/**
 * Meso Phase 40: Live Project & Customer Profitability Matrix
 * Real-time margin analysis: (Project Revenue - Direct Labor - Billable Expenses - Allocated Overhead).
 */

import { getDb } from '../db/db.js';

/**
 * Create a new project linked to a customer
 */
export async function createProject({
  companyId = 'comp_1',
  id = null,
  projectCode,
  projectName,
  customerId,
  startDate = new Date().toISOString().split('T')[0],
  endDate = null,
  budgetPaise = 0,
  notes = ''
}) {
  const db = await getDb();
  const projectId = id || ('proj_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
  const res = await db.query(
    `INSERT INTO projects 
     (id, company_id, project_code, project_name, name, customer_id, start_date, end_date, budget_paise, status, notes)
     VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, 'IN_PROGRESS', $9)
     RETURNING *`,
    [projectId, companyId, projectCode, projectName, customerId, startDate, endDate, parseInt(budgetPaise, 10), notes]
  );
  return res.rows[0];
}

/**
 * Calculate live real-time profitability for a single project
 */
export async function calculateProjectProfitability(companyId = 'comp_1', projectId, overheadPercentage = 10) {
  const db = await getDb();

  // 1. Fetch project info
  const pRes = await db.query(`SELECT * FROM projects WHERE id = $1 AND company_id = $2`, [projectId, companyId]);
  if (!pRes.rows[0]) throw new Error(`Project ${projectId} not found`);
  const project = pRes.rows[0];

  // 2. Compute Direct Labor Cost & Billed Labor Revenue from timesheets
  const tsRes = await db.query(
    `SELECT 
       COALESCE(SUM(hours * hourly_cost_paise), 0) AS total_labor_cost_paise,
       COALESCE(SUM(CASE WHEN status = 'BILLED' THEN hours * hourly_billable_rate_paise ELSE 0 END), 0) AS billed_labor_revenue_paise,
       COALESCE(SUM(hours), 0) AS total_hours
     FROM timesheet_entries
     WHERE company_id = $1 AND project_id = $2`,
    [companyId, projectId]
  );
  const directLaborCostPaise = Math.round(parseFloat(tsRes.rows[0]?.total_labor_cost_paise || 0));
  const billedLaborRevenuePaise = Math.round(parseFloat(tsRes.rows[0]?.billed_labor_revenue_paise || 0));
  const totalHours = parseFloat(tsRes.rows[0]?.total_hours || 0);

  // 3. Compute Direct Material & Billable Expenses
  const expRes = await db.query(
    `SELECT 
       COALESCE(SUM(amount_paise), 0) AS total_material_cost_paise,
       COALESCE(SUM(CASE WHEN status = 'BILLED' THEN billable_amount_paise ELSE 0 END), 0) AS billed_expense_revenue_paise
     FROM billable_expenses
     WHERE company_id = $1 AND project_id = $2`,
    [companyId, projectId]
  );
  const directMaterialCostPaise = Math.round(parseFloat(expRes.rows[0]?.total_material_cost_paise || 0));
  const billedExpenseRevenuePaise = Math.round(parseFloat(expRes.rows[0]?.billed_expense_revenue_paise || 0));

  // 4. Compute Total Direct Costs and Revenue
  const totalDirectCostsPaise = directLaborCostPaise + directMaterialCostPaise;
  const totalBilledRevenuePaise = billedLaborRevenuePaise + billedExpenseRevenuePaise;

  // 5. Compute Allocated Overhead & Net Profit
  const allocatedOverheadPaise = Math.round(totalDirectCostsPaise * (parseFloat(overheadPercentage) / 100));
  const totalCostsWithOverheadPaise = totalDirectCostsPaise + allocatedOverheadPaise;

  const grossProfitPaise = totalBilledRevenuePaise - totalDirectCostsPaise;
  const netProfitPaise = totalBilledRevenuePaise - totalCostsWithOverheadPaise;

  const grossMarginBp = totalBilledRevenuePaise > 0 
    ? Math.round((grossProfitPaise / totalBilledRevenuePaise) * 10000) 
    : 0;
  const netMarginBp = totalBilledRevenuePaise > 0 
    ? Math.round((netProfitPaise / totalBilledRevenuePaise) * 10000) 
    : 0;

  return {
    projectId: project.id,
    projectCode: project.project_code,
    projectName: project.project_name,
    customerId: project.customer_id,
    status: project.status,
    budgetPaise: parseInt(project.budget_paise, 10),
    totalHours,
    directLaborCostPaise,
    directMaterialCostPaise,
    totalDirectCostsPaise,
    allocatedOverheadPaise,
    totalCostsWithOverheadPaise,
    billedLaborRevenuePaise,
    billedExpenseRevenuePaise,
    totalBilledRevenuePaise,
    grossProfitPaise,
    netProfitPaise,
    grossMarginPercent: (grossMarginBp / 100).toFixed(2),
    netMarginPercent: (netMarginBp / 100).toFixed(2),
    isProfitable: netProfitPaise > 0
  };
}

/**
 * Generate Customer Profitability Matrix across all projects and sales
 */
export async function getCustomerProfitabilityMatrix(companyId = 'comp_1') {
  const db = await getDb();

  const res = await db.query(
    `SELECT 
       c.id AS customer_id,
       c.display_name AS customer_name,
       (SELECT COUNT(*) FROM projects p WHERE p.customer_id = c.id AND p.company_id = c.company_id) AS project_count,
       COALESCE((SELECT SUM(t.hours * t.hourly_billable_rate_paise) FROM timesheet_entries t WHERE t.customer_id = c.id AND t.company_id = c.company_id), 0)
       + COALESCE((SELECT SUM(b.billable_amount_paise) FROM billable_expenses b WHERE b.customer_id = c.id AND b.company_id = c.company_id), 0) AS total_revenue_paise,
       COALESCE((SELECT SUM(t.hours * t.hourly_cost_paise) FROM timesheet_entries t WHERE t.customer_id = c.id AND t.company_id = c.company_id), 0)
       + COALESCE((SELECT SUM(b.amount_paise) FROM billable_expenses b WHERE b.customer_id = c.id AND b.company_id = c.company_id), 0) AS total_direct_cost_paise
     FROM contacts c
     WHERE c.company_id = $1 AND c.type = 'CUSTOMER'
       AND (
         COALESCE((SELECT SUM(t.hours * t.hourly_billable_rate_paise) FROM timesheet_entries t WHERE t.customer_id = c.id AND t.company_id = c.company_id), 0)
         + COALESCE((SELECT SUM(b.billable_amount_paise) FROM billable_expenses b WHERE b.customer_id = c.id AND b.company_id = c.company_id), 0)
       ) > 0
     ORDER BY total_revenue_paise DESC`,
    [companyId]
  );

  return res.rows.map(row => {
    const rev = Math.round(parseFloat(row.total_revenue_paise || 0));
    const cost = Math.round(parseFloat(row.total_direct_cost_paise || 0));
    const profit = rev - cost;
    const margin = rev > 0 ? ((profit / rev) * 100).toFixed(2) : '0.00';

    return {
      customerId: row.customer_id,
      customerName: row.customer_name,
      projectCount: parseInt(row.project_count, 10),
      totalRevenuePaise: rev,
      totalCostPaise: cost,
      netProfitPaise: profit,
      marginPercent: margin,
      isHighMargin: parseFloat(margin) >= 30.0
    };
  });
}
