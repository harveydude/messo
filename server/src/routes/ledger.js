/**
 * Domain 3 API Routes: Continuous Double-Entry General Ledger, Multi-Currency,
 * Sub-Ledger Reconciliation, Multi-GSTIN Branches & Year-End Close (Phases 11-15)
 */

import { Router } from 'express';
import { extractUserCompany, requireRole } from '../middleware/rbac.js';
import { setExchangeRate, getExchangeRate, convertCurrency, recordForexGainLoss } from '../services/currencyService.js';
import { checkSubledgerReconciliation, syncSubledgerToGl } from '../services/subledgerReconciliationService.js';
import { createBranch, listBranches, createCostCenter, listCostCenters } from '../services/branchService.js';
import { closeFiscalYear, listFiscalYearCloses } from '../services/yearEndService.js';
import { handleApiError } from '../utils/errorHelper.js';

const router = Router();
router.use(extractUserCompany);

// ==================== PHASE 12: MULTI-CURRENCY & FOREX ====================
router.get('/exchange-rates', async (req, res) => {
  try {
    const { from = 'USD', to = 'INR', date } = req.query;
    const rate = await getExchangeRate({
      companyId: req.companyId,
      fromCurrency: from,
      toCurrency: to,
      date
    });
    res.json({ success: true, from, to, rate });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch exchange rates.');
  }
});

router.post('/exchange-rates', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const { fromCurrency, toCurrency = 'INR', rate, effectiveDate, source } = req.body;
    const saved = await setExchangeRate({
      companyId: req.companyId,
      fromCurrency,
      toCurrency,
      rate,
      effectiveDate,
      source,
      user: req.user
    });
    res.status(201).json({ success: true, exchangeRate: saved });
  } catch (err) {
    handleApiError(res, err, 'Failed to set exchange rate.');
  }
});

router.post('/convert', async (req, res) => {
  try {
    const { amountMinor, fromCurrency, toCurrency, date } = req.body;
    const conversion = await convertCurrency({
      amountMinor,
      fromCurrency,
      toCurrency,
      date,
      companyId: req.companyId
    });
    res.json({ success: true, ...conversion });
  } catch (err) {
    handleApiError(res, err, 'Currency conversion failed.');
  }
});

router.post('/forex-gain-loss', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const log = await recordForexGainLoss({
      companyId: req.companyId,
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, forexLog: log });
  } catch (err) {
    handleApiError(res, err, 'Failed to record forex gain/loss.');
  }
});

// ==================== PHASE 13: SUBLEDGER TO GL RECONCILIATION ====================
router.get('/reconciliation/check', async (req, res) => {
  try {
    const report = await checkSubledgerReconciliation({
      companyId: req.companyId,
      recordReport: true
    });
    res.json({ success: true, report });
  } catch (err) {
    handleApiError(res, err, 'Failed to check subledger reconciliation.');
  }
});

router.post('/reconciliation/sync', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT']), async (req, res) => {
  try {
    const report = await syncSubledgerToGl({ companyId: req.companyId });
    res.json({ success: true, report });
  } catch (err) {
    handleApiError(res, err, 'Failed to sync subledger to general ledger.');
  }
});

// ==================== PHASE 14: BRANCHES & COST CENTERS ====================
router.get('/branches', async (req, res) => {
  try {
    const branches = await listBranches({ companyId: req.companyId });
    res.json({ success: true, branches });
  } catch (err) {
    handleApiError(res, err, 'Failed to list branches.');
  }
});

router.post('/branches', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const branch = await createBranch({
      companyId: req.companyId,
      ...req.body
    });
    res.status(201).json({ success: true, branch });
  } catch (err) {
    handleApiError(res, err, 'Failed to create branch.');
  }
});

router.get('/cost-centers', async (req, res) => {
  try {
    const costCenters = await listCostCenters({ companyId: req.companyId });
    res.json({ success: true, costCenters });
  } catch (err) {
    handleApiError(res, err, 'Failed to list cost centers.');
  }
});

router.post('/cost-centers', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER']), async (req, res) => {
  try {
    const cc = await createCostCenter({
      companyId: req.companyId,
      ...req.body
    });
    res.status(201).json({ success: true, costCenter: cc });
  } catch (err) {
    handleApiError(res, err, 'Failed to create cost center.');
  }
});

// ==================== PHASE 15: YEAR-END CLOSE ====================
router.post('/year-end-close', requireRole(['OWNER', 'CHARTERED_ACCOUNTANT']), async (req, res) => {
  try {
    const result = await closeFiscalYear({
      companyId: req.companyId,
      ...req.body,
      user: req.user
    });
    res.status(201).json({ success: true, closeRecord: result });
  } catch (err) {
    handleApiError(res, err, 'Failed to execute year-end close.');
  }
});

router.get('/fiscal-years', async (req, res) => {
  try {
    const closes = await listFiscalYearCloses({ companyId: req.companyId });
    res.json({ success: true, fiscalYearCloses: closes });
  } catch (err) {
    handleApiError(res, err, 'Failed to list fiscal year closes.');
  }
});

export default router;
