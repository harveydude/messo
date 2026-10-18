/**
 * Meso Phase 39: Timesheets, Contractor Hours & Billable Expenses
 * Direct conversion of verified contractor/team hours and marked-up vendor expenses into customer invoices.
 */

import { getDb } from '../db/db.js';

/**
 * Record a team or contractor timesheet entry
 */
export async function createTimesheetEntry({
  companyId = 'comp_1',
  projectId = null,
  customerId = null,
  workerId,
  workerName,
  workDate = new Date().toISOString().split('T')[0],
  hours,
  hourlyCostPaise = 0,
  hourlyBillableRatePaise = 0,
  isBillable = true,
  notes = ''
}) {
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO timesheet_entries 
     (company_id, project_id, customer_id, worker_id, worker_name, work_date, hours, hourly_cost_paise, hourly_billable_rate_paise, is_billable, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'SUBMITTED', $11)
     RETURNING *`,
    [
      companyId,
      projectId,
      customerId,
      workerId,
      workerName,
      workDate,
      parseFloat(hours),
      parseInt(hourlyCostPaise, 10),
      parseInt(hourlyBillableRatePaise, 10),
      Boolean(isBillable),
      notes
    ]
  );
  return res.rows[0];
}

/**
 * Approve timesheet entries
 */
export async function approveTimesheetEntries(companyId = 'comp_1', entryIds = []) {
  const db = await getDb();
  const res = await db.query(
    `UPDATE timesheet_entries 
     SET status = 'APPROVED' 
     WHERE company_id = $1 AND id = ANY($2::uuid[]) AND status = 'SUBMITTED'
     RETURNING *`,
    [companyId, entryIds]
  );
  return res.rows;
}

/**
 * Record a project-specific billable expense (e.g. from vendor bill or direct disbursement)
 */
export async function recordBillableExpense({
  companyId = 'comp_1',
  projectId = null,
  customerId = null,
  vendorId = null,
  sourceDocType = 'BILL',
  sourceDocId = null,
  description,
  amountPaise,
  markupPercentage = 0,
  isBillable = true
}) {
  const db = await getDb();
  const amt = parseInt(amountPaise, 10);
  const markup = parseFloat(markupPercentage);
  const billableAmt = Math.round(amt * (1 + markup / 100));

  const res = await db.query(
    `INSERT INTO billable_expenses 
     (company_id, project_id, customer_id, vendor_id, source_doc_type, source_doc_id, description, amount_paise, markup_percentage, billable_amount_paise, is_billable, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
     RETURNING *`,
    [companyId, projectId, customerId, vendorId, sourceDocType, sourceDocId, description, amt, markup, billableAmt, Boolean(isBillable)]
  );
  return res.rows[0];
}

/**
 * Convert unbilled approved timesheet hours and billable expenses into invoice items
 * Marks timesheets and expenses as BILLED with the target invoiceId.
 */
export async function convertUnbilledToInvoiceItems({
  companyId = 'comp_1',
  customerId,
  projectId = null,
  invoiceId = null
}) {
  const db = await getDb();

  // 1. Fetch unbilled approved timesheets
  let tsQuery = `SELECT * FROM timesheet_entries 
                 WHERE company_id = $1 AND status = 'APPROVED' AND is_billable = TRUE`;
  const tsParams = [companyId];

  if (customerId) {
    tsParams.push(customerId);
    tsQuery += ` AND customer_id = $${tsParams.length}`;
  }
  if (projectId) {
    tsParams.push(projectId);
    tsQuery += ` AND project_id = $${tsParams.length}`;
  }

  const tsRes = await db.query(tsQuery, tsParams);
  const timesheets = tsRes.rows;

  // 2. Fetch unbilled billable expenses
  let expQuery = `SELECT * FROM billable_expenses 
                  WHERE company_id = $1 AND status IN ('PENDING', 'APPROVED') AND is_billable = TRUE`;
  const expParams = [companyId];

  if (customerId) {
    expParams.push(customerId);
    expQuery += ` AND customer_id = $${expParams.length}`;
  }
  if (projectId) {
    expParams.push(projectId);
    expQuery += ` AND project_id = $${expParams.length}`;
  }

  const expRes = await db.query(expQuery, expParams);
  const expenses = expRes.rows;

  // 3. Assemble invoice line items
  const invoiceLines = [];
  let totalLaborPaise = 0;
  let totalExpensesPaise = 0;

  for (const ts of timesheets) {
    const lineTotal = Math.round(parseFloat(ts.hours) * parseInt(ts.hourly_billable_rate_paise, 10));
    totalLaborPaise += lineTotal;
    invoiceLines.push({
      type: 'TIMESHEET',
      sourceId: ts.id,
      description: `${ts.worker_name} - ${ts.hours} hrs @ ₹${(parseInt(ts.hourly_billable_rate_paise, 10) / 100).toFixed(2)}/hr (${ts.notes || 'Professional services'})`,
      quantity: parseFloat(ts.hours),
      unitPricePaise: parseInt(ts.hourly_billable_rate_paise, 10),
      totalPaise: lineTotal
    });
  }

  for (const exp of expenses) {
    const lineTotal = parseInt(exp.billable_amount_paise, 10);
    totalExpensesPaise += lineTotal;
    invoiceLines.push({
      type: 'EXPENSE',
      sourceId: exp.id,
      description: `${exp.description} (Cost: ₹${(parseInt(exp.amount_paise, 10) / 100).toFixed(2)}${parseFloat(exp.markup_percentage) > 0 ? ` + ${exp.markup_percentage}% markup` : ''})`,
      quantity: 1,
      unitPricePaise: lineTotal,
      totalPaise: lineTotal
    });
  }

  // 4. Mark source items as BILLED if an invoiceId was provided or generated
  const effectiveInvoiceId = invoiceId || ('INV-BILLABLE-' + Date.now());
  const tsIds = timesheets.map(t => t.id);
  const expIds = expenses.map(e => e.id);

  if (tsIds.length > 0) {
    await db.query(
      `UPDATE timesheet_entries 
       SET status = 'BILLED', invoice_id = $1 
       WHERE id = ANY($2::uuid[])`,
      [effectiveInvoiceId, tsIds]
    );
  }

  if (expIds.length > 0) {
    await db.query(
      `UPDATE billable_expenses 
       SET status = 'BILLED', invoice_id = $1 
       WHERE id = ANY($2::uuid[])`,
      [effectiveInvoiceId, expIds]
    );
  }

  return {
    invoiceId: effectiveInvoiceId,
    totalBilledPaise: totalLaborPaise + totalExpensesPaise,
    totalLaborPaise,
    totalExpensesPaise,
    lineItemsCount: invoiceLines.length,
    lineItems: invoiceLines
  };
}
