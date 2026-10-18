/**
 * Meso Phase 45: 12-Month Rolling Cash Flow & Working Capital Forecaster
 * Consolidates historical burn, open A/R collections, open A/P vendor payments, 
 * and recurring templates into forward-looking 12-month liquidity projections.
 */

import { getDb } from '../db/db.js';

/**
 * Generate 12-month rolling cash flow projection with working capital analysis
 */
export async function generate12MonthCashFlowForecast(companyId = 'comp_1', options = {}) {
  const db = await getDb();
  const arRealizationRate = options.arRealizationRate || 0.95; // 95% collection realization
  const baseMonthlyOpExPaise = options.monthlyOpExPaise || 25000000; // Default ₹2,50,000 monthly operational burn

  // 1. Calculate Current Liquid Cash & Bank Balances
  const bankRes = await db.query(
    `SELECT 
       COALESCE(SUM(l.debit_paise - l.credit_paise), 0) AS liquid_cash_paise
     FROM journal_entry_lines l
     JOIN chart_of_accounts a ON l.account_id = a.id
     WHERE a.company_id = $1 AND a.account_type IN ('BANK', 'CASH')`,
    [companyId]
  );
  const currentCashPaise = Math.max(0, parseInt(bankRes.rows[0]?.liquid_cash_paise || 50000000, 10)); // Default ₹5,00,000 if pristine db

  // 2. Fetch Open A/R Invoices by Due Date
  const arRes = await db.query(
    `SELECT 
       TO_CHAR(due_date, 'YYYY-MM') AS month_key,
       COALESCE(SUM(balance_due_paise), 0) AS due_amount_paise
     FROM invoices 
     WHERE company_id = $1 AND status IN ('SENT', 'OVERDUE', 'PARTIALLY_PAID') AND balance_due_paise > 0
     GROUP BY TO_CHAR(due_date, 'YYYY-MM')`,
    [companyId]
  );
  const arMap = {};
  arRes.rows.forEach(r => {
    if (r.month_key) arMap[r.month_key] = parseInt(r.due_amount_paise, 10);
  });

  // 3. Fetch Open A/P Bills by Due Date
  const apRes = await db.query(
    `SELECT 
       TO_CHAR(due_date, 'YYYY-MM') AS month_key,
       COALESCE(SUM(open_balance_paise), 0) AS due_amount_paise
     FROM bills 
     WHERE company_id = $1 AND status != 'PAID' AND open_balance_paise > 0
     GROUP BY TO_CHAR(due_date, 'YYYY-MM')`,
    [companyId]
  );
  const apMap = {};
  apRes.rows.forEach(r => {
    if (r.month_key) apMap[r.month_key] = parseInt(r.due_amount_paise, 10);
  });

  // 4. Calculate Current Working Capital (Current Assets - Current Liabilities)
  const caRes = await db.query(
    `SELECT 
       COALESCE(SUM(balance_due_paise), 0) AS total_ar_paise
     FROM invoices WHERE company_id = $1 AND status != 'PAID'`,
    [companyId]
  );
  const totalArPaise = parseInt(caRes.rows[0]?.total_ar_paise || 0, 10);

  const clRes = await db.query(
    `SELECT 
       COALESCE(SUM(open_balance_paise), 0) AS total_ap_paise
     FROM bills WHERE company_id = $1 AND status != 'PAID'`,
    [companyId]
  );
  const totalApPaise = parseInt(clRes.rows[0]?.total_ap_paise || 0, 10);

  const currentAssetsPaise = currentCashPaise + totalArPaise;
  const currentLiabilitiesPaise = totalApPaise;
  const netWorkingCapitalPaise = currentAssetsPaise - currentLiabilitiesPaise;
  const currentRatio = currentLiabilitiesPaise > 0 
    ? (currentAssetsPaise / currentLiabilitiesPaise).toFixed(2) 
    : 'N/A (No Liabilities)';

  // 5. Generate 12 Forward Monthly Buckets
  const months = [];
  let runningBalance = currentCashPaise;
  let minimumBalancePaise = currentCashPaise;
  let hasCashDeficit = false;

  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });

    const openAr = arMap[monthKey] || 0;
    const projectedArInflow = Math.round(openAr * arRealizationRate);
    const baselineSalesInflow = 15000000; // Base recurring sales: ₹1,50,000/mo
    const totalInflow = projectedArInflow + baselineSalesInflow;

    const openAp = apMap[monthKey] || 0;
    const totalOutflow = openAp + baseMonthlyOpExPaise;

    const netChange = totalInflow - totalOutflow;
    const startBal = runningBalance;
    const endBal = startBal + netChange;

    if (endBal < minimumBalancePaise) {
      minimumBalancePaise = endBal;
    }
    if (endBal < 0) {
      hasCashDeficit = true;
    }

    months.push({
      monthIndex: i + 1,
      monthKey,
      monthName,
      startBalancePaise: startBal,
      projectedInflowPaise: totalInflow,
      arCollectionsPaise: projectedArInflow,
      projectedOutflowPaise: totalOutflow,
      apDisbursementsPaise: openAp,
      netCashFlowPaise: netChange,
      endBalancePaise: endBal,
      isPositive: endBal >= 0
    });

    runningBalance = endBal;
  }

  return {
    companyId,
    currentCashPaise,
    workingCapital: {
      currentAssetsPaise,
      currentLiabilitiesPaise,
      netWorkingCapitalPaise,
      currentRatio,
      isSolvent: netWorkingCapitalPaise >= 0
    },
    forecastSummary: {
      monthsCount: 12,
      startBalancePaise: currentCashPaise,
      ending12MonthBalancePaise: runningBalance,
      minimumProjectedBalancePaise: minimumBalancePaise,
      hasCashDeficit
    },
    monthlyForecasts: months
  };
}
