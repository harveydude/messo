import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry, toInr, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all expenses and bills
const getExpensesAndBills = async (req, res) => {
  try {
    const db = await getDb();
    const expRes = await db.query(`
      SELECT
        id,
        expense_number as number,
        payee_name as payee,
        payment_date as date,
        total_paise,
        category,
        memo,
        'EXPENSE' as record_type,
        'PAID' as status
      FROM expenses
    `);

    const billRes = await db.query(`
      SELECT
        b.id,
        b.bill_number as number,
        v.display_name as payee,
        b.bill_date as date,
        b.due_date,
        b.amount_paise as total_paise,
        'Job Materials & Supplies' as category,
        b.notes as memo,
        'BILL' as record_type,
        b.status
      FROM bills b
      LEFT JOIN contacts v ON b.vendor_id = v.id
    `);

    const combined = [
      ...expRes.rows.map(e => ({ ...e, amount_inr: toInr(e.total_paise) })),
      ...billRes.rows.map(b => ({ ...b, amount_inr: toInr(b.total_paise) }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, items: combined, expenses: combined });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/', getExpensesAndBills);
router.get('/expenses-bills', getExpensesAndBills);

// POST create Expense or Bill
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      recordType = 'EXPENSE', // 'EXPENSE' or 'BILL'
      payeeName,
      vendorId = 'vend_1',
      paymentDate = new Date().toISOString().split('T')[0],
      dueDate,
      paymentAccountId = 'acc_1010', // Checking
      refNo = '',
      memo = '',
      lines = [],
      totalInr
    } = req.body;

    if (!payeeName && !vendorId) {
      return res.status(400).json({ success: false, error: 'Payee or Vendor is required' });
    }

    let totalPaise = 0;
    if (lines && lines.length > 0) {
      totalPaise = lines.reduce((acc, l) => acc + Math.round(Number(l.amount || 0) * 100), 0);
    } else if (totalInr) {
      totalPaise = Math.round(Number(totalInr) * 100);
    }

    const primaryCategory = (lines && lines[0]?.category) || 'Office Supplies & Software';
    const expenseAccountId = primaryCategory.toLowerCase().includes('legal') || primaryCategory.toLowerCase().includes('bookkeep')
      ? 'acc_6010'
      : primaryCategory.toLowerCase().includes('fuel') || primaryCategory.toLowerCase().includes('auto')
      ? 'acc_6000'
      : primaryCategory.toLowerCase().includes('material') || primaryCategory.toLowerCase().includes('hardware')
      ? 'acc_5000'
      : 'acc_6020';

    if (recordType === 'BILL') {
      // 1. Create Vendor Bill (Deferred Payment -> Credit AP)
      const billId = `bill_${randomUUID()}`;
      const billNum = refNo || `BILL-${Date.now().toString().slice(-4)}`;
      const due = dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

      await db.query(`
        INSERT INTO bills (id, bill_number, vendor_id, bill_date, due_date, status, amount_paise, open_balance_paise, notes)
        VALUES ($1, $2, $3, $4, $5, 'UNPAID', $6, $7, $8)
      `, [billId, billNum, vendorId, paymentDate, due, totalPaise, totalPaise, memo]);

      // Sub-Ledger Posting: Debit Expense, Credit Accounts Payable (acc_2000)
      await postJournalEntry({
        entryNumber: `JE-BILL-${billNum}`,
        entryDate: paymentDate,
        sourceType: 'BILL',
        narration: `Vendor bill #${billNum} from ${payeeName || 'Vendor'}`,
        sourceId: billId,
        lines: [
          { accountId: expenseAccountId, debitPaise: totalPaise, creditPaise: 0, description: `Bill: ${primaryCategory}` },
          { accountId: 'acc_2000', debitPaise: 0, creditPaise: totalPaise, description: 'Accounts Payable' }
        ]
      });

      await logAudit({ action: 'CREATE', entityType: 'BILL', entityId: billId, after: { billNum, totalInr } });
      return res.json({ success: true, message: 'Vendor Bill created and posted to AP', id: billId, billNumber: billNum });
    }

    // 2. Immediate Expense (Money left account -> Credit Bank)
    const expId = `exp_${randomUUID()}`;
    const expNum = refNo || `EXP-${Date.now().toString().slice(-4)}`;

    await db.query(`
      INSERT INTO expenses (id, expense_number, payee_name, payment_account_id, payment_date, ref_no, memo, total_paise, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [expId, expNum, payeeName || 'Vendor', paymentAccountId, paymentDate, refNo, memo, totalPaise, primaryCategory]);

    // Sub-Ledger Posting: Debit Expense, Credit Bank Checking (acc_1010)
    await postJournalEntry({
      entryNumber: `JE-EXP-${expNum}`,
      entryDate: paymentDate,
      sourceType: 'EXPENSE',
      narration: `Expense to ${payeeName} - ${memo || primaryCategory}`,
      sourceId: expId,
      lines: [
        { accountId: expenseAccountId, debitPaise: totalPaise, creditPaise: 0, description: `Expense: ${primaryCategory}` },
        { accountId: paymentAccountId, debitPaise: 0, creditPaise: totalPaise, description: 'Bank Settlement' }
      ]
    });

    await logAudit({ action: 'CREATE', entityType: 'EXPENSE', entityId: expId, after: { expNum, totalInr } });
    res.json({ success: true, message: 'Expense created and ledger balanced', id: expId, number: expNum });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Pay Bill (Settles AP: Debit Accounts Payable, Credit Bank)
router.post('/bills/:id/pay', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { bankAccountId = 'acc_1010' } = req.body;

    const billRes = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (billRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    const bill = billRes.rows[0];
    const amountPaise = BigInt(bill.open_balance_paise || bill.amount_paise);

    await db.query(`UPDATE bills SET status = 'PAID', open_balance_paise = 0 WHERE id = $1`, [id]);

    // Settle AP in General Ledger
    await postJournalEntry({
      entryNumber: `JE-PAY-${bill.bill_number}`,
      sourceType: 'BILL_PAYMENT',
      narration: `Settle Bill #${bill.bill_number}`,
      sourceId: id,
      lines: [
        { accountId: 'acc_2000', debitPaise: amountPaise.toString(), creditPaise: 0, description: `Settle Bill #${bill.bill_number}` },
        { accountId: bankAccountId, debitPaise: 0, creditPaise: amountPaise.toString(), description: 'Bank Settlement' }
      ]
    });

    await logAudit({ action: 'UPDATE', entityType: 'BILL', entityId: id, after: { status: 'PAID' } });
    res.json({ success: true, message: `Bill #${bill.bill_number} marked as paid and cleared from AP` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Schedule Bill Payment
router.post('/bills/:id/schedule-payment', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { scheduledDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] } = req.body;

    await db.query(`UPDATE bills SET status = 'SCHEDULED', scheduled_payment_date = $1 WHERE id = $2`, [scheduledDate, id]);
    res.json({ success: true, message: `Bill payment scheduled for ${scheduledDate}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
