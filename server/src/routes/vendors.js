import express from 'express';
import { getDb } from '../db/db.js';
import { handleApiError } from '../utils/errorHelper.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET all vendors with tenant isolation
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query(`
      SELECT v.*,
        COALESCE(SUM(b.open_balance_paise), 0) as current_unpaid_paise
      FROM vendors v
      LEFT JOIN bills b ON v.id = b.vendor_id AND b.status != 'PAID' AND b.company_id = $1
      WHERE v.company_id = $1
      GROUP BY v.id
      ORDER BY v.display_name ASC
    `, [companyId]);

    const formatted = result.rows.map(v => ({
      ...v,
      open_balance_inr: (Number(v.open_balance_paise || 0) / 100).toFixed(2),
      current_unpaid_inr: (Number(v.current_unpaid_paise || 0) / 100).toFixed(2),
    }));

    res.json({ success: true, vendors: formatted });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch vendors.');
  }
});

// GET single vendor
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query('SELECT * FROM vendors WHERE id = $1 AND company_id = $2', [req.params.id, companyId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    res.json({ success: true, vendor: result.rows[0] });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch vendor.');
  }
});

// POST create vendor
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const {
      displayName,
      companyName = '',
      email = '',
      phone = '',
      address = '',
      gstin = '',
      pan = '',
      openBalanceInr = 0
    } = req.body;

    if (!displayName) {
      return res.status(400).json({ success: false, error: 'Display name is required' });
    }

    const vendorId = `vend_${randomUUID()}`;
    const openBalancePaise = Math.round(Number(openBalanceInr || 0) * 100);

    await db.query(
      `INSERT INTO vendors (id, company_id, display_name, company_name, email, phone, address, gstin, pan, open_balance_paise)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [vendorId, companyId, displayName, companyName, email, phone, address, gstin, pan, openBalancePaise]
    );

    res.json({
      success: true,
      message: 'Vendor created successfully',
      vendor: { id: vendorId, display_name: displayName, email, phone }
    });
  } catch (err) {
    handleApiError(res, err, 'Failed to create vendor.');
  }
});

export default router;
