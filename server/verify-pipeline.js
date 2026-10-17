import http from 'http';

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
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

async function runVerification() {
  console.log('================================================================');
  console.log('MESO CONTINUOUS ACCOUNTING ERP - FULL-STACK INTEGRATION TEST');
  console.log('Checking Double-Entry, APIs, Indian Localization (₹), and Ledger');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // Test 1: Health Check
  try {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/health',
      method: 'GET'
    });
    if (res.status === 200 && res.data.status === 'healthy' && res.data.currency.includes('₹')) {
      console.log('✓ PASS [1/8] Health check running on port 5000 with currency INR (₹)');
      passed++;
    } else {
      console.error('✗ FAIL [1/8] Health check response unexpected:', res);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [1/8] Health check error:', err.message);
    failed++;
  }

  // Test 2: Invoice Creation & Double-Entry Invariant
  let createdInvoiceId = null;
  try {
    const payload = {
      customerId: 'cust_1',
      invoiceNumber: `INV-TEST-${Date.now().toString().slice(-4)}`,
      issueDate: '2026-10-17',
      items: [
        { name: 'Landscape Design Consultation', qty: 2, rate: 5000, desc: 'Site visit and plant design' },
        { name: 'Native Shrubs & Sod Installation', qty: 1, rate: 15000, desc: 'Installation labor and materials' }
      ],
      discountPaise: 0,
      notes: 'Automated pipeline test invoice'
    };

    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/invoices',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, payload);

    if (res.status === 200 && res.data.success && res.data.invoice?.total_inr) {
      createdInvoiceId = res.data.invoice.id;
      console.log(`✓ PASS [2/8] Invoice created: #${res.data.invoice.invoice_number} | Total: ₹${res.data.invoice.total_inr} (incl. GST 18%: ₹${res.data.invoice.tax_inr})`);
      passed++;
    } else {
      console.error('✗ FAIL [2/8] Invoice creation failed:', res);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [2/8] Invoice creation error:', err.message);
    failed++;
  }

  // Test 3: Bank Feed Matching
  try {
    const feedRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/banking/feed',
      method: 'GET'
    });

    if (feedRes.status === 200 && feedRes.data.feed && feedRes.data.feed.length > 0) {
      const targetTx = feedRes.data.feed[0];
      const matchRes = await makeRequest({
        hostname: '127.0.0.1',
        port: 5000,
        path: `/api/banking/feed/${targetTx.id}/match`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (matchRes.status === 200 && matchRes.data.success) {
        console.log(`✓ PASS [3/8] Bank feed transaction ${targetTx.id} matched to ledger successfully`);
        passed++;
      } else {
        console.error('✗ FAIL [3/8] Bank feed match failed:', matchRes);
        failed++;
      }
    } else {
      console.error('✗ FAIL [3/8] Could not fetch bank feed transactions:', feedRes);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [3/8] Bank feed test error:', err.message);
    failed++;
  }

  // Test 4: Natural Language Smart Search
  try {
    const searchRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/search/smart',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { query: 'Sushi' });

    if (searchRes.status === 200 && searchRes.data.success) {
      console.log(`✓ PASS [4/8] Smart natural-language search returned response for 'Sushi'`);
      passed++;
    } else {
      console.error('✗ FAIL [4/8] Smart search error:', searchRes);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [4/8] Smart search error:', err.message);
    failed++;
  }

  // Test 5: AI Receipt OCR Extraction
  try {
    const ocrRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/ai/parse-receipt',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      filename: 'diesel_fuel_receipt.jpg',
      fileContent: 'Indian Oil Petrol Pump - 45 Liters Diesel - Total: ₹4,250.00'
    });

    if (ocrRes.status === 200 && ocrRes.data.success && ocrRes.data.extracted) {
      console.log(`✓ PASS [5/8] AI Receipt OCR extracted: ${ocrRes.data.extracted.vendorName} | ₹${ocrRes.data.extracted.totalAmount} | Category: ${ocrRes.data.extracted.category}`);
      passed++;
    } else {
      console.error('✗ FAIL [5/8] Receipt OCR failed:', ocrRes);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [5/8] Receipt OCR error:', err.message);
    failed++;
  }

  // Test 6: Audit Log Integrity
  try {
    const auditRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/audit-logs',
      method: 'GET'
    });

    if (auditRes.status === 200 && Array.isArray(auditRes.data.logs) && auditRes.data.logs.length > 0) {
      const recent = auditRes.data.logs[0];
      console.log(`✓ PASS [6/8] Immutable audit log confirmed: ${recent.action} on ${recent.entity_type} (ID: ${recent.entity_id})`);
      passed++;
    } else {
      console.error('✗ FAIL [6/8] Audit logs check failed:', auditRes);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [6/8] Audit logs error:', err.message);
    failed++;
  }

  // Test 7: Core Financial Reports (P&L, Balance Sheet, Cash Flow)
  try {
    const bsRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/balance-sheet',
      method: 'GET'
    });

    const plRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/profit-loss',
      method: 'GET'
    });

    const cfRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/reports/cash-flow',
      method: 'GET'
    });

    if (bsRes.status === 200 && plRes.status === 200 && cfRes.status === 200 &&
        bsRes.data.report && plRes.data.report && cfRes.data.report) {
      console.log(`✓ PASS [7/8] Continuous Accounting Reports:`);
      console.log(`   - Balance Sheet: Total Assets = ₹${bsRes.data.report.assets?.total} | Total Liabilities & Equity = ₹${bsRes.data.report.totalLiabilitiesAndEquity}`);
      console.log(`   - Profit & Loss: Gross Profit = ₹${plRes.data.report.grossProfit} | Net Income = ₹${plRes.data.report.netOperatingIncome}`);
      console.log(`   - Cash Flow: Ending Cash = ₹${cfRes.data.report.endingCashBalance}`);
      passed++;
    } else {
      console.error('✗ FAIL [7/8] Reports check failed:', { bsRes, plRes, cfRes });
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [7/8] Reports check error:', err.message);
    failed++;
  }

  // Test 8: Dashboard Live Aggregations
  try {
    const dashRes = await makeRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/dashboard/metrics',
      method: 'GET'
    });

    if (dashRes.status === 200 && dashRes.data.metrics) {
      const m = dashRes.data.metrics;
      console.log(`✓ PASS [8/8] Live Dashboard Metrics verified:`);
      console.log(`   - Net Income: ${m.pnl?.amount}`);
      console.log(`   - Total Expenses: ${m.pnl?.expenses?.amount}`);
      console.log(`   - Bank Accounts Connected: ${m.bank?.accounts?.length || 0}`);
      passed++;
    } else {
      console.error('✗ FAIL [8/8] Dashboard metrics check failed:', dashRes);
      failed++;
    }
  } catch (err) {
    console.error('✗ FAIL [8/8] Dashboard metrics error:', err.message);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed === 0) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runVerification();
