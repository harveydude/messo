import express from 'express';
import { getDb } from '../db/db.js';
import { logAudit } from '../services/ledgerService.js';

const router = express.Router();

// Helper to format rupees in Indian format
const toInr = (paise) => `₹${(Math.abs(Number(paise || 0)) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const toNumeric = (paise) => Number((Number(paise || 0) / 100).toFixed(2));

router.get(['/', '/metrics', '/business-at-a-glance'], async (req, res) => {
  try {
    const db = await getDb();

    // 1. Profit & Loss from Accounts & GL
    const pnlRes = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN account_type = 'INCOME' THEN cached_balance_paise ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN account_type IN ('EXPENSE', 'COGS') THEN cached_balance_paise ELSE 0 END), 0) as total_expense
      FROM chart_of_accounts
      WHERE statement_group = 'PROFIT_AND_LOSS'
    `);
    const totalIncomePaise = Number(pnlRes.rows[0]?.total_income || 834700);
    const totalExpensePaise = Number(pnlRes.rows[0]?.total_expense || 695300);
    const netProfitPaise = totalIncomePaise - totalExpensePaise;
    const priorPeriodNetProfitPaise = 18000; // Prior month net profit

    // 2. Bank Accounts & Live Connections
    const bankConnsRes = await db.query(`
      SELECT * FROM bank_connections
    `);
    let bankAccounts = [];
    if (bankConnsRes.rows.length > 0) {
      bankAccounts = bankConnsRes.rows.map(b => ({
        id: b.id,
        name: b.institution_name,
        bank_balance: toNumeric(b.bank_balance_paise),
        in_quickbooks_balance: toNumeric(b.in_books_balance_paise),
        bankBalance: toInr(b.bank_balance_paise),
        inBooks: toInr(b.in_books_balance_paise),
        updated_at_label: 'Updated moments ago',
        updated: 'Updated moments ago',
        to_review_count: b.institution_name.includes('Mastercard') ? 5 : 25,
      }));
    } else {
      bankAccounts = [
        {
          id: 'bc_1',
          name: 'Checking (HDFC)',
          bank_balance: -3621.93,
          in_quickbooks_balance: 1201.00,
          bankBalance: '-₹3,621.93',
          inBooks: '₹1,201.00',
          updated_at_label: 'Updated moments ago',
          updated: 'Updated moments ago',
          to_review_count: 25,
        },
        {
          id: 'bc_2',
          name: 'Mastercard Credit Account',
          bank_balance: 304.96,
          in_quickbooks_balance: 157.72,
          bankBalance: '₹304.96',
          inBooks: '₹157.72',
          updated_at_label: 'Updated moments ago',
          updated: 'Updated moments ago',
          to_review_count: 5,
        }
      ];
    }

    // 3. Invoices & Funnel
    const invRes = await db.query(`
      SELECT
        COALESCE(SUM(CASE WHEN status != 'PAID' THEN balance_due_paise ELSE 0 END), 0) as unpaid_total,
        COALESCE(SUM(CASE WHEN status != 'PAID' THEN 1 ELSE 0 END), 0) as unpaid_count,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_paise ELSE 0 END), 0) as paid_total,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END), 0) as paid_count
      FROM invoices
    `);
    const unpaidPaise = Number(invRes.rows[0]?.unpaid_total || 0);
    const paidPaise = Number(invRes.rows[0]?.paid_total || 0);

    // 4. Accounts Payable & Bills
    const apRes = await db.query(`
      SELECT
        COALESCE(SUM(open_balance_paise), 0) as total_ap,
        COUNT(*) as open_bills_count
      FROM bills
      WHERE status != 'PAID'
    `);
    const totalApPaise = Number(apRes.rows[0]?.total_ap || 160267);

    // 4.5 Dynamic Expense Categories from Chart of Accounts / Journal
    const expRes = await db.query(`
      SELECT name, cached_balance_paise 
      FROM chart_of_accounts 
      WHERE account_type IN ('EXPENSE', 'COGS') AND is_active = TRUE
      ORDER BY cached_balance_paise DESC
    `);
    
    const palette = ['#0077C5', '#00A699', '#1E3A8A', '#F97316', '#E53E3E', '#8D9096'];
    let calculatedCategories = [];
    if (expRes.rows.length > 0 && totalExpensePaise > 0) {
      calculatedCategories = expRes.rows.slice(0, 5).map((row, idx) => {
        const bal = Number(row.cached_balance_paise || 0);
        const percent = Math.max(1, Math.round((bal / totalExpensePaise) * 100));
        return {
          name: row.name.replace(/ \(.*\)/, ''),
          amount: toNumeric(bal),
          percentage: percent,
          percent: percent,
          color: palette[idx % palette.length],
        };
      });
    } else {
      calculatedCategories = [
        { name: 'Cost of Goods Sold', amount: 540.00, percentage: 48, percent: 48, color: '#0077C5' },
        { name: 'Legal & Professional Fees', amount: 320.00, percentage: 29, percent: 29, color: '#00A699' },
        { name: 'Automobile & Fuel', amount: 157.00, percentage: 14, percent: 14, color: '#1E3A8A' },
        { name: 'Other', amount: 100.00, percentage: 9, percent: 9, color: '#F97316' }
      ];
    }

    // 5. Unreviewed Bank Feed Counts
    const toReviewInflows = 8;
    const toReviewOutflows = 15;
    const totalToReview = toReviewInflows + toReviewOutflows;

    const data = {
      success: true,
      // Section 3 Master Structures
      profit_and_loss: {
        period: 'Last month',
        posted_income: toNumeric(totalIncomePaise),
        posted_expenses: toNumeric(totalExpensePaise),
        net_profit: toNumeric(netProfitPaise),
        prior_period_net_profit: toNumeric(priorPeriodNetProfitPaise),
        trend_percentage: 673,
        income_to_review_count: toReviewInflows,
        income_to_review_amount: 1520.00,
        expenses_to_review_count: toReviewOutflows,
        expenses_to_review_amount: 2340.00,
        categorized_percentage_badge: 78,
        to_review_total_count: totalToReview,
        footer_action_label: `Categorize ${totalToReview} transactions`,
        footer_action_route: '/accounting/bank-transactions?status=FOR_REVIEW'
      },
      expenses: {
        period: 'Last 30 days',
        total_spending: toNumeric(totalExpensePaise),
        amount: toInr(totalExpensePaise),
        categorized_ratio_badge: 63,
        percentBadge: '63%',
        trendText: 'Down 81% from prior 30 days',
        trend_percentage: -81,
        categories: calculatedCategories,
        to_review_count: 10,
        reviewText: '10 to review',
        footer_action_label: 'Categorize 10 transactions',
        footerLink: 'Categorize 10 transactions',
        footer_action_route: '/accounting/bank-transactions?type=EXPENSE&period=last_30_days'
      },
      bank_accounts: {
        as_of_label: 'As of today',
        todays_balance: -3422.00,
        accounts: bankAccounts,
        footer_control_label: 'Go to registers'
      },
      cash_flow_trend: {
        current_cash_balance: -3422.00,
        mode: 'CASH_BALANCE',
        time_horizon: '12 months',
        historical_points: [
          { month: 'Jan', balance: 5200 },
          { month: 'Feb', balance: 4800 },
          { month: 'Mar', balance: 3900 },
          { month: 'Apr', balance: 2100 },
          { month: 'May', balance: 1100 },
          { month: 'Jun', balance: -450 },
          { month: 'Jul', balance: -1200 },
          { month: 'Aug', balance: -2400 },
          { month: 'Sep', balance: -3100 },
          { month: 'Oct', balance: -3422 }
        ],
        projected_points: [
          { month: 'Nov', projected_balance: -2100 },
          { month: 'Dec', projected_balance: 1400 }
        ]
      },
      accounts_payable: {
        total_ap_amount: 1602.67,
        as_of_label: 'As of today',
        aging: {
          current: 0.00,
          past_due_1_7: 755.00,
          past_due_8_14: 0.00,
          past_due_15_plus: 847.67
        },
        footer_link: '/reports/accounts-payable-aging-summary'
      },

      // Backwards Compatibility for Frontend Component Views
      metrics: {
        pnl: {
          amount: (netProfitPaise < 0 ? '-' : '') + toInr(netProfitPaise),
          income: {
            amount: toInr(totalIncomePaise),
            label: 'Income',
            bookedPercent: 73,
            unreviewedPercent: 27,
            reviewText: '8 to review'
          },
          expenses: {
            amount: toInr(totalExpensePaise),
            label: 'Expenses',
            bookedPercent: 63,
            unreviewedPercent: 37,
            reviewText: '15 to review'
          },
          trendText: '↑ Up 673% from prior month',
          marginBadge: '78%',
        },
        funnel: {
          outstanding: toInr(unpaidPaise),
          outstandingCount: Number(invRes.rows[0]?.unpaid_count || 4),
          paid: toInr(paidPaise),
          paidCount: Number(invRes.rows[0]?.paid_count || 8),
          period: 'This month',
        },
        bank: {
          todaysBalance: '-₹3,422.00',
          accounts: bankAccounts,
          asOf: 'As of today',
        },
        accountsPayable: {
          total: toInr(totalApPaise),
          asOf: 'As of today',
          aging: [
            { label: 'Current', amount: 0, color: '#2CA01C' },
            { label: '1-7 days', amount: 755.00, color: '#4E9FD4' },
            { label: '8-14 days', amount: 0, color: '#E8A33D' },
            { label: '15+ days', amount: 847.67, color: '#E53E3E' }
          ],
        },
        cashflow: {
          title: 'CASH FLOW TREND',
          amount: '-₹3,422.00',
          period: '12 months',
          activeToggle: 'Cash balance',
          points: [
            { month: 'Jan', balance: 5200 },
            { month: 'Feb', balance: 4800 },
            { month: 'Mar', balance: 3900 },
            { month: 'Apr', balance: 2100 },
            { month: 'May', balance: 1100 },
            { month: 'Jun', balance: -450 },
            { month: 'Jul', balance: -1200 },
            { month: 'Aug', balance: -2400 },
            { month: 'Sep', balance: -3100 },
            { month: 'Oct', balance: -3422 }
          ]
        },
        expenses: {
          period: 'Last 30 days',
          title: 'EXPENSES',
          subtitle: 'Spending for last 30 days',
          amount: toInr(totalExpensePaise),
          percentBadge: '63%',
          trendText: 'Down 81% from prior 30 days',
          categories: calculatedCategories,
          reviewText: '10 to review',
          footerLink: 'Categorize 10 transactions'
        }
      }
    };

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Section 3.A Layout Customization Feedback Route
router.post('/feedback/layout-customization', async (req, res) => {
  try {
    const { feedback = 'THUMBS_UP', comment = '' } = req.body;
    await logAudit({
      action: 'FEEDBACK',
      entityType: 'LAYOUT_CUSTOMIZATION',
      entityId: 'dashboard_layout',
      after: { feedback, comment }
    });
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
