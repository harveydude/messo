import express from 'express';
import { getDb } from '../db/db.js';
import { postJournalEntry } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all bills
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT b.*, v.display_name as vendor_name, v.company_name, v.email as vendor_email
      FROM bills b
      JOIN vendors v ON b.vendor_id = v.id
      ORDER BY b.due_date ASC
    `);

    const formatted = result.rows.map(b => ({
      ...b,
      amount_inr: (Number(b.amount_paise) / 100).toFixed(2),
      open_balance_inr: (Number(b.open_balance_paise) / 100).toFixed(2),
    }));

    res.json({ success: true, bills: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create bill
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      vendorId,
      billNumber,
      billDate = new Date().toISOString().split('T')[0],
      dueDate,
      amountInr,
      categoryAccountId = 'acc_5000',
      notes = ''
    } = req.body;

    if (!vendorId || !amountInr) {
      return res.status(400).json({ success: false, error: 'Vendor and amount are required' });
    }

    const billId = `bill_${randomUUID()}`;
    const billNum = billNumber || `BILL-${Date.now().toString().slice(-4)}`;
    const amountPaise = Math.round(Number(amountInr) * 100);
    const due = dueDate || billDate;

    // 1. Insert Bill
    await db.query(
      `INSERT INTO bills (id, bill_number, vendor_id, bill_date, due_date, status, amount_paise, open_balance_paise, notes)
       VALUES ($1, $2, $3, $4, $5, 'UNPAID', $6, $7, $8)`,
      [billId, billNum, vendorId, billDate, due, amountPaise, amountPaise, notes]
    );

    // 2. Update Vendor Open Balance
    await db.query(
      'UPDATE vendors SET open_balance_paise = open_balance_paise + $1 WHERE id = $2',
      [amountPaise, vendorId]
    );

    // 3. Auto-Post Journal Entry:
    // Debit Expense / Materials (categoryAccountId), Credit Accounts Payable (acc_2000)
    await postJournalEntry({
      entryNumber: `JE-BILL-${billNum}`,
      entryDate: billDate,
      docType: 'bill',
      narration: `Bill #${billNum} from vendor`,
      sourceId: billId,
      lines: [
        { accountId: categoryAccountId, debitPaise: amountPaise, creditPaise: 0, description: `Bill #${billNum} Expense` },
        { accountId: 'acc_2000', debitPaise: 0, creditPaise: amountPaise, description: `Accounts Payable` }
      ]
    });

    res.json({
      success: true,
      message: 'Bill created and ledger updated',
      bill: {
        id: billId,
        bill_number: billNum,
        amount_inr: (amountPaise / 100).toFixed(2),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST pay bill
router.post('/:id/pay', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { bankAccountId = 'acc_1010' } = req.body;

    const billRes = await db.query('SELECT * FROM bills WHERE id = $1', [id]);
    if (billRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Bill not found' });
    }

    const bill = billRes.rows[0];
    const amountPaise = BigInt(bill.open_balance_paise);

    if (amountPaise <= 0n) {
      return res.status(400).json({ success: false, error: 'Bill is already paid' });
    }

    // 1. Mark Bill as Paid
    await db.query(
      `UPDATE bills SET status = 'PAID', open_balance_paise = 0, version = version + 1 WHERE id = $1`,
      [id]
    );

    // 2. Reduce Vendor Balance
    await db.query(
      'UPDATE vendors SET open_balance_paise = GREATEST(0, open_balance_paise - $1) WHERE id = $2',
      [amountPaise.toString(), bill.vendor_id]
    );

    // 3. Post Journal:
    // Debit Accounts Payable (acc_2000), Credit Bank (bankAccountId)
    await postJournalEntry({
      entryNumber: `JE-PAY-${bill.bill_number}`,
      docType: 'payment',
      narration: `Bill payment for #${bill.bill_number}`,
      sourceId: id,
      lines: [
        { accountId: 'acc_2000', debitPaise: amountPaise.toString(), creditPaise: 0, description: `Settle Bill #${bill.bill_number}` },
        { accountId: bankAccountId, debitPaise: 0, creditPaise: amountPaise.toString(), description: `Bank Settlement` }
      ]
    });

    res.json({ success: true, message: `Bill #${bill.bill_number} marked as paid` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
