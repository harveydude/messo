/**
 * Meso Domain 5 API Routes: Indian Direct Tax (TDS, TCS & Fixed Assets)
 * Phases 21-25
 */

import express from 'express';
import { validatePanStructure, validateAadhaarStructure, registerLowerDeductionCert } from '../services/tdsPanValidator.js';
import { processTdsForBillOrAdvance, adjustAdvancePaymentTds, calculateTcs } from '../services/tdsCalculationEngine.js';
import { calculateTdsLateInterest, recordChallanItns281, compileForm26Q } from '../services/tdsComplianceService.js';
import { registerFixedAsset, calculateDualDepreciation, listFixedAssets } from '../services/fixedAssetsService.js';

const router = express.Router();

// Phase 21: Validate PAN / Aadhaar
router.post('/pan/validate', (req, res) => {
  try {
    const { pan, aadhaar } = req.body;
    let panResult = null;
    let aadhaarResult = null;
    if (pan) panResult = validatePanStructure(pan);
    if (aadhaar) aadhaarResult = validateAadhaarStructure(aadhaar);
    res.json({ success: true, pan: panResult, aadhaar: aadhaarResult });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 21: Register Section 197 Lower Deduction Certificate
router.post('/lower-cert', async (req, res) => {
  try {
    const cert = await registerLowerDeductionCert({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, cert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 22: Calculate & Deduct TDS on Bill or Advance
router.post('/tds/process', async (req, res) => {
  try {
    const result = await processTdsForBillOrAdvance({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 23: Whichever is Earlier - Adjust Advance Payment TDS
router.post('/tds/adjust-advance', async (req, res) => {
  try {
    const result = await adjustAdvancePaymentTds({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 23: Calculate TCS (Sec 206C(1H))
router.post('/tcs/calculate', (req, res) => {
  try {
    const result = calculateTcs(req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 24: Late Interest Calculator (Sec 201(1A))
router.post('/tds/late-interest', (req, res) => {
  try {
    const result = calculateTdsLateInterest(req.body);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 24: Record ITNS 281 Challan Settlement
router.post('/challans', async (req, res) => {
  try {
    const challan = await recordChallanItns281({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, challan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 24: Compile Form 26Q
router.get('/form26q', async (req, res) => {
  try {
    const { financialYear = '2026-27', quarter = 'Q1' } = req.query;
    const form26q = await compileForm26Q({
      companyId: req.user?.company_id || 'comp_1',
      financialYear,
      quarter,
    });
    res.json({ success: true, form26q });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 25: Fixed Assets Register
router.get('/fixed-assets', async (req, res) => {
  try {
    const assets = await listFixedAssets({ companyId: req.user?.company_id || 'comp_1' });
    res.json({ success: true, assets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fixed-assets', async (req, res) => {
  try {
    const asset = await registerFixedAsset({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, asset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/fixed-assets/depreciation', async (req, res) => {
  try {
    const result = await calculateDualDepreciation({
      companyId: req.user?.company_id || 'comp_1',
      ...req.body,
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
