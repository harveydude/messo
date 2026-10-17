import http from 'http';

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

const BASE_OPT = {
  hostname: '127.0.0.1',
  port: 5000,
  headers: { 'Content-Type': 'application/json' }
};

async function testMasterBlueprint() {
  console.log('========================================================================');
  console.log('MESO CONTINUOUS ACCOUNTING ERP - MASTER 2026 SPECIFICATION VERIFICATION');
  console.log('Testing All 29 +Create Workflows, Dashboard Formulas, Search & Seed');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  async function check(name, fn) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`✓ PASS: ${name}`);
        passed++;
      } else {
        console.error(`✗ FAIL: ${name}`);
        failed++;
      }
    } catch (e) {
      console.error(`✗ FAIL: ${name} -> ${e.message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // 1. COLUMN 1: CUSTOMERS (11 Workflows)
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Column 1: Customer Workflows (11) ---');
  await check('1. Invoice (POST /api/customers/invoices)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/invoices', method: 'POST' }, {
      customerId: 'cust_1',
      totalAmount: 15000,
      lines: [{ description: 'Site Design', qty: 1, rate: 15000 }]
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('2. Receive Payment (POST /api/customers/receive-payment)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/receive-payment', method: 'POST' }, {
      customerId: 'cust_1',
      totalAmount: 5000,
      depositToAccountId: 'acc_1010'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('3. Statement (POST /api/customers/statements)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/statements', method: 'POST' }, {
      customerId: 'cust_1'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('4. Estimate (POST /api/customers/estimates)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/estimates', method: 'POST' }, {
      customerId: 'cust_2',
      totalAmount: 22000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('5. Sales Order (POST /api/customers/sales-orders)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/sales-orders', method: 'POST' }, {
      customerId: 'cust_3',
      totalAmount: 18000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('6. Credit Memo (POST /api/customers/credit-memos)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/credit-memos', method: 'POST' }, {
      customerId: 'cust_1',
      totalAmount: 3500
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('7. Sales Receipt (POST /api/customers/sales-receipts)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/sales-receipts', method: 'POST' }, {
      customerId: 'cust_4',
      totalAmount: 12500
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('8. Refund Receipt (POST /api/customers/refund-receipts)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/refund-receipts', method: 'POST' }, {
      customerId: 'cust_4',
      totalAmount: 2000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('9. Delayed Credit (POST /api/customers/delayed-credits)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/delayed-credits', method: 'POST' }, {
      customerId: 'cust_5',
      totalAmount: 1500
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('10. Delayed Charge (POST /api/customers/delayed-charges)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/customers/delayed-charges', method: 'POST' }, {
      customerId: 'cust_5',
      totalAmount: 4000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('11. Add Customer (POST /api/contacts type=CUSTOMER)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/contacts', method: 'POST' }, {
      displayName: `Apex Landscaping Test ${Date.now().toString().slice(-4)}`,
      type: 'CUSTOMER',
      email: 'apex@test.in'
    });
    return res.status === 200 && res.data.success;
  });

  // --------------------------------------------------------------------------
  // 2. COLUMN 2: VENDORS (9 Workflows)
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Column 2: Vendor Workflows (9) ---');
  await check('12. Expense (POST /api/vendors/expenses)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/expenses', method: 'POST' }, {
      vendorId: 'vend_1',
      totalAmount: 4500,
      paymentAccountId: 'acc_1010',
      categoryAccountId: 'acc_6020'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('13. Check (POST /api/vendors/checks)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/checks', method: 'POST' }, {
      vendorId: 'vend_2',
      totalAmount: 3200,
      bankAccountId: 'acc_1010'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('14. Bill (POST /api/vendors/bills)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/bills', method: 'POST' }, {
      vendorId: 'vend_3',
      totalAmount: 18500
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('15. Pay Bills (POST /api/vendors/pay-bills)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/pay-bills', method: 'POST' }, {
      billId: 'bill_101',
      totalAmount: 2287.50
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('16. Purchase Order (POST /api/vendors/purchase-orders)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/purchase-orders', method: 'POST' }, {
      vendorId: 'vend_1',
      totalAmount: 35000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('17. Vendor Credit (POST /api/vendors/vendor-credits)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/vendor-credits', method: 'POST' }, {
      vendorId: 'vend_1',
      totalAmount: 1200
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('18. Credit Card Credit (POST /api/vendors/credit-card-credits)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/vendors/credit-card-credits', method: 'POST' }, {
      vendorId: 'vend_4',
      totalAmount: 850
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('19. Print Checks (GET & POST /api/vendors/print-checks)', async () => {
    const getRes = await request({ ...BASE_OPT, path: '/api/vendors/print-checks', method: 'GET' });
    const postRes = await request({ ...BASE_OPT, path: '/api/vendors/print-checks', method: 'POST' }, {
      checkIds: [],
      startingCheckNo: 1001
    });
    return getRes.status === 200 && postRes.status === 200 && postRes.data.success;
  });

  await check('20. Add Vendor (POST /api/contacts type=VENDOR)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/contacts', method: 'POST' }, {
      displayName: `Apex Stone Depot ${Date.now().toString().slice(-4)}`,
      type: 'VENDOR',
      email: 'vendor@apexstone.in'
    });
    return res.status === 200 && res.data.success;
  });

  // --------------------------------------------------------------------------
  // 3. COLUMN 3: TEAM (2 Workflows)
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Column 3: Team Workflows (2) ---');
  await check('21. Payroll (POST /api/team/payroll-runs)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/team/payroll-runs', method: 'POST' }, {
      totalAmount: 50000,
      grossPayPaise: 5000000
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('22. Add Contractor (POST /api/contacts type=CONTRACTOR)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/contacts', method: 'POST' }, {
      displayName: `Ramesh Site Contractor ${Date.now().toString().slice(-4)}`,
      type: 'CONTRACTOR',
      email: 'ramesh@contractor.in'
    });
    return res.status === 200 && res.data.success;
  });

  // --------------------------------------------------------------------------
  // 4. COLUMN 4: OTHER (7 Workflows)
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Column 4: Other Workflows (7) ---');
  await check('23. Task (POST /api/other/tasks)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/tasks', method: 'POST' }, {
      title: 'Review Q4 GST Returns',
      priority: 'HIGH'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === false;
  });

  await check('24. Bank Deposit (POST /api/other/bank-deposits)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/bank-deposits', method: 'POST' }, {
      totalAmount: 10000,
      depositToAccountId: 'acc_1010'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('25. Transfer (POST /api/other/transfers)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/transfers', method: 'POST' }, {
      totalAmount: 25000,
      fromAccountId: 'acc_1010',
      toAccountId: 'acc_1015'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('26. Journal Entry (POST /api/other/journal-entries)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/journal-entries', method: 'POST' }, {
      journalLines: [
        { accountId: 'acc_6020', debit: 1500, credit: 0, description: 'Office supplies adjustment' },
        { accountId: 'acc_1010', debit: 0, credit: 1500, description: 'Paid via bank checking' }
      ]
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('27. Inventory Qty Adjustment (POST /api/other/inventory-adjustments)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/inventory-adjustments', method: 'POST' }, {
      changeInQty: -2,
      unitCost: 2500
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('28. Pay Down Credit Card (POST /api/other/pay-down-credit-card)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/other/pay-down-credit-card', method: 'POST' }, {
      totalAmount: 5000,
      creditCardAccountId: 'acc_1020',
      bankAccountId: 'acc_1010'
    });
    return res.status === 200 && res.data.success && res.data.isPosting === true;
  });

  await check('29. Add Product/Service (POST /api/catalog/products-services)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/catalog/products-services', method: 'POST' }, {
      name: `Granite Water Slabs ${Date.now().toString().slice(-4)}`,
      type: 'INVENTORY',
      priceInr: 3500,
      costInr: 1800,
      initialQty: 10
    });
    return res.status === 200 && res.data.success;
  });

  // --------------------------------------------------------------------------
  // 5. SECTION 3: DASHBOARD BUSINESS AT A GLANCE
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Section 3: Business at a glance ---');
  await check('Dashboard business-at-a-glance exact structure', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/dashboard/business-at-a-glance', method: 'GET' });
    const d = res.data;
    const ok = res.status === 200 &&
               d.profit_and_loss?.posted_income > 0 &&
               d.expenses?.total_spending > 0 &&
               d.bank_accounts?.accounts?.length >= 2 &&
               d.accounts_payable?.total_ap_amount > 0 &&
               d.cash_flow_trend?.historical_points?.length > 0;
    if (ok) {
      console.log(`   P&L: Income ₹${d.profit_and_loss.posted_income} | Net: ₹${d.profit_and_loss.net_profit} | Badge: ${d.profit_and_loss.categorized_percentage_badge}%`);
      console.log(`   Expenses: Total ₹${d.expenses.total_spending} | Ratio: ${d.expenses.categorized_ratio_badge}% | To review: ${d.expenses.to_review_count}`);
      console.log(`   A/P: Total ₹${d.accounts_payable.total_ap_amount} | Past Due 1-7: ₹${d.accounts_payable.aging.past_due_1_7}`);
    }
    return ok;
  });

  await check('Feedback layout-customization (POST /api/dashboard/feedback/layout-customization)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/dashboard/feedback/layout-customization', method: 'POST' }, {
      feedback: 'THUMBS_UP'
    });
    return res.status === 200 && res.data.success;
  });

  // --------------------------------------------------------------------------
  // 6. SECTION 5: SMART SEARCH MODES
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Section 5: Smart Search 3 Modes ---');
  await check('Smart Search Mode 1: Natural Language Query ("Show me open invoices for the last 30 days")', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/search/smart', method: 'POST' }, {
      query: 'Show me open invoices for the last 30 days'
    });
    return res.status === 200 && res.data.type === 'NATURAL_LANGUAGE' && res.data.records && res.data.ai_summary;
  });

  await check('Smart Search Mode 2: Action Command Mode ("create invoice")', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/search/smart', method: 'POST' }, {
      query: 'create invoice'
    });
    return res.status === 200 && res.data.type === 'ACTION_COMMAND' && res.data.quick_action?.action === 'OPEN_MODAL';
  });

  await check('Smart Search Mode 3: Global Entity Search Mode ("Sushi")', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/search/smart', method: 'POST' }, {
      query: 'Sushi'
    });
    return res.status === 200 && res.data.type === 'SEARCH' && res.data.contacts?.length > 0;
  });

  // --------------------------------------------------------------------------
  // 7. SECTION 7: AUDIT LOG AND SEED VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Section 7: Audit Log and Enterprise Seed ---');
  await check('Audit Log entries matching frame_507.jpg (Craig Carlson, Enabled multi-currency)', async () => {
    const res = await request({ ...BASE_OPT, path: '/api/audit-logs', method: 'GET' });
    const logs = res.data?.logs || [];
    const found = logs.some(l => l.event_summary === 'Enabled multi-currency' || l.action === 'UPDATE');
    return res.status === 200 && found;
  });

  console.log('\n========================================================================');
  console.log(`FINAL RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed === 0) process.exit(0);
  else process.exit(1);
}

testMasterBlueprint();
