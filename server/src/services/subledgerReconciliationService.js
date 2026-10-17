/**
 * Sub-Ledger to General Ledger Continuous Invariant Checker (Phase 13)
 * Enforces that customer open balances (A/R) and vendor open balances (A/P)
 * always equal their exact respective Chart of Accounts GL control accounts.
 */

import { getDb } from '../db/db.js';

export async function checkSubledgerReconciliation(options = 'comp_1') {
  const companyId = typeof options === 'string' ? options : (options?.companyId || 'comp_1');
  const recordReport = typeof options === 'object' ? (options?.recordReport ?? true) : true;
  const db = await getDb();

  // 1. Fetch Accounts Receivable (AR) GL Balance (Account 1100)
  const arGlRes = await db.query(
    `SELECT COALESCE(cached_balance_paise, 0) as balance 
     FROM chart_of_accounts 
     WHERE company_id = $1 AND (code LIKE '1100%' OR name ILIKE '%Accounts Receivable%')
     LIMIT 1`,
    [companyId]
  );
  const arGlPaise = arGlRes.rows.length > 0 ? Number(arGlRes.rows[0].balance) : 0;

  // 2. Fetch Invoices Subledger Open Balance Sum
  const arSubRes = await db.query(
    `SELECT COALESCE(SUM(balance_due_paise), 0) as subtotal
     FROM invoices
     WHERE company_id = $1 AND is_deleted = false AND status NOT IN ('VOID', 'VOIDED', 'DRAFT')`,
    [companyId]
  );
  const arSubledgerPaise = Number(arSubRes.rows[0]?.subtotal || 0);
  const arVariancePaise = arGlPaise - arSubledgerPaise;

  // 3. Fetch Accounts Payable (AP) GL Balance (Account 2000)
  const apGlRes = await db.query(
    `SELECT COALESCE(cached_balance_paise, 0) as balance 
     FROM chart_of_accounts 
     WHERE company_id = $1 AND (code LIKE '2000%' OR name ILIKE '%Accounts Payable%')
     LIMIT 1`,
    [companyId]
  );
  const apGlPaise = apGlRes.rows.length > 0 ? Number(apGlRes.rows[0].balance) : 0;

  // 4. Fetch Bills Subledger Open Balance Sum
  const apSubRes = await db.query(
    `SELECT COALESCE(SUM(open_balance_paise), 0) as subtotal
     FROM bills
     WHERE company_id = $1 AND is_deleted = false AND status NOT IN ('VOID', 'VOIDED', 'PAID')`,
    [companyId]
  );
  const apSubledgerPaise = Number(apSubRes.rows[0]?.subtotal || 0);
  const apVariancePaise = apGlPaise - apSubledgerPaise;

  const isBalanced = arVariancePaise === 0 && apVariancePaise === 0;

  const report = {
    companyId,
    checkedAt: new Date().toISOString(),
    ar: {
      glPaise: arGlPaise,
      subledgerPaise: arSubledgerPaise,
      variancePaise: arVariancePaise,
      isBalanced: arVariancePaise === 0
    },
    ap: {
      glPaise: apGlPaise,
      subledgerPaise: apSubledgerPaise,
      variancePaise: apVariancePaise,
      isBalanced: apVariancePaise === 0
    },
    isBalanced,
    status: isBalanced ? 'HEALTHY' : 'VARIANCE_DETECTED',
    customerSubledgerPaise: arSubledgerPaise,
    accountsReceivableGlPaise: arGlPaise,
    variancePaise: arVariancePaise
  };

  if (recordReport) {
    try {
      await db.query(
        `INSERT INTO subledger_reconciliation_reports (
          company_id, ar_gl_paise, ar_subledger_paise, ar_variance_paise,
          ap_gl_paise, ap_subledger_paise, ap_variance_paise, is_balanced, details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          companyId,
          arGlPaise,
          arSubledgerPaise,
          arVariancePaise,
          apGlPaise,
          apSubledgerPaise,
          apVariancePaise,
          isBalanced,
          JSON.stringify(report)
        ]
      );
    } catch {
      // ignore report persistence error if in-memory test
    }
  }

  return report;
}

/**
 * Diagnostic utility to synchronize Chart of Accounts control ledger balances
 * to the exact sub-ledger open balances when initial batches or adjustments are promoted.
 */
export async function syncSubledgerToGl(options = 'comp_1') {
  const companyId = typeof options === 'string' ? options : (options?.companyId || 'comp_1');
  const db = await getDb();

  // Sum open invoices
  const arSubRes = await db.query(
    `SELECT COALESCE(SUM(balance_due_paise), 0) as subtotal
     FROM invoices
     WHERE company_id = $1 AND is_deleted = false AND status NOT IN ('VOID', 'VOIDED', 'DRAFT')`,
    [companyId]
  );
  const arSubTotal = Number(arSubRes.rows[0]?.subtotal || 0);

  // Sum open bills
  const apSubRes = await db.query(
    `SELECT COALESCE(SUM(open_balance_paise), 0) as subtotal
     FROM bills
     WHERE company_id = $1 AND is_deleted = false AND status NOT IN ('VOID', 'VOIDED', 'PAID')`,
    [companyId]
  );
  const apSubTotal = Number(apSubRes.rows[0]?.subtotal || 0);

  // Upsert control accounts for companyId
  const arAcc = await db.query(
    `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND (code LIKE '1100%' OR name ILIKE '%Accounts Receivable%') LIMIT 1`,
    [companyId]
  );
  if (arAcc.rows.length > 0) {
    await db.query(`UPDATE chart_of_accounts SET cached_balance_paise = $1 WHERE id = $2`, [arSubTotal, arAcc.rows[0].id]);
  } else {
    const accId = 'acc_ar_' + Math.random().toString(36).substring(2, 8);
    const uniqueCode = '1100-' + Math.floor(100 + Math.random() * 900);
    await db.query(
      `INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, cached_balance_paise)
       VALUES ($1, $2, $3, 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE', $4)`,
      [accId, companyId, uniqueCode, arSubTotal]
    );
  }

  const apAcc = await db.query(
    `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND (code LIKE '2000%' OR name ILIKE '%Accounts Payable%') LIMIT 1`,
    [companyId]
  );
  if (apAcc.rows.length > 0) {
    await db.query(`UPDATE chart_of_accounts SET cached_balance_paise = $1 WHERE id = $2`, [apSubTotal, apAcc.rows[0].id]);
  } else {
    const accId = 'acc_ap_' + Math.random().toString(36).substring(2, 8);
    const uniqueCode = '2000-' + Math.floor(100 + Math.random() * 900);
    await db.query(
      `INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, cached_balance_paise)
       VALUES ($1, $2, $3, 'Accounts Payable', 'BALANCE_SHEET', 'ACCOUNTS_PAYABLE', $4)`,
      [accId, companyId, uniqueCode, apSubTotal]
    );
  }

  const recon = await checkSubledgerReconciliation({ companyId, recordReport: true });
  return { success: true, ...recon };
}
