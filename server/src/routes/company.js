import express from 'express';
import { getDb } from '../db/db.js';
import { logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

import { updateVersioned, conflict } from '../services/versioned.js';

const router = express.Router();

// GET current company
router.get('/current', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM companies LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }
    res.json({ success: true, company: result.rows[0], id: result.rows[0].id });
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
    const companyId = req.companyId || req.header('x-company-id') || 'comp_1';
    const {
      version,
      settings,
      name,
      legalName,
      email,
      phone,
      accountingMethod,
      multicurrencyEnabled,
      industry,
    } = req.body || {};

    if (version !== undefined || settings !== undefined) {
      if (version == null) {
        return res.status(422).json({ error: { code: 'VALIDATION', message: 'version required' } });
      }
      const cur = await db.query(`SELECT settings FROM companies WHERE id=$1`, [companyId]);
      const merged = { ...(cur.rows[0]?.settings || {}), ...(settings || {}) };
      const row = await updateVersioned('companies', {
        id: companyId,
        companyId: companyId,
        expectedVersion: version,
        set: { settings: merged },
      });
      return res.json({ ok: true, success: true, version: row.__new_version, settings: row.settings });
    }

    // Legacy unversioned direct update fallback
    await db.query(`
      UPDATE companies SET
        name = COALESCE($1, name),
        legal_name = COALESCE($2, legal_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        accounting_method = COALESCE($5, accounting_method),
        multicurrency_enabled = COALESCE($6, multicurrency_enabled),
        industry = COALESCE($7, industry),
        version = version + 1
      WHERE id = $8
    `, [name, legalName, email, phone, accountingMethod, multicurrencyEnabled, industry, companyId]);

    await logAudit({
      action: 'UPDATE',
      entityType: 'SETTING',
      entityId: companyId,
      after: req.body,
    });

    const updated = await db.query('SELECT * FROM companies WHERE id = $1', [companyId]);
    res.json({ ok: true, success: true, message: 'Settings saved', settings: updated.rows[0] });
  } catch (e) {
    if (e.code === 'CONFLICT_VERSION') return conflict(res, e);
    if (e.status === 404) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    if (e.status === 422) return res.status(422).json({ error: { code: 'VALIDATION', message: e.message } });
    res.status(500).json({ success: false, error: e.message });
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
