import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

const VALID_REGISTRATIONS = ['REGULAR', 'COMPOSITION', 'SEZ', 'GIFT_CITY_IFSC', 'UNREGISTERED'];
const VALID_METHODS = ['ACCRUAL', 'CASH'];
const VALID_VALUATIONS = ['FIFO', 'WEIGHTED_AVERAGE'];

/**
 * Retrieves the accounting policy for a company, seeding defaults if needed.
 */
export async function getCompanyPolicy(companyId = 'comp_1') {
  const db = await getDb();

  let res = await db.query(
    `SELECT * FROM company_accounting_policies WHERE company_id = $1`,
    [companyId]
  );

  if (res.rows.length === 0) {
    // Seed default policy
    const insertRes = await db.query(
      `INSERT INTO company_accounting_policies (
        company_id, registration_type, accounting_method, inventory_valuation,
        functional_currency, books_closed_until, allow_prior_period_adjustments, version
      ) VALUES ($1, 'REGULAR', 'ACCRUAL', 'FIFO', 'INR', NULL, false, 1)
      RETURNING *`,
      [companyId]
    );
    return insertRes.rows[0];
  }

  return res.rows[0];
}

/**
 * Updates the company accounting policy with validation and audit logging.
 */
export async function updateCompanyPolicy(companyId = 'comp_1', updates = {}, user = { id: 'usr_1', role: 'OWNER' }) {
  const db = await getDb();
  const current = await getCompanyPolicy(companyId);

  const registration_type = updates.registration_type || current.registration_type;
  const accounting_method = updates.accounting_method || current.accounting_method;
  const inventory_valuation = updates.inventory_valuation || current.inventory_valuation;
  let functional_currency = updates.functional_currency || current.functional_currency;
  const lut_arn = updates.lut_arn !== undefined ? updates.lut_arn : current.lut_arn;
  const lut_expiry_date = updates.lut_expiry_date !== undefined ? updates.lut_expiry_date : current.lut_expiry_date;
  const books_closed_until = updates.books_closed_until !== undefined ? updates.books_closed_until : current.books_closed_until;
  const allow_prior_period_adjustments = updates.allow_prior_period_adjustments !== undefined ? updates.allow_prior_period_adjustments : current.allow_prior_period_adjustments;

  if (!VALID_REGISTRATIONS.includes(registration_type)) {
    throw new Error(`Invalid registration_type: ${registration_type}. Must be one of ${VALID_REGISTRATIONS.join(', ')}`);
  }
  if (!VALID_METHODS.includes(accounting_method)) {
    throw new Error(`Invalid accounting_method: ${accounting_method}`);
  }
  if (!VALID_VALUATIONS.includes(inventory_valuation)) {
    throw new Error(`Invalid inventory_valuation: ${inventory_valuation}`);
  }

  // GIFT City IFSC special rules: allows foreign functional currency (e.g. USD, EUR)
  if (registration_type !== 'GIFT_CITY_IFSC' && functional_currency !== 'INR') {
    // Non-GIFT City domestic companies must maintain INR primary ledger
    functional_currency = 'INR';
  }

  const updatedRes = await db.query(
    `UPDATE company_accounting_policies
     SET registration_type = $1,
         accounting_method = $2,
         inventory_valuation = $3,
         functional_currency = $4,
         lut_arn = $5,
         lut_expiry_date = $6,
         books_closed_until = $7,
         allow_prior_period_adjustments = $8,
         version = version + 1,
         updated_at = NOW()
     WHERE company_id = $9
     RETURNING *`,
    [
      registration_type,
      accounting_method,
      inventory_valuation,
      functional_currency,
      lut_arn,
      lut_expiry_date,
      books_closed_until,
      allow_prior_period_adjustments,
      companyId
    ]
  );

  const updated = updatedRes.rows[0];

  // Log in MCA Rule 3(1) tamper-evident audit trail
  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'policy',
    entityId: companyId,
    action: 'POLICY_CHANGE',
    beforeJson: current,
    afterJson: updated
  });

  return updated;
}

/**
 * Checks whether an edit or post is locked by the books closure date.
 */
export async function checkBooksLock(companyId = 'comp_1', txnDateStr, isPriorPeriodAdjustment = false) {
  const policy = await getCompanyPolicy(companyId);
  if (!policy.books_closed_until) {
    return { allowed: true };
  }

  const txnDate = new Date(txnDateStr);
  const lockDate = new Date(policy.books_closed_until);

  if (txnDate <= lockDate) {
    if (isPriorPeriodAdjustment && policy.allow_prior_period_adjustments) {
      return {
        allowed: true,
        isPriorPeriodAdjustment: true,
        notice: `Posting as Prior Period Adjustment against closed books lock date (${policy.books_closed_until})`
      };
    }

    return {
      allowed: false,
      error: `Accounting period is locked up to ${policy.books_closed_until}. Transactions on or prior to this date cannot be modified without authorized Prior Period Adjustment.`
    };
  }

  return { allowed: true };
}

/**
 * Fetches the legally accurate tax rate active on a specific transaction date.
 */
export async function getEffectiveTaxSchedule(companyId = 'comp_1', code, kind = 'GST', txnDateStr = new Date().toISOString().split('T')[0]) {
  const db = await getDb();

  const res = await db.query(
    `SELECT * FROM effective_dated_tax_schedules
     WHERE company_id = $1 
       AND hsn_or_section_code = $2 
       AND kind = $3
       AND effective_from <= $4::date
       AND effective_to >= $4::date
     ORDER BY effective_from DESC
     LIMIT 1`,
    [companyId, code, kind, txnDateStr]
  );

  return res.rows[0] || null;
}
