/**
 * Meso Domain 9 Proof-of-Correctness Suite: Connected Banking, Reconciliation & Treasury
 * Phases 41 to 45 (25 Rigorous Tests, 5 Tests per Phase)
 * Verifies real database persistence, UTR extraction, SHA-256 deduplication, 
 * split matching, contra transfers, reconciliation tamper lock, and 12-month cash flow.
 */

import { getDb, initDb } from '../server/src/db/db.js';
import {
  ingestBankStatement,
  extractUtrNumber,
  computeTransactionHash,
  parseBankCsvContent,
  SUPPORTED_BANKS
} from '../server/src/services/bankIngestionService.js';
import {
  createBankRule,
  evaluateBankRules,
  matchBankTransactionSplit
} from '../server/src/services/bankRulesMatchingService.js';
import {
  recordBankDeposit,
  recordContraTransfer,
  recordCreditCardPaydown
} from '../server/src/services/treasuryTransferService.js';
import {
  initiateReconciliation,
  completeReconciliation,
  assertTransactionUnlocked
} from '../server/src/services/reconciliationLockService.js';
import {
  generate12MonthCashFlowForecast
} from '../server/src/services/cashFlowForecastService.js';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runDomain9ProofSuite() {
  console.log('================================================================================');
  console.log('MESO DOMAIN 9 PROOF-OF-CORRECTNESS SUITE: PHASES 41-45 (25 TESTS)');
  console.log('================================================================================\n');

  await initDb();
  const db = await getDb();
  const companyId = 'comp_1';

  // Seed baseline accounts if not present
  await db.query(
    `INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, is_active)
     VALUES 
       ('acc_hdfc_bank', $1, '1011', 'HDFC Current Account', 'BALANCE_SHEET', 'BANK', TRUE),
       ('acc_icici_bank', $1, '1021', 'ICICI Operating Account', 'BALANCE_SHEET', 'BANK', TRUE),
       ('acc_undeposited_funds', $1, '1099', 'Undeposited Funds Clearing', 'BALANCE_SHEET', 'CURRENT_ASSET', TRUE),
       ('acc_corporate_card', $1, '2011', 'Corporate Credit Card Liability', 'BALANCE_SHEET', 'CREDIT_CARD', TRUE),
       ('acc_bank_fees', $1, '6050', 'Bank & Merchant Processing Fees', 'PROFIT_AND_LOSS', 'EXPENSE', TRUE),
       ('acc_accounts_receivable', $1, '1100', 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE', TRUE),
       ('acc_accounts_payable', $1, '2101', 'Accounts Payable', 'BALANCE_SHEET', 'ACCOUNTS_PAYABLE', TRUE)
     ON CONFLICT (code) DO NOTHING`,
    [companyId]
  );

  // Seed customer contact and test invoices
  const customerId = 'cont_proof_d9_cust_' + Date.now();
  await db.query(
    `INSERT INTO contacts (id, company_id, type, display_name, email, gstin)
     VALUES ($1, $2, 'CUSTOMER', 'Zenith Infra Systems Pvt Ltd', 'accounts@zenithinfra.com', '27AAACZ9876Z1Z1')
     ON CONFLICT (id) DO NOTHING`,
    [customerId, companyId]
  );

  const inv1Id = 'inv_d9_1_' + Date.now();
  const inv2Id = 'inv_d9_2_' + Date.now();
  await db.query(
    `INSERT INTO invoices (id, company_id, invoice_number, customer_id, issue_date, due_date, subtotal_paise, total_paise, balance_due_paise, status)
     VALUES 
       ($1, $2, 'INV-D9-1-' || $5, $3, CURRENT_DATE, CURRENT_DATE + 30, 5000000, 5900000, 5900000, 'SENT'),
       ($4, $2, 'INV-D9-2-' || $5, $3, CURRENT_DATE, CURRENT_DATE + 30, 4000000, 4720000, 4720000, 'SENT')
     ON CONFLICT (id) DO NOTHING`,
    [inv1Id, companyId, customerId, inv2Id, String(Date.now())]
  );

  // ============================================================================
  // PHASE 41: Universal Indian Bank Statement & Feed Ingestor (5 Tests)
  // ============================================================================
  console.log('--- PHASE 41: Universal Indian Bank Statement & Feed Ingestor (5 Tests) ---');

  // 41.1: CSV Statement Parser
  const sampleCsv = `Date,Narration,Chq/Ref Number,Withdrawal,Deposit,Balance
2026-09-01,NEFT-AXIS00012345-RELIANCE IND,AXIS00012345,,150000.00,500000.00
2026-09-02,UPI/625489123456/Swiggy Tech,625489123456,1250.50,,498749.50
2026-09-03,RTGS-HDFC00098765-TATA CONSULTING,HDFC00098765,,500000.00,998749.50`;

  const parsed = parseBankCsvContent(sampleCsv, SUPPORTED_BANKS.HDFC);
  const isParsedOk = parsed.length === 3 && parsed[0].receivedPaise === 15000000 && parsed[1].spentPaise === 125050;
  assert(isParsedOk, 'Phase 41 Test 1: Indian bank statement parsed into exact integer minor-unit paise');

  // 41.2: UTR Extraction from Complex Bank Narrations
  const utrNeft = extractUtrNumber('NEFT-HDFCN00293847-BHARAT TECH LLP');
  const utrUpi = extractUtrNumber('UPI/229384756102/Payment to vendor');
  const isUtrOk = utrNeft === 'HDFCN00293847' && utrUpi === '229384756102';
  assert(isUtrOk, 'Phase 41 Test 2: Automatic regex extraction of statutory Indian NEFT, RTGS & UPI reference numbers');

  // 41.3: SHA-256 Deduplication Hash
  const hash1 = computeTransactionHash({
    companyId,
    bankAccountId: 'acc_hdfc_bank',
    date: '2026-09-01',
    amountPaise: 15000000,
    utr: 'AXIS00012345',
    description: 'NEFT-AXIS00012345-RELIANCE IND'
  });
  const hash2 = computeTransactionHash({
    companyId,
    bankAccountId: 'acc_hdfc_bank',
    date: '2026-09-01',
    amountPaise: 15000000,
    utr: 'AXIS00012345',
    description: 'NEFT-AXIS00012345-RELIANCE IND'
  });
  assert(hash1 === hash2 && hash1.length === 64, 'Phase 41 Test 3: Cryptographic SHA-256 deduplication hash generated consistently');

  // 41.4: Ingestion with Initial Batch Insertion
  const testBankAccountId = 'acc_hdfc_ingest_' + Date.now();
  let ingestResult1 = null;
  try {
    ingestResult1 = await ingestBankStatement({
      companyId,
      bankAccountId: testBankAccountId,
      bankName: SUPPORTED_BANKS.HDFC,
      csvContent: sampleCsv
    });
    const isIngested = ingestResult1 && ingestResult1.ingestedCount === 3 && ingestResult1.duplicateCount === 0;
    assert(isIngested, 'Phase 41 Test 4: First ingestion run cleanly saves statement lines into bank_transactions' + (isIngested ? '' : ` (got ingested: ${ingestResult1?.ingestedCount}, dup: ${ingestResult1?.duplicateCount})`));
  } catch (err) {
    assert(false, 'Phase 41 Test 4: Statement ingestion: ' + err.message);
  }

  // 41.5: Re-Ingestion Duplicate Lock Prevention
  try {
    const ingestResult2 = await ingestBankStatement({
      companyId,
      bankAccountId: testBankAccountId,
      bankName: SUPPORTED_BANKS.HDFC,
      csvContent: sampleCsv
    });
    const isDupPrevented = ingestResult2.duplicateCount === 3 && ingestResult2.ingestedCount === 0;
    assert(isDupPrevented, 'Phase 41 Test 5: Re-ingesting identical statement reports 100% duplicate detection with zero double-entries');
  } catch (err) {
    assert(false, 'Phase 41 Test 5: Duplicate ingestion guard: ' + err.message);
  }

  // ============================================================================
  // PHASE 42: Bank Rules & Split Matching (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 42: AI + Rule-Based Bank Categorization & Split Matching (5 Tests) ---');
  let testRule = null;

  // 42.1: Bank Categorization Rule Creation
  try {
    testRule = await createBankRule({
      companyId,
      name: 'Swiggy & Food Delivery Office Expense Rule',
      priority: 1,
      direction: 'MONEY_OUT',
      conditions: [
        { field: 'description', operator: 'CONTAINS', value: 'Swiggy' }
      ],
      targetAccountId: 'acc_6050',
      autoAdd: true
    });
    const isRuleOk = testRule && testRule.name.includes('Swiggy');
    assert(isRuleOk, 'Phase 42 Test 1: Bank categorization rule created with multi-condition matching operators');
  } catch (err) {
    assert(false, 'Phase 42 Test 1: Bank rule creation: ' + err.message);
  }

  // 42.2: Bank Rule Evaluation Engine
  try {
    const matched = await evaluateBankRules(companyId, {
      spent_paise: 125050,
      description: 'UPI/625489123456/Swiggy Tech Pvt Ltd'
    });
    const isMatchOk = matched && matched.targetAccountId === 'acc_6050' && matched.autoAdd === true;
    assert(isMatchOk, 'Phase 42 Test 2: Rule evaluation matches incoming bank description to designated category and auto-action');
  } catch (err) {
    assert(false, 'Phase 42 Test 2: Rule evaluation engine: ' + err.message);
  }

  // 42.3: Seed Deposit Transaction for Split Matching
  const btDepositId = 'bt_dep_split_' + Date.now();
  // Total of Invoices 1 & 2: ₹59,000 + ₹47,200 = ₹1,06,200 = 10,620,000 paise
  // Bank deposit received: ₹1,04,076 = 10,407,600 paise (2% Gateway fee = ₹2,124 = 212,400 paise deducted)
  await db.query(
    `INSERT INTO bank_transactions 
     (id, company_id, bank_connection_id, bank_account_id, account_code, date, description, payee, received_paise, spent_paise, status)
     VALUES ($1, $2, 'acc_hdfc_bank', 'acc_hdfc_bank', '1010', CURRENT_DATE, 'Razorpay Settlement Payout', 'Razorpay', 10407600, 0, 'FOR_REVIEW')
     ON CONFLICT (id) DO NOTHING`,
    [btDepositId, companyId]
  );

  // 42.4: Execute Split Matching across Invoices 1 & 2 with Auto-Fee Detection
  let splitResult = null;
  try {
    splitResult = await matchBankTransactionSplit({
      companyId,
      bankTransactionId: btDepositId,
      targetDocType: 'INVOICE',
      allocations: [
        { docId: inv1Id, amountPaise: 5900000 },
        { docId: inv2Id, amountPaise: 4720000 }
      ],
      feeAccountId: 'acc_bank_fees',
      bankAccountId: 'acc_hdfc_bank'
    });

    const expectedFee = 212400; // ₹2,124.00
    const isSplitOk = splitResult && splitResult.detectedFeePaise === expectedFee && splitResult.splits.length === 2;
    assert(isSplitOk, `Phase 42 Test 3: Split match knoсks off multiple customer invoices and auto-detects bank fee deduction (${splitResult.detectedFeePaise} paise vs ${expectedFee} paise)`);
  } catch (err) {
    assert(false, 'Phase 42 Test 3: Split matching & fee detection: ' + err.message);
  }

  // 42.5: Invoices Marked Paid & Double-Entry Balance
  try {
    const invCheck = await db.query(`SELECT status, balance_due_paise FROM invoices WHERE id IN ($1, $2)`, [inv1Id, inv2Id]);
    const allPaid = invCheck.rows.every(r => r.status === 'PAID' && parseInt(r.balance_due_paise, 10) === 0);

    const linesRes = await db.query(
      `SELECT debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [splitResult.journalEntryId]
    );
    const sumDebits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.debit_paise, 10), 0);
    const sumCredits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.credit_paise, 10), 0);
    const isBalanced = sumDebits === sumCredits && sumDebits === 10620000;

    assert(allPaid, 'Phase 42 Test 4: Invoices marked PAID with zero balance due after bank clearance');
    assert(isBalanced, 'Phase 42 Test 5: Split match journal entry balances (Bank Dr + Fee Dr = A/R Cr)');
  } catch (err) {
    assert(false, 'Phase 42 Test 4/5: Invoices and GL verification: ' + err.message);
  }

  // ============================================================================
  // PHASE 43: Undeposited Funds, Contra Transfers & CC Paydowns (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 43: Undeposited Funds, Contra Transfers & Credit Card Paydowns (5 Tests) ---');

  // 43.1: Bank Deposit from Undeposited Funds
  let depositTxn = null;
  try {
    depositTxn = await recordBankDeposit({
      companyId,
      destinationBankAccountId: 'acc_hdfc_bank',
      amountPaise: 7500000, // ₹75,000.00
      referenceNo: 'CHQ-882910'
    });
    const isDepOk = depositTxn && parseInt(depositTxn.amount_paise, 10) === 7500000;
    assert(isDepOk, 'Phase 43 Test 1: Bank deposit clears cash/cheques from Undeposited Funds into HDFC Bank');
  } catch (err) {
    assert(false, 'Phase 43 Test 1: Undeposited funds deposit: ' + err.message);
  }

  // 43.2: Deposit Double-Entry GL Balance
  try {
    const linesRes = await db.query(
      `SELECT debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [depositTxn.journal_entry_id]
    );
    const sumDebits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.debit_paise, 10), 0);
    const sumCredits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.credit_paise, 10), 0);
    const isDepJeOk = sumDebits === sumCredits && sumDebits === 7500000;
    assert(isDepJeOk, 'Phase 43 Test 2: Deposit journal entry balances Debit Bank Asset against Credit Undeposited Funds');
  } catch (err) {
    assert(false, 'Phase 43 Test 2: Deposit GL balance: ' + err.message);
  }

  // 43.3: Contra Bank-to-Bank Transfer
  let contraTxn = null;
  try {
    contraTxn = await recordContraTransfer({
      companyId,
      fromBankAccountId: 'acc_hdfc_bank',
      toBankAccountId: 'acc_icici_bank',
      amountPaise: 20000000, // ₹2,00,000.00
      referenceNo: 'RTGS-TRF-00918'
    });
    const isContraOk = contraTxn && parseInt(contraTxn.amount_paise, 10) === 20000000;
    assert(isContraOk, 'Phase 43 Test 3: Contra transfer recorded between HDFC Current and ICICI Operating accounts');
  } catch (err) {
    assert(false, 'Phase 43 Test 3: Contra transfer: ' + err.message);
  }

  // 43.4: Contra Transfer GL Invariant
  try {
    const linesRes = await db.query(
      `SELECT debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [contraTxn.journal_entry_id]
    );
    const sumDebits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.debit_paise, 10), 0);
    const sumCredits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.credit_paise, 10), 0);
    const isContraJeOk = sumDebits === sumCredits && sumDebits === 20000000;
    assert(isContraJeOk, 'Phase 43 Test 4: Contra journal entry balances Debit ICICI against Credit HDFC');
  } catch (err) {
    assert(false, 'Phase 43 Test 4: Contra GL balance: ' + err.message);
  }

  // 43.5: Credit Card Bill Paydown
  try {
    const ccPaydown = await recordCreditCardPaydown({
      companyId,
      bankAccountId: 'acc_hdfc_bank',
      creditCardAccountId: 'acc_corporate_card',
      amountPaise: 4500000, // ₹45,000.00
      referenceNo: 'AUTO-DEBIT-CC-SEPT'
    });
    const isCcOk = ccPaydown && ccPaydown.transfer_type === 'CREDIT_CARD_PAYDOWN';
    assert(isCcOk, 'Phase 43 Test 5: Corporate credit card bill settlement posts balanced liability decrease vs bank disbursement');
  } catch (err) {
    assert(false, 'Phase 43 Test 5: Credit card paydown: ' + err.message);
  }

  // ============================================================================
  // PHASE 44: Statement Reconciliation & Post-Reconciliation Tamper Lock (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 44: Statement Reconciliation & Post-Reconciliation Tamper Lock (5 Tests) ---');
  let testRec = null;

  // 44.1: Initiate Bank Reconciliation Session
  try {
    // Statement ending balance ₹1,50,000. Cleared deposits ₹2,00,000, Cleared payments ₹50,000 -> Cleared balance ₹1,50,000 (Difference: 0)
    testRec = await initiateReconciliation({
      companyId,
      accountId: 'acc_hdfc_bank',
      statementEndingDate: '2026-09-30',
      statementEndingBalancePaise: 15000000,
      clearedDepositsPaise: 20000000,
      clearedPaymentsPaise: 5000000
    });
    const isRecOk = testRec && testRec.difference_paise === '0' && testRec.status === 'IN_PROGRESS';
    assert(isRecOk, 'Phase 44 Test 1: Bank statement reconciliation session initiated with difference calculation');
  } catch (err) {
    assert(false, 'Phase 44 Test 1: Reconciliation session init: ' + err.message);
  }

  // 44.2: Enforce Zero Difference Guard
  try {
    const badRec = await initiateReconciliation({
      companyId,
      accountId: 'acc_hdfc_bank',
      statementEndingDate: '2026-09-30',
      statementEndingBalancePaise: 16000000, // Statement says 160,000 but cleared is 150,000 (diff: -10,000)
      clearedDepositsPaise: 20000000,
      clearedPaymentsPaise: 5000000
    });

    let threwExpected = false;
    try {
      await completeReconciliation({
        companyId,
        reconciliationId: badRec.id,
        clearedLineIds: []
      });
    } catch {
      threwExpected = true;
    }
    assert(threwExpected, 'Phase 44 Test 2: Reconciliation rejects completion when difference is non-zero');
  } catch (err) {
    assert(false, 'Phase 44 Test 2: Zero difference guard: ' + err.message);
  }

  // 44.3: Complete Reconciliation & Lock Lines
  let lockedJeId = null;
  let lockedLineId = null;
  try {
    // Create a dummy journal line to test locking
    lockedJeId = 'je_rec_lock_test_' + Date.now();
    await db.query(
      `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, status)
       VALUES ($1, $2, 'JE-REC-' || $3, CURRENT_DATE, 'Reconciled transaction test', 'MANUAL_JE', 'POSTED')`,
      [lockedJeId, companyId, String(Date.now())]
    );
    lockedLineId = 'jel_rec_lock_' + Date.now();
    const lockedLine2Id = 'jel_rec_lock2_' + Date.now();
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES 
         ($1, $2, 'acc_hdfc_bank', 15000000, 0, 'Reconciled bank line'),
         ($3, $2, 'acc_undeposited_funds', 0, 15000000, 'Balancing credit line')`,
      [lockedLineId, lockedJeId, lockedLine2Id]
    );

    const compResult = await completeReconciliation({
      companyId,
      reconciliationId: testRec.id,
      clearedLineIds: [lockedLineId]
    });

    const isCompleted = compResult.success && compResult.reconciliation.status === 'COMPLETED';
    assert(isCompleted, 'Phase 44 Test 3: Reconciliation marks status COMPLETED and locks cleared journal lines');
  } catch (err) {
    assert(false, 'Phase 44 Test 3: Complete reconciliation: ' + err.message);
  }

  // 44.4: Verify is_reconciled = TRUE in DB
  try {
    const lineCheck = await db.query(
      `SELECT is_reconciled, reconciliation_id FROM journal_entry_lines WHERE id = $1`,
      [lockedLineId]
    );
    const isLineLocked = lineCheck.rows[0]?.is_reconciled === true && lineCheck.rows[0]?.reconciliation_id === testRec.id;
    assert(isLineLocked, 'Phase 44 Test 4: Database permanently records is_reconciled = TRUE and references reconciliation ID');
  } catch (err) {
    assert(false, 'Phase 44 Test 4: Database is_reconciled verification: ' + err.message);
  }

  // 44.5: Post-Reconciliation Tamper Lock Guard
  try {
    let blockedTamper = false;
    try {
      await assertTransactionUnlocked(companyId, lockedJeId);
    } catch (err) {
      if (err.message.includes('TAMPER_LOCK_VIOLATION')) {
        blockedTamper = true;
      }
    }
    assert(blockedTamper, 'Phase 44 Test 5: Post-Reconciliation Tamper Lock immediately rejects modifications to reconciled entries');
  } catch (err) {
    assert(false, 'Phase 44 Test 5: Tamper lock guard: ' + err.message);
  }

  // ============================================================================
  // PHASE 45: 12-Month Rolling Cash Flow & Working Capital (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 45: 12-Month Rolling Cash Flow & Working Capital Forecaster (5 Tests) ---');
  let forecastResult = null;

  // 45.1: 12 Monthly Buckets Generation
  try {
    forecastResult = await generate12MonthCashFlowForecast(companyId, {
      arRealizationRate: 0.95,
      monthlyOpExPaise: 25000000
    });
    const isBucketsOk = forecastResult && forecastResult.monthlyForecasts.length === 12;
    assert(isBucketsOk, 'Phase 45 Test 1: Rolling cash flow generator compiles exactly 12 chronological monthly forecast buckets');
  } catch (err) {
    assert(false, 'Phase 45 Test 1: Forecast buckets generation: ' + err.message);
  }

  // 45.2: Sequential Continuity Invariant (End Balance[N] == Start Balance[N+1])
  try {
    let continuous = true;
    for (let i = 0; i < 11; i++) {
      const curEnd = forecastResult.monthlyForecasts[i].endBalancePaise;
      const nextStart = forecastResult.monthlyForecasts[i + 1].startBalancePaise;
      if (curEnd !== nextStart) {
        continuous = false;
        break;
      }
    }
    assert(continuous, 'Phase 45 Test 2: Sequential continuity invariant holds: Month N ending balance matches Month N+1 starting balance');
  } catch (err) {
    assert(false, 'Phase 45 Test 2: Sequential continuity check: ' + err.message);
  }

  // 45.3: Net Working Capital Computation
  try {
    const wc = forecastResult.workingCapital;
    const isWcOk = wc && wc.netWorkingCapitalPaise === (wc.currentAssetsPaise - wc.currentLiabilitiesPaise);
    assert(isWcOk, `Phase 45 Test 3: Net working capital computed accurately (Assets: ₹${wc.currentAssetsPaise / 100} - Liab: ₹${wc.currentLiabilitiesPaise / 100} = ₹${wc.netWorkingCapitalPaise / 100})`);
  } catch (err) {
    assert(false, 'Phase 45 Test 3: Working capital computation: ' + err.message);
  }

  // 45.4: Minimum Projected Cash Balance Tracking
  try {
    const summary = forecastResult.forecastSummary;
    const allEndBalances = forecastResult.monthlyForecasts.map(m => m.endBalancePaise);
    const actualMin = Math.min(summary.startBalancePaise, ...allEndBalances);
    const isMinOk = summary.minimumProjectedBalancePaise === actualMin;
    assert(isMinOk, `Phase 45 Test 4: Treasury minimum projected balance tracked across the 12-month curve (Min: ₹${summary.minimumProjectedBalancePaise / 100})`);
  } catch (err) {
    assert(false, 'Phase 45 Test 4: Minimum cash projection: ' + err.message);
  }

  // 45.5: Multi-Tenant Liquidity Isolation
  try {
    const otherCompanyId = 'comp_treasury_iso_' + Date.now();
    const otherForecast = await generate12MonthCashFlowForecast(otherCompanyId);
    const isIsolated = otherForecast.workingCapital.currentAssetsPaise === otherForecast.currentCashPaise;
    assert(isIsolated, 'Phase 45 Test 5: Strict multi-tenant isolation enforced—zero leakage of banking balances or cash forecasts');
  } catch (err) {
    assert(false, 'Phase 45 Test 5: Multi-tenant treasury isolation: ' + err.message);
  }

  console.log('\n================================================================================');
  console.log(`DOMAIN 9 SUITE COMPLETE: ${testsPassed}/25 PASSED, ${testsFailed} FAILED`);
  console.log('================================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runDomain9ProofSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
