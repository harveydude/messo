import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { getDb } from '../db/db.js';
import { toInr, postJournalEntry, logAudit } from '../services/ledgerService.js';
import { randomUUID } from 'crypto';

const router = express.Router();

// 1. Mileage Logs
router.get('/mileage', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT * FROM mileage_logs ORDER BY trip_date DESC');
    const formatted = result.rows.map(m => ({
      ...m,
      deduction_inr: toInr(m.calculated_deduction_paise),
    }));
    res.json({ success: true, trips: formatted });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/mileage', async (req, res) => {
  try {
    const db = await getDb();
    const { tripDate, startLocation, endLocation, distanceKm, purpose, vehicleName = 'Utility Truck' } = req.body;
    const tripId = `trip_${randomUUID()}`;
    const ratePerKmPaise = 1200; // ₹12/km
    const deductionPaise = Math.round(Number(distanceKm || 0) * ratePerKmPaise);

    await db.query(`
      INSERT INTO mileage_logs (id, trip_date, start_location, end_location, distance_km, rate_per_km_paise, calculated_deduction_paise, purpose, vehicle_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [tripId, tripDate || new Date().toISOString().split('T')[0], startLocation, endLocation, distanceKm, ratePerKmPaise, deductionPaise, purpose, vehicleName]);

    res.json({ success: true, tripId, deductionInr: (deductionPaise / 100).toFixed(2) });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 2. Projects & Timesheets
router.get('/projects', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT p.*, c.display_name as customer_name
      FROM projects p
      LEFT JOIN contacts c ON p.customer_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/timesheets', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT te.*, p.name as project_name, u.name as user_name
      FROM time_entries te
      LEFT JOIN projects p ON te.project_id = p.id
      LEFT JOIN users u ON te.user_id = u.id
      ORDER BY te.work_date DESC
    `);
    res.json({ success: true, timeEntries: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 3. Payroll Run (Posts Double-Entry Journal)
router.post('/payroll/run', async (req, res) => {
  try {
    const { payPeriodStart, payPeriodEnd, payDate = new Date().toISOString().split('T')[0], totalGrossInr, totalTaxesInr } = req.body;
    const db = await getDb();

    const grossPaise = Math.round(Number(totalGrossInr || 125000) * 100);
    const taxPaise = Math.round(Number(totalTaxesInr || 25000) * 100);
    const netPaise = grossPaise - taxPaise;

    const runId = `pr_${randomUUID()}`;

    // Post double-entry journal:
    // Debit Payroll Expense (Gross)
    // Credit Payroll Tax Liabilities (Tax Withholding)
    // Credit Bank Checking Account (Net Pay)
    const je = await postJournalEntry({
      entryNumber: `JE-PAYROLL-${Date.now().toString().slice(-4)}`,
      entryDate: payDate,
      sourceType: 'PAYROLL',
      narration: `Bi-weekly payroll run ending ${payPeriodEnd}`,
      sourceId: runId,
      lines: [
        { accountId: 'acc_6040', debitPaise: grossPaise, creditPaise: 0, description: 'Gross Wages & Compensation' },
        { accountId: 'acc_2200', debitPaise: 0, creditPaise: taxPaise, description: 'Employee Tax Withholdings (TDS/PF)' },
        { accountId: 'acc_1010', debitPaise: 0, creditPaise: netPaise, description: 'Net Direct Deposits via HDFC Checking' }
      ]
    });

    await db.query(`
      INSERT INTO payroll_runs (id, pay_period_start, pay_period_end, pay_date, total_gross_paise, total_taxes_paise, total_net_paise, status, journal_entry_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSED', $8)
    `, [runId, payPeriodStart || '2025-10-01', payPeriodEnd || '2025-10-15', payDate, grossPaise, taxPaise, netPaise, je.id]);

    res.json({
      success: true,
      message: 'Payroll run processed and posted to General Ledger',
      payrollRun: {
        id: runId,
        grossInr: (grossPaise / 100).toFixed(2),
        taxesInr: (taxPaise / 100).toFixed(2),
        netInr: (netPaise / 100).toFixed(2),
      }
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 4. Tax Summary
router.get('/taxes/summary', async (req, res) => {
  try {
    const db = await getDb();
    const invTax = await db.query('SELECT COALESCE(SUM(tax_paise), 0) as total_gst_collected FROM invoices WHERE status != \'VOID\'');
    const billTax = await db.query('SELECT COALESCE(SUM(tax_paise), 0) as total_itc FROM invoices WHERE status = \'PAID\'');

    const outputPaise = Number(invTax.rows[0]?.total_gst_collected || 0);
    const inputPaise = Math.round(outputPaise * 0.35); // 35% estimated ITC
    const netGstPayable = outputPaise - inputPaise;

    res.json({
      success: true,
      summary: {
        outputGstInr: toInr(outputPaise),
        inputCreditInr: toInr(inputPaise),
        netPayableInr: toInr(netGstPayable),
        filingDue: '20th of next month (GSTR-3B)',
        status: 'CURRENT'
      }
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 5. Lending Offers
router.get('/lending/offers', async (req, res) => {
  res.json({
    success: true,
    offers: [
      { id: 'lend_1', lender: 'HDFC Capital', amount: '₹15,00,000', term: '24 Months', apr: '10.5%', type: 'Working Capital Line', prequalified: true },
      { id: 'lend_2', lender: 'ICICI Business Growth', amount: '₹25,00,000', term: '36 Months', apr: '11.2%', type: 'Equipment Term Loan', prequalified: true }
    ]
  });
});

// 6. Marketing Campaigns
router.get('/marketing/campaigns', async (req, res) => {
  res.json({
    success: true,
    campaigns: [
      { id: 'mkt_1', name: 'Autumn Courtyard Landscaping Promo', channel: 'Google Ads & Instagram', spentInr: '25,000', leadsGenerated: 42, revenueInr: '1,45,000', roi: '480%' },
      { id: 'mkt_2', name: 'Commercial Resort Waterfall Refurbishment', channel: 'Direct Mail & Email', spentInr: '12,000', leadsGenerated: 18, revenueInr: '85,000', roi: '608%' }
    ]
  });
});

// 7. Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const db = await getDb();
    const limit = parseInt(req.query.limit || 1000);
    const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json({ success: true, logs: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 8. User Preferences
router.get('/user/preferences', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query('SELECT ui_preferences_json FROM users LIMIT 1');
    res.json({
      success: true,
      preferences: result.rows[0]?.ui_preferences_json || {
        privacy_mode_enabled: false,
        pinned_apps: ['bank_transactions', 'expense_transactions', 'sales_transactions']
      }
    });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.patch('/user/preferences', async (req, res) => {
  try {
    const db = await getDb();
    const prefs = req.body;
    await db.query(`
      UPDATE users
      SET ui_preferences_json = $1
      WHERE id = 'usr_1'
    `, [JSON.stringify(prefs)]);
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 9. Notifications & Integrations
router.get('/notifications', (req, res) => {
  res.json({
    success: true,
    notifications: [
      { id: 'notif_1', title: 'Bank Feeds Synced', message: 'HDFC Checking balance updated moments ago.', time: 'Just now', unread: true },
      { id: 'notif_2', title: 'Invoice #1002 Overdue', message: 'Sushi by Katsuyuki is past due by 15 days.', time: '2 hours ago', unread: true }
    ]
  });
});

router.get('/integrations', (req, res) => {
  res.json({
    success: true,
    integrations: [
      { id: 'int_1', name: 'Razorpay & UPI Payments', status: 'CONNECTED', category: 'Payments' },
      { id: 'int_2', name: 'HDFC NetBanking Direct Feed', status: 'CONNECTED', category: 'Banking' },
      { id: 'int_3', name: 'Tally Prime Export Bridge', status: 'AVAILABLE', category: 'Accounting' },
      { id: 'int_4', name: 'Shopify Store Connector', status: 'AVAILABLE', category: 'E-Commerce' }
    ]
  });
});

export default router;
