/**
 * Meso Phase 21: PAN/Aadhaar Validator & Lower/Higher Deduction Engine
 * Section 197 & Section 206AA Compliance (2026 Specification)
 */

import { getDb } from '../db/db.js';

export const PAN_ENTITY_TYPES = {
  C: 'COMPANY',
  P: 'INDIVIDUAL',
  H: 'HUF',
  F: 'FIRM',
  A: 'AOP',
  T: 'TRUST',
  B: 'BOI',
  L: 'LOCAL_AUTHORITY',
  J: 'ARTIFICIAL_JURIDICAL_PERSON',
  G: 'GOVERNMENT',
};

/**
 * Validate 10-character Indian Permanent Account Number (PAN)
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g., ABCDE1234F)
 * 4th character determines the legal entity type under Indian Income Tax Act.
 */
export function validatePanStructure(pan) {
  if (!pan || typeof pan !== 'string') {
    return { isValid: false, reason: 'PAN is empty or missing' };
  }
  const cleanPan = pan.trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!panRegex.test(cleanPan)) {
    return {
      isValid: false,
      reason: 'Invalid PAN structure. Must be 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)',
      pan: cleanPan,
    };
  }

  const fourthChar = cleanPan[3];
  const entityType = PAN_ENTITY_TYPES[fourthChar] || 'OTHER';

  return {
    isValid: true,
    pan: cleanPan,
    entityCode: fourthChar,
    entityType,
    isCompany: entityType === 'COMPANY',
    isIndividualOrHuf: entityType === 'INDIVIDUAL' || entityType === 'HUF',
  };
}

/**
 * Validate 12-digit Indian Aadhaar number
 */
export function validateAadhaarStructure(aadhaar) {
  if (!aadhaar || typeof aadhaar !== 'string') {
    return { isValid: false, reason: 'Aadhaar is empty or missing' };
  }
  const clean = aadhaar.trim().replace(/\s+/g, '');
  if (!/^\d{12}$/.test(clean)) {
    return { isValid: false, reason: 'Aadhaar must be exactly 12 numeric digits' };
  }
  if (/^(\d)\1{11}$/.test(clean)) {
    return { isValid: false, reason: 'Invalid Aadhaar: all repeating digits' };
  }
  return { isValid: true, aadhaar: clean };
}

/**
 * Register Section 197 Lower / NIL Deduction Certificate
 */
export async function registerLowerDeductionCert({
  companyId = 'comp_1',
  vendorId,
  certificateNo,
  sectionCode,
  lowerRateBp = 0,
  thresholdAmountPaise,
  validFrom,
  validTo,
}) {
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO tds_lower_deduction_certificates (
      company_id, vendor_id, certificate_no, section_code, lower_rate_bp,
      threshold_amount_paise, valid_from, valid_to, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
    ON CONFLICT (company_id, vendor_id, certificate_no) DO UPDATE
      SET lower_rate_bp = EXCLUDED.lower_rate_bp,
          threshold_amount_paise = EXCLUDED.threshold_amount_paise,
          valid_to = EXCLUDED.valid_to,
          is_active = true
    RETURNING *`,
    [companyId, vendorId, certificateNo, sectionCode, lowerRateBp, thresholdAmountPaise, validFrom, validTo]
  );
  return res.rows[0];
}

/**
 * Fetch active lower deduction certificate if valid on transaction date
 */
export async function getActiveLowerCert({ companyId = 'comp_1', vendorId, sectionCode, txnDate }) {
  const db = await getDb();
  const dateStr = typeof txnDate === 'string' ? txnDate : txnDate.toISOString().slice(0, 10);
  const res = await db.query(
    `SELECT * FROM tds_lower_deduction_certificates
     WHERE company_id = $1
       AND vendor_id = $2
       AND section_code = $3
       AND is_active = true
       AND valid_from <= $4
       AND valid_to >= $4
       AND utilized_amount_paise < threshold_amount_paise
     LIMIT 1`,
    [companyId, vendorId, sectionCode, dateStr]
  );
  return res.rows[0] || null;
}

/**
 * Resolve Applicable TDS Rate considering Section 206AA (Higher deduction if missing/invalid PAN)
 * and Section 197 Lower Deduction Certificate.
 */
export function resolveTdsRateWithRules({ vendorPan, baseRateBp, lowerCert = null }) {
  const panCheck = validatePanStructure(vendorPan);

  // Section 206AA: Higher deduction (20% = 2000 bp) if PAN missing or invalid
  if (!panCheck.isValid) {
    return {
      appliedRateBp: Math.max(baseRateBp, 2000), // Minimum 20%
      ruleApplied: 'SEC_206AA_HIGHER_RATE_NO_PAN',
      isHigherRate: true,
      entityType: 'UNKNOWN',
      panCheck,
    };
  }

  // Section 197: Lower Deduction Certificate applied
  if (lowerCert && lowerCert.lower_rate_bp !== undefined) {
    return {
      appliedRateBp: lowerCert.lower_rate_bp,
      ruleApplied: 'SEC_197_LOWER_DEDUCTION_CERTIFICATE',
      isLowerCert: true,
      certificateNo: lowerCert.certificate_no,
      entityType: panCheck.entityType,
      panCheck,
    };
  }

  // Standard Section Rate
  return {
    appliedRateBp: baseRateBp,
    ruleApplied: 'STANDARD_STATUTORY_RATE',
    entityType: panCheck.entityType,
    panCheck,
  };
}
