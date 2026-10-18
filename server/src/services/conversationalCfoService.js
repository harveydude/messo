/**
 * Phase 49: Natural Language Command Bar & Conversational CFO
 * Parses conversational natural language queries into live SQL analytics,
 * financial metrics, and chart data:
 * 1. Unpaid MSME bills over 30/45 days (Section 43B(h) compliance)
 * 2. Net GST payable (Output Tax vs Eligible ITC)
 * 3. Top customers by revenue
 * 4. Cash runway & working capital liquidity
 */

import { getDb } from '../db/db.js';

/**
 * Natural language intent parser
 */
export function parseConversationalIntent(query = '') {
  const q = (query || '').toLowerCase().trim();

  if (q.includes('msme') || (q.includes('unpaid') && (q.includes('bill') || q.includes('vendor')))) {
    return 'MSME_OVERDUE_BILLS';
  }
  if (q.includes('gst') || q.includes('tax payable') || q.includes('itc') || q.includes('gstr')) {
    return 'NET_GST_POSITION';
  }
  if (q.includes('top customer') || q.includes('biggest client') || q.includes('highest revenue customer') || q.includes('revenue by customer')) {
    return 'TOP_CUSTOMERS';
  }
  if (q.includes('runway') || q.includes('working capital') || q.includes('liquidity') || q.includes('cash balance')) {
    return 'RUNWAY_WORKING_CAPITAL';
  }

  return 'FINANCIAL_PULSE';
}

/**
 * Process Conversational CFO query
 */
export async function executeConversationalCfoQuery(companyId = 'comp_1', queryText = '') {
  const db = await getDb();
  const intent = parseConversationalIntent(queryText);

  let title = '';
  let summary = '';
  let keyMetrics = [];
  let chartData = { type: 'bar', labels: [], datasets: [] };
  let records = [];

  switch (intent) {
    case 'MSME_OVERDUE_BILLS': {
      title = 'Unpaid MSME Supplier Bills (> 30 Days Overdue)';
      const res = await db.query(
        `SELECT b.id, b.bill_number, b.open_balance_paise, b.due_date,
                (CURRENT_DATE - b.due_date) AS days_overdue,
                c.display_name AS vendor_name
         FROM bills b
         JOIN contacts c ON c.id = b.vendor_id
         WHERE b.company_id = $1 
           AND b.open_balance_paise > 0 
           AND b.status != 'VOID'
           AND (CURRENT_DATE - b.due_date) > 30
         ORDER BY (CURRENT_DATE - b.due_date) DESC`,
        [companyId]
      );

      records = res.rows;
      const totalOverduePaise = records.reduce((acc, r) => acc + parseInt(r.open_balance_paise, 10), 0);
      const totalCount = records.length;

      summary = `Found ${totalCount} overdue bills totaling ₹${(totalOverduePaise / 100).toLocaleString('en-IN')}. Under Section 43B(h) of the Income Tax Act, payments to registered MSMEs beyond 45 days are disallowed as business expense deductions.`;

      keyMetrics = [
        { label: 'Total MSME Overdue', value: `₹${(totalOverduePaise / 100).toLocaleString('en-IN')}`, tone: 'danger' },
        { label: 'Overdue Invoices', value: totalCount.toString(), tone: 'neutral' },
        { label: 'Statutory Grace Period', value: '15 / 45 Days', tone: 'neutral' }
      ];

      chartData = {
        type: 'bar',
        labels: records.slice(0, 5).map(r => r.vendor_name || r.bill_number),
        datasets: [{
          label: 'Overdue Amount (₹)',
          data: records.slice(0, 5).map(r => parseInt(r.open_balance_paise, 10) / 100)
        }]
      };
      break;
    }

    case 'NET_GST_POSITION': {
      title = 'Net GST Payable Position & ITC Clearance';
      // 1. Output tax from sales invoices
      const outRes = await db.query(
        `SELECT 
           COALESCE(SUM(cgst_paise), 0) AS total_cgst,
           COALESCE(SUM(sgst_paise), 0) AS total_sgst,
           COALESCE(SUM(igst_paise), 0) AS total_igst
         FROM invoices
         WHERE company_id = $1 AND status != 'VOID'`,
        [companyId]
      );

      // 2. Input tax credit from bills & expenses
      const inRes = await db.query(
        `SELECT 
           COALESCE(SUM(cgst_paise), 0) AS total_cgst,
           COALESCE(SUM(sgst_paise), 0) AS total_sgst,
           COALESCE(SUM(igst_paise), 0) AS total_igst
         FROM bills
         WHERE company_id = $1 AND status != 'VOID'`,
        [companyId]
      );

      const outCgst = parseInt(outRes.rows[0]?.total_cgst || 0, 10);
      const outSgst = parseInt(outRes.rows[0]?.total_sgst || 0, 10);
      const outIgst = parseInt(outRes.rows[0]?.total_igst || 0, 10);
      const totalOutputPaise = outCgst + outSgst + outIgst;

      const inCgst = parseInt(inRes.rows[0]?.total_cgst || 0, 10);
      const inSgst = parseInt(inRes.rows[0]?.total_sgst || 0, 10);
      const inIgst = parseInt(inRes.rows[0]?.total_igst || 0, 10);
      const totalItcPaise = inCgst + inSgst + inIgst;

      const netGstPayablePaise = Math.max(0, totalOutputPaise - totalItcPaise);
      const netCgstPayable = Math.max(0, outCgst - inCgst);
      const netSgstPayable = Math.max(0, outSgst - inSgst);
      const netIgstPayable = Math.max(0, outIgst - inIgst);

      summary = `Gross Output Tax is ₹${(totalOutputPaise / 100).toLocaleString('en-IN')}. Eligible ITC offset is ₹${(totalItcPaise / 100).toLocaleString('en-IN')}. Net statutory GST payable is ₹${(netGstPayablePaise / 100).toLocaleString('en-IN')}.`;

      keyMetrics = [
        { label: 'Net GST Payable', value: `₹${(netGstPayablePaise / 100).toLocaleString('en-IN')}`, tone: netGstPayablePaise > 0 ? 'warning' : 'success' },
        { label: 'Gross Output Liability', value: `₹${(totalOutputPaise / 100).toLocaleString('en-IN')}`, tone: 'neutral' },
        { label: 'Total Input Tax Credit (ITC)', value: `₹${(totalItcPaise / 100).toLocaleString('en-IN')}`, tone: 'success' }
      ];

      chartData = {
        type: 'doughnut',
        labels: ['Net CGST', 'Net SGST', 'Net IGST', 'Utilized ITC'],
        datasets: [{
          data: [netCgstPayable / 100, netSgstPayable / 100, netIgstPayable / 100, totalItcPaise / 100]
        }]
      };

      records = [
        { component: 'CGST', outputPaise: outCgst, itcPaise: inCgst, netPaise: netCgstPayable },
        { component: 'SGST', outputPaise: outSgst, itcPaise: inSgst, netPaise: netSgstPayable },
        { component: 'IGST', outputPaise: outIgst, itcPaise: inIgst, netPaise: netIgstPayable }
      ];
      break;
    }

    case 'TOP_CUSTOMERS': {
      title = 'Top Customers by Realized Revenue';
      const res = await db.query(
        `SELECT c.id, c.display_name, 
                COALESCE(SUM(i.total_paise), 0) AS total_revenue_paise,
                COUNT(i.id) AS invoices_count
         FROM contacts c
         JOIN invoices i ON i.customer_id = c.id
         WHERE c.company_id = $1 AND i.status != 'VOID'
         GROUP BY c.id, c.display_name
         ORDER BY total_revenue_paise DESC
         LIMIT 5`,
        [companyId]
      );

      records = res.rows;
      const topName = records[0]?.display_name || 'N/A';
      const topRev = parseInt(records[0]?.total_revenue_paise || 0, 10);

      summary = `Leaderboard dominated by ${topName} contributing ₹${(topRev / 100).toLocaleString('en-IN')} across active accounts.`;

      keyMetrics = [
        { label: 'Top Customer', value: topName, tone: 'neutral' },
        { label: 'Leader Revenue', value: `₹${(topRev / 100).toLocaleString('en-IN')}`, tone: 'success' },
        { label: 'Active Clients Analyzed', value: records.length.toString(), tone: 'neutral' }
      ];

      chartData = {
        type: 'bar',
        labels: records.map(r => r.display_name),
        datasets: [{
          label: 'Revenue (₹)',
          data: records.map(r => parseInt(r.total_revenue_paise, 10) / 100)
        }]
      };
      break;
    }

    case 'RUNWAY_WORKING_CAPITAL':
    default: {
      title = 'Treasury Liquidity, Working Capital & Cash Runway';
      // Cash & Bank balance
      const cashRes = await db.query(
        `SELECT COALESCE(SUM(jel.debit_paise) - SUM(jel.credit_paise), 0) AS current_cash
         FROM chart_of_accounts coa
         LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
         LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'POSTED'
         WHERE coa.company_id = $1 AND coa.account_type = 'BANK'`,
        [companyId]
      );
      const cashPaise = Math.max(0, parseInt(cashRes.rows[0]?.current_cash || 0, 10));

      // AR
      const arRes = await db.query(
        `SELECT COALESCE(SUM(balance_due_paise), 0) AS total_ar FROM invoices WHERE company_id = $1 AND status != 'VOID'`,
        [companyId]
      );
      const arPaise = parseInt(arRes.rows[0]?.total_ar || 0, 10);

      // AP
      const apRes = await db.query(
        `SELECT COALESCE(SUM(open_balance_paise), 0) AS total_ap FROM bills WHERE company_id = $1 AND status != 'VOID'`,
        [companyId]
      );
      const apPaise = parseInt(apRes.rows[0]?.total_ap || 0, 10);

      const currentAssetsPaise = cashPaise + arPaise;
      const currentLiabilitiesPaise = apPaise;
      const netWorkingCapitalPaise = currentAssetsPaise - currentLiabilitiesPaise;
      const currentRatio = currentLiabilitiesPaise > 0 ? (currentAssetsPaise / currentLiabilitiesPaise).toFixed(2) : 'N/A';

      // Estimated 3-month burn
      const avgMonthlyBurnPaise = 25000000; // ₹2,50,000 monthly burn baseline
      const runwayMonths = (cashPaise / avgMonthlyBurnPaise).toFixed(1);

      summary = `Current cash reserves are ₹${(cashPaise / 100).toLocaleString('en-IN')}. Estimated runway is ${runwayMonths} months at baseline operational expenditure. Net Working Capital stands at ₹${(netWorkingCapitalPaise / 100).toLocaleString('en-IN')}.`;

      keyMetrics = [
        { label: 'Available Cash', value: `₹${(cashPaise / 100).toLocaleString('en-IN')}`, tone: 'success' },
        { label: 'Current Runway', value: `${runwayMonths} Months`, tone: parseFloat(runwayMonths) < 3 ? 'warning' : 'success' },
        { label: 'Current Ratio', value: currentRatio, tone: parseFloat(currentRatio) >= 1.33 ? 'success' : 'warning' }
      ];

      chartData = {
        type: 'pie',
        labels: ['Cash & Bank', 'Accounts Receivable', 'Accounts Payable'],
        datasets: [{
          data: [cashPaise / 100, arPaise / 100, apPaise / 100]
        }]
      };

      records = [
        { metric: 'Current Assets', amountPaise: currentAssetsPaise },
        { metric: 'Current Liabilities', amountPaise: currentLiabilitiesPaise },
        { metric: 'Net Working Capital', amountPaise: netWorkingCapitalPaise }
      ];
      break;
    }
  }

  const responsePayload = {
    success: true,
    companyId,
    queryText,
    intent,
    title,
    summary,
    keyMetrics,
    chartData,
    records
  };

  // Record audit into cfo_query_history
  const historyId = 'cfo_q_' + Date.now();
  await db.query(
    `INSERT INTO cfo_query_history (id, company_id, query_text, parsed_intent, response_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [historyId, companyId, queryText, intent, JSON.stringify(responsePayload)]
  );

  return responsePayload;
}
