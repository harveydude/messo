/**
 * Indian GST Compliance Engine: Place of Supply (PoS) & Tax Determination (Phases 16 & 17)
 * Implements intra-state, inter-state, UTGST, Zero-rated LUT (SEZ/Export),
 * and effective-dated HSN/SAC rate determination.
 */

import { getDb } from '../db/db.js';

// Indian Union Territories without legislature that charge UTGST instead of SGST
export const UTGST_STATE_CODES = new Set(['04', '25', '31', '35', '38']); // Chandigarh, DNH&DD, Lakshadweep, Andaman, Ladakh

export const TAX_SCHEMES = {
  INTRA_STATE: 'INTRA_STATE',
  INTER_STATE: 'INTER_STATE',
  UTGST: 'UTGST',
  ZERO_RATED_LUT: 'ZERO_RATED_LUT',
  IFSC_EXEMPT: 'IFSC_EXEMPT',
  EXPORT_WITH_PAYMENT: 'EXPORT_WITH_PAYMENT'
};

/**
 * Determines Tax Scheme and Place of Supply rules based on Supplier & Recipient locations.
 */
export function determineTaxScheme(options = {}) {
  const {
    supplierStateCode = '27',
    placeOfSupplyStateCode,
    recipientStateCode,
    isExport = false,
    isSez = false,
    hasLut = false,
    lutArn = null,
    isGiftCityIfsc = false
  } = options;

  const sCode = String(supplierStateCode).padStart(2, '0');
  const posCode = String(placeOfSupplyStateCode || recipientStateCode || supplierStateCode).padStart(2, '0');

  // 1. GIFT City IFSC Exempt Supplies
  if (isGiftCityIfsc) {
    return {
      taxScheme: TAX_SCHEMES.IFSC_EXEMPT,
      scheme: TAX_SCHEMES.IFSC_EXEMPT,
      isZeroRated: true,
      description: 'GIFT City IFSC Section 80LA Zero-Rated Exemption'
    };
  }

  // 2. Export / SEZ under Letter of Undertaking (LUT)
  if ((isExport || isSez) && (lutArn || hasLut)) {
    return {
      taxScheme: TAX_SCHEMES.ZERO_RATED_LUT,
      scheme: TAX_SCHEMES.ZERO_RATED_LUT,
      isZeroRated: true,
      lutArn: lutArn || 'LUT-ARN-APPLIED',
      description: `Zero-Rated Supply under LUT (ARN: ${lutArn || 'LUT-ARN-APPLIED'})`
    };
  }

  // 3. Export / SEZ with payment of IGST
  if (isExport || isSez) {
    return {
      taxScheme: TAX_SCHEMES.EXPORT_WITH_PAYMENT,
      scheme: TAX_SCHEMES.EXPORT_WITH_PAYMENT,
      isZeroRated: false,
      description: 'Export with Payment of IGST (Refund route)'
    };
  }

  // 4. Intra-State Supply (Supplier State == Place of Supply)
  if (sCode === posCode) {
    if (UTGST_STATE_CODES.has(posCode)) {
      return {
        taxScheme: TAX_SCHEMES.UTGST,
        scheme: TAX_SCHEMES.UTGST,
        isZeroRated: false,
        description: `Intra-UT Supply (${posCode}): CGST + UTGST`
      };
    }
    return {
      taxScheme: TAX_SCHEMES.INTRA_STATE,
      scheme: TAX_SCHEMES.INTRA_STATE,
      isZeroRated: false,
      description: `Intra-State Supply (${posCode}): CGST + SGST`
    };
  }

  // 5. Inter-State Supply (Supplier State != Place of Supply)
  return {
    taxScheme: TAX_SCHEMES.INTER_STATE,
    scheme: TAX_SCHEMES.INTER_STATE,
    isZeroRated: false,
    description: `Inter-State Supply (${sCode} -> ${posCode}): IGST`
  };
}

/**
 * Calculates exact tax splits in paise based on taxable value, rate in basis points, and tax scheme.
 */
export function calculateGstSplits(arg1, arg2, arg3, arg4) {
  let taxableAmountPaise, rateBp = 1800, cessRateBp = 0, taxScheme = TAX_SCHEMES.INTRA_STATE;
  const isInputBigInt = typeof arg1 === 'bigint';

  if (typeof arg1 === 'object' && arg1 !== null && typeof arg1 !== 'bigint') {
    taxableAmountPaise = arg1.taxableAmountPaise;
    rateBp = arg1.rateBp ?? 1800;
    cessRateBp = arg1.cessRateBp ?? 0;
    taxScheme = arg1.taxScheme || arg1.scheme || TAX_SCHEMES.INTRA_STATE;
  } else {
    taxableAmountPaise = arg1;
    if (arg2 !== undefined) rateBp = arg2;
    if (typeof arg3 === 'string') {
      taxScheme = arg3;
    } else {
      if (arg3 !== undefined) cessRateBp = arg3;
      if (arg4 !== undefined) taxScheme = arg4;
    }
  }

  const taxable = Number(taxableAmountPaise);

  function formatOutput(num) {
    return isInputBigInt ? BigInt(num) : num;
  }

  if (taxScheme === TAX_SCHEMES.ZERO_RATED_LUT || taxScheme === TAX_SCHEMES.IFSC_EXEMPT) {
    return {
      taxableAmountPaise: formatOutput(taxable),
      cgstPaise: formatOutput(0),
      sgstPaise: formatOutput(0),
      igstPaise: formatOutput(0),
      cessPaise: formatOutput(0),
      totalTaxPaise: formatOutput(0),
      totalAmountPaise: formatOutput(taxable),
      taxScheme,
      scheme: taxScheme
    };
  }

  const cessPaise = Math.round((taxable * cessRateBp) / 10000);

  if (taxScheme === TAX_SCHEMES.INTER_STATE || taxScheme === TAX_SCHEMES.EXPORT_WITH_PAYMENT) {
    const igstPaise = Math.round((taxable * rateBp) / 10000);
    const totalTax = igstPaise + cessPaise;
    return {
      taxableAmountPaise: formatOutput(taxable),
      cgstPaise: formatOutput(0),
      sgstPaise: formatOutput(0),
      igstPaise: formatOutput(igstPaise),
      cessPaise: formatOutput(cessPaise),
      totalTaxPaise: formatOutput(totalTax),
      totalAmountPaise: formatOutput(taxable + totalTax),
      taxScheme,
      scheme: taxScheme
    };
  }

  // Intra-State or UTGST (Half to Central, Half to State/UT)
  const halfRateBp = Math.floor(rateBp / 2);
  const cgstPaise = Math.round((taxable * halfRateBp) / 10000);
  const sgstPaise = Math.round((taxable * halfRateBp) / 10000);
  const totalTax = cgstPaise + sgstPaise + cessPaise;

  return {
    taxableAmountPaise: formatOutput(taxable),
    cgstPaise: formatOutput(cgstPaise),
    sgstPaise: formatOutput(sgstPaise),
    igstPaise: formatOutput(0),
    cessPaise: formatOutput(cessPaise),
    totalTaxPaise: formatOutput(totalTax),
    totalAmountPaise: formatOutput(taxable + totalTax),
    taxScheme,
    scheme: taxScheme
  };
}

/**
 * Phase 17: Effective-Dated HSN/SAC & GST Rate Registry
 */
export async function registerGstRate({
  companyId = 'comp_1',
  hsnOrSacCode,
  description = '',
  slabRateBp = 1800,
  cessRateBp = 0,
  effectiveFrom = '2017-07-01',
  effectiveTo = null,
  category = 'SERVICES'
}) {
  const db = await getDb();
  const code = String(hsnOrSacCode).trim().toUpperCase();

  const query = `
    INSERT INTO gst_rate_registry (
      company_id, hsn_or_sac_code, description, slab_rate_bp, cess_rate_bp,
      effective_from, effective_to, category
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (company_id, hsn_or_sac_code, effective_from)
    DO UPDATE SET 
      slab_rate_bp = EXCLUDED.slab_rate_bp,
      cess_rate_bp = EXCLUDED.cess_rate_bp,
      effective_to = EXCLUDED.effective_to,
      description = EXCLUDED.description
    RETURNING *;
  `;

  const res = await db.query(query, [
    companyId,
    code,
    description,
    slabRateBp,
    cessRateBp,
    effectiveFrom,
    effectiveTo,
    category
  ]);

  return res.rows[0];
}

export async function getGstRateForHsn(arg1, arg2, arg3) {
  let companyId = 'comp_1';
  let hsnOrSacCode;
  let date = new Date().toISOString().split('T')[0];

  if (typeof arg1 === 'object' && arg1 !== null) {
    companyId = arg1.companyId || companyId;
    hsnOrSacCode = arg1.hsnOrSacCode;
    date = arg1.date || date;
  } else {
    hsnOrSacCode = arg1;
    if (arg2) date = arg2;
    if (arg3) companyId = arg3;
  }

  const db = await getDb();
  const code = String(hsnOrSacCode || '').trim().toUpperCase();

  const res = await db.query(
    `SELECT * FROM gst_rate_registry
     WHERE company_id = $1 
       AND hsn_or_sac_code = $2 
       AND effective_from <= $3
       AND (effective_to IS NULL OR effective_to >= $3)
     ORDER BY effective_from DESC
     LIMIT 1`,
    [companyId, code, date]
  );

  if (res.rows.length > 0) {
    return res.rows[0];
  }

  // Default fallback rate: 18% (1800 bp)
  return {
    hsn_or_sac_code: code,
    description: 'Standard Indian GST Rate',
    slab_rate_bp: 1800,
    cess_rate_bp: 0,
    effective_from: '2017-07-01',
    effective_to: null,
    category: 'SERVICES'
  };
}
