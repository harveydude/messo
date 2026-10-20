import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import {
  ingestBankStatement,
  extractUtrNumber,
  SUPPORTED_BANKS
} from '../services/bankIngestionService.js';
import {
  createBankRule,
  evaluateBankRules,
  matchBankTransactionSplit
} from '../services/bankRulesMatchingService.js';
import {
  recordBankDeposit,
  recordContraTransfer,
  recordCreditCardPaydown
} from '../services/treasuryTransferService.js';
import {
  initiateReconciliation,
  completeReconciliation,
  assertTransactionUnlocked
} from '../services/reconciliationLockService.js';
import {
  generate12MonthCashFlowForecast
} from '../services/cashFlowForecastService.js';

const router = express.Router();

// ==========================================
// Phase 41: Bank Statement Ingestor
// ==========================================
router.post('/banking/ingest-statement', async (req, res) => {
  try {
    const result = await ingestBankStatement({
      companyId: req.companyId,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 42: Bank Rules & Split Matches
// ==========================================
router.post('/banking/rules', async (req, res) => {
  try {
    const rule = await createBankRule({
      companyId: req.companyId,
      ...req.body
    });
    res.json({ success: true, rule });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/banking/rules/evaluate', async (req, res) => {
  try {
    const match = await evaluateBankRules(req.companyId, req.body.transaction);
    res.json({ success: true, match });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/banking/split-match', async (req, res) => {
  try {
    const result = await matchBankTransactionSplit({
      companyId: req.companyId,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 43: Undeposited Funds & Transfers
// ==========================================
router.post('/banking/deposits', async (req, res) => {
  try {
    const deposit = await recordBankDeposit({
      companyId: req.companyId,
      ...req.body
    });
    res.json({ success: true, deposit });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/banking/contra-transfers', async (req, res) => {
  try {
    const transfer = await recordContraTransfer({
      companyId: req.companyId,
      ...req.body
    });
    res.json({ success: true, transfer });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/banking/credit-card-paydowns', async (req, res) => {
  try {
    const paydown = await recordCreditCardPaydown({
      companyId: req.companyId,
      ...req.body
    });
    res.json({ success: true, paydown });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 44: Reconciliation & Tamper Lock
// ==========================================
router.post('/banking/reconciliations/initiate', async (req, res) => {
  try {
    const reconciliation = await initiateReconciliation({
      companyId: req.companyId,
      ...req.body
    });
    res.json({ success: true, reconciliation });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/banking/reconciliations/complete', async (req, res) => {
  try {
    const result = await completeReconciliation({
      companyId: req.companyId,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/banking/check-unlocked/:journalEntryId', async (req, res) => {
  try {
    const result = await assertTransactionUnlocked(req.companyId, req.params.journalEntryId);
    res.json({ success: true, ...result });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 45: 12-Month Cash Flow & Working Capital
// ==========================================
router.get('/treasury/cash-flow-forecast', async (req, res) => {
  try {
    const forecast = await generate12MonthCashFlowForecast(req.companyId, req.query);
    res.json({ success: true, forecast });
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
