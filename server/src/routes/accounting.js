import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry, toInr, logAudit } from '../services/ledgerService.js';
import { handleApiError } from '../utils/errorHelper.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET Chart of Accounts with tenant isolation
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query(`
      SELECT * FROM chart_of_accounts
      WHERE company_id = $1 AND is_active = TRUE
      ORDER BY code ASC
    `, [companyId]);

    const formatted = result.rows.map(a => ({
      ...a,
      balance_inr: toInr(a.cached_balance_paise),
    }));

    res.json({ success: true, accounts: formatted });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch chart of accounts.');
  }
});

// POST create Account
router.post('/chart-of-accounts', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const { code, name, statementGroup, accountType, subType, initialBalanceInr = 0 } = req.body;

    const accId = `acc_${code || randomUUID().slice(0, 6)}`;
    const balancePaise = Math.round(Number(initialBalanceInr) * 100);

    await db.query(`
      INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, sub_type, cached_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [accId, companyId, code, name, statementGroup || 'BALANCE_SHEET', accountType, subType || '', balancePaise]);

    await db.query(`
      INSERT INTO accounts (id, company_id, code, name, type, sub_type, balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [accId, companyId, code, name, accountType.toLowerCase(), subType || '', balancePaise]);

    await logAudit({
      companyId,
      action: 'CREATE',
      entityType: 'ACCOUNT',
      entityId: accId,
      after: req.body,
    });

    res.json({ success: true, message: 'Account created successfully', accountId: accId });
  } catch (err) {
    handleApiError(res, err, 'Failed to create account.');
  }
});

// GET Journal Entries
router.get('/journal-entries', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query(`
      SELECT je.*,
        json_agg(
          json_build_object(
            'id', jl.id,
            'account_id', jl.account_id,
            'debit_inr', (jl.debit_paise::numeric / 100),
            'credit_inr', (jl.credit_paise::numeric / 100),
            'description', jl.description
          )
        ) as lines
      FROM journal_entries je
      LEFT JOIN journal_entry_lines jl ON je.id = jl.journal_entry_id
      WHERE je.company_id = $1
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.created_at DESC
    `, [companyId]);
    res.json({ success: true, entries: result.rows });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch journal entries.');
  }
});

// POST Manual Journal Entry
router.post('/journal-entries', async (req, res) => {
  try {
    const companyId = req.companyId || 'comp_1';
    const { entryNumber, entryDate, memo, lines = [] } = req.body;
    const formattedLines = lines.map(l => ({
      accountId: l.accountId,
      debitPaise: Math.round(Number(l.debit || 0) * 100),
      creditPaise: Math.round(Number(l.credit || 0) * 100),
      description: l.description || '',
    }));

    const result = await postJournalEntry({
      companyId,
      entryNumber,
      entryDate,
      sourceType: 'MANUAL_JE',
      narration: memo,
      lines: formattedLines,
    });

    res.json({ success: true, message: 'Journal entry posted and verified', entry: result });
  } catch (err) {
    const isInvariantViolation = err.message && (
      err.message.includes('Double-Entry Violation') ||
      err.message.includes('must equal total credits') ||
      err.message.includes('Difference:')
    );
    if (isInvariantViolation) {
      return res.status(422).json({ success: false, error: err.message });
    }
    handleApiError(res, err, 'Failed to post journal entry.');
  }
});

// GET / POST Rules & Recurring
router.get('/rules-and-recurring', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query('SELECT * FROM rules WHERE company_id = $1 ORDER BY created_at DESC', [companyId]);
    res.json({ success: true, rules: result.rows });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch rules.');
  }
});

// GET / POST Budgets
router.get('/budgets', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query('SELECT * FROM budgets WHERE company_id = $1 ORDER BY fiscal_year DESC', [companyId]);
    res.json({ success: true, budgets: result.rows });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch budgets.');
  }
});

// POST Bank Reconciliation
router.post('/reconcile', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const { accountId, statementEndingDate, statementEndingBalanceInr, clearedBalanceInr } = req.body;
    const recId = `rec_${randomUUID()}`;
    const diff = Math.round((Number(statementEndingBalanceInr) - Number(clearedBalanceInr)) * 100);

    await db.query(`
      INSERT INTO bank_reconciliations (id, company_id, account_id, statement_ending_date, statement_ending_balance_paise, cleared_balance_paise, difference_paise, status, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    `, [recId, companyId, accountId, statementEndingDate, Math.round(Number(statementEndingBalanceInr)*100), Math.round(Number(clearedBalanceInr)*100), diff, diff === 0 ? 'COMPLETED' : 'IN_PROGRESS']);

    res.json({
      success: true,
      message: diff === 0 ? 'Reconciliation completed to ₹0.00 difference' : 'Reconciliation saved in progress',
      differenceInr: (diff / 100).toFixed(2)
    });
  } catch (err) {
    handleApiError(res, err, 'Failed to save reconciliation.');
  }
});

export default router;
