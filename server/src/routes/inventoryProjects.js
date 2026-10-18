import express from 'express';
import {
  recordInventoryReceipt,
  recordInventoryIssue,
  recalculateValuationFromDate,
  getInventoryValuationSummary,
  VALUATION_METHODS
} from '../services/inventoryValuationService.js';
import {
  createBatch,
  registerSerialNumbers,
  updateSerialStatus,
  checkReorderAlerts,
  checkExpiringBatches,
  performStockAdjustment
} from '../services/stockTrackingService.js';
import {
  createBillOfMaterials,
  executeAssemblyBuild,
  issueJobWorkChallan,
  recordJobWorkReturn,
  checkOverdueJobWorkChallans
} from '../services/manufacturingService.js';
import {
  createTimesheetEntry,
  approveTimesheetEntries,
  recordBillableExpense,
  convertUnbilledToInvoiceItems
} from '../services/timesheetBillingService.js';
import {
  createProject,
  calculateProjectProfitability,
  getCustomerProfitabilityMatrix
} from '../services/projectProfitabilityService.js';

const router = express.Router();

// ==========================================
// Phase 36: Inventory Valuation Engine
// ==========================================
router.get('/inventory/valuation/:productId', async (req, res) => {
  try {
    const summary = await getInventoryValuationSummary(req.companyId, req.params.productId);
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory/recalculate', async (req, res) => {
  try {
    const { productId, fromDate } = req.body;
    const result = await recalculateValuationFromDate(req.companyId, productId, fromDate);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Phase 37: Batches, Serials & Adjustments
// ==========================================
router.post('/inventory/batches', async (req, res) => {
  try {
    const batch = await createBatch({ companyId: req.companyId, ...req.body });
    res.json({ success: true, batch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inventory/reorder-alerts', async (req, res) => {
  try {
    const alerts = await checkReorderAlerts(req.companyId);
    res.json({ success: true, alerts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inventory/expiring-batches', async (req, res) => {
  try {
    const batches = await checkExpiringBatches(req.companyId, req.query.days || 30);
    res.json({ success: true, batches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory/adjustments', async (req, res) => {
  try {
    const adjustment = await performStockAdjustment({ companyId: req.companyId, ...req.body });
    res.json({ success: true, adjustment });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Phase 38: Manufacturing & Job Work
// ==========================================
router.post('/inventory/bom', async (req, res) => {
  try {
    const bom = await createBillOfMaterials({ companyId: req.companyId, ...req.body });
    res.json({ success: true, bom });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory/assemblies/build', async (req, res) => {
  try {
    const build = await executeAssemblyBuild({ companyId: req.companyId, ...req.body });
    res.json({ success: true, build });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory/job-work/challans', async (req, res) => {
  try {
    const challan = await issueJobWorkChallan({ companyId: req.companyId, ...req.body });
    res.json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/inventory/job-work/returns', async (req, res) => {
  try {
    const result = await recordJobWorkReturn({ companyId: req.companyId, ...req.body });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/inventory/job-work/overdue', async (req, res) => {
  try {
    const overdue = await checkOverdueJobWorkChallans(req.companyId);
    res.json({ success: true, overdue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Phase 39: Timesheets & Billable Expenses
// ==========================================
router.post('/projects/timesheets', async (req, res) => {
  try {
    const entry = await createTimesheetEntry({ companyId: req.companyId, ...req.body });
    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/timesheets/approve', async (req, res) => {
  try {
    const approved = await approveTimesheetEntries(req.companyId, req.body.entryIds);
    res.json({ success: true, approved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/billable-expenses', async (req, res) => {
  try {
    const expense = await recordBillableExpense({ companyId: req.companyId, ...req.body });
    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/projects/convert-unbilled-to-invoice', async (req, res) => {
  try {
    const invoiceData = await convertUnbilledToInvoiceItems({ companyId: req.companyId, ...req.body });
    res.json({ success: true, invoiceData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// Phase 40: Project & Customer Profitability
// ==========================================
router.post('/projects', async (req, res) => {
  try {
    const project = await createProject({ companyId: req.companyId, ...req.body });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/projects/:projectId/profitability', async (req, res) => {
  try {
    const profitability = await calculateProjectProfitability(req.companyId, req.params.projectId, req.query.overhead || 10);
    res.json({ success: true, profitability });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/reports/customer-profitability', async (req, res) => {
  try {
    const matrix = await getCustomerProfitabilityMatrix(req.companyId);
    res.json({ success: true, matrix });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
