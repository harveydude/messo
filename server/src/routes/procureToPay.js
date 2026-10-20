/**
 * Meso Domain 7 API Routes: Procure-to-Pay, OCR & MSME Compliance
 * Phases 31-35
 */

import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { getDb } from '../db/db.js';
import {
  createPurchaseOrder,
  getPurchaseOrder,
  createGoodsReceiptNote,
  performThreeWayMatch
} from '../services/procurementService.js';
import {
  simulateOcrScan,
  convertOcrToBillDraft,
  parseIndianInvoiceText
} from '../services/invoiceOcrService.js';
import {
  submitBillForApproval,
  approveBill,
  rejectBill,
  createRecurringBillTemplate,
  processRecurringBillTemplates
} from '../services/billApprovalService.js';
import {
  validateUdyamNumber,
  evaluateMsmeCompliance
} from '../services/msmeComplianceService.js';
import {
  issueVendorDebitNote,
  generateBatchPayoutFile
} from '../services/batchPayoutService.js';

const router = express.Router();

const getUser = (req) => ({
  id: req.user?.id || 'usr_1',
  role: req.user?.role || 'FINANCE_CONTROLLER'
});

// =========================================================================
// Phase 31: Purchase Orders & 3-Way Matching Engine
// =========================================================================

// List Purchase Orders
router.get('/procurement/purchase-orders', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT po.*, c.display_name as vendor_name
       FROM purchase_orders po
       LEFT JOIN contacts c ON c.id = po.vendor_id
       WHERE po.company_id = $1
       ORDER BY po.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, purchaseOrders: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Create Purchase Order
router.post('/procurement/purchase-orders', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const po = await createPurchaseOrder({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, purchaseOrder: po });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Get Purchase Order by ID
router.get('/procurement/purchase-orders/:id', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const po = await getPurchaseOrder(req.params.id, companyId);
    if (!po) return res.status(404).json({ success: false, error: 'Purchase order not found' });
    res.json({ success: true, purchaseOrder: po });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Create Goods Receipt Note (GRN)
router.post('/procurement/goods-receipts', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const grn = await createGoodsReceiptNote({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, goodsReceipt: grn });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Execute 3-Way Match
router.post('/procurement/three-way-match', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await performThreeWayMatch({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// =========================================================================
// Phase 32: AI Indian Invoice & Receipt OCR Pipeline
// =========================================================================

// Simulate / Run OCR Scan
router.post('/ocr/scan', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const scan = await simulateOcrScan({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, scan });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Parse Text Preview
router.post('/ocr/parse-preview', (req, res) => {
  try {
    const extracted = parseIndianInvoiceText(req.body.rawText);
    res.json({ success: true, extracted });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Convert OCR Scan to Draft Bill
router.post('/ocr/convert-to-bill', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const bill = await convertOcrToBillDraft({
      ocrId: req.body.ocrId,
      companyId,
      user: getUser(req)
    });
    res.json({ success: true, bill });
  } catch (err) {
    handleApiError(res, err);
  }
});

// =========================================================================
// Phase 33: Vendor Bills & Multi-Tier Approvals
// =========================================================================

// Submit Bill for Approval
router.post('/bills/:id/submit-approval', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await submitBillForApproval({
      billId: req.params.id,
      companyId,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// Approve Bill
router.post('/bills/:id/approve', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await approveBill({
      billId: req.params.id,
      companyId,
      comments: req.body.comments,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// Reject Bill
router.post('/bills/:id/reject', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await rejectBill({
      billId: req.params.id,
      companyId,
      reason: req.body.reason,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// Create Recurring Bill Template
router.post('/bills/recurring-templates', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const template = await createRecurringBillTemplate({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json({ success: true, template });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Process Recurring Bill Templates
router.post('/bills/recurring-templates/process', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await processRecurringBillTemplates({
      companyId,
      asOfDate: req.body.asOfDate
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// =========================================================================
// Phase 34: MSME (Udyam) 45-Day Compliance Shield
// =========================================================================

// Validate Udyam Registration Number
router.post('/msme/validate-udyam', (req, res) => {
  try {
    const result = validateUdyamNumber(req.body.udyamNumber);
    res.json({ success: true, ...result });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Evaluate MSME Compliance Radar
router.post('/msme/evaluate', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const report = await evaluateMsmeCompliance({
      companyId,
      asOfDate: req.body.asOfDate
    });
    res.json(report);
  } catch (err) {
    handleApiError(res, err);
  }
});

// =========================================================================
// Phase 35: Batch Bill Payouts, Vendor Credits & Debit Notes
// =========================================================================

// Issue Vendor Debit Note
router.post('/debit-notes', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await issueVendorDebitNote({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// List Vendor Debit Notes
router.get('/debit-notes', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await db.query(
      `SELECT dn.*, c.display_name as vendor_name
       FROM vendor_debit_notes dn
       LEFT JOIN contacts c ON c.id = dn.vendor_id
       WHERE dn.company_id = $1
       ORDER BY dn.created_at DESC`,
      [companyId]
    );
    res.json({ success: true, debitNotes: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

// Generate Batch Payout File & Settle Bills
router.post('/payouts/batch', async (req, res) => {
  try {
    const companyId = req.companyId || req.user?.company_id || 'comp_1';
    const result = await generateBatchPayoutFile({
      companyId,
      ...req.body,
      user: getUser(req)
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
