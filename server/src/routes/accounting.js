import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry, toInr, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET Chart of Accounts
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM chart_of_accounts
      WHERE is_active = TRUE
      ORDER BY code ASC
    `);

    const formatted = result.rows.map(a => ({
      ...a,
      balance_inr: toInr(a.cached_balance_paise),
    }));

    res.json({ success: true, accounts: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create Account
router.post('/chart-of-accounts', async (req, res) => {
  try {
    const db = await getDb();
    const { code, name, statementGroup, accountType, subType, initialBalanceInr = 0 } = req.body;

    const accId = `acc_${code || randomUUID().slice(0, 6)}`;
    const balancePaise = Math.round(Number(initialBalanceInr) * 100);

    await db.query(`
      INSERT INTO chart_of_accounts (id, code, name, statement_group, account_type, sub_type, cached_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [accId, code, name, statementGroup || 'BALANCE_SHEET', accountType, subType || '', balancePaise]);

    await db.query(`
      INSERT INTO accounts (id, code, name, type, sub_type, balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [accId, code, name, accountType.toLowerCase(), subType || '', balancePaise]);

    await logAudit({
      action: 'CREATE',
      entityType: 'ACCOUNT',
      entityId: accId,
      after: req.body,
    });

    res.json({ success: true, message: 'Account created successfully', accountId: accId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Journal Entries
router.get('/journal-entries', async (req, res) => {
  try {
    const db = await getDb();
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
      LEFT JOIN journal_entry_lines jl ON je.id = jl.entry_id
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.created_at DESC
    `);
    res.json({ success: true, entries: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Manual Journal Entry
router.post('/journal-entries', async (req, res) => {
  try {
    const { entryNumber, entryDate, memo, lines = [] } = req.body;
    const formattedLines = lines.map(l => ({
      accountId: l.accountId,
      debitPaise: Math.round(Number(l.debit || 0) * 100),
      creditPaise: Math.round(Number(l.credit || 0) * 100),
      description: l.description || '',
    }));

    const result = await postJournalEntry({
      entryNumber,
      entryDate,
      sourceType: 'MANUAL_JE',
      narration: memo,
      lines: formattedLines,
    });

    res.json({ success: true, message: 'Journal entry posted and verified', entry: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET / POST Rules & Recurring
router.get('/rules-and-recurring', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM rules ORDER BY created_at DESC');
    res.json({ success: true, rules: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / POST Budgets
router.get('/budgets', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM budgets ORDER BY fiscal_year DESC');
    res.json({ success: true, budgets: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Bank Reconciliation
router.post('/reconcile', async (req, res) => {
  try {
    const db = await getDb();
    const { accountId, statementEndingDate, statementEndingBalanceInr, clearedBalanceInr } = req.body;
    const recId = `rec_${randomUUID()}`;
    const diff = Math.round((Number(statementEndingBalanceInr) - Number(clearedBalanceInr)) * 100);

    await db.query(`
      INSERT INTO bank_reconciliations (id, account_id, statement_ending_date, statement_ending_balance_paise, cleared_balance_paise, difference_paise, status, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
    `, [recId, accountId, statementEndingDate, Math.round(Number(statementEndingBalanceInr)*100), Math.round(Number(clearedBalanceInr)*100), diff, diff === 0 ? 'COMPLETED' : 'IN_PROGRESS']);

    res.json({
      success: true,
      message: diff === 0 ? 'Reconciliation completed to ₹0.00 difference' : 'Reconciliation saved in progress',
      differenceInr: (diff / 100).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
