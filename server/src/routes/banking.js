import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry, toInr, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all bank transactions (supports /feed and /transactions)
const getFeedHandler = async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM bank_transactions
      ORDER BY date DESC, created_at DESC
    `);

    const formatted = result.rows.map(tx => ({
      ...tx,
      spent_inr: tx.spent_paise ? (Number(tx.spent_paise) / 100).toFixed(2) : null,
      received_inr: tx.received_paise ? (Number(tx.received_paise) / 100).toFixed(2) : null,
    }));

    res.json({ success: true, feed: formatted, transactions: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/feed', getFeedHandler);
router.get('/transactions', getFeedHandler);

// GET connected bank accounts
router.get('/connections', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM bank_connections');
    const formatted = result.rows.map(b => ({
      ...b,
      bank_balance_inr: toInr(b.bank_balance_paise),
      in_books_balance_inr: toInr(b.in_books_balance_paise),
    }));
    res.json({ success: true, connections: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST link bank account
router.post('/link-account', async (req, res) => {
  try {
    const db = await getDb();
    const { institutionName, accountType = 'CHECKING', initialBalanceInr = 100000 } = req.body;
    const connId = `bc_${randomUUID()}`;
    const chartId = `acc_${randomUUID().slice(0, 6)}`;
    const balPaise = Math.round(Number(initialBalanceInr) * 100);

    // Create chart of account entry
    await db.query(`
      INSERT INTO chart_of_accounts (id, code, name, statement_group, account_type, sub_type, cached_balance_paise)
      VALUES ($1, $2, $3, 'BALANCE_SHEET', 'BANK', 'bank', $4)
    `, [chartId, `10${Math.floor(10 + Math.random() * 89)}`, `${institutionName} (${accountType})`, balPaise]);

    await db.query(`
      INSERT INTO bank_connections (id, chart_of_account_id, institution_name, masked_account_number, account_type, bank_balance_paise, in_books_balance_paise)
      VALUES ($1, $2, $3, '•••• 8821', $4, $5, $5)
    `, [connId, chartId, institutionName, accountType, balPaise]);

    res.json({ success: true, message: 'Bank account connected to Meso live feed', connectionId: connId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// MATCH Transaction (Pipeline 1: Links feed row to existing journal entry & clears queue)
const matchHandler = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;

    await db.query(
      `UPDATE bank_transactions SET status = 'MATCHED', action = 'Match' WHERE id = $1`,
      [id]
    );

    await logAudit({
      action: 'UPDATE',
      entityType: 'BANK_TRANSACTION',
      entityId: id,
      after: { status: 'MATCHED' },
    });

    res.json({ success: true, message: 'Bank feed transaction matched to ledger record' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/feed/:id/match', matchHandler);
router.put('/transactions/:id/match', matchHandler);
router.post('/match', (req, res) => {
  req.params.id = req.body.transactionId || req.body.id;
  return matchHandler(req, res);
});

// CATEGORIZE Transaction (Pipeline 1: Creates expense/deposit & posts balanced double-entry)
const categorizeHandler = async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { categoryAccountId = 'acc_6020' } = req.body;

    const txRes = await db.query('SELECT * FROM bank_transactions WHERE id = $1', [id]);
    if (txRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    const tx = txRes.rows[0];
    const isSpent = Number(tx.spent_paise || 0) > 0;
    const amount = isSpent ? BigInt(tx.spent_paise) : BigInt(tx.received_paise);

    // Post double-entry journal entry:
    // If spent: Debit Expense Account, Credit Bank
    // If received: Debit Bank, Credit Income Account
    if (isSpent) {
      await postJournalEntry({
        entryNumber: `JE-TX-${tx.id.slice(-6)}`,
        entryDate: tx.date,
        sourceType: 'BANK_FEED',
        narration: `Categorized bank outflow: ${tx.description}`,
        sourceId: id,
        lines: [
          { accountId: categoryAccountId, debitPaise: amount.toString(), creditPaise: 0, description: tx.description },
          { accountId: 'acc_1010', debitPaise: 0, creditPaise: amount.toString(), description: 'Bank Checking Outflow' }
        ]
      });
    } else {
      await postJournalEntry({
        entryNumber: `JE-TX-${tx.id.slice(-6)}`,
        entryDate: tx.date,
        sourceType: 'BANK_FEED',
        narration: `Categorized bank inflow: ${tx.description}`,
        sourceId: id,
        lines: [
          { accountId: 'acc_1010', debitPaise: amount.toString(), creditPaise: 0, description: 'Bank Checking Deposit' },
          { accountId: categoryAccountId || 'acc_4000', debitPaise: 0, creditPaise: amount.toString(), description: tx.description }
        ]
      });
    }

    await db.query(`UPDATE bank_transactions SET status = 'CATEGORIZED', action = 'View' WHERE id = $1`, [id]);

    res.json({ success: true, message: 'Bank feed transaction categorized and posted to General Ledger' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/feed/:id/categorize', categorizeHandler);
router.put('/transactions/:id/categorize', categorizeHandler);

export default router;
