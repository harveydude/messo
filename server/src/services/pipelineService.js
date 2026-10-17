/**
 * Meso Phase 26: Estimates, Quotes & Sales Orders Pipeline
 * Full lifecycle state machine: DRAFT -> SENT -> ACCEPTED -> CONVERTED_TO_ORDER -> CONVERTED_TO_INVOICE
 * with inventory reservation (qty_committed tracking).
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function createEstimate({
  companyId = 'comp_1',
  customerId,
  estimateNumber,
  items = [],
  terms = 'Valid for 30 days',
  notes = '',
  expiryDate,
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const estNo = estimateNumber || `EST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let subtotalPaise = 0n;
  let taxPaise = 0n;

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = BigInt(item.unitPricePaise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;
    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;
  }

  const totalPaise = subtotalPaise + taxPaise;

  const estRes = await db.query(
    `INSERT INTO estimates (
      company_id, estimate_number, customer_id, expiry_date, status,
      subtotal_paise, tax_paise, total_paise, terms, notes
    ) VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE + 30), 'DRAFT', $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      companyId,
      estNo,
      customerId,
      expiryDate || null,
      subtotalPaise.toString(),
      taxPaise.toString(),
      totalPaise.toString(),
      terms,
      notes
    ]
  );

  const estimate = estRes.rows[0];

  // Insert items
  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = BigInt(item.unitPricePaise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;

    await db.query(
      `INSERT INTO estimate_items (
        estimate_id, product_id, description, quantity, unit_price_paise,
        hsn_sac, tax_rate_bp, tax_amount_paise, total_amount_paise
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        estimate.id,
        item.productId || null,
        item.description || 'Estimate Line Item',
        qty,
        unitPrice.toString(),
        item.hsnSac || '998314',
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
    entityType: 'estimate',
    entityId: estimate.id,
    action: 'CREATE',
    afterJson: { estimateNumber: estNo, totalPaise: totalPaise.toString() }
  });

  return estimate;
}

export async function getEstimate(estimateId, companyId = 'comp_1') {
  const db = await getDb();
  const estRes = await db.query(
    `SELECT e.*, c.display_name as customer_name, c.email as customer_email, c.gstin as customer_gstin
     FROM estimates e
     JOIN contacts c ON c.id = e.customer_id
     WHERE e.id = $1 AND e.company_id = $2`,
    [estimateId, companyId]
  );
  if (estRes.rows.length === 0) return null;

  const itemsRes = await db.query(
    `SELECT * FROM estimate_items WHERE estimate_id = $1 ORDER BY id ASC`,
    [estimateId]
  );

  return {
    ...estRes.rows[0],
    items: itemsRes.rows || []
  };
}

export async function createSalesOrder({
  companyId = 'comp_1',
  customerId,
  estimateId = null,
  orderNumber,
  items = [],
  terms = 'Net 30',
  notes = '',
  deliveryDueDate,
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const orderNo = orderNumber || `SO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  let subtotalPaise = 0n;
  let taxPaise = 0n;

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = BigInt(item.unitPricePaise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;
    subtotalPaise += lineSubtotal;
    taxPaise += lineTax;
  }

  const totalPaise = subtotalPaise + taxPaise;

  const orderRes = await db.query(
    `INSERT INTO sales_orders (
      company_id, order_number, estimate_id, customer_id, delivery_due_date,
      status, subtotal_paise, tax_paise, total_paise, terms, notes
    ) VALUES ($1, $2, $3, $4, $5, 'CONFIRMED', $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      companyId,
      orderNo,
      estimateId,
      customerId,
      deliveryDueDate || null,
      subtotalPaise.toString(),
      taxPaise.toString(),
      totalPaise.toString(),
      terms,
      notes
    ]
  );

  const order = orderRes.rows[0];

  // Insert items and commit inventory
  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = BigInt(item.unitPricePaise || 0);
    const lineSubtotal = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(item.taxRateBp ?? 1800);
    const lineTax = (lineSubtotal * taxRateBp) / 10000n;

    await db.query(
      `INSERT INTO sales_order_items (
        order_id, product_id, description, quantity, unit_price_paise,
        hsn_sac, tax_rate_bp, tax_amount_paise, total_amount_paise
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        order.id,
        item.productId || null,
        item.description || 'Sales Order Line Item',
        qty,
        unitPrice.toString(),
        item.hsnSac || '998314',
        Number(taxRateBp),
        lineTax.toString(),
        (lineSubtotal + lineTax).toString()
      ]
    );

    // If product has inventory, reserve it under qty_committed
    if (item.productId) {
      await db.query(
        `UPDATE products_and_services 
         SET quantity_committed = COALESCE(quantity_committed, 0) + $1
         WHERE id = $2 AND company_id = $3`,
        [qty, item.productId, companyId]
      );
    }
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'sales_order',
    entityId: order.id,
    action: 'CREATE',
    afterJson: { orderNumber: orderNo, totalPaise: totalPaise.toString() }
  });

  return order;
}

export async function convertEstimateToSalesOrder({
  estimateId,
  companyId = 'comp_1',
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const estimate = await getEstimate(estimateId, companyId);
  if (!estimate) {
    throw new Error(`Estimate ${estimateId} not found`);
  }

  if (estimate.status === 'CONVERTED_TO_ORDER' || estimate.status === 'CONVERTED_TO_INVOICE') {
    throw new Error(`Estimate ${estimate.estimate_number} has already been converted`);
  }

  const orderItems = estimate.items.map(it => ({
    productId: it.product_id,
    description: it.description,
    quantity: Number(it.quantity),
    unitPricePaise: it.unit_price_paise,
    hsnSac: it.hsn_sac,
    taxRateBp: it.tax_rate_bp
  }));

  const salesOrder = await createSalesOrder({
    companyId,
    customerId: estimate.customer_id,
    estimateId: estimate.id,
    items: orderItems,
    terms: estimate.terms,
    notes: `Converted from Estimate ${estimate.estimate_number}`,
    user
  });

  const db = await getDb();
  await db.query(
    `UPDATE estimates 
     SET status = 'CONVERTED_TO_ORDER', converted_order_id = $1 
     WHERE id = $2`,
    [salesOrder.id, estimate.id]
  );

  return salesOrder;
}

export async function convertSalesOrderToInvoice({
  orderId,
  companyId = 'comp_1',
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const orderRes = await db.query(
    `SELECT * FROM sales_orders WHERE id = $1 AND company_id = $2`,
    [orderId, companyId]
  );
  if (orderRes.rows.length === 0) {
    throw new Error(`Sales Order ${orderId} not found`);
  }

  const order = orderRes.rows[0];
  if (order.status === 'CONVERTED_TO_INVOICE') {
    throw new Error(`Sales Order ${order.order_number} is already converted to invoice`);
  }

  const itemsRes = await db.query(
    `SELECT * FROM sales_order_items WHERE order_id = $1`,
    [orderId]
  );
  const items = itemsRes.rows || [];

  const invoiceId = 'inv_so_' + Date.now();
  const invoiceNumber = `INV-${order.order_number.replace('SO-', '')}`;
  const totalPaise = BigInt(order.total_paise);
  const subtotalPaise = BigInt(order.subtotal_paise);
  const taxPaise = BigInt(order.tax_paise);
  const cgstPaise = taxPaise / 2n;
  const sgstPaise = taxPaise - cgstPaise;

  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 1. Create Invoice
    await db.query(
      `INSERT INTO invoices (
        id, company_id, invoice_number, customer_id, issue_date, due_date,
        subtotal_paise, tax_paise, total_paise, balance_due_paise, status,
        cgst_paise, sgst_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, $5, $6, $7, $7, 'POSTED', $8, $9)`,
      [
        invoiceId,
        companyId,
        invoiceNumber,
        order.customer_id,
        subtotalPaise.toString(),
        taxPaise.toString(),
        totalPaise.toString(),
        cgstPaise.toString(),
        sgstPaise.toString()
      ]
    );

    // 2. Release committed stock & deduct on-hand stock
    for (const it of items) {
      if (it.product_id) {
        const qty = Number(it.quantity);
        await db.query(
          `UPDATE products_and_services 
           SET quantity_committed = GREATEST(0, COALESCE(quantity_committed, 0) - $1),
               quantity_on_hand = COALESCE(quantity_on_hand, 0) - $1
           WHERE id = $2 AND company_id = $3`,
          [qty, it.product_id, companyId]
        );
      }
    }

    // 3. Post Double-Entry Journal Entry
    const jeId = 'je_so_inv_' + Date.now();
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'INVOICE', $5, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-' + invoiceNumber,
        `Invoice ${invoiceNumber} created from Sales Order ${order.order_number}`,
        invoiceId
      ]
    );

    // Ensure Accounts Exist
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1100', $1, '1100', 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_4000', $1, '4000', 'Sales Revenue', 'PROFIT_AND_LOSS', 'INCOME') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2200', $1, '2200', 'Output CGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2210', $1, '2210', 'Output SGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit A/R
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_1100', $3, 0, 'Receivable for Sales Order conversion')`,
      ['jel_ar_' + Date.now(), jeId, totalPaise.toString()]
    );

    // Credit Revenue
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_4000', 0, $3, 'Revenue for Sales Order conversion')`,
      ['jel_rev_' + Date.now(), jeId, subtotalPaise.toString()]
    );

    // Credit Output Tax
    if (cgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2200', 0, $3, 'Output CGST')`,
        ['jel_cgst_' + Date.now(), jeId, cgstPaise.toString()]
      );
    }
    if (sgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2210', 0, $3, 'Output SGST')`,
        ['jel_sgst_' + Date.now(), jeId, sgstPaise.toString()]
      );
    }

    // 4. Update Sales Order
    await db.query(
      `UPDATE sales_orders 
       SET status = 'CONVERTED_TO_INVOICE', converted_invoice_id = $1 
       WHERE id = $2`,
      [invoiceId, orderId]
    );

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'sales_order',
    entityId: orderId,
    action: 'CONVERT_TO_INVOICE',
    afterJson: { invoiceId, invoiceNumber }
  });

  return {
    success: true,
    invoiceId,
    invoiceNumber,
    orderId,
    totalPaise: totalPaise.toString()
  };
}
