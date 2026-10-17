import { getDb } from '../db/db.js';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validates 15-digit Indian GSTIN format and checksum structure.
 */
export function validateGstin(gstin) {
  if (!gstin) return { valid: true }; // optional
  const clean = String(gstin).trim().toUpperCase();
  if (clean.length !== 15) {
    return { valid: false, error: `Invalid GSTIN length (${clean.length}). Must be exactly 15 characters.` };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { valid: false, error: `Invalid GSTIN format: ${clean}` };
  }
  return { valid: true, gstin: clean };
}

/**
 * Validates 10-character Indian PAN structure.
 */
export function validatePan(pan) {
  if (!pan) return { valid: true };
  const clean = String(pan).trim().toUpperCase();
  if (clean.length !== 10 || !PAN_REGEX.test(clean)) {
    return { valid: false, error: `Invalid Indian Income Tax PAN structure: ${clean}` };
  }
  return { valid: true, pan: clean };
}

/**
 * Validates a mapped row before staging it.
 */
export function validateMappedRow(targetEntity, mappedData) {
  const errors = [];

  if (targetEntity === 'contacts') {
    if (!mappedData.display_name || String(mappedData.display_name).trim().length === 0) {
      errors.push('Mandatory Party / Contact name is missing.');
    }
    if (mappedData.gstin) {
      const gstinCheck = validateGstin(mappedData.gstin);
      if (!gstinCheck.valid) errors.push(gstinCheck.error);
    }
    if (mappedData.pan) {
      const panCheck = validatePan(mappedData.pan);
      if (!panCheck.valid) errors.push(panCheck.error);
    }
  }

  if (targetEntity === 'invoices' || targetEntity === 'bills') {
    if (!mappedData.doc_number) {
      errors.push('Missing Document / Invoice Number.');
    }
    if (mappedData.total_amount !== undefined && isNaN(Number(mappedData.total_amount))) {
      errors.push(`Invalid amount value: ${mappedData.total_amount}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Deduplicates and matches contacts against existing database, or auto-creates if missing (Phase 9).
 */
export async function matchOrAutoCreateContact({
  companyId = 'comp_1',
  name,
  gstin = '',
  pan = '',
  contactType = 'CUSTOMER'
}) {
  const db = await getDb();
  const cleanName = String(name || '').trim();
  const cleanGstin = String(gstin || '').trim().toUpperCase();
  const cleanPan = String(pan || '').trim().toUpperCase();

  // 1. Match by GSTIN if present
  if (cleanGstin) {
    const gstinMatch = await db.query(
      `SELECT id, display_name FROM contacts WHERE company_id = $1 AND UPPER(gstin) = $2 LIMIT 1`,
      [companyId, cleanGstin]
    );
    if (gstinMatch.rows.length > 0) {
      return { contact: gstinMatch.rows[0], created: false, matchedOn: 'GSTIN' };
    }
  }

  // 2. Match by PAN if present
  if (cleanPan) {
    const panMatch = await db.query(
      `SELECT id, display_name FROM contacts WHERE company_id = $1 AND UPPER(pan) = $2 LIMIT 1`,
      [companyId, cleanPan]
    );
    if (panMatch.rows.length > 0) {
      return { contact: panMatch.rows[0], created: false, matchedOn: 'PAN' };
    }
  }

  // 3. Match by Name (Case-Insensitive)
  const nameMatch = await db.query(
    `SELECT id, display_name FROM contacts WHERE company_id = $1 AND LOWER(display_name) = LOWER($2) LIMIT 1`,
    [companyId, cleanName]
  );
  if (nameMatch.rows.length > 0) {
    return { contact: nameMatch.rows[0], created: false, matchedOn: 'NAME' };
  }

  // 4. Auto-create new contact (Phase 9 Master Data Auto-Creation)
  const contactId = 'cont_' + Math.random().toString(36).substring(2, 10);
  const contactTypeVal = (contactType || 'CUSTOMER').toUpperCase();
  const insertRes = await db.query(
    `INSERT INTO contacts (
      id, company_id, display_name, gstin, pan, type, opening_balance_paise
    ) VALUES ($1, $2, $3, $4, $5, $6, 0)
    RETURNING id, display_name`,
    [contactId, companyId, cleanName, cleanGstin || null, cleanPan || null, contactTypeVal]
  );

  return { contact: insertRes.rows[0], created: true, matchedOn: 'NEW_RECORD' };
}

/**
 * Ensures a Chart of Accounts category exists, auto-creating a standard ledger if missing (Phase 9).
 */
export async function matchOrAutoCreateAccount({
  companyId = 'comp_1',
  accountName,
  accountType = 'Expense',
  statementSection = 'P&L'
}) {
  const db = await getDb();
  const cleanName = String(accountName || '').trim();

  const match = await db.query(
    `SELECT id, name FROM chart_of_accounts WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [companyId, cleanName]
  );

  if (match.rows.length > 0) {
    return { account: match.rows[0], created: false };
  }

  const accountId = 'acc_' + Math.random().toString(36).substring(2, 10);
  const code = 'ACC-' + Math.floor(1000 + Math.random() * 9000);
  const group = statementSection && statementSection.toLowerCase().includes('balance') ? 'BALANCE_SHEET' : 'PROFIT_AND_LOSS';
  const typeNormalized = (accountType || 'EXPENSE').toUpperCase();

  const insertRes = await db.query(
    `INSERT INTO chart_of_accounts (
      id, company_id, code, name, account_type, statement_group, cached_balance_paise
    ) VALUES ($1, $2, $3, $4, $5, $6, 0)
    RETURNING id, name, statement_group, account_type`,
    [accountId, companyId, code, cleanName, typeNormalized, group]
  );

  return { account: insertRes.rows[0], created: true };
}
