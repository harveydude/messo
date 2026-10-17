/**
 * Meso Phase 25: Fixed Assets Register & Dual Depreciation Engine
 * Companies Act, 2013 (Schedule II) vs Income Tax Act, 1961 (Section 32 - 180 Day Rule)
 */

import { getDb } from '../db/db.js';

export const INCOME_TAX_BLOCK_RATES = {
  COMPUTERS: 4000,        // 40%
  PLANT_MACHINERY: 1500,  // 15%
  FURNITURE: 1000,        // 10%
  VEHICLES: 3000,         // 30%
  BUILDINGS: 1000,        // 10%
};

/**
 * Register a new Fixed Asset
 */
export async function registerFixedAsset({
  companyId = 'comp_1',
  assetCode,
  assetName,
  assetCategory = 'COMPUTERS',
  purchaseDate,
  putToUseDate,
  originalCostPaise,
  salvageValuePaise = 0,
  usefulLifeYears = 3,
  depreciationMethod = 'SLM',
}) {
  const db = await getDb();
  const res = await db.query(
    `INSERT INTO fixed_assets (
      company_id, asset_code, asset_name, asset_category, purchase_date,
      put_to_use_date, original_cost_paise, salvage_value_paise,
      useful_life_years, depreciation_method, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'ACTIVE')
    ON CONFLICT (company_id, asset_code) DO UPDATE
      SET asset_name = EXCLUDED.asset_name,
          asset_category = EXCLUDED.asset_category,
          put_to_use_date = EXCLUDED.put_to_use_date,
          original_cost_paise = EXCLUDED.original_cost_paise,
          useful_life_years = EXCLUDED.useful_life_years,
          depreciation_method = EXCLUDED.depreciation_method
    RETURNING *`,
    [
      companyId,
      assetCode,
      assetName,
      assetCategory,
      purchaseDate,
      putToUseDate,
      BigInt(originalCostPaise).toString(),
      BigInt(salvageValuePaise).toString(),
      usefulLifeYears,
      depreciationMethod,
    ]
  );
  return res.rows[0];
}

/**
 * Calculate Dual Depreciation under Companies Act, 2013 & Income Tax Act, 1961
 */
export async function calculateDualDepreciation({
  companyId = 'comp_1',
  assetId,
  financialYear = '2026-27',
}) {
  const db = await getDb();
  const assetRes = await db.query(`SELECT * FROM fixed_assets WHERE id = $1 AND company_id = $2`, [assetId, companyId]);
  if (assetRes.rows.length === 0) {
    throw new Error(`Fixed asset not found: ${assetId}`);
  }
  const asset = assetRes.rows[0];
  const cost = BigInt(asset.original_cost_paise);
  const salvage = BigInt(asset.salvage_value_paise || 0);
  const usefulLifeYears = BigInt(asset.useful_life_years || 3);

  // Parse financial year dates: e.g. '2026-27' -> 2026-04-01 to 2027-03-31
  const startYear = parseInt(financialYear.split('-')[0], 10);
  const fyStartDate = new Date(Date.UTC(startYear, 3, 1)); // April 1
  const fyEndDate = new Date(Date.UTC(startYear + 1, 2, 31)); // March 31

  const putToUse = new Date(asset.put_to_use_date);

  // 1. Calculate active days in this financial year
  const activeStart = putToUse > fyStartDate ? putToUse : fyStartDate;
  let activeDays = Math.ceil((fyEndDate - activeStart) / (1000 * 60 * 60 * 24)) + 1;
  if (activeDays > 365) activeDays = 365;
  if (activeDays < 0) activeDays = 0;

  // 2. Companies Act, 2013 Depreciation (SLM pro-rata)
  const depreciableAmount = cost > salvage ? cost - salvage : 0n;
  const annualCompaniesActDepr = depreciableAmount / usefulLifeYears;
  const companiesActDepreciation = (annualCompaniesActDepr * BigInt(activeDays)) / 365n;
  const wdvClosingBooks = cost - companiesActDepreciation;

  // 3. Income Tax Act, 1961 (Section 32 Block Rates & 180-Day Rule)
  const blockRateBp = INCOME_TAX_BLOCK_RATES[asset.asset_category] || 1500;
  // 180-Day Rule: If acquired/put to use on or after October 3rd / 4th (< 180 days in FY), rate is cut by 50%
  const isLessThan180Days = activeDays < 180;
  const effectiveTaxRateBp = isLessThan180Days ? Math.floor(blockRateBp / 2) : blockRateBp;

  const incomeTaxDepreciation = (cost * BigInt(effectiveTaxRateBp)) / 10000n;
  const wdvClosingTax = cost - incomeTaxDepreciation;

  // 4. Timing Difference (for Deferred Tax Asset / Liability)
  const timingDifference = companiesActDepreciation - incomeTaxDepreciation;

  // 5. Persist entry into fixed_asset_depreciation_entries
  const entryRes = await db.query(
    `INSERT INTO fixed_asset_depreciation_entries (
      company_id, asset_id, financial_year,
      companies_act_depreciation_paise, income_tax_depreciation_paise,
      timing_difference_paise, wdv_closing_books_paise, wdv_closing_tax_paise,
      is_less_than_180_days
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (company_id, asset_id, financial_year) DO UPDATE
      SET companies_act_depreciation_paise = EXCLUDED.companies_act_depreciation_paise,
          income_tax_depreciation_paise = EXCLUDED.income_tax_depreciation_paise,
          timing_difference_paise = EXCLUDED.timing_difference_paise,
          wdv_closing_books_paise = EXCLUDED.wdv_closing_books_paise,
          wdv_closing_tax_paise = EXCLUDED.wdv_closing_tax_paise,
          is_less_than_180_days = EXCLUDED.is_less_than_180_days
    RETURNING *`,
    [
      companyId,
      assetId,
      financialYear,
      companiesActDepreciation.toString(),
      incomeTaxDepreciation.toString(),
      timingDifference.toString(),
      wdvClosingBooks.toString(),
      wdvClosingTax.toString(),
      isLessThan180Days,
    ]
  );

  return {
    assetId,
    assetCode: asset.asset_code,
    assetName: asset.asset_name,
    category: asset.asset_category,
    originalCostPaise: cost.toString(),
    financialYear,
    activeDaysInYear: activeDays,
    isLessThan180Days,
    companiesAct: {
      method: asset.depreciation_method,
      usefulLifeYears: Number(usefulLifeYears),
      annualDepreciationPaise: annualCompaniesActDepr.toString(),
      depreciationPaise: companiesActDepreciation.toString(),
      closingWdvPaise: wdvClosingBooks.toString(),
    },
    incomeTaxAct: {
      blockRatePercent: (blockRateBp / 100).toFixed(1),
      effectiveRatePercent: (effectiveTaxRateBp / 100).toFixed(1),
      applied180DayRule: isLessThan180Days,
      depreciationPaise: incomeTaxDepreciation.toString(),
      closingWdvPaise: wdvClosingTax.toString(),
    },
    timingDifferencePaise: timingDifference.toString(),
    deferredTaxNature: timingDifference > 0n ? 'DEFERRED_TAX_ASSET' : 'DEFERRED_TAX_LIABILITY',
    entry: entryRes.rows[0],
  };
}

/**
 * List all Fixed Assets with their latest dual depreciation
 */
export async function listFixedAssets({ companyId = 'comp_1' }) {
  const db = await getDb();
  const res = await db.query(
    `SELECT a.*, d.companies_act_depreciation_paise, d.income_tax_depreciation_paise, d.timing_difference_paise
     FROM fixed_assets a
     LEFT JOIN fixed_asset_depreciation_entries d ON a.id = d.asset_id
     WHERE a.company_id = $1
     ORDER BY a.asset_code ASC`,
    [companyId]
  );
  return res.rows;
}
