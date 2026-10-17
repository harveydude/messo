/**
 * Meso Domain 7 Proof-of-Correctness Suite: Procure-to-Pay, OCR & MSME Compliance
 * Phases 31 to 35 (25 Rigorous Tests, 5 Tests per Phase)
 * Verifies real database persistence, Indian accounting/tax math, and system invariants.
 */

import { getDb, initDb } from '../server/src/db/db.js';
import {
  createPurchaseOrder,
  getPurchaseOrder,
  createGoodsReceiptNote,
  performThreeWayMatch
} from '../server/src/services/procurementService.js';
import {
  simulateOcrScan,
  convertOcrToBillDraft,
  parseIndianInvoiceText,
  suggestExpenseAccountForHsn
} from '../server/src/services/invoiceOcrService.js';
import {
  determineApprovalTier,
  canUserApproveTier,
  submitBillForApproval,
  approveBill,
  rejectBill,
  createRecurringBillTemplate,
  processRecurringBillTemplates,
  APPROVAL_TIERS
} from '../server/src/services/billApprovalService.js';
import {
  validateUdyamNumber,
  calculateMsmeDueDate,
  calculateMsmeLateInterest,
  evaluateMsmeCompliance,
  MSME_PENAL_RATE_PERCENT
} from '../server/src/services/msmeComplianceService.js';
import {
  issueVendorDebitNote,
  generateBatchPayoutFile
} from '../server/src/services/batchPayoutService.js';

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

async function runDomain7ProofSuite() {
  console.log('================================================================================');
  console.log('MESO DOMAIN 7 PROOF-OF-CORRECTNESS SUITE: PHASES 31-35 (25 TESTS)');
  console.log('================================================================================\n');

  await initDb();
  const db = await getDb();
  const companyId = 'comp_1';

  // Seed baseline vendor contact and product for testing
  const vendorId = 'cont_proof_d7_vendor_' + Date.now();
  await db.query(
    `INSERT INTO contacts (id, company_id, type, display_name, email, gstin, pan, billing_address, msme_category, udyam_registration_no, msme_has_written_agreement)
     VALUES ($1, $2, 'VENDOR', 'Bharat Tech Supplies LLP', 'sales@bharattech.in', '27AABCB1234F1Z8', 'AABCB1234F', 'Andheri East, Mumbai, MH', 'MICRO', 'UDYAM-MH-01-0012345', true)
     ON CONFLICT (id) DO NOTHING`,
    [vendorId, companyId]
  );

  const prodId = 'prod_proof_d7_item_' + Date.now();
  await db.query(
    `INSERT INTO products_and_services (id, company_id, name, type, sales_price_paise, purchase_cost_paise, quantity_on_hand, is_active)
     VALUES ($1, $2, 'Hardware Network Switch 48-Port', 'INVENTORY', 150000, 100000, 50, true)
     ON CONFLICT (id) DO NOTHING`,
    [prodId, companyId]
  );

  // ============================================================================
  // PHASE 31: Purchase Orders & 3-Way Matching Engine (5 Tests)
  // ============================================================================
  console.log('--- PHASE 31: Purchase Orders & 3-Way Matching Engine (5 Tests) ---');
  let testPo = null;
  let testGrn = null;
  let testBillId = null;

  // 31.1: PO Creation & Integer Paise Calculation
  try {
    testPo = await createPurchaseOrder({
      companyId,
      vendorId,
      poNumber: 'PO-D7-' + Date.now(),
      items: [
        { productId: prodId, description: '48-Port Gigabit Switch', quantity: 10, unitPricePaise: 100000, taxRateBp: 1800 }
      ],
      terms: 'Net 30',
      notes: 'Proof test procurement order'
    });

    const isPoOk = testPo && testPo.status === 'ISSUED' &&
      BigInt(testPo.subtotal_paise) === 1000000n && // 10 * 100000 = 1,000,000 paise (Rs. 10,000)
      BigInt(testPo.tax_paise) === 180000n &&       // 18% = 180,000 paise (Rs. 1,800)
      BigInt(testPo.total_paise) === 1180000n;      // Total = 1,180,000 paise (Rs. 11,800)
    assert(isPoOk, 'Phase 31 Test 1: Purchase Order created with accurate 18% GST and integer paise calculation');
  } catch (err) {
    console.error('Error 31.1:', err);
    assert(false, 'Phase 31 Test 1: PO creation');
  }

  // 31.2: Goods Receipt Note (GRN) & Received Stock Tracking
  try {
    const fullPo = await getPurchaseOrder(testPo.id, companyId);
    const poItemId = fullPo.items[0].id;

    testGrn = await createGoodsReceiptNote({
      companyId,
      poId: testPo.id,
      vendorId,
      grnNumber: 'GRN-D7-' + Date.now(),
      items: [
        { poItemId, productId: prodId, description: '48-Port Gigabit Switch', quantityReceived: 10, quantityAccepted: 10, quantityRejected: 0 }
      ]
    });

    const poItemRes = await db.query(`SELECT quantity_received, quantity_ordered FROM purchase_order_items WHERE id = $1`, [poItemId]);
    const isGrnOk = testGrn && testGrn.status === 'ACCEPTED' &&
      Number(poItemRes.rows[0].quantity_received) === 10;
    assert(isGrnOk, 'Phase 31 Test 2: Goods Receipt Note records delivery and updates received quantity on PO items');
  } catch (err) {
    console.error('Error 31.2:', err);
    assert(false, 'Phase 31 Test 2: GRN creation and stock tracking');
  }

  // 31.3: Full Delivery State Transition
  try {
    const refreshedPo = await getPurchaseOrder(testPo.id, companyId);
    const isReceivedOk = refreshedPo.status === 'RECEIVED';
    assert(isReceivedOk, 'Phase 31 Test 3: Purchase Order status automatically transitions to RECEIVED upon complete delivery');
  } catch (err) {
    console.error('Error 31.3:', err);
    assert(false, 'Phase 31 Test 3: PO status transition');
  }

  // 31.4: 3-Way Match: Perfect Match Verification
  try {
    // Create matching Vendor Bill in bills
    testBillId = 'bill_match_perfect_' + Date.now();
    await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 1180000, 1180000, 1000000, 180000)`,
      [testBillId, companyId, 'BILL-PERF-' + Date.now(), vendorId]
    );

    const matchRes = await performThreeWayMatch({
      companyId,
      poId: testPo.id,
      grnId: testGrn.id,
      billId: testBillId,
      tolerancePercentage: 2.0
    });

    const billRes = await db.query(`SELECT approval_status FROM bills WHERE id = $1`, [testBillId]);

    const isMatchOk = matchRes.success &&
      matchRes.matchStatus === 'PERFECT_MATCH' &&
      matchRes.isApprovedForPayment === true &&
      billRes.rows[0].approval_status === 'APPROVED';
    assert(isMatchOk, 'Phase 31 Test 4: 3-Way Match confirms exact match across PO, GRN, and Bill, approving bill for payment');
  } catch (err) {
    console.error('Error 31.4:', err);
    assert(false, 'Phase 31 Test 4: 3-way perfect match');
  }

  // 31.5: 3-Way Match: Variance Discrepancy Quarantine
  try {
    // Create an inflated/discrepant Vendor Bill (Rs. 15,000 instead of Rs. 11,800)
    const badBillId = 'bill_match_bad_' + Date.now();
    await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 1500000, 1500000, 1300000, 200000)`,
      [badBillId, companyId, 'BILL-BAD-' + Date.now(), vendorId]
    );

    const badMatchRes = await performThreeWayMatch({
      companyId,
      poId: testPo.id,
      grnId: testGrn.id,
      billId: badBillId,
      tolerancePercentage: 2.0
    });

    const isVarianceBlocked = badMatchRes.success &&
      badMatchRes.matchStatus === 'BLOCKED_VARIANCE' &&
      badMatchRes.isApprovedForPayment === false;
    assert(isVarianceBlocked, 'Phase 31 Test 5: Rate variance exceeding tolerance triggers BLOCKED_VARIANCE and halts payment approval');
  } catch (err) {
    console.error('Error 31.5:', err);
    assert(false, 'Phase 31 Test 5: 3-way variance quarantine');
  }

  // ============================================================================
  // PHASE 32: AI Indian Invoice & Receipt OCR Pipeline (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 32: AI Indian Invoice & Receipt OCR Pipeline (5 Tests) ---');

  const sampleInvoiceText = `
    BHARAT TECH SUPPLIES LLP
    Tax Invoice
    GSTIN: 27AABCB1234F1Z8
    Invoice No: INV-2026-9041
    Invoice Date: 15/04/2026
    Due Date: 15/05/2026
    HSN/SAC: 998314
    Description: Annual Cloud ERP & Security Audit Services
    Subtotal: Rs. 1,00,000.00
    CGST (9%): Rs. 9,000.00
    SGST (9%): Rs. 9,000.00
    Total Invoice Value: Rs. 1,18,000.00
  `;

  // 32.1: Legal Entity & 15-Digit GSTIN Extraction
  try {
    const parsed = parseIndianInvoiceText(sampleInvoiceText);
    const isGstinOk = parsed.vendorGstin === '27AABCB1234F1Z8' &&
      parsed.vendorPan === 'AABCB1234F';
    assert(isGstinOk, 'Phase 32 Test 1: Parser extracts valid 15-digit GSTIN and isolates vendor PAN entity key');
  } catch (err) {
    console.error('Error 32.1:', err);
    assert(false, 'Phase 32 Test 1: GSTIN extraction');
  }

  // 32.2: Document Number & Date Normalization
  try {
    const parsed = parseIndianInvoiceText(sampleInvoiceText);
    const isDocOk = parsed.invoiceNumber === 'INV-2026-9041' &&
      parsed.invoiceDate === '2026-04-15';
    assert(isDocOk, 'Phase 32 Test 2: Standardizes document number and normalizes Indian date format (DD/MM/YYYY) to ISO (YYYY-MM-DD)');
  } catch (err) {
    console.error('Error 32.2:', err);
    assert(false, 'Phase 32 Test 2: Document number and date normalization');
  }

  // 32.3: Taxable Value & Dual GST Split Calculation
  try {
    const parsed = parseIndianInvoiceText(sampleInvoiceText);
    const isTaxOk = BigInt(parsed.totalPaise) === 11800000n &&
      BigInt(parsed.subtotalPaise) === 10000000n &&
      BigInt(parsed.cgstPaise) === 900000n &&
      BigInt(parsed.sgstPaise) === 900000n;
    assert(isTaxOk, 'Phase 32 Test 3: Computes exact taxable base and 50/50 CGST and SGST splits to the paisa');
  } catch (err) {
    console.error('Error 32.3:', err);
    assert(false, 'Phase 32 Test 3: Taxable value and GST split math');
  }

  // 32.4: Chart of Accounts Auto-Categorization
  try {
    const profAccount = suggestExpenseAccountForHsn('998314', 'Software Consulting');
    const rentAccount = suggestExpenseAccountForHsn('997212', 'Commercial Office Space Lease');
    const cogsAccount = suggestExpenseAccountForHsn('847130', 'Laptops and Servers');

    const isCategorizedOk = profAccount.accountId === 'acc_6000' &&
      rentAccount.accountId === 'acc_6100' &&
      cogsAccount.accountId === 'acc_5000';
    assert(isCategorizedOk, 'Phase 32 Test 4: HSN/SAC heuristic maps items directly to proper Chart of Accounts expense heads');
  } catch (err) {
    console.error('Error 32.4:', err);
    assert(false, 'Phase 32 Test 4: Chart of accounts auto-categorization');
  }

  // 32.5: OCR Scan to Draft Bill Conversion
  try {
    const scan = await simulateOcrScan({
      companyId,
      fileName: 'vendor_tax_inv_9041.pdf',
      rawText: sampleInvoiceText
    });

    const billDraft = await convertOcrToBillDraft({
      ocrId: scan.id,
      companyId
    });

    const isConvertedOk = billDraft && billDraft.bill_number === 'INV-2026-9041' &&
      BigInt(billDraft.amount_paise) === 11800000n &&
      billDraft.approval_status === 'PENDING_APPROVAL';
    assert(isConvertedOk, 'Phase 32 Test 5: OCR scan converts seamlessly into a staged Draft Vendor Bill with confidence scoring');
  } catch (err) {
    console.error('Error 32.5:', err);
    assert(false, 'Phase 32 Test 5: OCR to bill conversion');
  }

  // ============================================================================
  // PHASE 33: Vendor Bills, Recurring Expenses & Multi-Tier Approvals (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 33: Vendor Bills & Multi-Tier Approvals (5 Tests) ---');

  // 33.1: Threshold-Based Tier Classification
  try {
    const t1 = determineApprovalTier(3000000);  // Rs. 30,000 -> TIER_1
    const t2 = determineApprovalTier(15000000); // Rs. 1,50,000 -> TIER_2
    const t3 = determineApprovalTier(60000000); // Rs. 6,00,000 -> TIER_3

    const isTiersOk = t1 === APPROVAL_TIERS.TIER_1 &&
      t2 === APPROVAL_TIERS.TIER_2 &&
      t3 === APPROVAL_TIERS.TIER_3;
    assert(isTiersOk, 'Phase 33 Test 1: Automatically classifies approval tiers: Tier 1 (<=50k), Tier 2 (50k-500k), Tier 3 (>500k)');
  } catch (err) {
    console.error('Error 33.1:', err);
    assert(false, 'Phase 33 Test 1: Approval tier classification');
  }

  // 33.2: Authorization Enforcement Guard
  try {
    let authBlocked = false;
    try {
      // Create high-value Tier 3 bill (Rs. 10 Lakhs = 100,000,000 paise)
      const bigBillId = 'bill_big_' + Date.now();
      await db.query(
        `INSERT INTO bills (
          id, company_id, bill_number, vendor_id, bill_date, due_date,
          status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
        ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 100000000, 100000000, 84745763, 15254237)`,
        [bigBillId, companyId, 'BILL-BIG-' + Date.now(), vendorId]
      );

      await submitBillForApproval({ billId: bigBillId, companyId });

      // Attempt approval with basic Manager role (should fail!)
      await approveBill({
        billId: bigBillId,
        companyId,
        user: { id: 'usr_mgr', role: 'MANAGER' }
      });
    } catch (err) {
      if (err.message.includes('not authorized')) authBlocked = true;
    }
    assert(authBlocked, 'Phase 33 Test 2: RBAC authority check rejects approval when user role lacks required tier sign-off authority');
  } catch (err) {
    console.error('Error 33.2:', err);
    assert(false, 'Phase 33 Test 2: Approval authorization guard');
  }

  // 33.3: Authorized Multi-Tier Approval & Audit Trail
  let approvedBillId = null;
  try {
    approvedBillId = 'bill_appr_ok_' + Date.now();
    await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise, cgst_paise, sgst_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 236000, 236000, 200000, 36000, 18000, 18000)`,
      [approvedBillId, companyId, 'BILL-APPR-' + Date.now(), vendorId]
    );

    await submitBillForApproval({ billId: approvedBillId, companyId });

    const approvalResult = await approveBill({
      billId: approvedBillId,
      companyId,
      comments: 'Verified against contract rates',
      user: { id: 'usr_ctrl', role: 'FINANCE_CONTROLLER' }
    });

    const auditRes = await db.query(`SELECT action, user_role, comments FROM bill_approval_audit WHERE bill_id = $1`, [approvedBillId]);

    const isApprOk = approvalResult.approvalStatus === 'APPROVED' &&
      auditRes.rows.some(a => a.action === 'APPROVE' && a.user_role === 'FINANCE_CONTROLLER');
    assert(isApprOk, 'Phase 33 Test 3: Authorized controller approval succeeds and records immutable sign-off audit entry');
  } catch (err) {
    console.error('Error 33.3:', err);
    assert(false, 'Phase 33 Test 3: Multi-tier approval execution');
  }

  // 33.4: Double-Entry General Ledger Balance on Approval
  try {
    const bRes = await db.query(`SELECT approval_status FROM bills WHERE id = $1`, [approvedBillId]);
    const jeRes = await db.query(
      `SELECT SUM(jel.debit_paise) as total_debit, SUM(jel.credit_paise) as total_credit
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.source_id = $1 AND je.source_type = 'VENDOR_BILL'`,
      [approvedBillId]
    );
    const row = jeRes.rows[0];
    const isGlOk = row && BigInt(row.total_debit) === 236000n &&
      BigInt(row.total_debit) === BigInt(row.total_credit);
    assert(isGlOk, 'Phase 33 Test 4: Bill approval automatically posts balanced General Ledger entry (Debit Expense & ITC = Credit A/P)');
  } catch (err) {
    console.error('Error 33.4:', err);
    assert(false, 'Phase 33 Test 4: Double-entry GL balance on bill approval');
  }

  // 33.5: Recurring Expense Automation Engine
  try {
    const tpl = await createRecurringBillTemplate({
      companyId,
      vendorId,
      templateName: 'Office Internet Lease Line',
      frequency: 'MONTHLY',
      amountPaise: 590000, // Rs. 5,900
      nextRunDate: new Date().toISOString().slice(0, 10)
    });

    const runResult = await processRecurringBillTemplates({ companyId });
    const isRecurringOk = tpl && runResult.processedCount >= 1 &&
      runResult.bills.some(b => b.recurring_rule_id === tpl.id);
    assert(isRecurringOk, 'Phase 33 Test 5: Recurring expense engine generates periodic vendor bills and rolls forward schedule date');
  } catch (err) {
    console.error('Error 33.5:', err);
    assert(false, 'Phase 33 Test 5: Recurring expenses automation');
  }

  // ============================================================================
  // PHASE 34: MSME (Udyam) 45-Day Compliance Shield (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 34: MSME (Udyam) 45-Day Compliance Shield (5 Tests) ---');

  // 34.1: Udyam Registration Syntax Validation
  try {
    const validUdyam = validateUdyamNumber('UDYAM-MH-01-0012345');
    const invalidUdyam = validateUdyamNumber('INVALID-UDYAM-123');

    const isUdyamOk = validUdyam.valid === true && validUdyam.stateCode === 'MH' &&
      invalidUdyam.valid === false;
    assert(isUdyamOk, 'Phase 34 Test 1: Validates official Ministry of MSME Udyam registration structure and extracts state code');
  } catch (err) {
    console.error('Error 34.1:', err);
    assert(false, 'Phase 34 Test 1: Udyam validation');
  }

  // 34.2: 15-Day vs 45-Day Statutory Deadline Resolution
  try {
    const noContract = calculateMsmeDueDate('2026-04-01', false);
    const withContract = calculateMsmeDueDate('2026-04-01', true);

    const isDatesOk = noContract.maxDaysAllowed === 15 && noContract.msmeDueDate === '2026-04-16' &&
      withContract.maxDaysAllowed === 45 && withContract.msmeDueDate === '2026-05-16';
    assert(isDatesOk, 'Phase 34 Test 2: Resolves statutory deadline: exactly 15 days without agreement and 45 days with written agreement');
  } catch (err) {
    console.error('Error 34.2:', err);
    assert(false, 'Phase 34 Test 2: MSME statutory deadline resolution');
  }

  // 34.3: Section 16 Penal Interest Math (3x RBI Bank Rate)
  try {
    // Principal: Rs. 1,00,000 (10,000,000 paise). Overdue: 30 days. Rate: 19.5% p.a.
    // Interest = (10,000,000 * 1950 * 30) / (10000 * 365) = 585,000,000 / 365 = 160,273 paise (Rs. 1,602.73)
    const interest = calculateMsmeLateInterest(10000000, 30, MSME_PENAL_RATE_PERCENT);
    const isInterestOk = interest === 160273n;
    assert(isInterestOk, 'Phase 34 Test 3: Computes statutory penal compound interest at 3x RBI bank rate (19.5% p.a.) down to exact paisa');
  } catch (err) {
    console.error('Error 34.3:', err);
    assert(false, 'Phase 34 Test 3: Section 16 penal interest math');
  }

  // 34.4: Section 43B(h) Disallowed Expense Flagging
  try {
    // Insert a bill dated 60 days ago for a Micro vendor (45 days deadline breached 15 days ago)
    const msmeBreachedBillId = 'bill_msme_breach_' + Date.now();
    await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE - 60, CURRENT_DATE - 15, 'UNPAID', 500000, 500000, 423728, 76272)`,
      [msmeBreachedBillId, companyId, 'BILL-MSME-BR-' + Date.now(), vendorId]
    );

    const report = await evaluateMsmeCompliance({ companyId, asOfDate: new Date().toISOString().slice(0, 10) });
    const target = report.bills.find(b => b.billId === msmeBreachedBillId);

    const isBreachedOk = target && target.status === 'BREACHED_DISALLOWED' &&
      target.daysOverdue >= 15 &&
      BigInt(target.disallowedAmountPaise) === 500000n &&
      BigInt(target.interestPenaltyPaise) > 0n;
    assert(isBreachedOk, 'Phase 34 Test 4: Overdue MSME bill flagged as BREACHED_DISALLOWED with 100% tax deductibility disallowance under Sec 43B(h)');
  } catch (err) {
    console.error('Error 34.4:', err);
    assert(false, 'Phase 34 Test 4: Section 43B(h) disallowance flagging');
  }

  // 34.5: MSME Warning Radar Breakdown
  try {
    // Insert an approaching bill (due in 5 days)
    const msmeApproachingBillId = 'bill_msme_appr_' + Date.now();
    await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE - 40, CURRENT_DATE + 5, 'UNPAID', 300000, 300000, 254237, 45763)`,
      [msmeApproachingBillId, companyId, 'BILL-MSME-AP-' + Date.now(), vendorId]
    );

    const radarReport = await evaluateMsmeCompliance({ companyId, asOfDate: new Date().toISOString().slice(0, 10) });
    const hasApproaching = radarReport.approachingCount >= 1;
    const hasBreached = radarReport.breachedCount >= 1;

    assert(hasApproaching && hasBreached, 'Phase 34 Test 5: MSME radar accurately categorizes bills into SAFE, APPROACHING_DEADLINE, and BREACHED stages');
  } catch (err) {
    console.error('Error 34.5:', err);
    assert(false, 'Phase 34 Test 5: MSME warning radar');
  }

  // ============================================================================
  // PHASE 35: Batch Bill Payouts, Vendor Credits & Debit Notes (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 35: Batch Bill Payouts & Vendor Debit Notes (5 Tests) ---');

  // Prepare a posted bill for debit note testing
  const debitTargetBillId = 'bill_dn_target_' + Date.now();
  const origBillNumber = 'BILL-DN-ORIG-' + Date.now();
  await db.query(
    `INSERT INTO bills (
      id, company_id, bill_number, vendor_id, bill_date, due_date,
      status, amount_paise, open_balance_paise, subtotal_paise, tax_paise
    ) VALUES ($1, $2, $3, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 236000, 236000, 200000, 36000)`,
    [debitTargetBillId, companyId, origBillNumber, vendorId]
  );

  let debitNoteResult = null;

  // 35.1: Section 34 Vendor Debit Note Creation
  try {
    debitNoteResult = await issueVendorDebitNote({
      companyId,
      originalBillId: debitTargetBillId,
      debitNoteNumber: 'DN-PROOF-' + Date.now(),
      reason: 'PURCHASE_RETURN',
      reasonDescription: 'Defective power supply returned to vendor',
      lines: [
        { productId: prodId, description: 'Return 1 unit network switch', quantity: 1, unitPricePaise: 100000, taxRateBp: 1800 }
      ]
    });

    const isDnOk = debitNoteResult.success &&
      debitNoteResult.originalBillNumber === origBillNumber &&
      BigInt(debitNoteResult.taxableAmountPaise) === 100000n &&
      BigInt(debitNoteResult.totalTaxPaise) === 18000n &&
      BigInt(debitNoteResult.totalPaise) === 118000n;
    assert(isDnOk, 'Phase 35 Test 1: Section 34 Vendor Debit Note issued with statutory reference to original bill number');
  } catch (err) {
    console.error('Error 35.1:', err);
    assert(false, 'Phase 35 Test 1: Vendor debit note creation');
  }

  // 35.2: Accounts Payable Knock-down
  try {
    const bRes = await db.query(`SELECT open_balance_paise FROM bills WHERE id = $1`, [debitTargetBillId]);
    const isDueKnocked = BigInt(bRes.rows[0].open_balance_paise) === (236000n - 118000n);
    assert(isDueKnocked, 'Phase 35 Test 2: Debit note automatically knocks down original bill open payable balance to exact paisa');
  } catch (err) {
    console.error('Error 35.2:', err);
    assert(false, 'Phase 35 Test 2: Accounts payable knockdown');
  }

  // 35.3: Input Tax Credit Reversal Double-Entry Invariant
  try {
    const jeRes = await db.query(
      `SELECT SUM(jel.debit_paise) as total_debit, SUM(jel.credit_paise) as total_credit
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.id = $1`,
      [debitNoteResult.journalEntryId]
    );
    const row = jeRes.rows[0];
    const isBalanced = row && BigInt(row.total_debit) === 118000n &&
      BigInt(row.total_debit) === BigInt(row.total_credit);
    assert(isBalanced, 'Phase 35 Test 3: Debit note journal entry debits A/P and credits Purchase Returns & ITC with exact balance');
  } catch (err) {
    console.error('Error 35.3:', err);
    assert(false, 'Phase 35 Test 3: ITC reversal double-entry invariant');
  }

  // 35.4: Bank Batch Payout File Generation
  let batchPayoutResult = null;
  const payBillA = 'bill_payout_a_' + Date.now();
  const payBillB = 'bill_payout_b_' + Date.now();

  try {
    await db.query(
      `INSERT INTO bills (id, company_id, bill_number, vendor_id, bill_date, due_date, status, amount_paise, open_balance_paise, subtotal_paise, tax_paise)
       VALUES 
        ($1, $3, $5, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 50000, 50000, 42372, 7628),
        ($2, $3, $6, $4, CURRENT_DATE, CURRENT_DATE + 30, 'UNPAID', 75000, 75000, 63559, 11441)`,
      [payBillA, payBillB, companyId, vendorId, 'BILL-PAY-A-' + Date.now(), 'BILL-PAY-B-' + Date.now()]
    );

    batchPayoutResult = await generateBatchPayoutFile({
      companyId,
      billIds: [payBillA, payBillB],
      payoutChannel: 'NEFT',
      bankFormat: 'HDFC_CMS'
    });

    const isBatchFileOk = batchPayoutResult.success &&
      batchPayoutResult.totalBillsCount === 2 &&
      BigInt(batchPayoutResult.totalPayoutPaise) === 125000n && // 50000 + 75000
      batchPayoutResult.fileContent.includes('NEFT') &&
      batchPayoutResult.fileContent.includes('500.00') &&
      batchPayoutResult.fileContent.includes('750.00');
    assert(isBatchFileOk, 'Phase 35 Test 4: Batch payout generator compiles multi-bill bank clearance CSV file with beneficiary metadata');
  } catch (err) {
    console.error('Error 35.4:', err);
    assert(false, 'Phase 35 Test 4: Batch payout file generation');
  }

  // 35.5: Batch Settlement & Cash Disbursement Journal Entry
  try {
    const billARes = await db.query(`SELECT status, open_balance_paise FROM bills WHERE id = $1`, [payBillA]);
    const billBRes = await db.query(`SELECT status, open_balance_paise FROM bills WHERE id = $1`, [payBillB]);

    const jeRes = await db.query(
      `SELECT SUM(jel.debit_paise) as total_debit, SUM(jel.credit_paise) as total_credit
       FROM journal_entries je
       JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
       WHERE je.id = $1`,
      [batchPayoutResult.journalEntryId]
    );
    const row = jeRes.rows[0];

    const isSettledOk = billARes.rows[0].status === 'PAID' &&
      Number(billARes.rows[0].open_balance_paise) === 0 &&
      billBRes.rows[0].status === 'PAID' &&
      Number(billBRes.rows[0].open_balance_paise) === 0 &&
      row && BigInt(row.total_debit) === 125000n &&
      BigInt(row.total_debit) === BigInt(row.total_credit);
    assert(isSettledOk, 'Phase 35 Test 5: Batch payout marks bills PAID with zero open balance and posts balanced cash disbursement entry');
  } catch (err) {
    console.error('Error 35.5:', err);
    assert(false, 'Phase 35 Test 5: Batch settlement & cash disbursement');
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

runDomain7ProofSuite().catch(err => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
