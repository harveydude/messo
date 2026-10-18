/**
 * Meso Phase 36: Continuous Inventory Valuation Engine (FIFO & Weighted Average)
 * Automatically recalculates COGS and closing stock value even with backdated transactions.
 * All math performed in integer minor units (paise) with strict decimal tracking.
 */

import { getDb } from '../db/db.js';

export const VALUATION_METHODS = {
  FIFO: 'FIFO',
  WEIGHTED_AVERAGE: 'WEIGHTED_AVERAGE'
};

/**
 * Record an incoming inventory receipt (Purchase Bill, Return In, or Assembly Build)
 */
export async function recordInventoryReceipt({
  companyId = 'comp_1',
  productId,
  quantity,
  unitCostPaise,
  sourceDocType = 'BILL',
  sourceDocId = null,
  layerDate = new Date().toISOString().split('T')[0]
}) {
  const db = await getDb();
  const qty = parseFloat(quantity);
  const cost = parseInt(unitCostPaise, 10);
  const totalCost = Math.round(qty * cost);

  const res = await db.query(
    `INSERT INTO inventory_valuation_layers 
     (company_id, product_id, layer_date, layer_type, source_doc_type, source_doc_id, quantity_in, quantity_out, quantity_remaining, unit_cost_paise, total_cost_paise)
     VALUES ($1, $2, $3, 'PURCHASE', $4, $5, $6, 0, $6, $7, $8)
     RETURNING *`,
    [companyId, productId, layerDate, sourceDocType, sourceDocId, qty, cost, totalCost]
  );

  // Update product quantity on hand and purchase cost in products_and_services
  await db.query(
    `UPDATE products_and_services 
     SET quantity_on_hand = COALESCE(quantity_on_hand, 0) + $1,
         purchase_cost_paise = $2
     WHERE id = $3 AND company_id = $4`,
    [qty, cost, productId, companyId]
  );

  return res.rows[0];
}

/**
 * Record an outgoing inventory issue (Sales Invoice, Assembly Out, or Spoilage)
 * Depletes FIFO valuation layers and calculates exact Cost of Goods Sold (COGS) in paise.
 */
export async function recordInventoryIssue({
  companyId = 'comp_1',
  productId,
  quantity,
  sourceDocType = 'INVOICE',
  sourceDocId = null,
  layerDate = new Date().toISOString().split('T')[0],
  method = VALUATION_METHODS.FIFO
}) {
  const db = await getDb();
  let remainingToIssue = parseFloat(quantity);
  let totalCogsPaise = 0;
  const layersDepleted = [];

  if (method === VALUATION_METHODS.WEIGHTED_AVERAGE) {
    // Weighted Average Valuation
    const summary = await getInventoryValuationSummary(companyId, productId);
    const avgCostPaise = summary.totalQuantity > 0 
      ? Math.round(summary.totalValuePaise / summary.totalQuantity)
      : 0;

    totalCogsPaise = Math.round(remainingToIssue * avgCostPaise);

    await db.query(
      `INSERT INTO inventory_valuation_layers 
       (company_id, product_id, layer_date, layer_type, source_doc_type, source_doc_id, quantity_in, quantity_out, quantity_remaining, unit_cost_paise, total_cost_paise)
       VALUES ($1, $2, $3, 'SALE', $4, $5, 0, $6, 0, $7, $8)`,
      [companyId, productId, layerDate, sourceDocType, sourceDocId, remainingToIssue, avgCostPaise, totalCogsPaise]
    );

    layersDepleted.push({
      method: 'WEIGHTED_AVERAGE',
      quantityIssued: remainingToIssue,
      unitCostPaise: avgCostPaise,
      cogsPaise: totalCogsPaise
    });
  } else {
    // FIFO Valuation: iterate over unconsumed receipt layers in chronological order
    const availableLayers = await db.query(
      `SELECT * FROM inventory_valuation_layers 
       WHERE company_id = $1 AND product_id = $2 AND quantity_remaining > 0
       ORDER BY layer_date ASC, created_at ASC`,
      [companyId, productId]
    );

    for (const layer of availableLayers.rows) {
      if (remainingToIssue <= 0) break;

      const layerRem = parseFloat(layer.quantity_remaining);
      const consumeQty = Math.min(layerRem, remainingToIssue);
      const layerCogs = Math.round(consumeQty * parseInt(layer.unit_cost_paise, 10));

      const newRemaining = layerRem - consumeQty;
      await db.query(
        `UPDATE inventory_valuation_layers 
         SET quantity_remaining = $1 
         WHERE id = $2`,
        [newRemaining, layer.id]
      );

      totalCogsPaise += layerCogs;
      remainingToIssue -= consumeQty;

      layersDepleted.push({
        layerId: layer.id,
        quantityConsumed: consumeQty,
        unitCostPaise: parseInt(layer.unit_cost_paise, 10),
        cogsPaise: layerCogs
      });
    }

    // Log the sale consumption row
    await db.query(
      `INSERT INTO inventory_valuation_layers 
       (company_id, product_id, layer_date, layer_type, source_doc_type, source_doc_id, quantity_in, quantity_out, quantity_remaining, unit_cost_paise, total_cost_paise)
       VALUES ($1, $2, $3, 'SALE', $4, $5, 0, $6, 0, $7, $8)`,
      [companyId, productId, layerDate, sourceDocType, sourceDocId, parseFloat(quantity), 
       parseFloat(quantity) > 0 ? Math.round(totalCogsPaise / parseFloat(quantity)) : 0, totalCogsPaise]
    );
  }

  // Update physical quantity on hand in catalog
  await db.query(
    `UPDATE products_and_services 
     SET quantity_on_hand = GREATEST(0, COALESCE(quantity_on_hand, 0) - $1)
     WHERE id = $2 AND company_id = $3`,
    [parseFloat(quantity), productId, companyId]
  );

  return {
    productId,
    quantityIssued: parseFloat(quantity),
    totalCogsPaise,
    method,
    layersDepleted
  };
}

/**
 * Recalculate inventory layers from a given backdate forward.
 * Called when a historical purchase bill or return is modified or inserted.
 */
export async function recalculateValuationFromDate(companyId, productId, fromDate) {
  const db = await getDb();

  // Reset remaining quantities on all receipts for this product
  await db.query(
    `UPDATE inventory_valuation_layers 
     SET quantity_remaining = quantity_in 
     WHERE company_id = $1 AND product_id = $2 AND quantity_in > 0`,
    [companyId, productId]
  );

  // Re-run chronological depletion for all sales
  const allSales = await db.query(
    `SELECT * FROM inventory_valuation_layers 
     WHERE company_id = $1 AND product_id = $2 AND quantity_out > 0
     ORDER BY layer_date ASC, created_at ASC`,
    [companyId, productId]
  );

  let cumulativeCogsPaise = 0;

  for (const sale of allSales.rows) {
    let unallocated = parseFloat(sale.quantity_out);
    let saleCogs = 0;

    const availableLayers = await db.query(
      `SELECT * FROM inventory_valuation_layers 
       WHERE company_id = $1 AND product_id = $2 AND quantity_remaining > 0
       ORDER BY layer_date ASC, created_at ASC`,
      [companyId, productId]
    );

    for (const rLayer of availableLayers.rows) {
      if (unallocated <= 0) break;
      const rRem = parseFloat(rLayer.quantity_remaining);
      const take = Math.min(rRem, unallocated);
      const cost = Math.round(take * parseInt(rLayer.unit_cost_paise, 10));

      await db.query(
        `UPDATE inventory_valuation_layers SET quantity_remaining = $1 WHERE id = $2`,
        [rRem - take, rLayer.id]
      );

      saleCogs += cost;
      unallocated -= take;
    }

    await db.query(
      `UPDATE inventory_valuation_layers 
       SET total_cost_paise = $1, unit_cost_paise = $2 
       WHERE id = $3`,
      [saleCogs, parseFloat(sale.quantity_out) > 0 ? Math.round(saleCogs / parseFloat(sale.quantity_out)) : 0, sale.id]
    );

    cumulativeCogsPaise += saleCogs;
  }

  const summary = await getInventoryValuationSummary(companyId, productId);

  return {
    recalculated: true,
    cumulativeCogsPaise,
    currentStock: summary.totalQuantity,
    closingValuePaise: summary.totalValuePaise
  };
}

/**
 * Get comprehensive inventory valuation summary for an item
 */
export async function getInventoryValuationSummary(companyId = 'comp_1', productId) {
  const db = await getDb();

  const res = await db.query(
    `SELECT 
       COALESCE(SUM(quantity_remaining), 0) AS total_quantity,
       COALESCE(SUM(quantity_remaining * unit_cost_paise), 0) AS total_value_paise
     FROM inventory_valuation_layers 
     WHERE company_id = $1 AND product_id = $2 AND quantity_remaining > 0`,
    [companyId, productId]
  );

  const totalQty = parseFloat(res.rows[0]?.total_quantity || 0);
  const totalVal = Math.round(parseFloat(res.rows[0]?.total_value_paise || 0));
  const avgCostPaise = totalQty > 0 ? Math.round(totalVal / totalQty) : 0;

  return {
    productId,
    totalQuantity: totalQty,
    totalValuePaise: totalVal,
    averageCostPaise: avgCostPaise
  };
}
