import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry } from '../services/ledgerService.js';

const router = express.Router();

const toInr = (paise) => (Math.abs(Number(paise || 0)) / 100).toFixed(2);

// GET Chart of Accounts
router.get('/accounts', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM accounts
      ORDER BY code ASC
    `);

    const formatted = result.rows.map(acc => ({
      ...acc,
      balance_inr: (Number(acc.balance_paise) / 100).toFixed(2),
    }));

    res.json({ success: true, accounts: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Journal Entries
router.get('/journal-entries', async (req, res) => {
  try {
    const db = await getDb();
    const entries = await db.query(`
      SELECT je.*,
        json_agg(
          json_build_object(
            'id', jl.id,
            'account_id', jl.account_id,
            'account_name', a.name,
            'account_code', a.code,
            'debit_inr', (jl.debit_paise::numeric / 100),
            'credit_inr', (jl.credit_paise::numeric / 100),
            'description', jl.description
          )
        ) as lines
      FROM journal_entries je
      LEFT JOIN journal_lines jl ON je.id = jl.entry_id
      LEFT JOIN accounts a ON jl.account_id = a.id
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.created_at DESC
    `);

    res.json({ success: true, entries: entries.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Manual Journal Entry
router.post('/journal-entries', async (req, res) => {
  try {
    const { entryNumber, entryDate, narration, lines } = req.body;

    if (!lines || lines.length < 2) {
      return res.status(400).json({ success: false, error: 'A journal entry must contain at least 2 lines' });
    }

    const formattedLines = lines.map(l => ({
      accountId: l.accountId,
      debitPaise: Math.round(Number(l.debit || 0) * 100),
      creditPaise: Math.round(Number(l.credit || 0) * 100),
      description: l.description || '',
    }));

    const result = await postJournalEntry({
      entryNumber: entryNumber || `JE-MAN-${Date.now().toString().slice(-4)}`,
      entryDate: entryDate || new Date().toISOString().split('T')[0],
      docType: 'journal',
      narration: narration || 'Manual Journal Entry',
      lines: formattedLines,
    });

    res.json({ success: true, message: 'Journal entry posted successfully', entry: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET Profit & Loss Statement
router.get('/profit-loss', async (req, res) => {
  try {
    const db = await getDb();

    const accountsRes = await db.query(`
      SELECT code, name, type, sub_type, balance_paise
      FROM accounts
      WHERE type IN ('income', 'expense')
      ORDER BY type, code ASC
    `);

    let totalIncomePaise = 0;
    let totalExpensePaise = 0;
    const incomeItems = [];
    const expenseItems = [];

    for (const row of accountsRes.rows) {
      const paise = Number(row.balance_paise || 0);
      const item = {
        code: row.code,
        name: row.name,
        amount: toInr(paise),
        amountPaise: paise
      };

      if (row.type === 'income') {
        totalIncomePaise += paise;
        incomeItems.push(item);
      } else {
        totalExpensePaise += paise;
        expenseItems.push(item);
      }
    }

    const netProfitPaise = totalIncomePaise - totalExpensePaise;

    res.json({
      success: true,
      reportName: 'Profit and Loss',
      currency: 'INR (₹)',
      income: {
        items: incomeItems,
        total: toInr(totalIncomePaise)
      },
      expenses: {
        items: expenseItems,
        total: toInr(totalExpensePaise)
      },
      netProfit: {
        amount: toInr(netProfitPaise),
        isPositive: netProfitPaise >= 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Balance Sheet Statement
router.get('/balance-sheet', async (req, res) => {
  try {
    const db = await getDb();

    const accountsRes = await db.query(`
      SELECT code, name, type, sub_type, balance_paise
      FROM accounts
      WHERE type IN ('asset', 'liability', 'equity')
      ORDER BY type, code ASC
    `);

    let totalAssetsPaise = 0;
    let totalLiabilitiesPaise = 0;
    let totalEquityPaise = 0;

    const assets = [];
    const liabilities = [];
    const equity = [];

    for (const row of accountsRes.rows) {
      const paise = Number(row.balance_paise || 0);
      const item = {
        code: row.code,
        name: row.name,
        amount: toInr(paise),
        subType: row.sub_type
      };

      if (row.type === 'asset') {
        totalAssetsPaise += paise;
        assets.push(item);
      } else if (row.type === 'liability') {
        totalLiabilitiesPaise += paise;
        liabilities.push(item);
      } else if (row.type === 'equity') {
        totalEquityPaise += paise;
        equity.push(item);
      }
    }

    res.json({
      success: true,
      reportName: 'Balance Sheet',
      currency: 'INR (₹)',
      assets: { items: assets, total: toInr(totalAssetsPaise) },
      liabilities: { items: liabilities, total: toInr(totalLiabilitiesPaise) },
      equity: { items: equity, total: toInr(totalEquityPaise) },
      totalLiabilitiesAndEquity: toInr(totalLiabilitiesPaise + totalEquityPaise)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
