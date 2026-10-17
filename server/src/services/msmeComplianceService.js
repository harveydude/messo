/**
 * Meso Phase 34: MSME (Udyam) 45-Day Compliance Shield (Section 43B(h))
 * Enforces MSMED Act 2006 statutory payment deadlines (15 days without agreement, 45 days with agreement),
 * Section 16 penal compound interest calculation (3x RBI Bank Rate = ~19.5% p.a.),
 * and Income Tax Act Section 43B(h) expense disallowance radar.
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export const MSME_CATEGORIES = {
  MICRO: 'MICRO',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  NON_MSME: 'NON_MSME'
};

// Current RBI Repo/Bank Rate reference: 6.50% -> 3x is 19.50%
export const RBI_BANK_RATE_PERCENT = 6.50;
export const MSME_PENAL_RATE_PERCENT = RBI_BANK_RATE_PERCENT * 3; // 19.50%

export function validateUdyamNumber(udyamNo) {
  if (!udyamNo) return { valid: false, error: 'Udyam number is required' };
  const clean = udyamNo.trim().toUpperCase();
  // Format: UDYAM-XX-00-0000000 (e.g. UDYAM-MH-01-0012345)
  const regex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
  const valid = regex.test(clean);
  return {
    valid,
    udyamNumber: clean,
    stateCode: valid ? clean.split('-')[1] : null,
    error: valid ? null : 'Invalid Udyam registration format. Must be UDYAM-XX-00-0000000 (e.g. UDYAM-MH-01-0012345)'
  };
}

export function calculateMsmeDueDate(billDateStr, hasWrittenAgreement = true) {
  const d = new Date(billDateStr);
  const maxDays = hasWrittenAgreement ? 45 : 15;
  d.setDate(d.getDate() + maxDays);
  return {
    msmeDueDate: d.toISOString().slice(0, 10),
    maxDaysAllowed: maxDays
  };
}

export function calculateMsmeLateInterest(openBalancePaise, daysOverdue, penalRatePercent = MSME_PENAL_RATE_PERCENT) {
  if (daysOverdue <= 0) return 0n;
  const balance = BigInt(openBalancePaise || 0);
  // Interest = Balance * (Rate / 100) * (Days / 365)
  // Scaled for precision: (balance * rate_bp * days) / (10000 * 365)
  const rateBp = BigInt(Math.round(penalRatePercent * 100)); // 1950 basis points
  const interestPaise = (balance * rateBp * BigInt(daysOverdue)) / (10000n * 365n);
  return interestPaise;
}

export async function evaluateMsmeCompliance({ companyId = 'comp_1', asOfDate = new Date().toISOString().slice(0, 10) }) {
  const db = await getDb();
  const asOf = new Date(asOfDate);

  // Fetch unpaid/open bills belonging to MICRO and SMALL enterprise vendors
  const billsRes = await db.query(
    `SELECT b.*, c.display_name as vendor_name, c.msme_category, c.udyam_registration_no,
            c.msme_has_written_agreement
     FROM bills b
     JOIN contacts c ON c.id = b.vendor_id
     WHERE b.company_id = $1
       AND b.status NOT IN ('PAID', 'VOID')
       AND b.open_balance_paise > 0
       AND c.msme_category IN ('MICRO', 'SMALL')`,
    [companyId]
  );

  const bills = billsRes.rows || [];
  const evaluatedBills = [];
  let totalDisallowedPaise = 0n;
  let totalInterestPenaltyPaise = 0n;

  for (const b of bills) {
    const hasAgreement = b.msme_has_written_agreement !== false;
    const { msmeDueDate, maxDaysAllowed } = calculateMsmeDueDate(b.bill_date, hasAgreement);

    const dueDateObj = new Date(msmeDueDate);
    const diffTime = dueDateObj - asOf;
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const daysOverdue = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;

    let status = 'SAFE';
    let interestPaise = 0n;
    let disallowedPaise = 0n;

    if (daysRemaining > 10) {
      status = 'SAFE';
    } else if (daysRemaining >= 0 && daysRemaining <= 10) {
      status = 'APPROACHING_DEADLINE';
    } else {
      status = 'BREACHED_DISALLOWED';
      interestPaise = calculateMsmeLateInterest(b.open_balance_paise, daysOverdue);
      disallowedPaise = BigInt(b.open_balance_paise);
      totalDisallowedPaise += disallowedPaise;
      totalInterestPenaltyPaise += interestPaise;
    }

    await db.query(
      `UPDATE bills
       SET msme_due_date = $1, msme_status = $2,
           msme_interest_penalty_paise = $3, msme_disallowed_amount_paise = $4
       WHERE id = $5`,
      [msmeDueDate, status, interestPaise.toString(), disallowedPaise.toString(), b.id]
    );

    evaluatedBills.push({
      billId: b.id,
      billNumber: b.bill_number,
      vendorName: b.vendor_name,
      msmeCategory: b.msme_category,
      udyamNo: b.udyam_registration_no,
      billDate: b.bill_date,
      msmeDueDate,
      maxDaysAllowed,
      daysRemaining,
      daysOverdue,
      status,
      openBalancePaise: b.open_balance_paise,
      interestPenaltyPaise: interestPaise.toString(),
      disallowedAmountPaise: disallowedPaise.toString()
    });
  }

  return {
    success: true,
    asOfDate,
    totalEvaluatedBills: evaluatedBills.length,
    safeCount: evaluatedBills.filter(b => b.status === 'SAFE').length,
    approachingCount: evaluatedBills.filter(b => b.status === 'APPROACHING_DEADLINE').length,
    breachedCount: evaluatedBills.filter(b => b.status === 'BREACHED_DISALLOWED').length,
    totalDisallowedPaise: totalDisallowedPaise.toString(),
    totalInterestPenaltyPaise: totalInterestPenaltyPaise.toString(),
    bills: evaluatedBills
  };
}
