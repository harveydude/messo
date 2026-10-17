/**
 * Meso Phase 22 & 23: Cumulative Threshold & Multi-Section TDS Engine
 * Whichever is Earlier (Advance vs Bill) & TCS (Section 206C(1H))
 */

import { getDb } from '../db/db.js';
import { validatePanStructure, getActiveLowerCert, resolveTdsRateWithRules } from './tdsPanValidator.js';

export const TDS_SECTIONS = {
  '194C': {
    name: 'Contractor & Sub-Contractor',
    singleBillThresholdPaise: 3000000n, // ₹30,000
    annualThresholdPaise: 10000000n,    // ₹1,00,000
    rateIndividualBp: 100,               // 1%
    rateCompanyBp: 200,                  // 2%
  },
  '194J': {
    name: 'Fees for Professional / Technical Services',
    singleBillThresholdPaise: 0n,
    annualThresholdPaise: 3000000n,      // ₹30,000
    rateTechnicalBp: 200,                // 2%
    rateProfessionalBp: 1000,            // 10%
  },
  '194H': {
    name: 'Commission & Brokerage',
    singleBillThresholdPaise: 0n,
    annualThresholdPaise: 1500000n,      // ₹15,000
    rateBp: 200,                         // 2% (2024 revised)
  },
  '194I_PLANT': {
    name: 'Rent - Plant & Machinery',
    singleBillThresholdPaise: 0n,
    annualThresholdPaise: 24000000n,     // ₹2,40,000
    rateBp: 200,                         // 2%
  },
  '194I_BUILDING': {
    name: 'Rent - Land, Building & Furniture',
    singleBillThresholdPaise: 0n,
    annualThresholdPaise: 24000000n,     // ₹2,40,000
    rateBp: 1000,                        // 10%
  },
  '194Q': {
    name: 'Purchase of Goods',
    singleBillThresholdPaise: 0n,
    annualThresholdPaise: 500000000n,    // ₹50,00,000
    rateBp: 10,                          // 0.1% on excess
  },
};

export function getFinancialYearForDate(dateInput) {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1 to 12
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Process TDS on a Vendor Bill or Advance Payment
 */
export async function processTdsForBillOrAdvance({
  companyId = 'comp_1',
  vendorId,
  docType = 'BILL', // 'BILL' or 'ADVANCE_PAYMENT'
  docId,
  sectionCode = '194C',
  subCategory = null, // e.g. 'TECHNICAL', 'PROFESSIONAL'
  amountPaise,
  date = new Date().toISOString().slice(0, 10),
  vendorPan = null,
}) {
  const db = await getDb();
  const amtBig = BigInt(amountPaise);
  const fy = getFinancialYearForDate(date);

  // 1. Validate PAN and identify entity
  const panResult = validatePanStructure(vendorPan);
  const isInd = panResult.isValid && panResult.isIndividualOrHuf;

  // 2. Determine base statutory rate
  let baseRateBp = 200; // default 2%
  const sec = TDS_SECTIONS[sectionCode] || TDS_SECTIONS['194C'];

  if (sectionCode === '194C') {
    baseRateBp = isInd ? sec.rateIndividualBp : sec.rateCompanyBp;
  } else if (sectionCode === '194J') {
    baseRateBp = subCategory === 'TECHNICAL' ? sec.rateTechnicalBp : sec.rateProfessionalBp;
  } else if (sec.rateBp) {
    baseRateBp = sec.rateBp;
  }

  // 3. Check for Section 197 Lower Deduction Certificate
  const lowerCert = await getActiveLowerCert({
    companyId,
    vendorId,
    sectionCode,
    txnDate: date,
  });

  // 4. Resolve final rate under Sec 206AA or Sec 197
  const resolved = resolveTdsRateWithRules({
    vendorPan,
    baseRateBp,
    lowerCert,
  });

  // 5. Query / Update cumulative tracker
  const trackerRes = await db.query(
    `SELECT cumulative_amount_paise, cumulative_tds_paise, is_threshold_breached
     FROM tds_cumulative_tracker
     WHERE company_id = $1 AND vendor_id = $2 AND financial_year = $3 AND section_code = $4`,
    [companyId, vendorId, fy, sectionCode]
  );

  let prevCumulativeAmt = 0n;
  let prevBreached = false;
  if (trackerRes.rows.length > 0) {
    prevCumulativeAmt = BigInt(trackerRes.rows[0].cumulative_amount_paise);
    prevBreached = trackerRes.rows[0].is_threshold_breached;
  }

  const newCumulativeAmt = prevCumulativeAmt + amtBig;

  // 6. Check thresholds
  let isThresholdMet = prevBreached;
  if (!isThresholdMet) {
    if (sec.singleBillThresholdPaise > 0n && amtBig >= sec.singleBillThresholdPaise) {
      isThresholdMet = true;
    } else if (newCumulativeAmt >= sec.annualThresholdPaise) {
      isThresholdMet = true;
    }
  }

  // 7. Calculate TDS paise
  let tdsAmountPaise = 0n;
  if (isThresholdMet) {
    // If 194Q, tax applies only on excess above ₹50L
    let taxableBase = amtBig;
    if (sectionCode === '194Q' && !prevBreached) {
      taxableBase = newCumulativeAmt - sec.annualThresholdPaise;
      if (taxableBase < 0n) taxableBase = 0n;
    }
    tdsAmountPaise = (taxableBase * BigInt(resolved.appliedRateBp)) / 10000n;
  }

  const netPayablePaise = amtBig - tdsAmountPaise;

  // 8. Update cumulative tracker
  await db.query(
    `INSERT INTO tds_cumulative_tracker (
      company_id, vendor_id, financial_year, section_code,
      cumulative_amount_paise, cumulative_tds_paise, is_threshold_breached, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    ON CONFLICT (company_id, vendor_id, financial_year, section_code) DO UPDATE
      SET cumulative_amount_paise = EXCLUDED.cumulative_amount_paise,
          cumulative_tds_paise = tds_cumulative_tracker.cumulative_tds_paise + EXCLUDED.cumulative_tds_paise,
          is_threshold_breached = EXCLUDED.is_threshold_breached,
          updated_at = now()`,
    [
      companyId,
      vendorId,
      fy,
      sectionCode,
      newCumulativeAmt.toString(),
      tdsAmountPaise.toString(),
      isThresholdMet,
    ]
  );

  // 9. Record transaction if TDS was deducted
  let txnRecord = null;
  if (tdsAmountPaise > 0n) {
    const txnRes = await db.query(
      `INSERT INTO tds_transactions (
        company_id, vendor_id, doc_type, doc_id, section_code, financial_year,
        gross_amount_paise, tds_rate_bp, tds_amount_paise, net_payable_paise,
        deduction_date, is_advance
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        companyId,
        vendorId,
        docType,
        docId,
        sectionCode,
        fy,
        amtBig.toString(),
        resolved.appliedRateBp,
        tdsAmountPaise.toString(),
        netPayablePaise.toString(),
        date,
        docType === 'ADVANCE_PAYMENT',
      ]
    );
    txnRecord = txnRes.rows[0];

    // If lower cert utilized, update lower cert utilized amount
    if (lowerCert) {
      await db.query(
        `UPDATE tds_lower_deduction_certificates
         SET utilized_amount_paise = utilized_amount_paise + $1
         WHERE id = $2`,
        [amtBig.toString(), lowerCert.id]
      );
    }
  }

  return {
    tdsApplicable: tdsAmountPaise > 0n,
    sectionCode,
    financialYear: fy,
    grossAmountPaise: amtBig.toString(),
    appliedRateBp: resolved.appliedRateBp,
    ruleApplied: resolved.ruleApplied,
    isThresholdBreached: isThresholdMet,
    tdsAmountPaise: tdsAmountPaise.toString(),
    netPayablePaise: netPayablePaise.toString(),
    transactionId: txnRecord ? txnRecord.id : null,
  };
}

/**
 * Phase 23: Whichever is Earlier - Adjust Advance Payment TDS against Final Bill
 */
export async function adjustAdvancePaymentTds({
  companyId = 'comp_1',
  vendorId,
  advanceDocId,
  billDocId,
  billAmountPaise,
  billDate,
}) {
  const db = await getDb();
  // Find advance transaction
  const advRes = await db.query(
    `SELECT * FROM tds_transactions
     WHERE company_id = $1 AND vendor_id = $2 AND doc_id = $3 AND is_advance = true`,
    [companyId, vendorId, advanceDocId]
  );

  if (advRes.rows.length === 0) {
    throw new Error(`No advance TDS record found for docId: ${advanceDocId}`);
  }

  const advTxn = advRes.rows[0];
  const advGross = BigInt(advTxn.gross_amount_paise);
  const advTds = BigInt(advTxn.tds_amount_paise);
  const billGross = BigInt(billAmountPaise);

  // Link advance to bill
  await db.query(
    `UPDATE tds_transactions SET adjusted_bill_id = $1 WHERE id = $2`,
    [billDocId, advTxn.id]
  );

  // Calculate remaining balance to tax
  const remainingGross = billGross > advGross ? billGross - advGross : 0n;
  let remainingTds = 0n;
  if (remainingGross > 0n) {
    remainingTds = (remainingGross * BigInt(advTxn.tds_rate_bp)) / 10000n;
  }

  return {
    advanceDocId,
    billDocId,
    originalAdvanceGrossPaise: advGross.toString(),
    originalAdvanceTdsPaise: advTds.toString(),
    billGrossPaise: billGross.toString(),
    remainingGrossPaise: remainingGross.toString(),
    additionalTdsPaise: remainingTds.toString(),
    totalTdsPaidPaise: (advTds + remainingTds).toString(),
    status: 'ADJUSTED_SUCCESSFULLY',
  };
}

/**
 * Phase 23: Section 206C(1H) TCS (Tax Collected at Source) on Sale of Goods
 */
export function calculateTcs({
  customerId,
  receiptAmountPaise,
  cumulativeReceiptsPaise = 0n,
  customerPan = null,
}) {
  const thresholdPaise = 500000000n; // ₹50 Lakhs
  const amtBig = BigInt(receiptAmountPaise);
  const prevBig = BigInt(cumulativeReceiptsPaise);
  const totalReceipts = prevBig + amtBig;

  const panCheck = validatePanStructure(customerPan);
  // Standard TCS rate: 0.1% (10 bp). Higher rate if no PAN: 1% (100 bp)
  const tcsRateBp = panCheck.isValid ? 10 : 100;

  if (totalReceipts <= thresholdPaise) {
    return {
      tcsApplicable: false,
      tcsAmountPaise: '0',
      reason: 'Cumulative collection does not exceed ₹50 Lakh threshold',
      tcsRateBp,
    };
  }

  let taxablePortion = amtBig;
  if (prevBig < thresholdPaise) {
    taxablePortion = totalReceipts - thresholdPaise;
  }

  const tcsAmountPaise = (taxablePortion * BigInt(tcsRateBp)) / 10000n;

  return {
    tcsApplicable: true,
    customerId,
    taxablePortionPaise: taxablePortion.toString(),
    tcsRateBp,
    tcsAmountPaise: tcsAmountPaise.toString(),
    isHigherRateWithoutPan: !panCheck.isValid,
  };
}
