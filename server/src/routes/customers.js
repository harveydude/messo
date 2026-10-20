import express from 'express';
import { getDb } from '../db/db.js';
import { handleApiError } from '../utils/errorHelper.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all customers with tenant isolation
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query(`
      SELECT c.*,
        COALESCE(SUM(i.balance_due_paise), 0) as open_balance_paise
      FROM customers c
      LEFT JOIN invoices i ON c.id = i.customer_id AND i.status != 'PAID' AND i.company_id = $1
      WHERE c.company_id = $1
      GROUP BY c.id
      ORDER BY c.display_name ASC
    `, [companyId]);

    const formatted = result.rows.map(c => ({
      ...c,
      open_balance_inr: (Number(c.open_balance_paise || 0) / 100).toFixed(2),
    }));

    res.json({ success: true, customers: formatted });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch customers.');
  }
});

// GET single customer by ID
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query('SELECT * FROM customers WHERE id = $1 AND company_id = $2', [req.params.id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch customer.');
  }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const {
      displayName,
      firstName = '',
      lastName = '',
      companyName = '',
      email = '',
      phone = '',
      billingAddress = '',
      gstin = '',
      pan = '',
      terms = 'Net 30'
    } = req.body;

    if (!displayName) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }

    const customerId = `cust_${randomUUID()}`;

    await db.query(
      `INSERT INTO customers (id, company_id, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, pan, terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [customerId, companyId, displayName, firstName, lastName, companyName, email, phone, billingAddress, gstin, pan, terms]
    );

    res.json({
      success: true,
      message: 'Customer created successfully',
      customer: { id: customerId, display_name: displayName, email, phone }
    });
  } catch (err) {
    handleApiError(res, err, 'Failed to create customer.');
  }
});

export default router;
