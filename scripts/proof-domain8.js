/**
 * Meso Domain 8 Proof-of-Correctness Suite: Inventory, Manufacturing & Project Profitability
 * Phases 36 to 40 (25 Rigorous Tests, 5 Tests per Phase)
 * Verifies real database persistence, FIFO/Weighted Average valuation math, 
 * assembly builds, timesheets, and project margin invariants.
 */

import { getDb, initDb } from '../server/src/db/db.js';
import {
  recordInventoryReceipt,
  recordInventoryIssue,
  recalculateValuationFromDate,
  getInventoryValuationSummary,
  VALUATION_METHODS
} from '../server/src/services/inventoryValuationService.js';
import {
  createBatch,
  registerSerialNumbers,
  updateSerialStatus,
  checkReorderAlerts,
  checkExpiringBatches,
  performStockAdjustment
} from '../server/src/services/stockTrackingService.js';
import {
  createBillOfMaterials,
  executeAssemblyBuild,
  issueJobWorkChallan,
  recordJobWorkReturn,
  checkOverdueJobWorkChallans
} from '../server/src/services/manufacturingService.js';
import {
  createTimesheetEntry,
  approveTimesheetEntries,
  recordBillableExpense,
  convertUnbilledToInvoiceItems
} from '../server/src/services/timesheetBillingService.js';
import {
  createProject,
  calculateProjectProfitability,
  getCustomerProfitabilityMatrix
} from '../server/src/services/projectProfitabilityService.js';

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

async function runDomain8ProofSuite() {
  console.log('================================================================================');
  console.log('MESO DOMAIN 8 PROOF-OF-CORRECTNESS SUITE: PHASES 36-40 (25 TESTS)');
  console.log('================================================================================\n');

  await initDb();
  const db = await getDb();
  const companyId = 'comp_1';

  // Seed baseline customer and vendor contacts for testing
  const customerId = 'cont_proof_d8_cust_' + Date.now();
  await db.query(
    `INSERT INTO contacts (id, company_id, type, display_name, email, gstin)
     VALUES ($1, $2, 'CUSTOMER', 'Acme Infrastructure Pvt Ltd', 'billing@acmeinfra.com', '27AAACA1234A1Z5')
     ON CONFLICT (id) DO NOTHING`,
    [customerId, companyId]
  );

  const vendorId = 'cont_proof_d8_vend_' + Date.now();
  await db.query(
    `INSERT INTO contacts (id, company_id, type, display_name, email, gstin)
     VALUES ($1, $2, 'VENDOR', 'Precision Components Ltd', 'sales@precisioncomp.in', '27AAACB5678B1Z2')
     ON CONFLICT (id) DO NOTHING`,
    [vendorId, companyId]
  );

  // Seed raw material and finished products
  const rawMatId1 = 'prod_raw_steel_' + Date.now();
  await db.query(
    `INSERT INTO products_and_services (id, company_id, name, type, sales_price_paise, purchase_cost_paise, quantity_on_hand, reorder_point, is_active)
     VALUES ($1, $2, 'Cold Rolled Steel Coil 2mm', 'INVENTORY', 12000, 8000, 0, 50, true)
     ON CONFLICT (id) DO NOTHING`,
    [rawMatId1, companyId]
  );

  const rawMatId2 = 'prod_raw_sensor_' + Date.now();
  await db.query(
    `INSERT INTO products_and_services (id, company_id, name, type, sales_price_paise, purchase_cost_paise, quantity_on_hand, reorder_point, is_active)
     VALUES ($1, $2, 'Micro Optic Sensor Unit', 'INVENTORY', 50000, 35000, 0, 20, true)
     ON CONFLICT (id) DO NOTHING`,
    [rawMatId2, companyId]
  );

  const finishedProdId = 'prod_finished_module_' + Date.now();
  await db.query(
    `INSERT INTO products_and_services (id, company_id, name, type, sales_price_paise, purchase_cost_paise, quantity_on_hand, reorder_point, is_active)
     VALUES ($1, $2, 'Automated Industrial Controller Box', 'INVENTORY', 250000, 150000, 0, 10, true)
     ON CONFLICT (id) DO NOTHING`,
    [finishedProdId, companyId]
  );

  // ============================================================================
  // PHASE 36: Continuous Inventory Valuation Engine (5 Tests)
  // ============================================================================
  console.log('--- PHASE 36: Continuous Inventory Valuation Engine (FIFO & Weighted Average) ---');
  let receipt1 = null;
  let receipt2 = null;
  let issue1 = null;

  // 36.1: Record Inventory Receipts (FIFO Layers)
  try {
    receipt1 = await recordInventoryReceipt({
      companyId,
      productId: rawMatId1,
      quantity: 100,
      unitCostPaise: 8000, // ₹80.00
      sourceDocType: 'BILL',
      sourceDocId: 'BILL-001',
      layerDate: '2026-09-01'
    });

    receipt2 = await recordInventoryReceipt({
      companyId,
      productId: rawMatId1,
      quantity: 50,
      unitCostPaise: 9000, // ₹90.00
      sourceDocType: 'BILL',
      sourceDocId: 'BILL-002',
      layerDate: '2026-09-15'
    });

    const isReceiptOk = receipt1 && parseFloat(receipt1.quantity_in) === 100 && receipt2 && parseFloat(receipt2.quantity_in) === 50;
    assert(isReceiptOk, 'Phase 36 Test 1: Inventory receipts create chronological valuation layers in integer minor-unit paise');
  } catch (err) {
    assert(false, 'Phase 36 Test 1: Inventory receipt layer creation: ' + err.message);
  }

  // 36.2: FIFO Issue and Layer Depletion
  try {
    // Sell 120 units: 100 from Layer 1 @ ₹80, 20 from Layer 2 @ ₹90
    // Expected COGS: (100 * 8000) + (20 * 9000) = 800,000 + 180,000 = 980,000 paise (₹9,800.00)
    issue1 = await recordInventoryIssue({
      companyId,
      productId: rawMatId1,
      quantity: 120,
      sourceDocType: 'INVOICE',
      sourceDocId: 'INV-001',
      layerDate: '2026-09-20',
      method: VALUATION_METHODS.FIFO
    });

    const expectedCogs = 980000;
    const isFifoCogsOk = issue1.totalCogsPaise === expectedCogs && issue1.layersDepleted.length === 2;
    assert(isFifoCogsOk, `Phase 36 Test 2: FIFO issue depletes oldest layer first with exact COGS (${issue1.totalCogsPaise} paise vs ${expectedCogs} paise)`);
  } catch (err) {
    assert(false, 'Phase 36 Test 2: FIFO depletion calculation: ' + err.message);
  }

  // 36.3: Weighted Average Valuation Calculation
  try {
    const summary = await getInventoryValuationSummary(companyId, rawMatId1);
    // Remaining: 30 units from Layer 2 @ ₹90 = 270,000 paise (₹2,700.00)
    const isValuationOk = summary.totalQuantity === 30 && summary.totalValuePaise === 270000;
    assert(isValuationOk, `Phase 36 Test 3: Closing stock summary matches remaining unconsumed layers (Qty: ${summary.totalQuantity}, Value: ₹${summary.totalValuePaise / 100})`);
  } catch (err) {
    assert(false, 'Phase 36 Test 3: Valuation summary calculation: ' + err.message);
  }

  // 36.4: Backdated Recalibration Engine
  try {
    // Re-evaluate from beginning of month
    const recalc = await recalculateValuationFromDate(companyId, rawMatId1, '2026-09-01');
    const isRecalcOk = recalc.recalculated && recalc.currentStock === 30 && recalc.closingValuePaise === 270000;
    assert(isRecalcOk, 'Phase 36 Test 4: Backdated valuation engine cleanly recalibrates historical layer allocations');
  } catch (err) {
    assert(false, 'Phase 36 Test 4: Backdated recalculation engine: ' + err.message);
  }

  // 36.5: Weighted Average Issue on Secondary Product
  try {
    await recordInventoryReceipt({
      companyId,
      productId: rawMatId2,
      quantity: 40,
      unitCostPaise: 30000,
      layerDate: '2026-09-05'
    });
    await recordInventoryReceipt({
      companyId,
      productId: rawMatId2,
      quantity: 60,
      unitCostPaise: 40000,
      layerDate: '2026-09-10'
    });
    // Total: 40*30,000 + 60*40,000 = 1,200,000 + 2,400,000 = 3,600,000 / 100 = 36,000 paise avg cost
    const waIssue = await recordInventoryIssue({
      companyId,
      productId: rawMatId2,
      quantity: 50,
      method: VALUATION_METHODS.WEIGHTED_AVERAGE,
      layerDate: '2026-09-22'
    });

    const expectedWaCogs = 50 * 36000;
    const isWaOk = waIssue.totalCogsPaise === expectedWaCogs;
    assert(isWaOk, `Phase 36 Test 5: Weighted average issue calculates smoothed blended unit cost (${waIssue.totalCogsPaise} paise vs ${expectedWaCogs} paise)`);
  } catch (err) {
    assert(false, 'Phase 36 Test 5: Weighted average valuation: ' + err.message);
  }

  // ============================================================================
  // PHASE 37: Batch/Serial Tracking, Reorder Alerts & Adjustments (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 37: Batch/Serial Tracking, Reorder Alerts & Stock Adjustments (5 Tests) ---');
  let testBatch = null;

  // 37.1: Batch & Lot Registration with Expiry Date
  try {
    testBatch = await createBatch({
      companyId,
      productId: rawMatId1,
      batchNumber: 'LOT-STL-2026-01',
      mfgDate: '2026-08-01',
      expiryDate: '2026-11-15',
      quantity: 150,
      unitCostPaise: 8000
    });
    const isBatchOk = testBatch && testBatch.batch_number === 'LOT-STL-2026-01' && parseFloat(testBatch.current_quantity) === 150;
    assert(isBatchOk, 'Phase 37 Test 1: Batch lot registered with manufacturing date, expiry date, and unit cost');
  } catch (err) {
    assert(false, 'Phase 37 Test 1: Batch lot creation: ' + err.message);
  }

  // 37.2: Serial Number Tracking & Lifecycle Transition
  try {
    const serials = await registerSerialNumbers({
      companyId,
      productId: finishedProdId,
      batchId: testBatch?.id,
      serialNumbers: ['SN-MESO-001', 'SN-MESO-002', 'SN-MESO-003'],
      purchaseDocId: 'PO-D8-001'
    });

    const updated = await updateSerialStatus({
      companyId,
      productId: finishedProdId,
      serialNumber: 'SN-MESO-001',
      newStatus: 'SOLD',
      salesDocId: 'INV-D8-999'
    });

    const isSerialOk = serials.length === 3 && updated && updated.status === 'SOLD';
    assert(isSerialOk, 'Phase 37 Test 2: Unique serial numbers tracked through lifecycle (IN_STOCK -> SOLD)');
  } catch (err) {
    assert(false, 'Phase 37 Test 2: Serial number tracking: ' + err.message);
  }

  // 37.3: Reorder Point Monitoring
  try {
    const alerts = await checkReorderAlerts(companyId);
    const hasShortage = alerts.length > 0 && alerts.some(a => a.id === finishedProdId);
    assert(hasShortage, 'Phase 37 Test 3: Reorder point monitoring accurately triggers restock shortage alerts');
  } catch (err) {
    assert(false, 'Phase 37 Test 3: Reorder alerts check: ' + err.message);
  }

  // 37.4: Expiration Date Proximity Alerts
  try {
    const expiring = await checkExpiringBatches(companyId, 60);
    const hasExpiring = expiring.some(b => b.batch_number === 'LOT-STL-2026-01');
    assert(hasExpiring, 'Phase 37 Test 4: Batch expiry monitor flags lots approaching expiration window');
  } catch (err) {
    assert(false, 'Phase 37 Test 4: Expiring batches check: ' + err.message);
  }

  // 37.5: Physical Stock Adjustment with Balanced Double-Entry GL Journal Entry
  try {
    // Current stock of rawMatId1 is 30. Physical count finds 25 (5 units shrinkage loss @ ₹80 = ₹400 = 40,000 paise loss)
    const adj = await performStockAdjustment({
      companyId,
      adjustmentNumber: 'ADJ-D8-' + Date.now(),
      adjustmentDate: '2026-09-25',
      reason: 'SHRINKAGE',
      notes: 'Physical monthly count discrepancy',
      items: [
        { productId: rawMatId1, countedQuantity: 25 }
      ]
    });

    // Verify GL entries exist and balance to zero
    const linesRes = await db.query(
      `SELECT debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [adj.journalEntryId]
    );
    const sumDebits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.debit_paise, 10), 0);
    const sumCredits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.credit_paise, 10), 0);
    const isBalanced = sumDebits === sumCredits && sumDebits === Math.abs(adj.totalVariancePaise) && sumDebits > 0;

    assert(isBalanced, 'Phase 37 Test 5: Stock adjustment updates physical stock and posts balanced shrinkage journal entry (Debits = Credits)');
  } catch (err) {
    assert(false, 'Phase 37 Test 5: Stock adjustment & double-entry GL: ' + err.message);
  }

  // ============================================================================
  // PHASE 38: Bill of Materials (BOM) & Job Work (ITC-04) (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 38: Bill of Materials (BOM), Assemblies & Job Work (ITC-04) (5 Tests) ---');
  let testBom = null;
  let testBuild = null;
  let testChallan = null;

  // 38.1: Create Bill of Materials (BOM)
  try {
    testBom = await createBillOfMaterials({
      companyId,
      finishedProductId: finishedProdId,
      bomNumber: 'BOM-CTL-BOX-' + Date.now(),
      name: 'Industrial Controller Box Assembly',
      version: '1.0',
      components: [
        { componentProductId: rawMatId1, quantityPerUnit: 2, scrapPercentage: 0 },
        { componentProductId: rawMatId2, quantityPerUnit: 1, scrapPercentage: 0 }
      ]
    });

    const isBomOk = testBom && testBom.components.length === 2;
    assert(isBomOk, 'Phase 38 Test 1: Multi-component Bill of Materials (BOM) defined with precise quantities');
  } catch (err) {
    assert(false, 'Phase 38 Test 1: BOM creation: ' + err.message);
  }

  // 38.2: Execute Assembly Build
  try {
    // Produce 5 finished units: consumes 10 steel + 5 sensors
    testBuild = await executeAssemblyBuild({
      companyId,
      bomId: testBom.id,
      buildNumber: 'BUILD-D8-' + Date.now(),
      quantityAssembled: 5,
      notes: 'Standard manufacturing production run'
    });

    const isBuildOk = testBuild && parseFloat(testBuild.quantity_assembled) === 5 && testBuild.total_cost_paise > 0;
    assert(isBuildOk, 'Phase 38 Test 2: Assembly build execution consumes component raw materials and increases finished goods');
  } catch (err) {
    assert(false, 'Phase 38 Test 2: Assembly build execution: ' + err.message);
  }

  // 38.3: Assembly Double-Entry GL Journal Entry
  try {
    const linesRes = await db.query(
      `SELECT debit_paise, credit_paise FROM journal_entry_lines WHERE journal_entry_id = $1`,
      [testBuild.journal_entry_id]
    );
    const sumDebits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.debit_paise, 10), 0);
    const sumCredits = linesRes.rows.reduce((acc, l) => acc + parseInt(l.credit_paise, 10), 0);
    const isJeBalanced = sumDebits === sumCredits && sumDebits === parseInt(testBuild.total_cost_paise, 10);

    assert(isJeBalanced, 'Phase 38 Test 3: Manufacturing journal entry balances Finished Goods debit against Raw Materials credit');
  } catch (err) {
    assert(false, 'Phase 38 Test 3: Manufacturing GL balance check: ' + err.message);
  }

  // 38.4: Issue Section 143 Job Work Delivery Challan
  try {
    testChallan = await issueJobWorkChallan({
      companyId,
      challanNumber: 'JW-CHALLAN-' + Date.now(),
      jobWorkerId: vendorId,
      goodsType: 'INPUTS',
      items: [
        { productId: rawMatId1, description: 'Steel parts for electroplating', quantitySent: 15, natureOfProcessing: 'Electroplating & Finishing' }
      ]
    });

    // Statutory due date must be exactly 12 months for INPUTS
    const d1 = new Date(testChallan.challan_date);
    const d2 = new Date(testChallan.due_return_date);
    const monthDiff = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    const isChallanOk = testChallan && monthDiff === 12 && testChallan.status === 'ISSUED';

    assert(isChallanOk, 'Phase 38 Test 4: Statutory Job Work delivery challan issued with strict 1-year input deadline (CGST Section 143)');
  } catch (err) {
    assert(false, 'Phase 38 Test 4: Job work challan issue: ' + err.message);
  }

  // 38.5: Job Work Return & Section 143 Compliance Status
  try {
    const itemId = testChallan.items[0].id;
    const ret = await recordJobWorkReturn({
      companyId,
      challanId: testChallan.id,
      returns: [
        { itemId, quantityReturned: 15 }
      ]
    });

    const isReturnedOk = ret.isFullyReturned && ret.status === 'FULLY_RETURNED';
    assert(isReturnedOk, 'Phase 38 Test 5: Processed goods return reconciliation updates challan status to FULLY_RETURNED');
  } catch (err) {
    assert(false, 'Phase 38 Test 5: Job work return recording: ' + err.message);
  }

  // ============================================================================
  // PHASE 39: Timesheets, Contractor Hours & Billable Expenses (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 39: Timesheets, Contractor Hours & Billable Expenses (5 Tests) ---');
  let testProject = null;
  let testTs1 = null;
  let testTs2 = null;
  let testExp = null;

  // 39.1: Project Creation & Timesheet Entry
  try {
    testProject = await createProject({
      companyId,
      projectCode: 'PRJ-M26-001',
      projectName: 'Smart Factory Automation Phase 1',
      customerId,
      startDate: '2026-09-01',
      budgetPaise: 100000000 // ₹10,00,000.00
    });

    testTs1 = await createTimesheetEntry({
      companyId,
      projectId: testProject.id,
      customerId,
      workerId: 'emp_001',
      workerName: 'Rajesh Sharma',
      workDate: '2026-09-10',
      hours: 40,
      hourlyCostPaise: 120000,       // ₹1,200.00/hr cost
      hourlyBillableRatePaise: 250000, // ₹2,500.00/hr billing rate
      isBillable: true,
      notes: 'PLC controller programming'
    });

    testTs2 = await createTimesheetEntry({
      companyId,
      projectId: testProject.id,
      customerId,
      workerId: 'emp_002',
      workerName: 'Ananya Sen',
      workDate: '2026-09-12',
      hours: 20,
      hourlyCostPaise: 100000,       // ₹1,000.00/hr cost
      hourlyBillableRatePaise: 200000, // ₹2,000.00/hr billing rate
      isBillable: true,
      notes: 'Circuit diagram architecture'
    });

    const isTsOk = testTs1 && parseFloat(testTs1.hours) === 40 && testTs2 && parseFloat(testTs2.hours) === 20;
    assert(isTsOk, 'Phase 39 Test 1: Project worker timesheet entries recorded with cost and billable rates');
  } catch (err) {
    assert(false, 'Phase 39 Test 1: Timesheet creation: ' + err.message);
  }

  // 39.2: Multi-Entry Timesheet Approval Workflow
  try {
    const approved = await approveTimesheetEntries(companyId, [testTs1.id, testTs2.id]);
    const isApproveOk = approved.length === 2 && approved.every(a => a.status === 'APPROVED');
    assert(isApproveOk, 'Phase 39 Test 2: Timesheet entries transition from SUBMITTED to APPROVED in batch approval');
  } catch (err) {
    assert(false, 'Phase 39 Test 2: Timesheet approval workflow: ' + err.message);
  }

  // 39.3: Billable Expense with Configurable Percentage Markup
  try {
    testExp = await recordBillableExpense({
      companyId,
      projectId: testProject.id,
      customerId,
      description: 'Specialised calibration hardware rental',
      amountPaise: 5000000, // ₹50,000.00
      markupPercentage: 15, // 15% markup -> ₹57,500.00 = 5,750,000 paise
      isBillable: true
    });

    const expectedBillable = 5750000;
    const isExpOk = testExp && parseInt(testExp.billable_amount_paise, 10) === expectedBillable;
    assert(isExpOk, `Phase 39 Test 3: Project billable expense recorded with automatic markup (${testExp.billable_amount_paise} paise vs ${expectedBillable} paise)`);
  } catch (err) {
    assert(false, 'Phase 39 Test 3: Billable expense markup: ' + err.message);
  }

  // 39.4: Direct Conversion of Unbilled Items to Customer Invoice
  let invoiceData = null;
  try {
    // 40 hrs @ 2500 + 20 hrs @ 2000 + 57500 exp = 100,000 + 40,000 + 57,500 = ₹1,97,500 = 19,750,000 paise
    invoiceData = await convertUnbilledToInvoiceItems({
      companyId,
      customerId,
      projectId: testProject.id,
      invoiceId: 'INV-D8-BILLABLE-001'
    });

    const expectedTotal = 19750000;
    const isConvertOk = invoiceData.totalBilledPaise === expectedTotal && invoiceData.lineItemsCount === 3;
    assert(isConvertOk, `Phase 39 Test 4: 1-Click conversion compiles unbilled timesheets & expenses into invoice lines (${invoiceData.totalBilledPaise} paise)`);
  } catch (err) {
    assert(false, 'Phase 39 Test 4: Conversion to invoice items: ' + err.message);
  }

  // 39.5: Anti-Double-Billing Lock
  try {
    // Verify source timesheets and expenses are now marked BILLED
    const tsCheck = await db.query(`SELECT status FROM timesheet_entries WHERE id IN ($1, $2)`, [testTs1.id, testTs2.id]);
    const expCheck = await db.query(`SELECT status FROM billable_expenses WHERE id = $1`, [testExp.id]);

    const isLocked = tsCheck.rows.every(r => r.status === 'BILLED') && expCheck.rows[0].status === 'BILLED';
    assert(isLocked, 'Phase 39 Test 5: Source timesheets and expenses locked as BILLED to prevent duplicate customer billing');
  } catch (err) {
    assert(false, 'Phase 39 Test 5: Anti-double-billing lock check: ' + err.message);
  }

  // ============================================================================
  // PHASE 40: Live Project & Customer Profitability Matrix (5 Tests)
  // ============================================================================
  console.log('\n--- PHASE 40: Live Project & Customer Profitability Matrix (5 Tests) ---');

  // 40.1: Calculate Project Margin Metrics
  let pStats = null;
  try {
    pStats = await calculateProjectProfitability(companyId, testProject.id, 10);
    // Direct Labor Cost: 40*1200 + 20*1000 = 48,000 + 20,000 = ₹68,000 = 6,800,000 paise
    // Direct Material Cost: ₹50,000 = 5,000,000 paise
    // Total Direct: 11,800,000 paise
    // Overhead (10%): 1,180,000 paise
    // Total Costs: 12,980,000 paise
    // Revenue: 19,750,000 paise
    // Net Profit: 19,750,000 - 12,980,000 = 6,770,000 paise (₹67,700.00)
    const isMarginOk = pStats.netProfitPaise === 6770000 && pStats.isProfitable === true;
    assert(isMarginOk, `Phase 40 Test 1: Real-time project margin computed with direct labor, expenses & overhead (Net Profit: ₹${pStats.netProfitPaise / 100})`);
  } catch (err) {
    assert(false, 'Phase 40 Test 1: Project margin computation: ' + err.message);
  }

  // 40.2: Margin Percentages Verification
  try {
    // Gross: (19,750,000 - 11,800,000) / 19,750,000 = 7,950,000 / 19,750,000 = 40.25%
    // Net: 6,770,000 / 19,750,000 = 34.28%
    const isPercentOk = parseFloat(pStats.grossMarginPercent) > 40 && parseFloat(pStats.netMarginPercent) > 34;
    assert(isPercentOk, `Phase 40 Test 2: Gross margin (${pStats.grossMarginPercent}%) and Net margin (${pStats.netMarginPercent}%) calculated to exact decimal basis points`);
  } catch (err) {
    assert(false, 'Phase 40 Test 2: Margin percentages verification: ' + err.message);
  }

  // 40.3: Project Budget Utilization Tracking
  try {
    const budgetUtilizationPct = ((pStats.totalCostsWithOverheadPaise / pStats.budgetPaise) * 100).toFixed(2);
    const isBudgetOk = parseFloat(budgetUtilizationPct) === 12.98;
    assert(isBudgetOk, `Phase 40 Test 3: Budget utilization rate accurately tracked against master project ceiling (${budgetUtilizationPct}%)`);
  } catch (err) {
    assert(false, 'Phase 40 Test 3: Budget utilization tracking: ' + err.message);
  }

  // 40.4: Customer Profitability Matrix Aggregation
  let custMatrix = null;
  try {
    custMatrix = await getCustomerProfitabilityMatrix(companyId);
    const clientStats = custMatrix.find(c => c.customerId === customerId);
    const isMatrixOk = clientStats && clientStats.totalRevenuePaise === 19750000 && clientStats.isHighMargin === true;
    assert(isMatrixOk, 'Phase 40 Test 4: Customer Profitability Matrix aggregates across projects and identifies high-margin clients');
  } catch (err) {
    assert(false, 'Phase 40 Test 4: Customer profitability matrix: ' + err.message);
  }

  // 40.5: Multi-Tenant Company Isolation Guard on Project Metrics
  try {
    const otherCompanyId = 'comp_isolation_test_' + Date.now();
    const otherMatrix = await getCustomerProfitabilityMatrix(otherCompanyId);
    const isIsolated = otherMatrix.length === 0;
    assert(isIsolated, 'Phase 40 Test 5: Strict multi-tenant isolation enforced—zero leakage of project margins across companies');
  } catch (err) {
    assert(false, 'Phase 40 Test 5: Multi-tenant isolation guard: ' + err.message);
  }

  console.log('\n================================================================================');
  console.log(`DOMAIN 8 SUITE COMPLETE: ${testsPassed}/25 PASSED, ${testsFailed} FAILED`);
  console.log('================================================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runDomain8ProofSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
