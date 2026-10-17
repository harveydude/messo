import express from 'express';
import { getDb } from '../db/db.js';
import { logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET current company
router.get('/current', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM companies LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    res.json({ success: true, company: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET company settings
router.get('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM companies LIMIT 1');
    res.json({ success: true, settings: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update company settings
router.put('/settings', async (req, res) => {
  try {
    const db = await getDb();
    const {
      name,
      legalName,
      email,
      phone,
      accountingMethod,
      multicurrencyEnabled,
      industry,
    } = req.body;

    await db.query(`
      UPDATE companies SET
        name = COALESCE($1, name),
        legal_name = COALESCE($2, legal_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        accounting_method = COALESCE($5, accounting_method),
        multicurrency_enabled = COALESCE($6, multicurrency_enabled),
        industry = COALESCE($7, industry)
      WHERE id = 'comp_1'
    `, [name, legalName, email, phone, accountingMethod, multicurrencyEnabled, industry]);

    await logAudit({
      action: 'UPDATE',
      entityType: 'SETTING',
      entityId: 'comp_1',
      after: req.body,
    });

    const updated = await db.query('SELECT * FROM companies WHERE id = comp_1');
    res.json({ success: true, message: 'Settings saved', settings: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET users
router.get('/users', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM users ORDER BY created_at ASC');
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create user
router.post('/users', async (req, res) => {
  try {
    const db = await getDb();
    const { name, email, role = 'STANDARD' } = req.body;
    const uid = `usr_${randomUUID()}`;

    await db.query(
      `INSERT INTO users (id, company_id, name, email, role, status) VALUES ($1, 'comp_1', $2, $3, $4, 'ACTIVE')`,
      [uid, name, email, role]
    );

    res.json({ success: true, user: { id: uid, name, email, role } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
