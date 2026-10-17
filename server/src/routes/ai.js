import express from 'express';
import { getDb } from '../db/db.js';
import { parseReceiptOCR, generateInvoiceReminderEmail } from '../services/aiService.js';

const router = express.Router();

// GET Business Feed (Intuit Assist)
router.get('/business-feed', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM ai_business_feed_items
      WHERE status != 'DISMISSED'
      ORDER BY created_at DESC
    `);
    res.json({ success: true, items: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Business Feed Action
router.post('/business-feed/:id/action', async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const { action = 'DISMISS' } = req.body;

    await db.query(`UPDATE ai_business_feed_items SET status = $1 WHERE id = $2`, [
      action === 'DISMISS' ? 'DISMISSED' : 'COMPLETED',
      id
    ]);

    res.json({ success: true, message: `Feed item ${id} marked as ${action}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST AI Parse Receipt OCR (Pipeline 2)
router.post('/parse-receipt', async (req, res) => {
  try {
    const { filename, fileContent } = req.body;
    const extracted = await parseReceiptOCR({ filename, fileContent });
    res.json({ success: true, extracted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST AI Overdue Reminder (Pipeline 3)
router.post('/invoice-reminder', async (req, res) => {
  try {
    const { invoiceId, severityLevel = 'GENTLE' } = req.body;
    const reminder = await generateInvoiceReminderEmail({ invoiceId, severityLevel });

    // Update invoice record
    const db = await getDb();
    await db.query(`
      UPDATE invoices
      SET last_reminder_sent_at = CURRENT_TIMESTAMP, reminder_severity_level = $1
      WHERE id = $2
    `, [severityLevel, invoiceId]);

    res.json({ success: true, message: 'AI reminder generated and sent', reminder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST AI Help Chat
router.post('/help-chat', async (req, res) => {
  try {
    const { message = '' } = req.body;
    const lower = message.toLowerCase();
    let reply = "I'm Meso Assist, your continuous accounting assistant. How can I help you reconcile your books today?";

    if (lower.includes('invoice') || lower.includes('bill')) {
      reply = "To create an invoice, click '+ Create' -> 'Invoice', or press 'Alt + I'. You can also import CSV/PDF statements directly into books.";
    } else if (lower.includes('gst') || lower.includes('tax')) {
      reply = "Meso continuously computes CGST, SGST, and IGST at 18% (Standard) or 12%/5% on every invoice and expense line item.";
    } else if (lower.includes('reconcile') || lower.includes('bank')) {
      reply = "To reconcile your bank account, go to Accounting -> Reconcile. We automatically match bank transactions within ₹0.00 difference.";
    }

    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
