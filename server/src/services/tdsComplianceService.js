/**
 * Meso Phase 24: ITNS 281 Challan Settlement, Late TDS Interest (Sec 201(1A)) & Form 26Q
 */

import { getDb } from '../db/db.js';

/**
 * Compute Section 201(1A) Interest on Late Deduction & Late Payment
 * - Late Deduction: 1% per month or fraction of month (from deductible date to deduction date)
 * - Late Payment: 1.5% per month or fraction of month (from deduction date to payment date)
 */
export function calculateTdsLateInterest({
  tdsAmountPaise,
  deductibleDate, // when bill/advance occurred
  deductionDate,  // when TDS was actually recorded
  paymentDate,    // when tax was deposited via Challan 281
}) {
  const amtBig = BigInt(tdsAmountPaise);
  if (amtBig <= 0n) {
    return { interestLateDeductionPaise: '0', interestLatePaymentPaise: '0', totalInterestPaise: '0' };
  }

  const d1 = new Date(deductibleDate);
  const d2 = new Date(deductionDate);
  const d3 = new Date(paymentDate);

  // Month-count calculation: Any fraction of a month counts as a full month under Section 201(1A)
  function getMonthsBetween(start, end) {
    if (end <= start) return 0;
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    let totalMonths = yearDiff * 12 + monthDiff;
    if (end.getDate() > start.getDate()) {
      totalMonths += 1;
    }
    return Math.max(totalMonths, 1);
  }

  // 1. Late deduction interest (1% per month)
  const deductionDelayMonths = getMonthsBetween(d1, d2);
  const interestLateDeductionPaise = (amtBig * BigInt(deductionDelayMonths) * 100n) / 10000n; // 1% = 100 bp

  // 2. Due date for monthly payment: 7th of the following month (April 30th for March)
  const deductionMonth = d2.getMonth(); // 0 to 11
  const deductionYear = d2.getFullYear();
  let statutoryDueDate;
  if (deductionMonth === 2) {
    // March -> Due date April 30
    statutoryDueDate = new Date(deductionYear, 3, 30);
  } else {
    // 7th of next month
    statutoryDueDate = new Date(deductionYear, deductionMonth + 1, 7);
  }

  let interestLatePaymentPaise = 0n;
  if (d3 > statutoryDueDate) {
    // Interest is calculated from deductionDate to paymentDate under Sec 201(1A)(ii)
    const paymentDelayMonths = getMonthsBetween(d2, d3);
    interestLatePaymentPaise = (amtBig * BigInt(paymentDelayMonths) * 150n) / 10000n; // 1.5% = 150 bp
  }

  const totalInterestPaise = interestLateDeductionPaise + interestLatePaymentPaise;

  return {
    tdsAmountPaise: amtBig.toString(),
    deductionDelayMonths,
    interestLateDeductionPaise: interestLateDeductionPaise.toString(),
    statutoryDueDate: statutoryDueDate.toISOString().slice(0, 10),
    isPaymentDelayed: d3 > statutoryDueDate,
    interestLatePaymentPaise: interestLatePaymentPaise.toString(),
    totalInterestPaise: totalInterestPaise.toString(),
  };
}

/**
 * Record Challan ITNS 281 Settlement
 */
export async function recordChallanItns281({
  companyId = 'comp_1',
  challanNo,
  bsrCode,
  depositDate,
  taxApplicable = '0020', // '0020' Company / '0021' Non-Company
  typeOfPayment = '200',  // '200' Regular / '400' Assessment
  sectionCode,
  tdsPaise,
  surchargePaise = 0,
  cessPaise = 0,
  interestPaise = 0,
  feePenaltyPaise = 0,
  bankName = 'State Bank of India',
  financialYear = '2026-27',
  quarter = 'Q1',
  transactionIds = [],
}) {
  const db = await getDb();
  const totalDeposited =
    BigInt(tdsPaise) +
    BigInt(surchargePaise) +
    BigInt(cessPaise) +
    BigInt(interestPaise) +
    BigInt(feePenaltyPaise);

  const res = await db.query(
    `INSERT INTO tds_challans_itns281 (
      company_id, challan_no, bsr_code, deposit_date, tax_applicable, type_of_payment,
      section_code, tds_paise, surcharge_paise, cess_paise, interest_paise, fee_penalty_paise,
      total_deposited_paise, bank_name, financial_year, quarter
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`,
    [
      companyId,
      challanNo,
      bsrCode,
      depositDate,
      taxApplicable,
      typeOfPayment,
      sectionCode,
      BigInt(tdsPaise).toString(),
      BigInt(surchargePaise).toString(),
      BigInt(cessPaise).toString(),
      BigInt(interestPaise).toString(),
      BigInt(feePenaltyPaise).toString(),
      totalDeposited.toString(),
      bankName,
      financialYear,
      quarter,
    ]
  );

  const challan = res.rows[0];

  // Link transactions to this challan if provided
  if (transactionIds.length > 0) {
    for (const tid of transactionIds) {
      await db.query(`UPDATE tds_transactions SET challan_id = $1 WHERE id = $2`, [challan.id, tid]);
    }
  }

  return challan;
}

/**
 * Compile Form 26Q Export Data for Indian Tax Filing
 */
export async function compileForm26Q({ companyId = 'comp_1', financialYear = '2026-27', quarter = 'Q1' }) {
  const db = await getDb();

  // Fetch all transactions and linked challans
  const res = await db.query(
    `SELECT t.*, c.display_name as vendor_name, c.pan as vendor_pan, ch.challan_no, ch.bsr_code, ch.deposit_date
     FROM tds_transactions t
     LEFT JOIN contacts c ON t.vendor_id = c.id
     LEFT JOIN tds_challans_itns281 ch ON t.challan_id = ch.id
     WHERE t.company_id = $1 AND t.financial_year = $2
     ORDER BY t.deduction_date ASC`,
    [companyId, financialYear]
  );

  let totalGrossPaise = 0n;
  let totalTdsPaise = 0n;

  const deducteeRecords = res.rows.map((row, idx) => {
    totalGrossPaise += BigInt(row.gross_amount_paise);
    totalTdsPaise += BigInt(row.tds_amount_paise);

    return {
      recordNo: idx + 1,
      deducteePan: row.vendor_pan || 'PANNOTAVBL',
      deducteeName: row.vendor_name || 'Vendor ' + row.vendor_id,
      sectionCode: row.section_code,
      deductionDate: row.deduction_date,
      grossAmountPaise: row.gross_amount_paise,
      tdsRatePercent: (row.tds_rate_bp / 100).toFixed(2),
      tdsDeductedPaise: row.tds_amount_paise,
      challanBSR: row.bsr_code || 'PENDING',
      challanSerialNo: row.challan_no || 'PENDING',
      challanDepositDate: row.deposit_date || 'PENDING',
    };
  });

  return {
    form: '26Q',
    companyId,
    financialYear,
    quarter,
    totalRecords: deducteeRecords.length,
    totalGrossAmountPaise: totalGrossPaise.toString(),
    totalTdsDeductedPaise: totalTdsPaise.toString(),
    deducteeRecords,
  };
}
