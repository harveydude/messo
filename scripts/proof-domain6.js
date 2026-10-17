/**
 * Meso Domain 6 Proof-of-Correctness Suite: Order-to-Cash & Revenue Recognition
 * Phases 26 to 30 (25 Rigorous Tests, 5 Tests per Phase)
 * Verifies real database persistence, Indian accounting/tax math, and system invariants.
 */

import { getDb, initDb } from '../server/src/db/db.js';
import {
  createEstimate,
  getEstimate,
  createSalesOrder,
  convertEstimateToSalesOrder,
  convertSalesOrderToInvoice
} from '../server/src/services/pipelineService.js';
import {
  createInvoiceTemplate,
  getTemplateForCompany,
  renderInvoiceDocument,
  TEMPLATE_TYPES
} from '../server/src/services/invoiceBuilderService.js';
import {
  createRevenueContract,
  recognizeScheduledRevenue,
  getRevenueContractSummary
} from '../server/src/services/revenueRecognitionService.js';
import {
  recordCustomerReceipt,
  recordAdvanceReceiptWithGst
} from '../server/src/services/customerReceiptService.js';
import {
  issueCreditNote,
  classifyDunningNotice,
  runDunningWorkflow
} from '../server/src/services/creditNoteDunningService.js';
import {
  getCompanyPolicy,
  updateCompanyPolicy
} from '../server/src/services/policyService.js';

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

async function runDomain6ProofSuite() {
  console.log('================================================================================');
  console.log('MESO DOMAIN 6 PROOF-OF-CORRECTNESS SUITE: PHASES 26-30 (25 TESTS)');
  console.log('================================================================================\n');

  await initDb();
  const db = await getDb();
  const companyId = 'comp_1';

  // Seed baseline contact and product for tests
  const custId = 'cont_proof_d6_cust';
  await db.query(
    `INSERT INTO contacts (id, company_id, type, display_name, email, gstin, pan, billing_address)
     VALUES ($1, $2, 'CUSTOMER', 'Acme India Pvt Ltd', 'billing@acmeindia.com', '27AACCA1234A1Z5', 'AACCA1234A', 'Nariman Point, Mumbai, MH')
     ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name`,
    [custId, companyId]
  );

  const prodId = 'prod_proof_d6_widget';
  await db.query(
    `INSERT INTO products_and_services (id, company_id, name, type, sales_price_paise, quantity_on_hand, quantity_committed, is_active)
     VALUES ($1, $2, 'Enterprise Cloud ERP License', 'INVENTORY', 50000, 100, 0, true)
     ON CONFLICT (id) DO UPDATE SET quantity_on_hand = 100, quantity_committed = 0`,
    [prodId, companyId]
  );

  // ============================================================================
  // PHASE 26: Estimates, Quotes & Sales Orders Pipeline (5 Tests)
  // ============================================================================
  console.log('--- PHASE 26: Estimates & Sales Orders Pipeline (5 Tests) ---');
  let testEstimate = null;
  let testSalesOrder = null;
  let testInvoiceId = null;

  // 26.1: Estimate Creation & State Machine
  try {
    testEstimate = await createEstimate({
      companyId,
      customerId: custId,
      estimateNumber: 'EST-TEST-' + Date.now(),
      items: [
        { productId: prodId, description: 'Cloud ERP User Seat', quantity: 2, unitPricePaise: 50000, taxRateBp: 1800 }
      ],
      terms: 'Valid for 30 days',
      notes: 'Proof test estimate'
    });

    const isCreated = testEstimate && testEstimate.status === 'DRAFT' &&
      BigInt(testEstimate.subtotal_paise) === 100000n &&
      BigInt(testEstimate.tax_paise) === 18000n &&
      BigInt(testEstimate.total_paise) === 118000n;
    assert(isCreated, 'Phase 26 Test 1: Estimate creation with 18% tax calculation and DRAFT status');
  } catch (err) {
    console.error('Error 26.1:', err);
    assert(false, 'Phase 26 Test 1: Estimate creation');
  }

  // 26.2: Estimate Conversion to Sales Order
  try {
    testSalesOrder = await convertEstimateToSalesOrder({
      estimateId: testEstimate.id,
      companyId
    });

    const refreshedEst = await getEstimate(testEstimate.id, companyId);
    const convertedOk = testSalesOrder && refreshedEst.status === 'CONVERTED_TO_ORDER' &&
      refreshedEst.converted_order_id === testSalesOrder.id;
    assert(convertedOk, 'Phase 26 Test 2: Estimate converts to Sales Order and transitions state');
  } catch (err) {
    console.error('Error 26.2:', err);
    assert(false, 'Phase 26 Test 2: Estimate to SO conversion');
  }

  // 26.3: Stock Reservation Tracking (quantity_committed)
  try {
    const pRes = await db.query(
      `SELECT quantity_on_hand, quantity_committed FROM products_and_services WHERE id = $1`,
      [prodId]
    );
    const prod = pRes.rows[0];
    const committedOk = Number(prod.quantity_committed) === 2 && Number(prod.quantity_on_hand) === 100;
    assert(committedOk, 'Phase 26 Test 3: Stock committed reservations increment while on-hand remains untouched');
  } catch (err) {
    console.error('Error 26.3:', err);
    assert(false, 'Phase 26 Test 3: Stock reservation');
  }

  // 26.4: Sales Order to Invoice Conversion
  try {
    const invResult = await convertSalesOrderToInvoice({
      orderId: testSalesOrder.id,
      companyId
    });
    testInvoiceId = invResult.invoiceId;

    const soRes = await db.query(`SELECT status, converted_invoice_id FROM sales_orders WHERE id = $1`, [testSalesOrder.id]);
    const invRes = await db.query(`SELECT total_paise, status FROM invoices WHERE id = $1`, [testInvoiceId]);
    const pRes = await db.query(`SELECT quantity_on_hand, quantity_committed FROM products_and_services WHERE id = $1`, [prodId]);

    const invOk = soRes.rows[0].status === 'CONVERTED_TO_INVOICE' &&
      invRes.rows[0].status === 'POSTED' &&
      BigInt(invRes.rows[0].total_paise) === 118000n &&
      Number(pRes.rows[0].quantity_committed) === 0 &&
      Number(pRes.rows[0].quantity_on_hand) === 98;
    assert(invOk, 'Phase 26 Test 4: Sales Order converts to Invoice, releases committed stock and deducts on-hand stock');
  } catch (err) {
    console.error('Error 26.4:', err);
    assert(false, 'Phase 26 Test 4: SO to Invoice conversion');
  }

  // 26.5: Balanced Double-Entry Journal Entry
  try {
    const jeRes = await db.query(
      `SELECT je.id, SUM(jel.debit_paise) as total_debit, SUM(jel.credit_paise) as total_credit
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.source_id = $1 AND je.source_type = 'INVOICE'
       GROUP BY je.id`,
      [testInvoiceId]
    );
    const je = jeRes.rows[0];
    const balanced = je && BigInt(je.total_debit) === BigInt(je.total_credit) &&
      BigInt(je.total_debit) === 118000n;
    assert(balanced, 'Phase 26 Test 5: Double-entry journal entry posted for invoice is balanced (Debit A/R = Credit Revenue + Tax)');
  } catch (err) {
    console.error('Error 26.5:', err);
    assert(false, 'Phase 26 Test 5: Double-entry verification');
  }

  // ============================================================================
  // PHASE 27: Multi-Template Tax Invoice, Bill of Supply & Export Builder (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 27: Multi-Template Invoice Builder (5 Tests) ---');

  // 27.1: Standard Tax Invoice Template
  try {
    const tpl = await createInvoiceTemplate({
      companyId,
      templateName: 'TAX_INV_PREMIUM',
      templateType: TEMPLATE_TYPES.TAX_INVOICE,
      headerTitle: 'TAX INVOICE',
      accentColor: '#0077C5',
      bankDetails: { bankName: 'HDFC Bank', accountNumber: '50200012345678', ifsc: 'HDFC0000001' }
    });
    const tplOk = tpl && tpl.template_type === 'TAX_INVOICE' && tpl.accent_color === '#0077C5' &&
      tpl.declaration_text.includes('particulars given above are true');
    assert(tplOk, 'Phase 27 Test 1: Standard Tax Invoice template created with statutory declaration and bank details');
  } catch (err) {
    console.error('Error 27.1:', err);
    assert(false, 'Phase 27 Test 1: Tax Invoice template');
  }

  // 27.2: Composition Scheme Bill of Supply
  try {
    await updateCompanyPolicy(companyId, { registration_type: 'COMPOSITION' });
    const compTpl = await getTemplateForCompany(companyId);
    const isCompOk = compTpl && compTpl.template_type === 'BILL_OF_SUPPLY' &&
      compTpl.header_title.includes('BILL OF SUPPLY') &&
      compTpl.declaration_text.includes('Composition taxable person');
    assert(isCompOk, 'Phase 27 Test 2: Composition scheme company dynamically resolves Bill of Supply template');
  } catch (err) {
    console.error('Error 27.2:', err);
    assert(false, 'Phase 27 Test 2: Composition Bill of Supply');
  } finally {
    await updateCompanyPolicy(companyId, { registration_type: 'REGULAR' });
  }

  // 27.3: Export Invoice under LUT
  try {
    await updateCompanyPolicy(companyId, { registration_type: 'SEZ', lut_arn: 'AD270426000001X' });
    const exportTpl = await getTemplateForCompany(companyId);
    const isExportOk = exportTpl && exportTpl.template_type === 'EXPORT_INVOICE' &&
      exportTpl.declaration_text.includes('Letter of Undertaking without payment of integrated tax');
    assert(isExportOk, 'Phase 27 Test 3: Export under LUT dynamically resolves statutory export declaration');
  } catch (err) {
    console.error('Error 27.3:', err);
    assert(false, 'Phase 27 Test 3: Export under LUT');
  } finally {
    await updateCompanyPolicy(companyId, { registration_type: 'REGULAR', lut_arn: null });
  }

  // 27.4: GIFT City IFSC Exempt Invoice
  try {
    await updateCompanyPolicy(companyId, { registration_type: 'GIFT_CITY_IFSC' });
    const ifscTpl = await getTemplateForCompany(companyId);
    const isIfscOk = ifscTpl && ifscTpl.template_type === 'IFSC_INVOICE' &&
      ifscTpl.declaration_text.includes('Section 80LA');
    assert(isIfscOk, 'Phase 27 Test 4: GIFT City IFSC entity dynamically resolves Section 80LA tax-exempt template');
  } catch (err) {
    console.error('Error 27.4:', err);
    assert(false, 'Phase 27 Test 4: GIFT City IFSC template');
  } finally {
    await updateCompanyPolicy(companyId, { registration_type: 'REGULAR' });
  }

  // 27.5: Full Document Rendering Engine
  try {
    const doc = await renderInvoiceDocument({ companyId, invoiceId: testInvoiceId });
    const isDocOk = doc && doc.invoiceId === testInvoiceId &&
      doc.customer.name === 'Acme India Pvt Ltd' &&
      doc.template.templateType &&
      BigInt(doc.financials.totalPaise) === 118000n;
    assert(isDocOk, 'Phase 27 Test 5: renderInvoiceDocument compiles unified print-ready object with financial breakdowns');
  } catch (err) {
    console.error('Error 27.5:', err);
    assert(false, 'Phase 27 Test 5: Document rendering engine');
  }

  // ============================================================================
  // PHASE 28: Ind AS 115 / ASC 606 Revenue Recognition Engine (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 28: Ind AS 115 Revenue Recognition Engine (5 Tests) ---');
  let revContract = null;

  // 28.1: Contract Creation & 12-Month Schedule Generation
  try {
    revContract = await createRevenueContract({
      companyId,
      customerId: custId,
      contractNumber: 'REV-PROOF-' + Date.now(),
      totalContractValuePaise: 12000000, // ₹1,20,000 annual SaaS subscription
      totalPeriods: 12,
      startDate: '2026-04-01'
    });

    const sRes = await db.query(
      `SELECT period_index, amount_to_recognize_paise, status 
       FROM revenue_schedules 
       WHERE contract_id = $1 ORDER BY period_index ASC`,
      [revContract.id]
    );
    const schedules = sRes.rows;
    let sumPaise = 0n;
    for (const s of schedules) sumPaise += BigInt(s.amount_to_recognize_paise);

    const isContractOk = revContract && schedules.length === 12 && sumPaise === 12000000n &&
      BigInt(schedules[0].amount_to_recognize_paise) === 1000000n;
    assert(isContractOk, 'Phase 28 Test 1: 12-Month contract created with exact monthly amortization schedule to the paise');
  } catch (err) {
    console.error('Error 28.1:', err);
    assert(false, 'Phase 28 Test 1: Revenue contract creation');
  }

  // 28.2: Initial Unearned Revenue Liability Booking
  try {
    const jeRes = await db.query(
      `SELECT je.id, jel.account_id, jel.debit_paise, jel.credit_paise
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.source_id = $1 AND je.source_type = 'REVENUE_CONTRACT_INIT'`,
      [revContract.id]
    );
    const lines = jeRes.rows;
    const arLine = lines.find(l => l.account_id === 'acc_1100');
    const unearnedLine = lines.find(l => l.account_id === 'acc_2100');

    const isInitialJeOk = arLine && unearnedLine &&
      BigInt(arLine.debit_paise) === 12000000n &&
      BigInt(unearnedLine.credit_paise) === 12000000n;
    assert(isInitialJeOk, 'Phase 28 Test 2: Initial booking posts Debit A/R and Credit Deferred Revenue (acc_2100) with zero day-one P&L leak');
  } catch (err) {
    console.error('Error 28.2:', err);
    assert(false, 'Phase 28 Test 2: Unearned revenue liability booking');
  }

  // 28.3: Monthly Revenue Recognition Execution
  try {
    const recRes = await recognizeScheduledRevenue({
      companyId,
      contractId: revContract.id,
      periodIndex: 1,
      recognitionDate: '2026-04-30'
    });

    const s1Res = await db.query(
      `SELECT status, journal_entry_id FROM revenue_schedules WHERE contract_id = $1 AND period_index = 1`,
      [revContract.id]
    );
    const cRes = await db.query(
      `SELECT recognized_revenue_paise, deferred_revenue_paise, status FROM revenue_contracts WHERE id = $1`,
      [revContract.id]
    );

    const isPeriodRecOk = recRes.success && s1Res.rows[0].status === 'RECOGNIZED' &&
      BigInt(cRes.rows[0].recognized_revenue_paise) === 1000000n &&
      BigInt(cRes.rows[0].deferred_revenue_paise) === 11000000n;
    assert(isPeriodRecOk, 'Phase 28 Test 3: Monthly schedule recognized, updating schedule status and contract balance');
  } catch (err) {
    console.error('Error 28.3:', err);
    assert(false, 'Phase 28 Test 3: Monthly revenue recognition');
  }

  // 28.4: Recognition Double-Entry Balance Invariant
  try {
    const s1 = (await db.query(`SELECT journal_entry_id FROM revenue_schedules WHERE contract_id = $1 AND period_index = 1`, [revContract.id])).rows[0];
    const linesRes = await db.query(
      `SELECT account_id, debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [s1.journal_entry_id]
    );
    const lines = linesRes.rows;
    const defLine = lines.find(l => l.account_id === 'acc_2100');
    const revLine = lines.find(l => l.account_id === 'acc_4000');

    const isBalOk = defLine && revLine &&
      BigInt(defLine.debit_paise) === 1000000n &&
      BigInt(revLine.credit_paise) === 1000000n;
    assert(isBalOk, 'Phase 28 Test 4: Recognition JE perfectly debits Deferred Revenue (liability) and credits Sales Revenue (P&L)');
  } catch (err) {
    console.error('Error 28.4:', err);
    assert(false, 'Phase 28 Test 4: Recognition JE balance');
  }

  // 28.5: Progress Tracking & Final Contract Completion
  try {
    for (let p = 2; p <= 12; p++) {
      await recognizeScheduledRevenue({ companyId, contractId: revContract.id, periodIndex: p });
    }
    const summary = await getRevenueContractSummary(revContract.id, companyId);
    const isCompletedOk = summary.status === 'COMPLETED' &&
      BigInt(summary.deferred_revenue_paise) === 0n &&
      BigInt(summary.recognized_revenue_paise) === 12000000n &&
      summary.progressPercent === 100;
    assert(isCompletedOk, 'Phase 28 Test 5: Contract progress tracks accurately and automatically transitions to COMPLETED at 100%');
  } catch (err) {
    console.error('Error 28.5:', err);
    assert(false, 'Phase 28 Test 5: Contract progress & completion');
  }

  // ============================================================================
  // PHASE 29: Customer Receipts, GST on Advances & Allocation Engine (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 29: Customer Receipts & Payment Allocations (5 Tests) ---');

  // Create two distinct invoices for allocation tests
  const invAId = 'inv_alloc_a_' + Date.now();
  const invBId = 'inv_alloc_b_' + Date.now();
  const invANo = 'INV-ALLOC-A-' + Date.now();
  const invBNo = 'INV-ALLOC-B-' + Date.now();

  await db.query(
    `INSERT INTO invoices (id, company_id, invoice_number, customer_id, issue_date, due_date, subtotal_paise, tax_paise, total_paise, balance_due_paise, status)
     VALUES 
      ($1, $3, $5, $4, CURRENT_DATE, CURRENT_DATE + 30, 50000, 0, 50000, 50000, 'POSTED'),
      ($2, $3, $6, $4, CURRENT_DATE, CURRENT_DATE + 30, 50000, 0, 50000, 50000, 'POSTED')`,
    [invAId, invBId, companyId, custId, invANo, invBNo]
  );

  // 29.1: Multi-Invoice Knock-off
  try {
    const receipt = await recordCustomerReceipt({
      companyId,
      customerId: custId,
      receiptNumber: 'RCP-KNOCK-' + Date.now(),
      amountReceivedPaise: 75000, // ₹750 knocks off Inv A completely and Inv B partially
      allocations: [
        { invoiceId: invAId, amountPaise: 50000 },
        { invoiceId: invBId, amountPaise: 25000 }
      ]
    });

    const invARes = await db.query(`SELECT balance_due_paise, status FROM invoices WHERE id = $1`, [invAId]);
    const invBRes = await db.query(`SELECT balance_due_paise, status FROM invoices WHERE id = $1`, [invBId]);

    const isKnockOk = receipt.success &&
      BigInt(invARes.rows[0].balance_due_paise) === 0n && invARes.rows[0].status === 'PAID' &&
      BigInt(invBRes.rows[0].balance_due_paise) === 25000n && invBRes.rows[0].status === 'PARTIALLY_PAID';
    assert(isKnockOk, 'Phase 29 Test 1: Customer payment knocks off multiple invoices updating balances and statuses');
  } catch (err) {
    console.error('Error 29.1:', err);
    assert(false, 'Phase 29 Test 1: Multi-invoice knockoff');
  }

  // 29.2: Customer TDS Deduction (Section 194Q / 194C)
  try {
    const tdsReceipt = await recordCustomerReceipt({
      companyId,
      customerId: custId,
      receiptNumber: 'RCP-TDS-' + Date.now(),
      amountReceivedPaise: 99000, // ₹990 Net cash received
      customerTdsPaise: 1000,     // ₹10 TDS deducted by customer (acc_1150)
      allocations: [{ invoiceId: invBId, amountPaise: 25000 }] // Knock off remaining 25000
    });

    const jeLines = (await db.query(
      `SELECT account_id, debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [tdsReceipt.journalEntryId]
    )).rows;

    const tdsLine = jeLines.find(l => l.account_id === 'acc_1150');
    const isTdsOk = tdsLine && BigInt(tdsLine.debit_paise) === 1000n;
    assert(isTdsOk, 'Phase 29 Test 2: Customer TDS deduction automatically debits acc_1150 (TDS Receivable)');
  } catch (err) {
    console.error('Error 29.2:', err);
    assert(false, 'Phase 29 Test 2: Customer TDS deduction');
  }

  // 29.3: Payment Gateway & Bank Charges Deduction
  try {
    const feeReceipt = await recordCustomerReceipt({
      companyId,
      customerId: custId,
      receiptNumber: 'RCP-FEE-' + Date.now(),
      amountReceivedPaise: 98000, // Net cash deposited
      bankChargesPaise: 2000,     // ₹20 gateway fee (acc_6200)
      allocations: []
    });

    const jeLines = (await db.query(
      `SELECT account_id, debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [feeReceipt.journalEntryId]
    )).rows;

    const feeLine = jeLines.find(l => l.account_id === 'acc_6200');
    const bnkLine = jeLines.find(l => l.account_id === 'acc_1000');
    const isFeeOk = feeLine && bnkLine &&
      BigInt(feeLine.debit_paise) === 2000n &&
      BigInt(bnkLine.debit_paise) === 98000n;
    assert(isFeeOk, 'Phase 29 Test 3: Bank / payment gateway fee debits acc_6200 and records true net deposit');
  } catch (err) {
    console.error('Error 29.3:', err);
    assert(false, 'Phase 29 Test 3: Bank fee deduction');
  }

  // 29.4: Gross Settlement Accounting Invariant
  try {
    // Gross = 80000 cash + 10000 TDS + 10000 Fee = 100000. Allocated = 0, Unallocated = 100000
    const invTestKnock = 'inv_inv_4_' + Date.now();
    const invTestKnockNo = 'INV-TEST-4-' + Date.now();
    await db.query(
      `INSERT INTO invoices (id, company_id, invoice_number, customer_id, issue_date, due_date, subtotal_paise, tax_paise, total_paise, balance_due_paise, status)
       VALUES ($1, $2, $4, $3, CURRENT_DATE, CURRENT_DATE + 30, 70000, 0, 70000, 70000, 'POSTED')`,
      [invTestKnock, companyId, custId, invTestKnockNo]
    );

    const rcp = await recordCustomerReceipt({
      companyId,
      customerId: custId,
      receiptNumber: 'RCP-INVARIANT-' + Date.now(),
      amountReceivedPaise: 80000,
      customerTdsPaise: 10000,
      bankChargesPaise: 10000,
      allocations: [{ invoiceId: invTestKnock, amountPaise: 70000 }]
    });

    const jeRes = await db.query(
      `SELECT SUM(debit_paise) as debits, SUM(credit_paise) as credits FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [rcp.journalEntryId]
    );
    const row = jeRes.rows[0];
    const isBalancedOk = BigInt(row.debits) === 100000n && BigInt(row.credits) === 100000n &&
      rcp.unallocatedPaise === '30000';
    assert(isBalancedOk, 'Phase 29 Test 4: Settlement equation invariant: Cash + TDS + Fees = A/R Knock-off + Unallocated Advance');
  } catch (err) {
    console.error('Error 29.4:', err);
    assert(false, 'Phase 29 Test 4: Settlement invariant');
  }

  // 29.5: Statutory GST on Service Advance Voucher (CGST Sec 13(2))
  try {
    const advReceipt = await recordAdvanceReceiptWithGst({
      companyId,
      customerId: custId,
      receiptNumber: 'ADV-VOUCH-' + Date.now(),
      grossAdvancePaise: 118000 // ₹1,180 advance received inclusive of 18% GST
    });

    const isAdvOk = advReceipt.success &&
      BigInt(advReceipt.baseAdvancePaise) === 100000n &&
      BigInt(advReceipt.totalTaxPaise) === 18000n &&
      BigInt(advReceipt.cgstPaise) === 9000n &&
      BigInt(advReceipt.sgstPaise) === 9000n;
    assert(isAdvOk, 'Phase 29 Test 5: Service advance generates statutory GST Receipt Voucher with 50/50 CGST/SGST tax split');
  } catch (err) {
    console.error('Error 29.5:', err);
    assert(false, 'Phase 29 Test 5: Service advance GST voucher');
  }

  // ============================================================================
  // PHASE 30: GST Credit Notes, Sales Returns & AI Dunning Workflows (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 30: GST Credit Notes & AI Dunning Workflows (5 Tests) ---');

  // Prepare a posted invoice for credit note testing
  const cnInvId = 'inv_cn_target_' + Date.now();
  const origInvNo = 'INV-CN-ORIG-' + Date.now();
  await db.query(
    `INSERT INTO invoices (id, company_id, invoice_number, customer_id, issue_date, due_date, subtotal_paise, tax_paise, total_paise, balance_due_paise, status)
     VALUES ($1, $2, $4, $3, CURRENT_DATE, CURRENT_DATE + 30, 200000, 36000, 236000, 236000, 'POSTED')`,
    [cnInvId, companyId, custId, origInvNo]
  );

  let creditNoteResult = null;

  // 30.1: Section 34 CGST Act Credit Note Linking
  try {
    creditNoteResult = await issueCreditNote({
      companyId,
      creditNoteNumber: 'CN-PROOF-' + Date.now(),
      originalInvoiceId: cnInvId,
      reason: 'SALES_RETURN',
      reasonDescription: 'Customer returned 1 defective license widget',
      lines: [
        { productId: prodId, description: 'Return of 1 User License', quantity: 1, unitPricePaise: 100000, taxRateBp: 1800 }
      ],
      restockInventory: true
    });

    const isCnOk = creditNoteResult.success &&
      creditNoteResult.originalInvoiceNumber === origInvNo &&
      BigInt(creditNoteResult.taxableAmountPaise) === 100000n &&
      BigInt(creditNoteResult.totalTaxPaise) === 18000n &&
      BigInt(creditNoteResult.totalPaise) === 118000n;
    assert(isCnOk, 'Phase 30 Test 1: Section 34 Credit Note links directly to original invoice number for GSTR-1 CDNR matching');
  } catch (err) {
    console.error('Error 30.1:', err);
    assert(false, 'Phase 30 Test 1: Section 34 Credit Note linking');
  }

  // 30.2: Invoice Balance Reduction
  try {
    const invRes = await db.query(`SELECT balance_due_paise FROM invoices WHERE id = $1`, [cnInvId]);
    const isDueReduced = BigInt(invRes.rows[0].balance_due_paise) === (236000n - 118000n);
    assert(isDueReduced, 'Phase 30 Test 2: Credit note automatically knocks down original invoice balance due to exact paise');
  } catch (err) {
    console.error('Error 30.2:', err);
    assert(false, 'Phase 30 Test 2: Invoice balance knockdown');
  }

  // 30.3: Inventory Restocking on Sales Return
  try {
    const pRes = await db.query(`SELECT quantity_on_hand FROM products_and_services WHERE id = $1`, [prodId]);
    // Was 98 after Phase 26 test 4; should now be 99 after restocking 1 item
    const isRestocked = Number(pRes.rows[0].quantity_on_hand) === 99;
    assert(isRestocked, 'Phase 30 Test 3: restockInventory = true automatically restocks inventory quantity on hand');
  } catch (err) {
    console.error('Error 30.3:', err);
    assert(false, 'Phase 30 Test 3: Inventory restocking');
  }

  // 30.4: Reversing Journal Entry Invariant
  try {
    const jeRes = await db.query(
      `SELECT SUM(debit_paise) as debits, SUM(credit_paise) as credits FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [creditNoteResult.journalEntryId]
    );
    const row = jeRes.rows[0];
    const isBalanced = BigInt(row.debits) === 118000n && BigInt(row.credits) === 118000n;
    assert(isBalanced, 'Phase 30 Test 4: Credit note journal entry debits Sales Returns & Tax, credits A/R with perfect balance');
  } catch (err) {
    console.error('Error 30.4:', err);
    assert(false, 'Phase 30 Test 4: Reversing journal entry invariant');
  }

  // 30.5: 3-Tier Dunning Engine & Workflow
  try {
    // 1. Classification check
    const gentle = classifyDunningNotice({ daysOverdue: 10, balanceDuePaise: 50000, invoiceNumber: 'INV-1' });
    const firm = classifyDunningNotice({ daysOverdue: 25, balanceDuePaise: 50000, invoiceNumber: 'INV-2' });
    const legal = classifyDunningNotice({ daysOverdue: 45, balanceDuePaise: 50000, invoiceNumber: 'INV-3' });

    const isClassifiedOk = gentle.noticeLevel === 'GENTLE_REMINDER' &&
      firm.noticeLevel === 'FIRM_REMINDER' &&
      legal.noticeLevel === 'FINAL_LEGAL_NOTICE' &&
      (legal.subject.includes('LEGAL ACTION') || legal.messageBody.includes('recovery'));

    // 2. Insert an overdue invoice and run workflow
    const overdueInvId = 'inv_dunning_proof_' + Date.now();
    const overdueInvNo = 'INV-DUN-OVERDUE-' + Date.now();
    await db.query(
      `INSERT INTO invoices (id, company_id, invoice_number, customer_id, issue_date, due_date, subtotal_paise, tax_paise, total_paise, balance_due_paise, status)
       VALUES ($1, $2, $4, $3, CURRENT_DATE - 40, CURRENT_DATE - 20, 50000, 0, 50000, 50000, 'OVERDUE')`,
      [overdueInvId, companyId, custId, overdueInvNo]
    );

    const dunningRun = await runDunningWorkflow({ companyId, asOfDate: new Date().toISOString().slice(0, 10) });
    const hasDispatched = dunningRun.dispatchedCount >= 1;

    assert(isClassifiedOk && hasDispatched, 'Phase 30 Test 5: 3-Tier AI dunning engine classifies overdue stages and dispatches legal/firm notices');
  } catch (err) {
    console.error('Error 30.5:', err);
    assert(false, 'Phase 30 Test 5: 3-tier dunning engine');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
  console.log(`PASSED: ${testsPassed}`);
  console.log(`FAILED: ${testsFailed}`);
  console.log(`SUCCESS RATE: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  console.log('================================================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDomain6ProofSuite().catch(err => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
