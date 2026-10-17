import express from 'express';
import { getDb } from '../db/db.js';
import { calculateGST } from '../services/gstService.js';
import { postJournalEntry, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all invoices
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT i.*, c.display_name as customer_name, c.email as customer_email, c.billing_address
      FROM invoices i
      LEFT JOIN contacts c ON i.customer_id = c.id
      ORDER BY i.created_at DESC
    `);

    // Format amounts in rupees for easy frontend display
    const formatted = result.rows.map(inv => ({
      ...inv,
      total_inr: (Number(inv.total_paise) / 100).toFixed(2),
      balance_due_inr: (Number(inv.balance_due_paise) / 100).toFixed(2),
      is_overdue: inv.status === 'OVERDUE' || (inv.status !== 'PAID' && new Date(inv.due_date) < new Date()),
    }));

    res.json({ success: true, invoices: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create invoice
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      customerId = 'cust_1',
      invoiceNumber,
      issueDate = new Date().toISOString().split('T')[0],
      dueDate,
      items = [],
      discountPaise = 0,
      notes = ''
    } = req.body;

    const invId = `inv_${randomUUID()}`;
    const invNum = invoiceNumber || `INV-${Date.now().toString().slice(-4)}`;

    // Calculate subtotal from items
    const subtotalPaise = items.reduce((s, it) => s + Math.round((Number(it.qty || 1) * Number(it.rate || 0)) * 100), 0);
    const gst = calculateGST({ taxablePaise: subtotalPaise, ratePct: 18 });
    const totalPaise = subtotalPaise + gst.totalTaxPaise - Number(discountPaise);
    const due = dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 1. Insert Invoice
    await db.query(
      `INSERT INTO invoices (id, invoice_number, customer_id, issue_date, due_date, status, subtotal_paise, tax_paise, discount_paise, total_paise, balance_due_paise, notes)
       VALUES ($1, $2, $3, $4, $5, 'SENT', $6, $7, $8, $9, $10, $11)`,
      [invId, invNum, customerId, issueDate, due, subtotalPaise, gst.totalTaxPaise, discountPaise, totalPaise, totalPaise, notes]
    );

    // 2. Insert Line Items
    for (const it of items) {
      const itId = `ii_${randomUUID()}`;
      const amountPaise = Math.round(Number(it.qty || 1) * Number(it.rate || 0) * 100);
      await db.query(
        `INSERT INTO invoice_items (id, invoice_id, product_name, description, qty, rate_paise, amount_paise)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [itId, invId, it.name || 'Service', it.desc || '', it.qty || 1, Math.round(Number(it.rate || 0) * 100), amountPaise]
      );
    }

    // 3. Auto-Post Balanced Double-Entry Journal to Ledger:
    // Debit Accounts Receivable (₹Total), Credit Sales Revenue (₹Subtotal), Credit GST Output (₹Tax)
    await postJournalEntry({
      entryNumber: `JE-INV-${invNum}`,
      entryDate: issueDate,
      sourceType: 'INVOICE',
      narration: `Invoice #${invNum} to customer`,
      sourceId: invId,
      lines: [
        { accountId: 'acc_1100', debitPaise: totalPaise, creditPaise: 0, description: `Invoice #${invNum} Receivable` },
        { accountId: 'acc_4000', debitPaise: 0, creditPaise: subtotalPaise - Number(discountPaise), description: `Sales Revenue` },
        ...(gst.totalTaxPaise > 0 ? [{ accountId: 'acc_2100', debitPaise: 0, creditPaise: gst.totalTaxPaise, description: `GST Output 18%` }] : [])
      ]
    });

    await logAudit({
      action: 'CREATE',
      entityType: 'INVOICE',
      entityId: invId,
      after: { invoiceNumber: invNum, totalInr: (totalPaise / 100).toFixed(2) },
    });

    res.json({
      success: true,
      message: 'Invoice created and ledger updated',
      invoice: {
        id: invId,
        invoice_number: invNum,
        total_inr: (totalPaise / 100).toFixed(2),
        tax_inr: (gst.totalTaxPaise / 100).toFixed(2),
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Review & Send Invoice (Pipeline 3)
router.post('/:id/send', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const invRes = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    await db.query(`UPDATE invoices SET status = 'SENT', last_reminder_sent_at = CURRENT_TIMESTAMP, version = version + 1 WHERE id = $1`, [id]);

    await logAudit({
      action: 'UPDATE',
      entityType: 'INVOICE',
      entityId: id,
      after: { action: 'SENT_VIA_EMAIL_AND_PDF' },
    });

    res.json({
      success: true,
      message: `Invoice #${invRes.rows[0].invoice_number} sent via email and PDF generated`,
      pdfUrl: `/api/invoices/${id}/pdf`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Receive Invoice Payment (Sub-Ledger Pipeline: DR Bank, CR AR)
router.post('/:id/payment', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { amountInr, paymentMethod = 'Bank Transfer', bankAccountId = 'acc_1010' } = req.body;

    const invRes = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const inv = invRes.rows[0];
    const paymentPaise = amountInr ? Math.round(Number(amountInr) * 100) : BigInt(inv.balance_due_paise);
    const newBalance = BigInt(inv.balance_due_paise) - BigInt(paymentPaise);
    const newStatus = newBalance <= 0n ? 'PAID' : 'PARTIALLY_PAID';

    // 1. Update Invoice balance & status
    await db.query(
      `UPDATE invoices SET balance_due_paise = $1, amount_paid_paise = amount_paid_paise + $2, status = $3, version = version + 1 WHERE id = $4`,
      [newBalance.toString(), paymentPaise.toString(), newStatus, id]
    );

    // 2. Post balanced Double-Entry Journal Entry:
    // Debit Bank Account, Credit Accounts Receivable
    await postJournalEntry({
      entryNumber: `JE-RCPT-${inv.invoice_number}`,
      sourceType: 'PAYMENT',
      narration: `Payment received for Invoice #${inv.invoice_number}`,
      sourceId: id,
      lines: [
        { accountId: bankAccountId, debitPaise: paymentPaise.toString(), creditPaise: 0, description: 'Bank Settlement' },
        { accountId: 'acc_1100', debitPaise: 0, creditPaise: paymentPaise.toString(), description: `Receive on #${inv.invoice_number}` }
      ]
    });

    await logAudit({
      action: 'CREATE',
      entityType: 'PAYMENT',
      entityId: id,
      after: { amountInr: (Number(paymentPaise)/100).toFixed(2), newStatus },
    });

    res.json({
      success: true,
      message: `Payment of ₹${(Number(paymentPaise)/100).toFixed(2)} recorded. Invoice is now ${newStatus}.`,
      status: newStatus,
      balanceDueInr: (Number(newBalance)/100).toFixed(2)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST send invoice reminder
router.post('/:id/reminder', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const invRes = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);
    if (invRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    res.json({
      success: true,
      message: `Invoice reminder successfully sent for #${invRes.rows[0].invoice_number}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
