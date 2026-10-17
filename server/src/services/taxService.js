import { getDb } from '../db/db.js';

// Financial rounding policy (§B3): per-line half-up; components adjusted so Σcomponents === total
export const roundHalfUp = (n) => Math.sign(n) * Math.round(Math.abs(n) + 1e-9);

export function splitFor(rateRow, isIntraState) {
  const s = rateRow.split || {};
  if (isIntraState && s.CGST && s.SGST) {
    return { mode: 'CGST_SGST', parts: { CGST: s.CGST, SGST: s.SGST } };
  }
  if (s.IGST) return { mode: 'IGST', parts: { IGST: s.IGST } };
  if (s.CGST && s.SGST) {
    return { mode: 'IGST_INTER_FALLBACK', parts: { IGST: rateRow.rate_bp } }; // inter-state supply ⇒ IGST at full rate
  }
  return { mode: 'SINGLE', parts: { TAX: rateRow.rate_bp } };
}

export function computeFromBp(amountMinor, rateBp, parts) {
  const total = roundHalfUp((amountMinor * rateBp) / 10000);
  const components = {};
  let sum = 0;
  const keys = Object.keys(parts);
  for (const k of keys) {
    components[k] = roundHalfUp((amountMinor * parts[k]) / 10000);
    sum += components[k];
  }
  if (sum !== total && keys.length) {
    // drift → largest component absorbs it
    const big = keys.reduce((a, b) => (components[b] > components[a] ? b : a), keys[0]);
    components[big] += total - sum;
  }
  return { total, components };
}

export function computeLineTax({ amountMinor, rateBp, split, isIntraState = true }) {
  const { mode, parts } = splitFor({ rate_bp: rateBp, split }, isIntraState);
  return { mode, ...computeFromBp(amountMinor, rateBp, parts) };
}

export async function computeLineTaxById({ companyId, taxRateId, amountMinor, isIntraState = true }) {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT * FROM tax_rates WHERE id=$1 AND company_id=$2 AND active`,
    [taxRateId, companyId]
  );
  const rate = rows[0];
  if (!rate) {
    const e = new Error(`Tax rate ${taxRateId} not found for company`);
    e.status = 422;
    e.code = 'TAX_RATE_NOT_FOUND';
    throw e;
  }
  const { mode, parts } = splitFor(rate, isIntraState);
  return { rateId: rate.id, name: rate.name, mode, ...computeFromBp(amountMinor, rate.rate_bp, parts) };
}

/** Whole-document tax: lines = [{ amountMinor, taxRateId, isIntraState }] */
export async function totalTaxForLines(companyId, lines) {
  let taxMinor = 0;
  const components = {};
  for (const l of lines || []) {
    if (!l.taxRateId) continue;
    const t = await computeLineTaxById({
      companyId,
      taxRateId: l.taxRateId,
      amountMinor: l.amountMinor,
      isIntraState: l.isIntraState !== false,
    });
    taxMinor += t.total;
    for (const [k, v] of Object.entries(t.components)) {
      components[k] = (components[k] || 0) + v;
    }
  }
  return { taxMinor, components };
}

export default {
  computeLineTax,
  computeLineTaxById,
  totalTaxForLines,
  roundHalfUp,
  splitFor,
  computeFromBp,
};
