/**
 * Meso Phase 37: Batch/Serial Tracking, Reorder Alerts & Stock Adjustments
 * Supports expiration management, serial number lifecycle, reorder triggers, and physical count reconciliation.
 */

import { getDb } from '../db/db.js';

/**
 * Register a new batch/lot for an inventory item
 */
export async function createBatch({
  companyId = 'comp_1',
  productId,
  batchNumber,
  mfgDate = null,
  expiryDate = null,
  quantity,
  unitCostPaise = 0
}) {
  const db = await getDb();
  const qty = parseFloat(quantity);
  const cost = parseInt(unitCostPaise, 10);

  const res = await db.query(
    `INSERT INTO inventory_batches 
     (company_id, product_id, batch_number, mfg_date, expiry_date, initial_quantity, current_quantity, unit_cost_paise)
     VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
     ON CONFLICT (company_id, product_id, batch_number) 
     DO UPDATE SET current_quantity = inventory_batches.current_quantity + EXCLUDED.current_quantity
     RETURNING *`,
    [companyId, productId, batchNumber, mfgDate, expiryDate, qty, cost]
  );

  return res.rows[0];
}

/**
 * Register serialized items into stock
 */
export async function registerSerialNumbers({
  companyId = 'comp_1',
  productId,
  batchId = null,
  serialNumbers = [],
  purchaseDocId = null
}) {
  const db = await getDb();
  const inserted = [];

  for (const sn of serialNumbers) {
    const res = await db.query(
      `INSERT INTO inventory_serials 
       (company_id, product_id, batch_id, serial_number, status, purchase_doc_id)
       VALUES ($1, $2, $3, $4, 'IN_STOCK', $5)
       ON CONFLICT (company_id, product_id, serial_number) 
       DO UPDATE SET status = 'IN_STOCK'
       RETURNING *`,
      [companyId, productId, batchId, sn.trim(), purchaseDocId]
    );
    inserted.push(res.rows[0]);
  }

  return inserted;
}

/**
 * Update serial status upon sale or return
 */
export async function updateSerialStatus({
  companyId = 'comp_1',
  productId,
  serialNumber,
  newStatus,
  salesDocId = null
}) {
  const db = await getDb();
  const res = await db.query(
    `UPDATE inventory_serials 
     SET status = $1, sales_doc_id = COALESCE($2, sales_doc_id)
     WHERE company_id = $3 AND product_id = $4 AND serial_number = $5
     RETURNING *`,
    [newStatus, salesDocId, companyId, productId, serialNumber]
  );
  return res.rows[0];
}

/**
 * Check products approaching or breaching reorder points
 */
export async function checkReorderAlerts(companyId = 'comp_1') {
  const db = await getDb();
  const res = await db.query(
    `SELECT 
       p.id, p.name, p.sku, p.quantity_on_hand, p.reorder_point, p.preferred_vendor_id,
       c.display_name AS vendor_name,
       (p.reorder_point - p.quantity_on_hand) AS shortage_qty
     FROM products_and_services p
     LEFT JOIN contacts c ON p.preferred_vendor_id = c.id
     WHERE p.company_id = $1 
       AND p.type = 'INVENTORY' 
       AND p.is_active = TRUE
       AND COALESCE(p.quantity_on_hand, 0) <= COALESCE(p.reorder_point, 10)
     ORDER BY (p.reorder_point - p.quantity_on_hand) DESC`,
    [companyId]
  );
  return res.rows;
}

/**
 * Check batches approaching expiry date
 */
export async function checkExpiringBatches(companyId = 'comp_1', daysNotice = 30) {
  const db = await getDb();
  const res = await db.query(
    `SELECT 
       b.*, p.name AS product_name,
       (b.expiry_date - CURRENT_DATE) AS days_until_expiry
     FROM inventory_batches b
     JOIN products_and_services p ON b.product_id = p.id
     WHERE b.company_id = $1 
       AND b.current_quantity > 0
       AND b.expiry_date IS NOT NULL
       AND b.expiry_date <= (CURRENT_DATE + ($2 || ' days')::INTERVAL)
     ORDER BY b.expiry_date ASC`,
    [companyId, daysNotice]
  );
  return res.rows;
}

/**
 * Perform a physical stock count adjustment with balanced double-entry accounting
 */
export async function performStockAdjustment({
  companyId = 'comp_1',
  adjustmentNumber,
  adjustmentDate = new Date().toISOString().split('T')[0],
  reason = 'SHRINKAGE',
  notes = '',
  items = [] // array of { productId, countedQuantity }
}) {
  const db = await getDb();
  let totalVariancePaise = 0;
  const processedItems = [];

  const adjRes = await db.query(
    `INSERT INTO stock_adjustments 
     (company_id, adjustment_number, adjustment_date, reason, status, notes)
     VALUES ($1, $2, $3, $4, 'POSTED', $5)
     RETURNING *`,
    [companyId, adjustmentNumber, adjustmentDate, reason, notes]
  );
  const adjustment = adjRes.rows[0];

  for (const item of items) {
    // Get current system stock and purchase cost
    const prodRes = await db.query(
      `SELECT quantity_on_hand, purchase_cost_paise FROM products_and_services WHERE id = $1 AND company_id = $2`,
      [item.productId, companyId]
    );

    const systemQty = parseFloat(prodRes.rows[0]?.quantity_on_hand || 0);
    const countedQty = parseFloat(item.countedQuantity);
    const varianceQty = countedQty - systemQty;
    const unitCost = parseInt(prodRes.rows[0]?.purchase_cost_paise || 0, 10);
    const itemVariancePaise = Math.round(varianceQty * unitCost);

    totalVariancePaise += itemVariancePaise;

    await db.query(
      `INSERT INTO stock_adjustment_items 
       (adjustment_id, product_id, system_quantity, counted_quantity, variance_quantity, unit_cost_paise, variance_cost_paise)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adjustment.id, item.productId, systemQty, countedQty, varianceQty, unitCost, itemVariancePaise]
    );

    // Update catalog quantity to matched physical count
    await db.query(
      `UPDATE products_and_services 
       SET quantity_on_hand = $1
       WHERE id = $2 AND company_id = $3`,
      [countedQty, item.productId, companyId]
    );

    // Record valuation layer adjustment
    if (varianceQty !== 0) {
      await db.query(
        `INSERT INTO inventory_valuation_layers 
         (company_id, product_id, layer_date, layer_type, source_doc_type, source_doc_id, quantity_in, quantity_out, quantity_remaining, unit_cost_paise, total_cost_paise)
         VALUES ($1, $2, $3, 'ADJUSTMENT', 'STOCK_ADJ', $4, $5, $6, $5, $7, $8)`,
        [companyId, item.productId, adjustmentDate, adjustment.id, 
         varianceQty > 0 ? varianceQty : 0, 
         varianceQty < 0 ? Math.abs(varianceQty) : 0, 
         unitCost, Math.abs(itemVariancePaise)]
      );
    }

    processedItems.push({
      productId: item.productId,
      systemQty,
      countedQty,
      varianceQty,
      varianceCostPaise: itemVariancePaise
    });
  }

  // Update total adjustment variance
  await db.query(
    `UPDATE stock_adjustments SET total_variance_paise = $1 WHERE id = $2`,
    [totalVariancePaise, adjustment.id]
  );

  // Generate balanced Double-Entry General Ledger journal entry
  // If variance is negative (shrinkage/damage): Debit Expense (Shrinkage), Credit Asset (Inventory)
  // If variance is positive (surplus): Debit Asset (Inventory), Credit Inventory Adjustment Gain
  const jeId = 'je_adj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  const entryNumber = 'JE-ADJ-' + Date.now();
  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'STOCK_ADJUSTMENT', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, adjustmentDate, `Stock Adjustment ${adjustmentNumber} (${reason})`, adjustment.id]
  );

  const absVal = Math.abs(totalVariancePaise);
  const l1Id = 'jel_' + Date.now() + '_1';
  const l2Id = 'jel_' + Date.now() + '_2';

  if (totalVariancePaise < 0) {
    // Shrinkage loss
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_inventory_shrinkage', $3, 0, 'Inventory loss / shrinkage write-down'),
              ($4, $2, 'acc_inventory_asset', 0, $3, 'Inventory asset downward revaluation')`,
      [l1Id, jeId, absVal, l2Id]
    );
  } else if (totalVariancePaise > 0) {
    // Surplus gain
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_inventory_asset', $3, 0, 'Inventory asset upward adjustment'),
              ($4, $2, 'acc_inventory_adjustment_gain', 0, $3, 'Physical inventory surplus gain')`,
      [l1Id, jeId, absVal, l2Id]
    );
  }

  await db.query(`UPDATE stock_adjustments SET journal_entry_id = $1 WHERE id = $2`, [jeId, adjustment.id]);

  return {
    adjustmentId: adjustment.id,
    adjustmentNumber,
    totalVariancePaise,
    journalEntryId: jeId,
    items: processedItems
  };
}
