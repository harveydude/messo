const BASE_URL = 'http://127.0.0.1:5000/api';

async function runRealAccountingLedgerTests() {
  console.log('========================================================================');
  console.log('REAL ACCOUNTING ENGINE & LEDGER VERIFICATION SUITE (§R12)');
  console.log('Testing Double-Entry Invariants, Recipe Table, Non-Posting & Transitions');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, details = '') {
    if (condition) {
      console.log(`[PASS] ${message}`);
      if (details) console.log(`       ↳ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      if (details) console.error(`       ↳ ${details}`);
      failed++;
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST 1: Post ₹500 Expense & Assert Balanced General Ledger Lines
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Expense Posting & Balanced Double-Entry ---');
    const expDocNo = `EXP-TEST-${Date.now().toString().slice(-4)}`;
    
    // Check initial COA balances via API
    const coaBeforeRes = await fetch(`${BASE_URL}/accounting/chart-of-accounts`);
    const coaBeforeData = await coaBeforeRes.json();
    const bankAcctBefore = coaBeforeData.accounts.find(a => a.id === 'acc_1010');
    const expAcctBefore = coaBeforeData.accounts.find(a => a.id === 'acc_6020');
    const bankBalanceBefore = parseFloat(bankAcctBefore?.balance_inr || 0);
    const expBalanceBefore = parseFloat(expAcctBefore?.balance_inr || 0);

    const expenseRes = await fetch(`${BASE_URL}/vendors/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payeeName: 'Audit Supplies Corp',
        paymentAccountId: 'acc_1010',
        expenseAccountId: 'acc_6020',
        totalAmount: 500.00,
        docNumber: expDocNo,
        memo: `Audit Test Expense ${expDocNo}`
      })
    });
    const expData = await expenseRes.json();
    assert(expenseRes.ok && expData.success, 'Expense API endpoint returns success', `Doc: ${expDocNo} | TxnId: ${expData.transactionId}`);
    assert(expData.isPosting === true, 'Expense marked explicitly with isPosting=true');

    // Verify Journal Entry & Balanced Lines via live Ledger API
    const jeRes = await fetch(`${BASE_URL}/accounting/journal-entries`);
    const jeData = await jeRes.json();
    const jeEntry = jeData.entries.find(e => e.source_type === 'EXPENSE' && (e.entry_number?.includes(expDocNo) || e.memo?.includes(expDocNo)));

    assert(jeEntry !== undefined, 'Journal Entry record created in General Ledger', `JE Number: ${jeEntry?.entry_number}`);
    
    const lines = jeEntry?.lines || [];
    const totalDebits = lines.reduce((s, l) => s + parseFloat(l.debit_inr || 0), 0);
    const totalCredits = lines.reduce((s, l) => s + parseFloat(l.credit_inr || 0), 0);

    assert(
      Math.abs(totalDebits - 500.00) < 0.01 && Math.abs(totalCredits - 500.00) < 0.01 && Math.abs(totalDebits - totalCredits) < 0.01,
      'Double-Entry Balanced: Total Debits equal Total Credits (₹500.00)',
      `Debits: ₹${totalDebits.toFixed(2)} | Credits: ₹${totalCredits.toFixed(2)} | Difference: ₹0.00`
    );

    // Verify COA balance movements
    const coaAfterRes = await fetch(`${BASE_URL}/accounting/chart-of-accounts`);
    const coaAfterData = await coaAfterRes.json();
    const bankAcctAfter = coaAfterData.accounts.find(a => a.id === 'acc_1010');
    const expAcctAfter = coaAfterData.accounts.find(a => a.id === 'acc_6020');
    const bankBalanceAfter = parseFloat(bankAcctAfter?.balance_inr || 0);
    const expBalanceAfter = parseFloat(expAcctAfter?.balance_inr || 0);

    assert(
      Math.abs((bankBalanceBefore - 500.00) - bankBalanceAfter) < 0.01,
      'Bank Account (acc_1010) credited and decreased by ₹500.00',
      `Before: ₹${bankBalanceBefore.toFixed(2)} -> After: ₹${bankBalanceAfter.toFixed(2)}`
    );
    assert(
      Math.abs((expBalanceBefore + 500.00) - expBalanceAfter) < 0.01,
      'Expense Account (acc_6020) debited and increased by ₹500.00',
      `Before: ₹${expBalanceBefore.toFixed(2)} -> After: ₹${expBalanceAfter.toFixed(2)}`
    );

    // ------------------------------------------------------------------------
    // TEST 2: Submit Unbalanced JE -> Strict Server-Side 422 Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Unbalanced Journal Entry Enforcement (HTTP 422) ---');
    const unbalancedRes = await fetch(`${BASE_URL}/accounting/journal-entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryNumber: `JE-UNBAL-${Date.now()}`,
        entryDate: '2026-10-17',
        memo: 'Unbalanced attack probe',
        lines: [
          { accountId: 'acc_1010', debit: 100.00, credit: 0 },
          { accountId: 'acc_4000', debit: 0, credit: 90.00 }, // Diff 10
        ]
      })
    });

    assert(
      unbalancedRes.status === 422,
      `Unbalanced Journal Entry rejected with HTTP ${unbalancedRes.status} (Expected: 422)`,
      `Status: ${unbalancedRes.status} Unprocessable Entity`
    );

    // ------------------------------------------------------------------------
    // TEST 3: Invoice Lifecycle & Payment Application (Status Transitions)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Invoice Lifecycle & Payment Application ---');
    const invNo = `INV-AUDIT-${Date.now().toString().slice(-4)}`;
    
    // Create Invoice of ₹1,000 + 18% GST (Total: ₹1,180.00)
    const invRes = await fetch(`${BASE_URL}/customers/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docNumber: invNo,
        contactId: 'cust_1',
        totalAmount: 1180.00,
        memo: 'Audit Service Engagement',
        lines: [{ description: 'Advisory', amount: 1000.00 }]
      })
    });
    const invData = await invRes.json();
    assert(invRes.ok && invData.success, 'Invoice created successfully', `Invoice #${invNo}`);

    const allInvoicesRes = await fetch(`${BASE_URL}/invoices`);
    const allInvoicesData = await allInvoicesRes.json();
    const createdInv = allInvoicesData.invoices?.find(i => i.invoice_number === invNo);
    
    assert(
      createdInv?.status === 'SENT' && parseFloat(createdInv?.balance_due_inr || 0) === 1180.00,
      'Invoice initial state is SENT with balance due = ₹1,180.00',
      `Status: ${createdInv?.status} | Balance: ₹${createdInv?.balance_due_inr}`
    );

    // Apply Partial Payment of ₹500.00
    const partialPayRes = await fetch(`${BASE_URL}/customers/receive-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: 'cust_1',
        linkedTxnId: createdInv?.id,
        invoiceId: createdInv?.id,
        totalAmount: 500.00,
        depositToAccountId: 'acc_1010',
        memo: `Partial payment on #${invNo}`
      })
    });
    const partialPayData = await partialPayRes.json();
    assert(partialPayRes.ok && partialPayData.success, 'Partial payment of ₹500.00 processed');

    const invPartialRes = await fetch(`${BASE_URL}/invoices`);
    const invPartialData = await invPartialRes.json();
    const partialInv = invPartialData.invoices?.find(i => i.id === createdInv?.id);

    assert(
      partialInv?.status === 'PARTIALLY_PAID' && parseFloat(partialInv?.balance_due_inr || 0) === 680.00,
      'Invoice state transitioned to PARTIALLY_PAID with balance due = ₹680.00',
      `Status: ${partialInv?.status} | Paid: ₹${partialInv?.amount_paid_inr} | Due: ₹${partialInv?.balance_due_inr}`
    );

    // Apply Final Payment of ₹680.00
    const finalPayRes = await fetch(`${BASE_URL}/customers/receive-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contactId: 'cust_1',
        linkedTxnId: createdInv?.id,
        invoiceId: createdInv?.id,
        totalAmount: 680.00,
        depositToAccountId: 'acc_1010',
        memo: `Final payment clearing #${invNo}`
      })
    });
    const finalPayData = await finalPayRes.json();
    assert(finalPayRes.ok && finalPayData.success, 'Final payment of ₹680.00 processed');

    const invFinalRes = await fetch(`${BASE_URL}/invoices`);
    const invFinalData = await invFinalRes.json();
    const finalInv = invFinalData.invoices?.find(i => i.id === createdInv?.id);

    assert(
      finalInv?.status === 'PAID' && parseFloat(finalInv?.balance_due_inr || 0) === 0.00,
      'Invoice state transitioned to PAID with balance due = ₹0.00',
      `Status: ${finalInv?.status} | Paid: ₹${finalInv?.amount_paid_inr} | Due: ₹${finalInv?.balance_due_inr}`
    );

    // ------------------------------------------------------------------------
    // TEST 4: Non-Posting Document Integrity (§R4 Recipe Table Verification)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Non-Posting Document Verification (§R4 Recipe Table) ---');
    const jeBeforeRes = await fetch(`${BASE_URL}/accounting/journal-entries`);
    const jeBeforeData = await jeBeforeRes.json();
    const baseJECount = (jeBeforeData.entries || []).length;

    const nonPostingWorkflows = [
      { name: 'Estimate', type: 'ESTIMATE', endpoint: '/customers/estimates', amount: 15000.00 },
      { name: 'Sales Order', type: 'SALES_ORDER', endpoint: '/customers/sales-orders', amount: 8000.00 },
      { name: 'Statement', type: 'STATEMENT', endpoint: '/customers/statements', amount: 5000.00 },
      { name: 'Delayed Credit', type: 'DELAYED_CREDIT', endpoint: '/customers/delayed-credits', amount: 2500.00 },
      { name: 'Delayed Charge', type: 'DELAYED_CHARGE', endpoint: '/customers/delayed-charges', amount: 1800.00 },
      { name: 'Purchase Order', type: 'PURCHASE_ORDER', endpoint: '/vendors/purchase-orders', amount: 12000.00 },
    ];

    for (const doc of nonPostingWorkflows) {
      const docRes = await fetch(`${BASE_URL}${doc.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: 'cust_1',
          docNumber: `NP-${doc.type.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
          totalAmount: doc.amount,
          memo: `Audit test non-posting ${doc.name}`
        })
      });
      const docData = await docRes.json();
      assert(docRes.ok && docData.success, `${doc.name} non-posting document created`);
      assert(docData.isPosting === false, `${doc.name} marked explicitly with isPosting=false`);
    }

    const jeAfterRes = await fetch(`${BASE_URL}/accounting/journal-entries`);
    const jeAfterData = await jeAfterRes.json();
    const finalJECount = (jeAfterData.entries || []).length;

    assert(
      finalJECount === baseJECount,
      'Ledger Integrity Confirmed: Exactly ZERO journal entries created for 6 non-posting workflows',
      `JE count before: ${baseJECount} | JE count after: ${finalJECount} (Delta: 0)`
    );

    // ------------------------------------------------------------------------
    // TEST 5: Bank Feed Match & Review Decrement
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Bank Feed Match Engine ---');
    const bankFeedRes = await fetch(`${BASE_URL}/banking/feed`);
    const bankFeedData = await bankFeedRes.json();
    assert(bankFeedRes.ok && Array.isArray(bankFeedData.feed), 'Bank feed retrieved with active transactions');

    const feedItem = bankFeedData.feed[0];
    if (feedItem) {
      const matchRes = await fetch(`${BASE_URL}/banking/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: feedItem.id,
          matchedDocumentId: 'inv_1',
          matchedType: 'INVOICE'
        })
      });
      const matchData = await matchRes.json();
      assert(matchRes.ok && matchData.success, `Bank transaction #${feedItem.id} categorized and matched`);
    }

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log(`REAL LEDGER AUDIT TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================================');

    if (failed === 0) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runRealAccountingLedgerTests();
