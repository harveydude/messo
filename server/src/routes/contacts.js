import express from 'express';
import { getDb } from '../db/db.js';
import { toInr, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET contacts (supports ?type=CUSTOMER,LEAD or ?type=VENDOR)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { type } = req.query;

    let query = 'SELECT * FROM contacts WHERE is_active = TRUE';
    const params = [];

    if (type) {
      const types = type.split(',').map(t => t.trim().toUpperCase());
      query += ` AND type = ANY($1)`;
      params.push(types);
    }

    query += ' ORDER BY display_name ASC';

    const result = await db.query(query, params);
    const formatted = result.rows.map(c => ({
      ...c,
      opening_balance_inr: toInr(c.opening_balance_paise),
    }));

    res.json({ success: true, contacts: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single contact
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create contact
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const {
      type = 'CUSTOMER',
      displayName,
      firstName = '',
      lastName = '',
      companyName = '',
      email = '',
      phone = '',
      billingAddress = '',
      gstin = '',
      pan = '',
      paymentTerms = 'Net 30',
      openingBalanceInr = 0,
      notes = ''
    } = req.body;

    if (!displayName) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }

    const contactId = `cont_${randomUUID()}`;
    const openingBalancePaise = Math.round(Number(openingBalanceInr) * 100);

    await db.query(`
      INSERT INTO contacts (id, type, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, pan, payment_terms, opening_balance_paise, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [contactId, type.toUpperCase(), displayName, firstName, lastName, companyName, email, phone, billingAddress, gstin, pan, paymentTerms, openingBalancePaise, notes]);

    // Backwards compatibility with customers or vendors tables
    if (type.toUpperCase() === 'VENDOR') {
      await db.query(`
        INSERT INTO vendors (id, display_name, company_name, email, phone, address, gstin, open_balance_paise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [contactId, displayName, companyName, email, phone, billingAddress, gstin, openingBalancePaise]);
    } else {
      await db.query(`
        INSERT INTO customers (id, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, terms)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [contactId, displayName, firstName, lastName, companyName, email, phone, billingAddress, gstin, paymentTerms]);
    }

    await logAudit({
      action: 'CREATE',
      entityType: 'CONTACT',
      entityId: contactId,
      after: { displayName, type, email, phone },
    });

    res.json({
      success: true,
      message: `${type} created successfully`,
      contact: { id: contactId, displayName, type, email, phone }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
