/**
 * Meso Phase 31: Purchase Orders & 3-Way Matching Engine
 * Implements PO lifecycle, Goods Receipt Notes (GRN), and automated 3-way variance matching
 * (PO Quantity & Rate vs. GRN Received Quantity vs. Vendor Bill Invoiced Quantity & Price).
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function createPurchaseOrder({
  companyId = 'comp_1',
  vendorId,
  poNumber,
  items = [],
  terms = 'Net 30',
  notes = '',
  deliveryExpectedDate = null,
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const num = poNumber || `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let subtotalPaise = 0n;
  let taxPaise = 0n;

  for (const item of items) {
    const qty = Number(item.quantity || item.quantity_ordered || 1);
    const unitPrice = BigInt(item.unitPricePaise || item.unit_price_paise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? item.tax_rate_bp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;

    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;
  }

  const totalPaise = subtotalPaise + taxPaise;

  const poRes = await db.query(
    `INSERT INTO purchase_orders (
      company_id, po_number, vendor_id, delivery_expected_date, status,
      subtotal_paise, tax_paise, total_paise, terms, notes
    ) VALUES ($1, $2, $3, $4, 'ISSUED', $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      companyId,
      num,
      vendorId,
      deliveryExpectedDate,
      subtotalPaise.toString(),
      taxPaise.toString(),
      totalPaise.toString(),
      terms,
      notes
    ]
  );
  const po = poRes.rows[0];

  // Insert PO items
  for (const item of items) {
    const qty = Number(item.quantity || item.quantity_ordered || 1);
    const unitPrice = BigInt(item.unitPricePaise || item.unit_price_paise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? item.tax_rate_bp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;

    await db.query(
      `INSERT INTO purchase_order_items (
        po_id, product_id, description, quantity_ordered, quantity_received,
        quantity_billed, unit_price_paise, hsn_sac, tax_rate_bp, tax_amount_paise, total_amount_paise
      ) VALUES ($1, $2, $3, $4, 0, 0, $5, $6, $7, $8, $9)`,
      [
        po.id,
        item.productId || item.product_id || null,
        item.description || 'Purchase Order Item',
        qty,
        unitPrice.toString(),
        item.hsnSac || item.hsn_sac || '998314',
        Number(taxRateBp),
        lineTax.toString(),
        (lineSubtotal + lineTax).toString()
      ]
    );
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'purchase_order',
    entityId: po.id,
    action: 'CREATE',
    afterJson: { poNumber: num, totalPaise: totalPaise.toString() }
  });

  return po;
}

export async function getPurchaseOrder(poId, companyId = 'comp_1') {
  const db = await getDb();
  const poRes = await db.query(
    `SELECT po.*, c.display_name as vendor_name, c.email as vendor_email, c.gstin as vendor_gstin
     FROM purchase_orders po
     LEFT JOIN contacts c ON c.id = po.vendor_id
     WHERE po.id = $1 AND po.company_id = $2`,
    [poId, companyId]
  );
  if (poRes.rows.length === 0) return null;

  const itemsRes = await db.query(
    `SELECT * FROM purchase_order_items WHERE po_id = $1 ORDER BY id ASC`,
    [poId]
  );

  return {
    ...poRes.rows[0],
    items: itemsRes.rows || []
  };
}

export async function createGoodsReceiptNote({
  companyId = 'comp_1',
  poId,
  vendorId,
  grnNumber,
  receiptDate = new Date().toISOString().slice(0, 10),
  items = [], // [{ poItemId, productId, description, quantityReceived, quantityAccepted, quantityRejected, rejectionReason }]
  receivedBy = 'Warehouse Team',
  notes = '',
  user = { id: 'usr_1', role: 'WAREHOUSE_MANAGER' }
}) {
  const db = await getDb();
  const num = grnNumber || `GRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let hasRejections = false;
  for (const it of items) {
    if (Number(it.quantityRejected || 0) > 0) hasRejections = true;
  }
  const grnStatus = hasRejections ? 'PARTIALLY_REJECTED' : 'ACCEPTED';

  await db.query('BEGIN');
  let grn = null;

  try {
    const grnRes = await db.query(
      `INSERT INTO goods_receipt_notes (
        company_id, grn_number, po_id, vendor_id, receipt_date, received_by, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [companyId, num, poId, vendorId, receiptDate, receivedBy, grnStatus, notes]
    );
    grn = grnRes.rows[0];

    for (const it of items) {
      const qRec = Number(it.quantityReceived || 0);
      const qAcc = Number(it.quantityAccepted !== undefined ? it.quantityAccepted : qRec);
      const qRej = Number(it.quantityRejected || 0);

      await db.query(
        `INSERT INTO goods_receipt_items (
          grn_id, po_item_id, product_id, description, quantity_received, quantity_accepted, quantity_rejected, rejection_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          grn.id,
          it.poItemId || null,
          it.productId || null,
          it.description || 'Received Inventory Item',
          qRec,
          qAcc,
          qRej,
          it.rejectionReason || null
        ]
      );

      // Update PO item received quantity
      if (it.poItemId) {
        await db.query(
          `UPDATE purchase_order_items
           SET quantity_received = quantity_received + $1
           WHERE id = $2`,
          [qAcc, it.poItemId]
        );
      }
    }

    // Check if PO is completely received
    if (poId) {
      const poItemsRes = await db.query(
        `SELECT quantity_ordered, quantity_received FROM purchase_order_items WHERE po_id = $1`,
        [poId]
      );
      const poItems = poItemsRes.rows || [];
      const allFullyReceived = poItems.length > 0 && poItems.every(i => Number(i.quantity_received) >= Number(i.quantity_ordered));
      const anyReceived = poItems.some(i => Number(i.quantity_received) > 0);

      const newPoStatus = allFullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : 'ISSUED';
      await db.query(`UPDATE purchase_orders SET status = $1 WHERE id = $2`, [newPoStatus, poId]);
    }

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'goods_receipt_note',
    entityId: grn.id,
    action: 'CREATE',
    afterJson: { grnNumber: num, status: grnStatus }
  });

  return grn;
}

export async function performThreeWayMatch({
  companyId = 'comp_1',
  poId,
  grnId,
  billId,
  tolerancePercentage = 2.00,
  user = { id: 'usr_1', role: 'FINANCE_CONTROLLER' }
}) {
  const db = await getDb();

  // 1. Fetch PO details
  const po = await getPurchaseOrder(poId, companyId);
  if (!po) throw new Error(`Purchase order ${poId} not found`);

  // 2. Fetch GRN items
  const grnItemsRes = await db.query(
    `SELECT * FROM goods_receipt_items WHERE grn_id = $1`,
    [grnId]
  );
  const grnItems = grnItemsRes.rows || [];

  // 3. Fetch Bill details
  const billRes = await db.query(
    `SELECT * FROM bills WHERE id = $1 AND company_id = $2`,
    [billId, companyId]
  );
  if (billRes.rows.length === 0) throw new Error(`Vendor bill ${billId} not found`);
  const bill = billRes.rows[0];

  // Total Quantities: Ordered vs Received Accepted vs Billed
  let totalQtyOrdered = 0;
  for (const item of po.items) totalQtyOrdered += Number(item.quantity_ordered);

  let totalQtyReceived = 0;
  for (const item of grnItems) totalQtyReceived += Number(item.quantity_accepted);

  const billTotalPaise = BigInt(bill.amount_paise || 0);
  const poTotalPaise = BigInt(po.total_paise || 0);

  // Qty Variance = Billed/Received vs Ordered
  const qtyVariance = Math.abs(totalQtyOrdered - totalQtyReceived);

  // Price Variance
  const priceVariancePaise = billTotalPaise > poTotalPaise ? billTotalPaise - poTotalPaise : poTotalPaise - billTotalPaise;
  const priceVariancePct = poTotalPaise > 0n ? (Number(priceVariancePaise) / Number(poTotalPaise)) * 100 : 0;

  let matchStatus = 'PERFECT_MATCH';
  let isApproved = true;

  if (qtyVariance === 0 && priceVariancePaise === 0n) {
    matchStatus = 'PERFECT_MATCH';
    isApproved = true;
  } else if (priceVariancePct <= tolerancePercentage && totalQtyReceived >= totalQtyOrdered) {
    matchStatus = 'VARIANCE_WITHIN_TOLERANCE';
    isApproved = true;
  } else {
    matchStatus = 'BLOCKED_VARIANCE';
    isApproved = false;
  }

  // Record 3-Way Match Log
  const logRes = await db.query(
    `INSERT INTO three_way_match_logs (
      company_id, po_id, grn_id, bill_id, match_status,
      qty_variance, price_variance_paise, tolerance_percentage,
      is_approved_for_payment, variance_details
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      companyId,
      poId,
      grnId,
      billId,
      matchStatus,
      qtyVariance,
      priceVariancePaise.toString(),
      tolerancePercentage,
      isApproved,
      JSON.stringify({
        totalQtyOrdered,
        totalQtyReceived,
        poTotalPaise: poTotalPaise.toString(),
        billTotalPaise: billTotalPaise.toString(),
        priceVariancePct: priceVariancePct.toFixed(2)
      })
    ]
  );

  // Update Bill approval flag if passed
  if (isApproved) {
    await db.query(
      `UPDATE bills SET po_id = $1, grn_id = $2, approval_status = 'APPROVED' WHERE id = $3`,
      [poId, grnId, billId]
    );
  } else {
    await db.query(
      `UPDATE bills SET po_id = $1, grn_id = $2, approval_status = 'PENDING_APPROVAL' WHERE id = $3`,
      [poId, grnId, billId]
    );
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'three_way_match',
    entityId: logRes.rows[0].id,
    action: 'MATCH',
    afterJson: { matchStatus, isApproved, qtyVariance, priceVariancePct: priceVariancePct.toFixed(2) }
  });

  return {
    success: true,
    matchId: logRes.rows[0].id,
    matchStatus,
    isApprovedForPayment: isApproved,
    totalQtyOrdered,
    totalQtyReceived,
    priceVariancePaise: priceVariancePaise.toString(),
    priceVariancePct: priceVariancePct.toFixed(2)
  };
}
