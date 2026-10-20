import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { getDb } from '../db/db.js';
import { toInr, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// GET Products & Services
router.get('/products-services', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM products_and_services
      WHERE is_active = TRUE
      ORDER BY name ASC
    `);

    const formatted = result.rows.map(p => ({
      ...p,
      sales_price_inr: toInr(p.sales_price_paise),
      purchase_cost_inr: toInr(p.purchase_cost_paise),
    }));

    res.json({ success: true, items: formatted });
  } catch (err) {
    handleApiError(res, err);
  }
});

// POST create Product / Service
router.post('/products-services', async (req, res) => {
  try {
    const db = await getDb();
    const {
      name,
      sku = '',
      type = 'SERVICE',
      description = '',
      salesPriceInr = 0,
      purchaseCostInr = 0,
      quantityOnHand = 0,
      incomeAccountId = 'acc_4000',
      expenseAccountId = 'acc_5000',
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Product or Service name is required' });
    }

    const prodId = `prod_${randomUUID()}`;
    const salesPaise = Math.round(Number(salesPriceInr) * 100);
    const costPaise = Math.round(Number(purchaseCostInr) * 100);

    await db.query(`
      INSERT INTO products_and_services (id, name, sku, type, description, sales_price_paise, purchase_cost_paise, quantity_on_hand, income_account_id, expense_or_cogs_account_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [prodId, name, sku, type, description, salesPaise, costPaise, quantityOnHand, incomeAccountId, expenseAccountId]);

    await logAudit({
      action: 'CREATE',
      entityType: 'PRODUCT',
      entityId: prodId,
      after: { name, type, salesPriceInr },
    });

    res.json({ success: true, message: 'Item created in catalog', product: { id: prodId, name, type } });
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
