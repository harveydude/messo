import express from 'express';
import { getDb } from '../db/db.js';
import { toInr, logAudit } from '../services/ledgerService.js';
import { handleApiError } from '../utils/errorHelper.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET contacts (supports ?type=CUSTOMER,LEAD or ?type=VENDOR) with tenant isolation
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const { type } = req.query;

    let query = 'SELECT * FROM contacts WHERE company_id = $1 AND is_active = TRUE';
    const params = [companyId];

    if (type) {
      const types = type.split(',').map(t => t.trim().toUpperCase());
      query += ` AND type = ANY($2)`;
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
    handleApiError(res, err, 'Failed to fetch contacts.');
  }
});

// GET single contact
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query('SELECT * FROM contacts WHERE id = $1 AND company_id = $2', [req.params.id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }
    res.json({ success: true, contact: result.rows[0] });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch contact.');
  }
});

// POST create contact
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
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
      INSERT INTO contacts (id, company_id, type, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, pan, payment_terms, opening_balance_paise, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [contactId, companyId, type.toUpperCase(), displayName, firstName, lastName, companyName, email, phone, billingAddress, gstin, pan, paymentTerms, openingBalancePaise, notes]);

    // Backwards compatibility with customers or vendors tables
    if (type.toUpperCase() === 'VENDOR') {
      await db.query(`
        INSERT INTO vendors (id, company_id, display_name, company_name, email, phone, address, gstin, open_balance_paise)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [contactId, companyId, displayName, companyName, email, phone, billingAddress, gstin, openingBalancePaise]);
    } else {
      await db.query(`
        INSERT INTO customers (id, company_id, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, terms)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [contactId, companyId, displayName, firstName, lastName, companyName, email, phone, billingAddress, gstin, paymentTerms]);
    }

    await logAudit({
      companyId,
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
    handleApiError(res, err, 'Failed to create contact.');
  }
});

export default router;
