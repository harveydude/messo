/**
 * Meso Phase 42: AI + Rule-Based Bank Categorization & Split Matching
 * User-defined bank categorization rules, multi-invoice split matching, and automatic bank fee detection.
 */

import { getDb } from '../db/db.js';

export const RULE_OPERATORS = {
  CONTAINS: 'CONTAINS',
  EQUALS: 'EQUALS',
  STARTS_WITH: 'STARTS_WITH',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN'
};

/**
 * Create a new bank categorization rule
 */
export async function createBankRule({
  companyId = 'comp_1',
  name,
  priority = 1,
  direction = 'MONEY_OUT',
  conditions = [], // array of { field: 'description'|'payee'|'amount', operator: 'CONTAINS'|..., value: '...' }
  targetAccountId,
  targetContactId = null,
  autoAdd = false
}) {
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO bank_rules 
     (company_id, name, priority, direction, conditions, target_account_id, target_contact_id, auto_add, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
     RETURNING *`,
    [companyId, name, priority, direction, JSON.stringify(conditions), targetAccountId, targetContactId, Boolean(autoAdd)]
  );
  return res.rows[0];
}

/**
 * Evaluate all active bank rules against a transaction
 */
export async function evaluateBankRules(companyId = 'comp_1', transaction) {
  const db = await getDb();
  const rulesRes = await db.query(
    `SELECT * FROM bank_rules 
     WHERE company_id = $1 AND is_active = TRUE
     ORDER BY priority ASC, created_at ASC`,
    [companyId]
  );

  const isMoneyOut = parseInt(transaction.spent_paise || 0, 10) > 0;
  const isMoneyIn = parseInt(transaction.received_paise || 0, 10) > 0;

  for (const rule of rulesRes.rows) {
    if (rule.direction === 'MONEY_OUT' && !isMoneyOut) continue;
    if (rule.direction === 'MONEY_IN' && !isMoneyIn) continue;

    const conditions = Array.isArray(rule.conditions) ? rule.conditions : JSON.parse(rule.conditions || '[]');
    let allMatched = conditions.length > 0;

    for (const cond of conditions) {
      let fieldValue = '';
      if (cond.field === 'description') fieldValue = (transaction.description || '').toLowerCase();
      else if (cond.field === 'payee') fieldValue = (transaction.payee || '').toLowerCase();
      else if (cond.field === 'amount') fieldValue = isMoneyOut ? parseInt(transaction.spent_paise, 10) : parseInt(transaction.received_paise, 10);

      const targetVal = typeof cond.value === 'string' ? cond.value.toLowerCase() : cond.value;

      let condPassed = false;
      switch (cond.operator) {
        case RULE_OPERATORS.CONTAINS:
          condPassed = String(fieldValue).includes(String(targetVal));
          break;
        case RULE_OPERATORS.EQUALS:
          condPassed = String(fieldValue) === String(targetVal);
          break;
        case RULE_OPERATORS.STARTS_WITH:
          condPassed = String(fieldValue).startsWith(String(targetVal));
          break;
        case RULE_OPERATORS.GREATER_THAN:
          condPassed = parseFloat(fieldValue) > parseFloat(targetVal);
          break;
        case RULE_OPERATORS.LESS_THAN:
          condPassed = parseFloat(fieldValue) < parseFloat(targetVal);
          break;
        default:
          condPassed = false;
      }

      if (!condPassed) {
        allMatched = false;
        break;
      }
    }

    if (allMatched) {
      return {
        matchedRuleId: rule.id,
        ruleName: rule.name,
        targetAccountId: rule.target_account_id,
        targetContactId: rule.target_contact_id,
        autoAdd: rule.auto_add
      };
    }
  }

  return null;
}

/**
 * Match a single bank transaction against multiple documents (Split Matching)
 * Detects bank fee deductions automatically (e.g. remittance fees or gateway charges).
 */
export async function matchBankTransactionSplit({
  companyId = 'comp_1',
  bankTransactionId,
  targetDocType = 'INVOICE', // 'INVOICE' for deposits, 'BILL' for payments
  allocations = [], // array of { docId, amountPaise }
  feeAccountId = 'acc_bank_fees',
  bankAccountId = 'acc_hdfc_bank'
}) {
  const db = await getDb();

  // Retrieve bank transaction
  const btRes = await db.query(`SELECT * FROM bank_transactions WHERE id = $1 AND company_id = $2`, [bankTransactionId, companyId]);
  if (!btRes.rows[0]) throw new Error(`Bank transaction ${bankTransactionId} not found`);
  const bt = btRes.rows[0];

  const bankAmountPaise = targetDocType === 'INVOICE' 
    ? parseInt(bt.received_paise, 10) 
    : parseInt(bt.spent_paise, 10);

  const totalAllocatedPaise = allocations.reduce((acc, a) => acc + parseInt(a.amountPaise, 10), 0);

  // Auto-detect bank charges: if customer invoice total is greater than bank receipt
  let detectedFeePaise = 0;
  if (targetDocType === 'INVOICE' && totalAllocatedPaise > bankAmountPaise) {
    detectedFeePaise = totalAllocatedPaise - bankAmountPaise;
  } else if (targetDocType === 'BILL' && bankAmountPaise > totalAllocatedPaise) {
    detectedFeePaise = bankAmountPaise - totalAllocatedPaise;
  }

  // Record split match records
  const splitRecords = [];
  for (const alloc of allocations) {
    const sRes = await db.query(
      `INSERT INTO bank_split_matches 
       (company_id, bank_transaction_id, target_doc_type, target_doc_id, allocated_amount_paise, fee_deducted_paise)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [companyId, bankTransactionId, targetDocType, alloc.docId, parseInt(alloc.amountPaise, 10), detectedFeePaise]
    );
    splitRecords.push(sRes.rows[0]);

    // Update target document (knock off invoice or bill)
    if (targetDocType === 'INVOICE') {
      await db.query(
        `UPDATE invoices 
         SET status = 'PAID', balance_due_paise = 0 
         WHERE id = $1 AND company_id = $2`,
        [alloc.docId, companyId]
      );
    } else {
      await db.query(
        `UPDATE bills 
         SET status = 'PAID', open_balance_paise = 0 
         WHERE id = $1 AND company_id = $2`,
        [alloc.docId, companyId]
      );
    }
  }

  // Create balanced GL journal entry
  const jeId = 'je_bt_match_' + Date.now();
  const entryNumber = 'JE-BTM-' + Date.now();
  const entryDate = bt.date;

  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'BANK_MATCH', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, entryDate, `Bank split match for ${bt.description}`, bankTransactionId]
  );

  const l1 = 'jel_btm_' + Date.now() + '_1';
  const l2 = 'jel_btm_' + Date.now() + '_2';
  const l3 = 'jel_btm_' + Date.now() + '_3';

  if (targetDocType === 'INVOICE') {
    // Customer Receipts: Debit Bank, Debit Bank Fees, Credit Accounts Receivable
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, $3, $4, 0, 'Net bank deposit received'),
              ($5, $2, $6, $7, 0, 'Deducted payment gateway / remittance fee'),
              ($8, $2, 'acc_accounts_receivable', 0, $9, 'Accounts receivable settlement')`,
      [l1, jeId, bankAccountId, bankAmountPaise, l2, feeAccountId, detectedFeePaise, l3, totalAllocatedPaise]
    );
  } else {
    // Vendor Payments: Debit Accounts Payable, Credit Bank, Credit/Debit Bank Fees
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_accounts_payable', $3, 0, 'Accounts payable settlement'),
              ($4, $2, $5, 0, $6, 'Bank payment disbursed'),
              ($7, $2, $8, $9, 0, 'Bank transaction fee')`,
      [l1, jeId, totalAllocatedPaise, l2, bankAccountId, bankAmountPaise, l3, feeAccountId, detectedFeePaise]
    );
  }

  // Update bank transaction status to MATCHED
  await db.query(
    `UPDATE bank_transactions 
     SET status = 'MATCHED', match_status = 'SPLIT_MATCHED', linked_journal_entry_id = $1 
     WHERE id = $2 AND company_id = $3`,
    [jeId, bankTransactionId, companyId]
  );

  return {
    success: true,
    bankTransactionId,
    targetDocType,
    bankAmountPaise,
    totalAllocatedPaise,
    detectedFeePaise,
    journalEntryId: jeId,
    splits: splitRecords
  };
}
