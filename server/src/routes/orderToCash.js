/**
 * Meso Domain 6 API Routes: Order-to-Cash & Revenue Recognition
 * Phases 26-30
 */

import express from 'express';
import { getDb } from '../db/db.js';
import {
  createEstimate,
  getEstimate,
  createSalesOrder,
  convertEstimateToSalesOrder,
  convertSalesOrderToInvoice
} from '../services/pipelineService.js';
import {
  createInvoiceTemplate,
  getTemplateForCompany,
  renderInvoiceDocument
} from '../services/invoiceBuilderService.js';
import {
  createRevenueContract,
  recognizeScheduledRevenue,
  getRevenueContractSummary
} from '../services/revenueRecognitionService.js';
import {
  recordCustomerReceipt,
  recordAdvanceReceiptWithGst
} from '../services/customerReceiptService.js';
import {
  issueCreditNote,
  classifyDunningNotice,
  runDunningWorkflow
} from '../services/creditNoteDunningService.js';

const router = express.Router();

// Helper for user context
const getUser = (req) => ({
  id: req.user?.id || 'usr_1',
  role: req.user?.role || 'FINANCE_MANAGER'
});

// =========================================================================
// Phase 26: Estimates & Sales Orders Pipeline
// =========================================================================

// List Estimates
router.get('/estimates', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT e.*, c.display_name as customer_name
       FROM estimates e
       LEFT JOIN contacts c ON c.id = e.customer_id
       WHERE e.company_id = $1
       ORDER BY e.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, estimates: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Estimate
router.post('/estimates', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const estimate = await createEstimate({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, estimate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Estimate by ID
router.get('/estimates/:id', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const estimate = await getEstimate(req.params.id, companyId);
    if (!estimate) {
      return res.status(404).json({ success: false, error: 'Estimate not found' });
    }
    res.json({ success: true, estimate });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Convert Estimate to Sales Order
router.post('/estimates/:id/convert-to-order', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const salesOrder = await convertEstimateToSalesOrder({
      estimateId: req.params.id,
      companyId,
      user: getUser(req)
    });
    res.json({ success: true, salesOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List Sales Orders
router.get('/sales-orders', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT so.*, c.display_name as customer_name
       FROM sales_orders so
       LEFT JOIN contacts c ON c.id = so.customer_id
       WHERE so.company_id = $1
       ORDER BY so.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, salesOrders: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create Sales Order directly
router.post('/sales-orders', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const salesOrder = await createSalesOrder({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, salesOrder });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Convert Sales Order to Invoice
router.post('/sales-orders/:id/convert-to-invoice', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await convertSalesOrderToInvoice({
      orderId: req.params.id,
      companyId,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// Phase 27: Multi-Template Invoice Builder & Render
// =========================================================================

// Create / Update Invoice Template
router.post('/templates', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const template = await createInvoiceTemplate({
      companyId,
      ...req.body
    });
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Active Template for Company
router.get('/templates', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const template = await getTemplateForCompany(companyId, req.query.type);
    res.json({ success: true, template });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Render Formatted Invoice Document
router.get('/invoices/:id/render', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const doc = await renderInvoiceDocument({
      companyId,
      invoiceId: req.params.id,
      templateId: req.query.templateId
    });
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// Phase 28: Ind AS 115 / ASC 606 Revenue Recognition Engine
// =========================================================================

// Create Revenue Contract
router.post('/revenue/contracts', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const contract = await createRevenueContract({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, contract });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Revenue Contract Summary & Schedules
router.get('/revenue/contracts/:id', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const summary = await getRevenueContractSummary(req.params.id, companyId);
    if (!summary) {
      return res.status(404).json({ success: false, error: 'Contract not found' });
    }
    res.json({ success: true, contract: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Recognize Scheduled Revenue Period
router.post('/revenue/contracts/:id/recognize', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await recognizeScheduledRevenue({
      companyId,
      contractId: req.params.id,
      periodIndex: req.body.periodIndex,
      recognitionDate: req.body.recognitionDate,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// Phase 29: Customer Receipts & Payment Allocations
// =========================================================================

// List Customer Receipts
router.get('/receipts', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT p.*, c.display_name as customer_name
       FROM customer_payments p
       LEFT JOIN contacts c ON c.id = p.customer_id
       WHERE p.company_id = $1
       ORDER BY p.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, receipts: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Customer Payment Receipt
router.post('/receipts', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await recordCustomerReceipt({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record Advance Receipt with GST Voucher
router.post('/receipts/advance-gst', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await recordAdvanceReceiptWithGst({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// Phase 30: GST Credit Notes & AI Dunning Workflows
// =========================================================================

// List Credit Notes
router.get('/credit-notes', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT cn.*, c.display_name as customer_name
       FROM credit_notes cn
       LEFT JOIN contacts c ON c.id = cn.customer_id
       WHERE cn.company_id = $1
       ORDER BY cn.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, creditNotes: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Issue Credit Note
router.post('/credit-notes', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await issueCreditNote({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Classify Dunning Notice Preview
router.post('/dunning/classify', (req, res) => {
  try {
    const classification = classifyDunningNotice(req.body);
    res.json({ success: true, classification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Run Automated Dunning Workflow
router.post('/dunning/run', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await runDunningWorkflow({
      companyId,
      asOfDate: req.body.asOfDate
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
