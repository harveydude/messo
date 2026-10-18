/**
 * Meso Phase 44: Statement Reconciliation & Post-Reconciliation Tamper Lock
 * Reconciles bank statements to zero difference and locks historical journal lines from tampering.
 */

import { getDb } from '../db/db.js';

export const RECONCILIATION_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

/**
 * Start or update a bank reconciliation session
 */
export async function initiateReconciliation({
  companyId = 'comp_1',
  accountId,
  statementEndingDate,
  statementEndingBalancePaise,
  clearedDepositsPaise = 0,
  clearedPaymentsPaise = 0,
  clearedLineIds = []
}) {
  const db = await getDb();
  const endingBalance = parseInt(statementEndingBalancePaise, 10);
  const clearedDep = parseInt(clearedDepositsPaise, 10);
  const clearedPay = parseInt(clearedPaymentsPaise, 10);

  // Cleared Balance = Cleared Deposits - Cleared Payments
  const clearedBalance = clearedDep - clearedPay;
  const differencePaise = clearedBalance - endingBalance;

  const recId = 'rec_' + Date.now();
  const res = await db.query(
    `INSERT INTO bank_reconciliations 
     (id, company_id, account_id, statement_ending_date, statement_ending_balance_paise, cleared_deposits_paise, cleared_payments_paise, cleared_balance_paise, difference_paise, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'IN_PROGRESS')
     RETURNING *`,
    [recId, companyId, accountId, statementEndingDate, endingBalance, clearedDep, clearedPay, clearedBalance, differencePaise]
  );

  return res.rows[0];
}

/**
 * Complete a bank reconciliation when difference is zero
 * Permanently locks journal entry lines (is_reconciled = TRUE).
 */
export async function completeReconciliation({
  companyId = 'comp_1',
  reconciliationId,
  clearedLineIds = [],
  reconciledBy = 'Finance Controller'
}) {
  const db = await getDb();

  const recRes = await db.query(
    `SELECT * FROM bank_reconciliations WHERE id = $1 AND company_id = $2`,
    [reconciliationId, companyId]
  );
  if (!recRes.rows[0]) throw new Error(`Reconciliation ${reconciliationId} not found`);
  const rec = recRes.rows[0];

  const diff = parseInt(rec.difference_paise, 10);
  if (diff !== 0) {
    throw new Error(`Cannot complete reconciliation with non-zero difference (Difference: ₹${(diff / 100).toFixed(2)})`);
  }

  const now = new Date().toISOString();

  // 1. Mark reconciliation COMPLETED
  const updatedRec = await db.query(
    `UPDATE bank_reconciliations 
     SET status = 'COMPLETED', completed_at = $1, reconciled_at = $1, reconciled_by = $2 
     WHERE id = $3 AND company_id = $4
     RETURNING *`,
    [now, reconciledBy, reconciliationId, companyId]
  );

  // 2. Lock cleared journal lines with is_reconciled = TRUE
  if (clearedLineIds.length > 0) {
    try {
      await db.query(`SET app.allow_journal_mutation = 'on'`);
      await db.query(
        `UPDATE journal_entry_lines 
         SET is_reconciled = TRUE, reconciliation_id = $1, reconciled_at = $2 
         WHERE id = ANY($3::text[])`,
        [reconciliationId, now, clearedLineIds]
      );
    } finally {
      await db.query(`SET app.allow_journal_mutation = 'off'`);
    }
  }

  return {
    success: true,
    reconciliation: updatedRec.rows[0],
    lockedLinesCount: clearedLineIds.length,
    isLocked: true
  };
}

/**
 * Tamper Lock Guard: checks if a journal entry or line can be edited/voided
 * Throws an exception if any line has already been reconciled.
 */
export async function assertTransactionUnlocked(companyId = 'comp_1', journalEntryId) {
  const db = await getDb();

  const res = await db.query(
    `SELECT id, account_id, is_reconciled, reconciliation_id, reconciled_at 
     FROM journal_entry_lines 
     WHERE journal_entry_id = $1 AND is_reconciled = TRUE`,
    [journalEntryId]
  );

  if (res.rows.length > 0) {
    const lockedLine = res.rows[0];
    throw new Error(
      `TAMPER_LOCK_VIOLATION: Transaction ${journalEntryId} has been reconciled in statement reconciliation ${lockedLine.reconciliation_id} and is permanently locked against modification or deletion.`
    );
  }

  return {
    isLocked: false,
    canModify: true
  };
}
