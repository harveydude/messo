/**
 * Input Tax Credit (ITC) Ledger & Section 17(5) Blocked Credit Engine (Phase 18)
 * Manages Electronic Credit Ledger claims, flags ineligible blocked credits,
 * and handles Reverse Charge Mechanism (RCM) accounting.
 */

import { getDb } from '../db/db.js';

export const SECTION_17_5_CATEGORIES = [
  'MOTOR_VEHICLES_PASSENGER',
  'FOOD_AND_BEVERAGES',
  'OUTDOOR_CATERING',
  'CLUB_MEMBERSHIP',
  'HEALTH_AND_FITNESS',
  'PERSONAL_CONSUMPTION',
  'GOODS_LOST_OR_STOLEN',
  'FREE_SAMPLES_OR_GIFTS'
];

/**
 * Checks whether an expense/bill category falls under Section 17(5) blocked credit.
 */
export function isSection17_5Blocked(categoryOrReason = '') {
  const norm = String(categoryOrReason).toUpperCase().replace(/[\s-]/g, '_');
  for (const cat of SECTION_17_5_CATEGORIES) {
    if (norm.includes(cat) || cat.includes(norm)) {
      return { blocked: true, reason: `Section 17(5) Ineligible Credit: ${cat}` };
    }
  }
  if (norm.includes('FOOD') || norm.includes('CAB') || norm.includes('CAR_RENTAL') || norm.includes('PERSONAL')) {
    return { blocked: true, reason: 'Section 17(5) Ineligible: Food / Conveyance / Personal Expense' };
  }
  return { blocked: false, reason: null };
}

/**
 * Records an Input Tax Credit line item into the Electronic Credit Ledger.
 */
export async function recordItcEntry({
  companyId = 'comp_1',
  docType = 'BILL',
  docId,
  itcType = 'ELIGIBLE_INPUTS',
  cgstPaise = 0,
  sgstPaise = 0,
  igstPaise = 0,
  cessPaise = 0,
  isBlocked = false,
  blockReason = null,
  claimPeriod = new Date().toISOString().substring(0, 7) // 'YYYY-MM'
}) {
  const db = await getDb();
  const cgst = Number(cgstPaise);
  const sgst = Number(sgstPaise);
  const igst = Number(igstPaise);
  const cess = Number(cessPaise);
  const totalItc = cgst + sgst + igst + cess;

  // Auto-evaluate Section 17(5) if reason supplied
  let blocked = isBlocked;
  let finalReason = blockReason;
  if (!blocked && blockReason) {
    const evalResult = isSection17_5Blocked(blockReason);
    if (evalResult.blocked) {
      blocked = true;
      finalReason = evalResult.reason;
    }
  }

  const isClaimed = !blocked;

  const query = `
    INSERT INTO itc_ledger (
      company_id, doc_type, doc_id, itc_type, cgst_paise, sgst_paise, igst_paise,
      cess_paise, total_itc_paise, is_blocked, block_reason, is_claimed, claim_period
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *;
  `;

  const res = await db.query(query, [
    companyId,
    docType,
    docId,
    blocked ? 'BLOCKED_SEC_17_5' : itcType,
    cgst,
    sgst,
    igst,
    cess,
    totalItc,
    blocked,
    finalReason,
    isClaimed,
    claimPeriod
  ]);

  return res.rows[0];
}

/**
 * Returns the Electronic Credit Ledger summary (Net Available ITC) for a return period.
 */
export async function getElectronicCreditLedgerSummary({ companyId = 'comp_1', claimPeriod }) {
  const db = await getDb();

  const periodClause = claimPeriod ? 'AND claim_period = $2' : '';
  const params = claimPeriod ? [companyId, claimPeriod] : [companyId];

  const res = await db.query(
    `SELECT 
       COALESCE(SUM(CASE WHEN is_claimed = true THEN cgst_paise ELSE 0 END), 0) as available_cgst,
       COALESCE(SUM(CASE WHEN is_claimed = true THEN sgst_paise ELSE 0 END), 0) as available_sgst,
       COALESCE(SUM(CASE WHEN is_claimed = true THEN igst_paise ELSE 0 END), 0) as available_igst,
       COALESCE(SUM(CASE WHEN is_claimed = true THEN cess_paise ELSE 0 END), 0) as available_cess,
       COALESCE(SUM(CASE WHEN is_claimed = true THEN total_itc_paise ELSE 0 END), 0) as total_available_itc,
       COALESCE(SUM(CASE WHEN is_blocked = true THEN total_itc_paise ELSE 0 END), 0) as total_blocked_itc
     FROM itc_ledger
     WHERE company_id = $1 ${periodClause}`,
    params
  );

  const row = res.rows[0] || {};
  return {
    companyId,
    claimPeriod: claimPeriod || 'ALL',
    availableCgstPaise: Number(row.available_cgst),
    availableSgstPaise: Number(row.available_sgst),
    availableIgstPaise: Number(row.available_igst),
    availableCessPaise: Number(row.available_cess),
    totalAvailableItcPaise: Number(row.total_available_itc),
    totalBlockedItcPaise: Number(row.total_blocked_itc)
  };
}
