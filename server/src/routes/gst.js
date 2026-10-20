/**
 * Domain 4 API Routes: Indian GST Compliance Engine (Phases 16-20)
 */

import { Router } from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { extractUserCompany, requireRole } from '../middleware/rbac.js';
import { determineTaxScheme, calculateGstSplits, registerGstRate, getGstRateForHsn } from '../services/gstTaxEngine.js';
import { recordItcEntry, getElectronicCreditLedgerSummary } from '../services/itcService.js';
import { generateEInvoice, cancelEInvoice, generateEwayBill } from '../services/eInvoiceService.js';
import { compileGstr1, compileGstr3b, fileGstReturn } from '../services/gstReturnsService.js';

const router = Router();
router.use(extractUserCompany);

// ==================== PHASE 16 & 17: POS & GST RATES ====================
router.post('/determine-tax', (req, res) => {
  try {
    const { supplierStateCode, placeOfSupplyStateCode, isExport, isSez, lutArn, isGiftCityIfsc, taxableAmountPaise, rateBp, cessRateBp } = req.body;
    const scheme = determineTaxScheme({
      supplierStateCode,
      placeOfSupplyStateCode,
      isExport,
      isSez,
      lutArn,
      isGiftCityIfsc
    });

    const calculation = calculateGstSplits({
      taxableAmountPaise: taxableAmountPaise || 0,
      rateBp: rateBp || 1800,
      cessRateBp: cessRateBp || 0,
      taxScheme: scheme.taxScheme
    });

    res.json({ success: true, scheme, calculation });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/rates', async (req, res) => {
  try {
    const { hsn, date } = req.query;
    const rate = await getGstRateForHsn({
      companyId: req.companyId,
      hsnOrSacCode: hsn,
      date
    });
    res.json({ success: true, rate });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/rates', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const registered = await registerGstRate({
      companyId: req.companyId,
      ...req.body
    });
    res.status(201).json({ success: true, rate: registered });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==================== PHASE 18: ITC LEDGER & BLOCKED CREDIT ====================
router.post('/itc/claim', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const entry = await recordItcEntry({
      companyId: req.companyId,
      ...req.body
    });
    res.status(201).json({ success: true, itcEntry: entry });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/itc/summary', async (req, res) => {
  try {
    const summary = await getElectronicCreditLedgerSummary({
      companyId: req.companyId,
      claimPeriod: req.query.period
    });
    res.json({ success: true, summary });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==================== PHASE 19: E-INVOICE & E-WAY BILL ====================
router.post('/einvoice/generate', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const eInv = await generateEInvoice({
      companyId: req.companyId,
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, eInvoice: eInv });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/einvoice/cancel', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT']), async (req, res) => {
  try {
    const cancelled = await cancelEInvoice({
      companyId: req.companyId,
      ...req.body,
      user: req.user
    });
    res.json({ success: true, eInvoice: cancelled });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/ewaybill/generate', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const bill = await generateEwayBill({
      companyId: req.companyId,
      ...req.body
    });
    res.status(201).json({ success: true, ewayBill: bill });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==================== PHASE 20: GSTR FILINGS ====================
router.get('/returns/gstr-1', async (req, res) => {
  try {
    const data = await compileGstr1({
      companyId: req.companyId,
      period: req.query.period || '2026-04'
    });
    res.json({ success: true, gstr1: data });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/returns/gstr-3b', async (req, res) => {
  try {
    const data = await compileGstr3b({
      companyId: req.companyId,
      period: req.query.period || '2026-04'
    });
    res.json({ success: true, gstr3b: data });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/returns/file', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT']), async (req, res) => {
  try {
    const filing = await fileGstReturn({
      companyId: req.companyId,
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, filing });
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
