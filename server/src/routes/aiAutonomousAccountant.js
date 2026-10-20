import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import {
  createEmployee,
  executeMonthlyPayrollRun
} from '../services/payrollEngineService.js';
import {
  generateScheduleIIIBalanceSheet,
  generateScheduleIIIPnL,
  generateTrialBalance,
  generateArApAging,
  generateCaAuditExportPack
} from '../services/scheduleIIIReportService.js';
import {
  runMesoAssistScan,
  resolveAnomaly
} from '../services/mesoAssistDoctorService.js';
import {
  executeConversationalCfoQuery
} from '../services/conversationalCfoService.js';

const router = express.Router();

// ==========================================
// Phase 46: Indian Payroll & Statutory Compliance
// ==========================================
router.post('/payroll/employees', async (req, res) => {
  try {
    const employee = await createEmployee(req.companyId, req.body);
    res.json({ success: true, employee });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/payroll/run', async (req, res) => {
  try {
    const result = await executeMonthlyPayrollRun({
      companyId: req.companyId,
      ...req.body
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 47: MCA Schedule III & CA Export Pack
// ==========================================
router.get('/reports/mca-schedule-iii/balance-sheet', async (req, res) => {
  try {
    const bs = await generateScheduleIIIBalanceSheet(req.companyId, req.query.asOfDate);
    res.json({ success: true, balanceSheet: bs });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/reports/mca-schedule-iii/pnl', async (req, res) => {
  try {
    const pnl = await generateScheduleIIIPnL(req.companyId, req.query.fromDate, req.query.toDate);
    res.json({ success: true, profitAndLoss: pnl });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/reports/mca-schedule-iii/trial-balance', async (req, res) => {
  try {
    const tb = await generateTrialBalance(req.companyId, req.query.asOfDate);
    res.json({ success: true, trialBalance: tb });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/reports/mca-schedule-iii/ar-ap-aging', async (req, res) => {
  try {
    const aging = await generateArApAging(req.companyId);
    res.json({ success: true, ...aging });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/reports/mca-schedule-iii/ca-export-pack', async (req, res) => {
  try {
    const pack = await generateCaAuditExportPack(req.companyId, req.body.financialYear, req.body.asOfDate);
    res.json({ success: true, pack });
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 48: Meso Assist AI Accounting Doctor
// ==========================================
router.post('/meso-assist/scan', async (req, res) => {
  try {
    const scan = await runMesoAssistScan(req.companyId);
    res.json({ success: true, ...scan });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/meso-assist/resolve', async (req, res) => {
  try {
    const result = await resolveAnomaly(req.companyId, req.body.anomalyId);
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// ==========================================
// Phase 49: Conversational CFO Command Bar
// ==========================================
router.post('/conversational-cfo/query', async (req, res) => {
  try {
    const result = await executeConversationalCfoQuery(req.companyId, req.body.query);
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
