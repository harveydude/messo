import { getDb } from './db.js';

export async function seedInitialData(force = false) {
  const db = await getDb();

  // Check if companies exist
  try {
    const compCheck = await db.query('SELECT COUNT(*) as count FROM companies');
    if (parseInt(compCheck.rows[0]?.count || 0) > 0 && !force) {
      console.log('Database already contains enterprise seed data, skipping.');
      return;
    }
  } catch (err) {
    // If table didn't exist yet, proceed
  }

  console.log('--- Seeding Master QuickBooks Online 2026 Enterprise Dataset ---');

  // 1. Company Information
  await db.query(`
    INSERT INTO companies (
      id, name, legal_name, email, phone, website, industry,
      address_json, legal_address_json, tax_id_type, tax_id_number,
      business_type, accounting_method, multicurrency_enabled, home_currency, subscription_tier
    ) VALUES (
      'comp_1', 'Sample Company', 'Sample Company Pvt Ltd', 'hello@samplecompany.in', '+91 22 2845 6789', 'www.samplecompany.in', 'Landscaping & Design',
      '{"street":"65 Marine Drive","city":"Mumbai","state":"MH","zip":"400021","country":"India"}'::jsonb,
      '{"street":"65 Marine Drive","city":"Mumbai","state":"MH","zip":"400021","country":"India"}'::jsonb,
      'PAN', 'AABCC1234F', 'Private Limited', 'ACCRUAL', false, 'INR', 'PLUS'
    ) ON CONFLICT (id) DO NOTHING
  `);

  // 2. Users & Memberships
  const users = [
    { id: 'usr_1', name: 'Craig Carlson', email: 'craig@samplecompany.in', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'usr_2', name: 'Emily Platt', email: 'emily@samplecompany.in', role: 'ADMIN', status: 'ACTIVE' },
    { id: 'usr_3', name: 'John Johnson', email: 'john@samplecompany.in', role: 'TIME_TRACKING_ONLY', status: 'ACTIVE' },
    { id: 'usr_4', name: 'Priya Raghavan', email: 'priya@samplecompany.in', role: 'ACCOUNTANT', status: 'ACTIVE' },
    { id: 'usr_5', name: 'Marcus Bell', email: 'marcus@samplecompany.in', role: 'STANDARD', status: 'ACTIVE' },
  ];

  for (const u of users) {
    await db.query(
      `INSERT INTO users (id, company_id, name, email, role, status) VALUES ($1, 'comp_1', $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.name, u.email, u.role, u.status]
    );
  }

  // 3. Chart of Accounts (Standard Full Ledger)
  const coa = [
    // Assets
    { id: 'acc_1000', code: '1000', name: 'Cash on Hand', group: 'BALANCE_SHEET', type: 'ASSET', sub: 'cash', balance: 5000000 },
    { id: 'acc_1010', code: '1010', name: 'Checking Account (HDFC)', group: 'BALANCE_SHEET', type: 'BANK', sub: 'bank', balance: 12010000 },
    { id: 'acc_1015', code: '1015', name: 'Savings Reserve (SBI)', group: 'BALANCE_SHEET', type: 'BANK', sub: 'bank', balance: 50000000 },
    { id: 'acc_1020', code: '1020', name: 'Mastercard Credit Account', group: 'BALANCE_SHEET', type: 'CREDIT_CARD', sub: 'credit_card', balance: 1577200 },
    { id: 'acc_1100', code: '1100', name: 'Accounts Receivable', group: 'BALANCE_SHEET', type: 'ACCOUNTS_RECEIVABLE', sub: 'receivable', balance: 28500000 },
    { id: 'acc_1200', code: '1200', name: 'Inventory Asset', group: 'BALANCE_SHEET', type: 'INVENTORY', sub: 'inventory', balance: 5000000 },
    { id: 'acc_1500', code: '1500', name: 'Machinery & Equipment', group: 'BALANCE_SHEET', type: 'FIXED_ASSET', sub: 'fixed_asset', balance: 134950000 },
    { id: 'acc_2110', code: '2110', name: 'GST Input Tax Credit (ITC)', group: 'BALANCE_SHEET', type: 'ASSET', sub: 'tax', balance: 120000 },

    // Liabilities
    { id: 'acc_2000', code: '2000', name: 'Accounts Payable', group: 'BALANCE_SHEET', type: 'ACCOUNTS_PAYABLE', sub: 'payable', balance: 16026700 },
    { id: 'acc_2100', code: '2100', name: 'GST Output Payable (18%)', group: 'BALANCE_SHEET', type: 'TAX_PAYABLE', sub: 'tax', balance: 450000 },
    { id: 'acc_2200', code: '2200', name: 'Payroll Liabilities', group: 'BALANCE_SHEET', type: 'LIABILITY', sub: 'payroll', balance: 2500000 },

    // Equity
    { id: 'acc_3000', code: '3000', name: "Owner's Equity", group: 'BALANCE_SHEET', type: 'EQUITY', sub: 'equity', balance: 100000000 },
    { id: 'acc_3900', code: '3900', name: 'Retained Earnings', group: 'BALANCE_SHEET', type: 'EQUITY', sub: 'equity', balance: 54933000 },

    // Income
    { id: 'acc_4000', code: '4000', name: 'Sales Revenue', group: 'PROFIT_AND_LOSS', type: 'INCOME', sub: 'revenue', balance: 83470000 },
    { id: 'acc_4010', code: '4010', name: 'Design Services Income', group: 'PROFIT_AND_LOSS', type: 'INCOME', sub: 'revenue', balance: 35000000 },
    { id: 'acc_4020', code: '4020', name: 'Installation & Maintenance Services', group: 'PROFIT_AND_LOSS', type: 'INCOME', sub: 'revenue', balance: 25000000 },

    // Expenses & COGS
    { id: 'acc_5000', code: '5000', name: 'Cost of Goods Sold (Job Materials)', group: 'PROFIT_AND_LOSS', type: 'COGS', sub: 'cogs', balance: 11170000 },
    { id: 'acc_6000', code: '6000', name: 'Automobile & Fuel Expenses', group: 'PROFIT_AND_LOSS', type: 'EXPENSE', sub: 'expense', balance: 700000 },
    { id: 'acc_6010', code: '6010', name: 'Legal & Professional Fees', group: 'PROFIT_AND_LOSS', type: 'EXPENSE', sub: 'expense', balance: 900000 },
    { id: 'acc_6020', code: '6020', name: 'Office Supplies & Software', group: 'PROFIT_AND_LOSS', type: 'EXPENSE', sub: 'expense', balance: 482000 },
    { id: 'acc_6030', code: '6030', name: 'Advertising & Marketing', group: 'PROFIT_AND_LOSS', type: 'EXPENSE', sub: 'expense', balance: 350000 },
    { id: 'acc_6040', code: '6040', name: 'Payroll Expense (Gross Wages)', group: 'PROFIT_AND_LOSS', type: 'EXPENSE', sub: 'expense', balance: 12500000 },
  ];

  for (const a of coa) {
    await db.query(`
      INSERT INTO chart_of_accounts (id, code, name, statement_group, account_type, sub_type, cached_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, cached_balance_paise = EXCLUDED.cached_balance_paise
    `, [a.id, a.code, a.name, a.group, a.type, a.sub, a.balance]);

    // Backwards compatibility sync with accounts table
    await db.query(`
      INSERT INTO accounts (id, code, name, type, sub_type, balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, balance_paise = EXCLUDED.balance_paise
    `, [a.id, a.code, a.name, a.type.toLowerCase(), a.sub, a.balance]);
  }

  // 4. 10 Customers & Leads
  const contacts = [
    { id: 'cust_1', type: 'CUSTOMER', name: 'Cool Cars', first: 'Gaurav', last: 'Parikh', company: 'Cool Cars Pvt Ltd', email: 'Cool_Cars@meso.in', phone: '+91 98201 23456', address: '65 Marine Drive, Nariman Point, Mumbai, MH 400021', gstin: '27AABCC1234F1Z5', balance: 5860000 },
    { id: 'cust_2', type: 'CUSTOMER', name: "Amy's Bird Sanctuary", first: 'Amy', last: 'Bird', company: "Amy's Bird Sanctuary", email: 'amy@birdsanctuary.in', phone: '+91 98111 87654', address: '456 Oak Avenue, Indiranagar, Bengaluru, KA 560038', gstin: '29ABCDE5678G1Z2', balance: 3620700 },
    { id: 'cust_3', type: 'CUSTOMER', name: 'Paulsen Medical Supplies', first: 'Paul', last: 'Paulsen', company: 'Paulsen Medical Supplies', email: 'paul@medicalsupplies.in', phone: '+91 98302 99887', address: '789 Pine Street, Park Circus, Kolkata, WB 700017', gstin: '19AAAAA0000A1Z5', balance: 0 },
    { id: 'cust_4', type: 'CUSTOMER', name: 'Sushi by Katsuyuki', first: 'Katsuyuki', last: 'Sushi', company: 'Sushi Katsuyuki Hospitality', email: 'katsuyuki@sushidelhi.in', phone: '+91 98101 11223', address: 'Connaught Place, Block B, New Delhi, DL 110001', gstin: '07BBBBB2222B1Z8', balance: 4800000 },
    { id: 'cust_5', type: 'CUSTOMER', name: 'Island Events', first: 'Island', last: 'Events', company: 'Island Events & Decor', email: 'island@eventschennai.in', phone: '+91 98401 55667', address: '12 Beach Road, ECR, Chennai, TN 600041', gstin: '33CCCCC3333C1Z1', balance: 0 },
    { id: 'cust_6', type: 'CUSTOMER', name: "Bill's Windsurf Shop", first: 'Bill', last: 'Windsurf', company: "Bill's Water Sports Goa", email: 'bill@windsurfgoa.in', phone: '+91 98221 44556', address: 'Calangute Beach Road, Goa, GA 403516', gstin: '30DDDDD4444D1Z4', balance: 1850000 },
    { id: 'cust_7', type: 'CUSTOMER', name: 'Diego Rodriguez', first: 'Diego', last: 'Rodriguez', company: 'Rodriguez Architect Studio', email: 'diego@rodriguezarch.in', phone: '+91 98901 77889', address: 'Koregaon Park, Lane 5, Pune, MH 411001', gstin: '27EEEEE5555E1Z7', balance: 0 },
    { id: 'cust_8', type: 'CUSTOMER', name: 'Dukes Basketball Camp', first: 'Duke', last: 'Ellington', company: 'Dukes Youth Sports Trust', email: 'duke@dukesports.in', phone: '+91 98490 22334', address: 'Banjara Hills, Road 12, Hyderabad, TS 500034', gstin: '36FFFFF6666F1Z9', balance: 2500000 },
    { id: 'cust_9', type: 'CUSTOMER', name: 'Dylan Sollfrank', first: 'Dylan', last: 'Sollfrank', company: 'Sollfrank Industrial Tech', email: 'dylan@sollfrank.in', phone: '+91 98250 88990', address: 'SG Highway, Bodakdev, Ahmedabad, GJ 380054', gstin: '24GGGGG7777G1Z2', balance: 0 },
    { id: 'cust_10', type: 'CUSTOMER', name: 'Fountain Masters', first: 'Francis', last: 'Miller', company: 'Fountain Masters Resort Decor', email: 'francis@fountainmasters.in', phone: '+91 98290 66778', address: 'MI Road, C-Scheme, Jaipur, RJ 302001', gstin: '08HHHHH8888H1Z5', balance: 4200000 },
  ];

  for (const c of contacts) {
    await db.query(`
      INSERT INTO contacts (id, type, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin, opening_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, opening_balance_paise = EXCLUDED.opening_balance_paise
    `, [c.id, c.type, c.name, c.first, c.last, c.company, c.email, c.phone, c.address, c.gstin, c.balance]);

    // Legacy sync
    await db.query(`
      INSERT INTO customers (id, display_name, first_name, last_name, company_name, email, phone, billing_address, gstin)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    `, [c.id, c.name, c.first, c.last, c.company, c.email, c.phone, c.address, c.gstin]);
  }

  // 5. 8 Vendors
  const vendors = [
    { id: 'vend_1', name: 'Hicks Hardware', company: 'Hicks Hardware & Tools', email: 'orders@hickshardware.in', phone: '+91 98450 11223', address: 'Plot 12, Industrial Area, Thane West, MH 400604', gstin: '27BBBBB1111B1Z2', balance: 2287500 },
    { id: 'vend_2', name: 'Cal Telephone', company: 'Cal Telecom & Fiber', email: 'billing@caltelecom.in', phone: '+91 98765 43210', address: 'Tower 4, Cyber City, Gurugram, HR 122002', gstin: '06CCCCC2222C1Z3', balance: 540000 },
    { id: 'vend_3', name: 'Brosnahan Insurance', company: 'Brosnahan Commercial Risk Brokers', email: 'claims@brosnahan.in', phone: '+91 99001 22334', address: 'Nariman Bhavan, 8th Floor, Mumbai, MH 400021', gstin: '27DDDDD3333D1Z4', balance: 8476700 },
    { id: 'vend_4', name: 'Office Supplies Co', company: 'Office Supplies Hub India', email: 'sales@officesupplies.in', phone: '+91 98112 33445', address: 'Sector 62, Electronic City, Noida, UP 201309', gstin: '09EEEEE5555E1Z6', balance: 0 },
    { id: 'vend_5', name: 'Utility Power', company: 'Torrent Energy & Power', email: 'billing@utilitypower.in', phone: '+91 98800 66778', address: 'MG Road, Commercial Complex, Bengaluru, KA 560001', gstin: '29FFFFF6666F1Z8', balance: 0 },
    { id: 'vend_6', name: 'A Rental Equipment', company: 'A Rental Backhoe & Heavy Machinery', email: 'rentals@arental.in', phone: '+91 98200 44332', address: 'MIDC Rabale, Navi Mumbai, MH 400701', gstin: '27GGGGG7777G1Z0', balance: 12000000 },
    { id: 'vend_7', name: "Bob's Burger Joint", company: 'Bobs Hospitality & Catering', email: 'catering@bobs.in', phone: '+91 98209 11223', address: 'Bandra West, Mumbai, MH 400050', gstin: '27HHHHH8888H1Z3', balance: 0 },
    { id: 'vend_8', name: 'Robertson Associates', company: 'Robertson Chartered Accountants', email: 'audit@robertsonca.in', phone: '+91 98109 99887', address: 'Barakhamba Road, New Delhi, DL 110001', gstin: '07IIIII9999I1Z5', balance: 900000 },
  ];

  for (const v of vendors) {
    await db.query(`
      INSERT INTO contacts (id, type, display_name, company_name, email, phone, billing_address, gstin, opening_balance_paise)
      VALUES ($1, 'VENDOR', $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, opening_balance_paise = EXCLUDED.opening_balance_paise
    `, [v.id, v.name, v.company, v.email, v.phone, v.address, v.gstin, v.balance]);

    // Legacy sync
    await db.query(`
      INSERT INTO vendors (id, display_name, company_name, email, phone, address, gstin, open_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, open_balance_paise = EXCLUDED.open_balance_paise
    `, [v.id, v.name, v.company, v.email, v.phone, v.address, v.gstin, v.balance]);
  }

  // 6. Products & Services Catalog
  const products = [
    { id: 'prod_1', name: 'Garden & Landscape Design', sku: 'DSGN-01', type: 'SERVICE', price: 750000, cost: 0, taxable: true, incomeAcc: 'acc_4010', cogsAcc: 'acc_5000' },
    { id: 'prod_2', name: 'Ready-mix Concrete (Grade M25)', sku: 'MAT-CONC', type: 'INVENTORY', price: 450000, cost: 250000, taxable: true, incomeAcc: 'acc_4000', cogsAcc: 'acc_5000', qty: 50 },
    { id: 'prod_3', name: 'Submersible Fountain Pump 1HP', sku: 'PUMP-1HP', type: 'INVENTORY', price: 185000, cost: 95000, taxable: true, incomeAcc: 'acc_4000', cogsAcc: 'acc_5000', qty: 25 },
    { id: 'prod_4', name: 'Natural Rock Fountain Set', sku: 'FNTN-RCK', type: 'INVENTORY', price: 2750000, cost: 1400000, taxable: true, incomeAcc: 'acc_4000', cogsAcc: 'acc_5000', qty: 4 },
    { id: 'prod_5', name: 'Outdoor LED Garden Lighting', sku: 'LGT-OUT', type: 'NON_INVENTORY', price: 450000, cost: 280000, taxable: true, incomeAcc: 'acc_4000', cogsAcc: 'acc_5000' },
    { id: 'prod_6', name: 'Site Installation & Labor', sku: 'LABR-INST', type: 'SERVICE', price: 500000, cost: 250000, taxable: true, incomeAcc: 'acc_4020', cogsAcc: 'acc_5000' },
  ];

  for (const p of products) {
    await db.query(`
      INSERT INTO products_and_services (id, name, sku, type, sales_price_paise, purchase_cost_paise, quantity_on_hand, income_account_id, expense_or_cogs_account_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING
    `, [p.id, p.name, p.sku, p.type, p.price, p.cost, p.qty || 0, p.incomeAcc, p.cogsAcc]);
  }

  // 7. Invoices (including Overdue Orange ones)
  const sampleInvoices = [
    { id: 'inv_1001', num: '1001', custId: 'cust_1', date: '2025-10-01', due: '2025-10-31', status: 'SENT', subtotal: 3700000, tax: 666000, total: 4366000, dueBal: 4366000 },
    { id: 'inv_1002', num: '1002', custId: 'cust_4', date: '2025-09-15', due: '2025-10-15', status: 'OVERDUE', subtotal: 4800000, tax: 864000, total: 5664000, dueBal: 5664000 },
    { id: 'inv_1003', num: '1003', custId: 'cust_2', date: '2025-08-20', due: '2025-09-19', status: 'PAID', subtotal: 3200000, tax: 576000, total: 3776000, dueBal: 0 },
    { id: 'inv_1004', num: '1004', custId: 'cust_3', date: '2025-09-05', due: '2025-10-05', status: 'PAID', subtotal: 14200000, tax: 2556000, total: 16756000, dueBal: 0 },
    { id: 'inv_1005', num: '1005', custId: 'cust_5', date: '2025-09-18', due: '2025-10-18', status: 'PAID', subtotal: 6750000, tax: 1215000, total: 7965000, dueBal: 0 },
    { id: 'inv_1037', num: '1037', custId: 'cust_2', date: '2025-09-27', due: '2025-10-27', status: 'OVERDUE', subtotal: 3620700, tax: 0, total: 3620700, dueBal: 3620700 },
    { id: 'inv_1038', num: '1038', custId: 'cust_1', date: '2025-10-24', due: '2025-11-23', status: 'SENT', subtotal: 2000000, tax: 360000, total: 2160000, dueBal: 2160000 },
  ];

  for (const inv of sampleInvoices) {
    await db.query(`
      INSERT INTO invoices (id, invoice_number, customer_id, issue_date, due_date, status, subtotal_paise, tax_paise, total_paise, balance_due_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (invoice_number) DO UPDATE SET status = EXCLUDED.status, balance_due_paise = EXCLUDED.balance_due_paise
    `, [inv.id, inv.num, inv.custId, inv.date, inv.due, inv.status, inv.subtotal, inv.tax, inv.total, inv.dueBal]);
  }

  // 8. Bills & Expenses
  const sampleBills = [
    { id: 'bill_101', num: 'BILL-101', vendId: 'vend_1', date: '2025-10-10', due: '2025-11-09', status: 'UNPAID', amount: 2287500 },
    { id: 'bill_102', num: 'BILL-102', vendId: 'vend_2', date: '2025-10-15', due: '2025-11-14', status: 'UNPAID', amount: 540000 },
    { id: 'bill_103', num: 'BILL-103', vendId: 'vend_3', date: '2025-10-01', due: '2025-10-31', status: 'UNPAID', amount: 8476700 },
    { id: 'bill_104', num: 'BILL-104', vendId: 'vend_4', date: '2025-09-12', due: '2025-10-12', status: 'PAID', amount: 1250000 },
  ];

  for (const b of sampleBills) {
    await db.query(`
      INSERT INTO bills (id, bill_number, vendor_id, bill_date, due_date, status, amount_paise, open_balance_paise)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [b.id, b.num, b.vendId, b.date, b.due, b.status, b.amount, b.status === 'PAID' ? 0 : b.amount]);
  }

  // 9. Bank Connections & Feeds
  await db.query(`
    INSERT INTO bank_connections (id, chart_of_account_id, institution_name, masked_account_number, account_type, bank_balance_paise, in_books_balance_paise)
    VALUES
      ('bc_hdfc', 'acc_1010', 'HDFC Bank Corporate', '•••• 4021', 'CHECKING', 12010000, 12010000),
      ('bc_sbi', 'acc_1015', 'SBI Treasury Savings', '•••• 9182', 'SAVINGS', 50000000, 50000000),
      ('bc_mc', 'acc_1020', 'Mastercard Business Credit', '•••• 7712', 'CREDIT_CARD', 1577200, 1577200)
    ON CONFLICT (id) DO NOTHING
  `);

  const sampleBankFeed = [
    { id: 'bt_1', account: '1010', date: '2025-11-24', desc: 'Books By Bessie - Graphic Assets', payee: 'Books By Bessie', spent: 0, received: 550000, status: 'FOR_REVIEW', action: 'Add' },
    { id: 'bt_2', account: '1010', date: '2025-10-25', desc: 'A Rental - Backhoe Deposit Refund', payee: 'Cool Cars', spent: 0, received: 2000000, status: 'FOR_REVIEW', action: 'Add' },
    { id: 'bt_3', account: '1010', date: '2025-10-25', desc: 'A Rental Equipment Hire', payee: 'A Rental Equipment', spent: 12000000, received: 0, status: 'FOR_REVIEW', action: 'Add' },
    { id: 'bt_4', account: '1010', date: '2025-09-29', desc: 'Client Direct Deposit ₹86,815.00', payee: 'Paulsen Medical Supplies', spent: 0, received: 8681500, status: 'MATCHED', action: 'Match', matchDetail: 'Deposit 09/29/2025 ₹86,815' },
    { id: 'bt_5', account: '1010', date: '2025-09-29', desc: 'Hicks Hardware Electronic Check', payee: 'Hicks Hardware', spent: 2287500, received: 0, status: 'MATCHED', action: 'Match', matchDetail: 'Check 75 ₹22,875 Hicks Hardware' },
  ];

  for (const bf of sampleBankFeed) {
    await db.query(`
      INSERT INTO bank_transactions (id, account_code, date, description, payee, spent_paise, received_paise, status, action, match_detail)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [bf.id, bf.account, bf.date, bf.desc, bf.payee, bf.spent, bf.received, bf.status, bf.action, bf.matchDetail]);
  }

  // 10. AI Business Feed Items (Intuit Assist)
  const feedItems = [
    {
      id: 'feed_1',
      category: 'OVERDUE_INVOICE',
      title: '2 Invoices are past due by 15+ days',
      summary: 'Sushi by Katsuyuki (₹56,640) and Amy\'s Bird Sanctuary (₹36,207) are overdue. Meso AI can generate a polite WhatsApp/Email reminder.',
      actionLabel: 'Send AI Reminder',
      payload: { invoiceIds: ['inv_1002', 'inv_1037'] }
    },
    {
      id: 'feed_2',
      category: 'UNCATEGORIZED_TXN',
      title: '3 Bank transactions awaiting review',
      summary: '₹1,45,500 in recent movements from HDFC Checking require categorization to update your Profit & Loss.',
      actionLabel: 'Review Bank Feed',
      payload: { route: 'bank_transactions' }
    },
    {
      id: 'feed_3',
      category: 'CASH_FLOW_ALERT',
      title: 'Healthy Q4 Cash Runway Projected',
      summary: 'With ₹1,20,100 in checking and ₹2,85,000 in open receivables, your 30-day operational runway is optimal.',
      actionLabel: 'View Cash Flow',
      payload: { route: 'cashflow' }
    }
  ];

  for (const fi of feedItems) {
    await db.query(`
      INSERT INTO ai_business_feed_items (id, category, title, summary_text, action_label, action_payload_json)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO NOTHING
    `, [fi.id, fi.category, fi.title, fi.summary, fi.actionLabel, JSON.stringify(fi.payload)]);
  }

  // 11. Mileage, Projects, Time Entries & Employees
  await db.query(`
    INSERT INTO mileage_logs (id, trip_date, start_location, end_location, distance_km, rate_per_km_paise, calculated_deduction_paise, purpose, vehicle_name)
    VALUES
      ('trip_1', '2025-10-18', 'Bandra Office', 'Nariman Point Cool Cars Site', 32.5, 1200, 39000, 'Site Survey & Fountain Estimation', 'Utility Truck MH-02'),
      ('trip_2', '2025-10-21', 'Thane Depot', 'Indiranagar Nursery', 48.0, 1200, 57600, 'Procurement of Rock Sculptures', 'Utility Truck MH-02')
    ON CONFLICT (id) DO NOTHING
  `);

  await db.query(`
    INSERT INTO projects (id, customer_id, name, status, budget_paise)
    VALUES
      ('proj_1', 'cust_1', 'Commercial Courtyard Fountains', 'IN_PROGRESS', 50000000),
      ('proj_2', 'cust_2', 'Aviary Natural Waterfall Installation', 'IN_PROGRESS', 35000000)
    ON CONFLICT (id) DO NOTHING
  `);

  await db.query(`
    INSERT INTO time_entries (id, project_id, user_id, work_date, hours, hourly_rate_paise, billable, invoiced, notes)
    VALUES
      ('te_1', 'proj_1', 'usr_3', '2025-10-22', 7.5, 250000, true, false, 'Hydraulic pump fittings & electrical conduit piping'),
      ('te_2', 'proj_1', 'usr_5', '2025-10-23', 5.0, 400000, true, false, 'Site design review and civil landscaping supervision')
    ON CONFLICT (id) DO NOTHING
  `);

  await db.query(`
    INSERT INTO employees (id, name, email, role, compensation_type, pay_rate_paise)
    VALUES
      ('emp_1', 'John Johnson', 'john@samplecompany.in', 'Field Crew Lead', 'HOURLY', 250000),
      ('emp_2', 'Marcus Bell', 'marcus@samplecompany.in', 'Estimator & Architect', 'SALARY', 6500000),
      ('emp_3', 'Emily Platt', 'emily@samplecompany.in', 'Head Bookkeeper', 'SALARY', 7500000)
    ON CONFLICT (id) DO NOTHING
  `);

  // 12. Audit Logs matching Section 7 / frame_507.jpg
  const sampleAuditLogs = [
    {
      id: 'aud_1',
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: 'comp_1',
      eventSummary: 'Enabled multi-currency',
      tz: 'Australian Eastern Daylight Time',
      createdAt: '2025-10-24T13:45:00+11:00'
    },
    {
      id: 'aud_2',
      action: 'AUTH',
      entityType: 'USER',
      entityId: 'usr_1',
      eventSummary: 'Signed in',
      tz: 'Australian Eastern Daylight Time',
      createdAt: '2025-10-24T13:40:00+11:00'
    },
    {
      id: 'aud_3',
      action: 'UPDATE',
      entityType: 'SETTINGS',
      entityId: 'comp_1',
      eventSummary: 'Edited Account and Settings',
      tz: 'Australian Eastern Daylight Time',
      createdAt: '2025-10-24T13:42:00+11:00'
    },
    {
      id: 'aud_4',
      action: 'CREATE',
      entityType: 'INVOICE',
      entityId: 'inv_1038',
      eventSummary: 'Added Invoice #1038',
      tz: 'Australian Eastern Daylight Time',
      createdAt: '2025-10-24T11:20:00+11:00'
    },
    {
      id: 'aud_5',
      action: 'CREATE',
      entityType: 'EXPENSE',
      entityId: 'exp_501',
      eventSummary: 'Added Expense #EXP-501',
      tz: 'Australian Eastern Daylight Time',
      createdAt: '2025-10-23T16:15:00+11:00'
    }
  ];

  for (const aud of sampleAuditLogs) {
    await db.query(`
      INSERT INTO audit_logs (id, company_id, user_id, action, entity_type, entity_id, event_summary, timezone_label, created_at)
      VALUES ($1, 'comp_1', 'usr_1', $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [aud.id, aud.action, aud.entityType, aud.entityId, aud.eventSummary, aud.tz, aud.createdAt]);
  }

  // 13. Populate products_services and transactions tables from Section 4
  for (const p of products) {
    await db.query(`
      INSERT INTO products_services (id, item_type, name, sku, sales_price, purchase_cost, qty_on_hand)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO NOTHING
    `, [p.id, p.type, p.name, p.sku, p.price / 100, p.cost / 100, p.qty || 0]);
  }

  for (const inv of sampleInvoices) {
    await db.query(`
      INSERT INTO transactions (id, txn_type, doc_number, txn_date, due_date, contact_id, is_posting, subtotal, tax_amount, total_amount, balance_due, status)
      VALUES ($1, 'INVOICE', $2, $3, $4, $5, true, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO NOTHING
    `, [inv.id, inv.num, inv.date, inv.due, inv.custId, inv.subtotal / 100, inv.tax / 100, inv.total / 100, inv.dueBal / 100, inv.status]);
  }

  for (const b of sampleBills) {
    await db.query(`
      INSERT INTO transactions (id, txn_type, doc_number, txn_date, due_date, contact_id, is_posting, subtotal, total_amount, balance_due, status)
      VALUES ($1, 'BILL', $2, $3, $4, $5, true, $6, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [b.id, b.num, b.date, b.due, b.vendId, b.amount / 100, b.status === 'PAID' ? 0 : b.amount / 100, b.status]);
  }

  // 14. Populate 25 Checking and 5 Mastercard bank_feed_transactions
  for (let i = 1; i <= 25; i++) {
    const isMatched = i % 4 === 0;
    const isSpent = i % 2 === 0;
    const amt = isSpent ? -((i * 450 + 250) / 10) : ((i * 800 + 500) / 10);
    await db.query(`
      INSERT INTO bank_feed_transactions (id, bank_account_id, posted_date, description, payee_name, amount, status, match_type)
      VALUES ($1, 'acc_1010', '2025-10-20', $2, $3, $4, 'FOR_REVIEW', $5)
      ON CONFLICT (id) DO NOTHING
    `, [
      `bft_chk_${i}`,
      isSpent ? `Vendor Payment #${1000 + i}` : `Customer Remittance #${2000 + i}`,
      isSpent ? 'Hicks Hardware' : 'Cool Cars',
      amt,
      isMatched ? 'EXACT_MATCH' : 'NONE'
    ]);
  }

  for (let i = 1; i <= 5; i++) {
    await db.query(`
      INSERT INTO bank_feed_transactions (id, bank_account_id, posted_date, description, payee_name, amount, status)
      VALUES ($1, 'acc_1020', '2025-10-21', $2, 'Office Supplies Co', $3, 'FOR_REVIEW')
      ON CONFLICT (id) DO NOTHING
    `, [`bft_mc_${i}`, `Mastercard Purchase #${i}`, -(i * 65.50)]);
  }

  console.log('✓ Master QuickBooks Online 2026 Enterprise Seed Complete.');
}
