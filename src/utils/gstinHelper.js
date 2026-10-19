/**
 * Indian GSTIN & Tax AI Auto-Enrichment Helper
 * 
 * Provides real-time parsing and intelligence for 15-digit Indian GSTINs:
 * - Digits 1-2: State Code (01-38, 97, 99)
 * - Digits 3-12: Permanent Account Number (PAN)
 * - Digit 13: Entity number of the same PAN holder in state
 * - Digit 14: Default 'Z'
 * - Digit 15: Check digit
 */

export const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export const PAN_ENTITY_TYPES = {
  'C': { label: 'Private Limited / Limited Company', taxType: 'pvt_ltd', code: 'Company' },
  'P': { label: 'Individual / Sole Proprietorship', taxType: 'sole_proprietor', code: 'Proprietor' },
  'F': { label: 'Partnership Firm / LLP', taxType: 'llp', code: 'Partnership/LLP' },
  'H': { label: 'Hindu Undivided Family (HUF)', taxType: 'sole_proprietor', code: 'HUF' },
  'A': { label: 'Association of Persons (AOP)', taxType: 'partnership', code: 'AOP' },
  'T': { label: 'Trust / Society', taxType: 'pvt_ltd', code: 'Trust' },
  'B': { label: 'Body of Individuals (BOI)', taxType: 'partnership', code: 'BOI' },
  'G': { label: 'Government Agency', taxType: 'pvt_ltd', code: 'Government' },
  'J': { label: 'Artificial Juridical Person', taxType: 'pvt_ltd', code: 'AJP' },
  'L': { label: 'Local Authority', taxType: 'pvt_ltd', code: 'Local Authority' },
};

/**
 * Real-time AI parser for Indian GSTIN
 */
export function parseGstinAI(rawGstin) {
  if (!rawGstin) return null;
  const clean = rawGstin.trim().toUpperCase();
  if (clean.length < 2) return null;

  const stateCode = clean.slice(0, 2);
  const stateName = GST_STATE_CODES[stateCode] || (clean.length >= 2 ? 'Special Economic Zone / Unknown State' : null);

  let pan = null;
  let panFourthChar = null;
  let entityInfo = null;
  let entityType = null;
  let suggestedTaxType = null;

  if (clean.length >= 6) {
    panFourthChar = clean[5]; // index 5 is 4th letter of PAN (C, P, F, H, etc.)
    entityInfo = PAN_ENTITY_TYPES[panFourthChar] || { label: 'Commercial Entity', taxType: 'pvt_ltd', code: 'General' };
    entityType = entityInfo.label;
    suggestedTaxType = entityInfo.taxType;
  }

  if (clean.length >= 12) {
    pan = clean.slice(2, 12);
  }

  const isValidFormat = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(clean);

  // Filing recommendations based on entity type and Indian GST rules
  let filingSchedule = 'GSTR-1 (Monthly/QRMP) + GSTR-3B Auto-Reconciliation';
  let directTax = 'Section 194C/J/I TDS Compliance';
  if (panFourthChar === 'C') {
    filingSchedule = 'Monthly GSTR-1 & GSTR-3B + Annual GSTR-9/9C Audit';
    directTax = 'Form 26Q/27Q TDS + Corporate Advance Tax (Sec 115BAA)';
  } else if (panFourthChar === 'F') {
    filingSchedule = 'Monthly GSTR-1 & GSTR-3B + Annual GSTR-9 Audit';
    directTax = 'Form 26Q TDS + Partnership Advance Tax (Form ITR-5)';
  } else if (panFourthChar === 'P') {
    filingSchedule = 'GSTR-1 (QRMP Scheme eligible) & GSTR-3B';
    directTax = 'Presumptive Tax (Sec 44AD/44ADA) + Advance Tax';
  }

  return {
    raw: clean,
    stateCode,
    stateName,
    pan,
    panFourthChar,
    entityType,
    suggestedTaxType,
    isValidFormat,
    isComplete: clean.length === 15,
    filingSchedule,
    directTax,
  };
}
