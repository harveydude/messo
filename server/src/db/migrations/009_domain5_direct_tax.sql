-- ============ 009: Domain 5 - Indian Direct Tax (TDS, TCS & Fixed Assets) ============

-- 1. Phase 21: PAN/Aadhaar & Section 197 Lower Deduction Certificates
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pan text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS aadhaar text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_tds_applicable boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS tds_lower_deduction_certificates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  vendor_id               TEXT NOT NULL,
  certificate_no          TEXT NOT NULL,
  section_code            TEXT NOT NULL, -- '194C', '194J', '194I', etc.
  lower_rate_bp           INT NOT NULL DEFAULT 0, -- 0 = NIL deduction, 50 = 0.5%
  threshold_amount_paise  BIGINT NOT NULL,
  utilized_amount_paise   BIGINT NOT NULL DEFAULT 0,
  valid_from              DATE NOT NULL,
  valid_to                DATE NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT true,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, vendor_id, certificate_no)
);
CREATE INDEX IF NOT EXISTS idx_tds_cert_vendor ON tds_lower_deduction_certificates (company_id, vendor_id, section_code);

-- 2. Phase 22: Cumulative Threshold & Multi-Section TDS Engine
CREATE TABLE IF NOT EXISTS tds_cumulative_tracker (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               TEXT NOT NULL DEFAULT 'comp_1',
  vendor_id                TEXT NOT NULL,
  financial_year           TEXT NOT NULL DEFAULT '2026-27',
  section_code             TEXT NOT NULL,
  cumulative_amount_paise  BIGINT NOT NULL DEFAULT 0,
  cumulative_tds_paise     BIGINT NOT NULL DEFAULT 0,
  is_threshold_breached    BOOLEAN NOT NULL DEFAULT false,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, vendor_id, financial_year, section_code)
);
CREATE INDEX IF NOT EXISTS idx_tds_tracker_vendor ON tds_cumulative_tracker (company_id, vendor_id, financial_year);

-- 3. Phase 23: Whichever is Earlier TDS & TCS Engine
CREATE TABLE IF NOT EXISTS tds_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               TEXT NOT NULL DEFAULT 'comp_1',
  vendor_id                TEXT NOT NULL,
  doc_type                 TEXT NOT NULL DEFAULT 'BILL' CHECK (doc_type IN ('BILL', 'ADVANCE_PAYMENT', 'EXPENSE')),
  doc_id                   TEXT NOT NULL,
  section_code             TEXT NOT NULL,
  financial_year           TEXT NOT NULL DEFAULT '2026-27',
  gross_amount_paise       BIGINT NOT NULL,
  tds_rate_bp              INT NOT NULL,
  tds_amount_paise         BIGINT NOT NULL,
  net_payable_paise        BIGINT NOT NULL,
  deduction_date           DATE NOT NULL,
  is_advance               BOOLEAN NOT NULL DEFAULT false,
  adjusted_bill_id         TEXT,
  challan_id               UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tds_txns_vendor ON tds_transactions (company_id, vendor_id, financial_year);

CREATE TABLE IF NOT EXISTS tcs_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               TEXT NOT NULL DEFAULT 'comp_1',
  customer_id              TEXT NOT NULL,
  doc_type                 TEXT NOT NULL DEFAULT 'INVOICE',
  doc_id                   TEXT NOT NULL,
  financial_year           TEXT NOT NULL DEFAULT '2026-27',
  gross_amount_paise       BIGINT NOT NULL,
  tcs_rate_bp              INT NOT NULL DEFAULT 10,
  tcs_amount_paise         BIGINT NOT NULL,
  receipt_date             DATE NOT NULL,
  challan_id               UUID,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tcs_txns_cust ON tcs_transactions (company_id, customer_id, financial_year);

-- 4. Phase 24: ITNS 281 Challan Settlement & Form 26Q
CREATE TABLE IF NOT EXISTS tds_challans_itns281 (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               TEXT NOT NULL DEFAULT 'comp_1',
  challan_no               TEXT NOT NULL,
  bsr_code                 TEXT NOT NULL,
  deposit_date             DATE NOT NULL,
  tax_applicable           TEXT NOT NULL DEFAULT '0020', -- '0020' Company / '0021' Non-Company
  type_of_payment          TEXT NOT NULL DEFAULT '200',  -- '200' Regular / '400' Assessment
  section_code             TEXT NOT NULL,
  tds_paise                BIGINT NOT NULL DEFAULT 0,
  surcharge_paise          BIGINT NOT NULL DEFAULT 0,
  cess_paise               BIGINT NOT NULL DEFAULT 0,
  interest_paise           BIGINT NOT NULL DEFAULT 0,
  fee_penalty_paise        BIGINT NOT NULL DEFAULT 0,
  total_deposited_paise    BIGINT NOT NULL,
  bank_name                TEXT,
  financial_year           TEXT NOT NULL DEFAULT '2026-27',
  quarter                  TEXT NOT NULL DEFAULT 'Q1',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tds_challans_comp ON tds_challans_itns281 (company_id, financial_year, quarter);

-- 5. Phase 25: Fixed Assets Register & Dual Depreciation Engine
CREATE TABLE IF NOT EXISTS fixed_assets (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               TEXT NOT NULL DEFAULT 'comp_1',
  asset_code               TEXT NOT NULL,
  asset_name               TEXT NOT NULL,
  asset_category           TEXT NOT NULL CHECK (asset_category IN ('COMPUTERS', 'PLANT_MACHINERY', 'FURNITURE', 'VEHICLES', 'BUILDINGS')),
  purchase_date            DATE NOT NULL,
  put_to_use_date          DATE NOT NULL,
  original_cost_paise      BIGINT NOT NULL,
  salvage_value_paise      BIGINT NOT NULL DEFAULT 0,
  useful_life_years        INT NOT NULL DEFAULT 3,
  depreciation_method      TEXT NOT NULL DEFAULT 'SLM' CHECK (depreciation_method IN ('SLM', 'WDV')),
  status                   TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPOSED', 'WRITTEN_OFF')),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, asset_code)
);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_comp ON fixed_assets (company_id, asset_category);

CREATE TABLE IF NOT EXISTS fixed_asset_depreciation_entries (
  id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                        TEXT NOT NULL DEFAULT 'comp_1',
  asset_id                          UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  financial_year                    TEXT NOT NULL DEFAULT '2026-27',
  companies_act_depreciation_paise  BIGINT NOT NULL,
  income_tax_depreciation_paise     BIGINT NOT NULL,
  timing_difference_paise           BIGINT NOT NULL,
  wdv_closing_books_paise           BIGINT NOT NULL,
  wdv_closing_tax_paise             BIGINT NOT NULL,
  is_less_than_180_days             BOOLEAN NOT NULL DEFAULT false,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, asset_id, financial_year)
);
CREATE INDEX IF NOT EXISTS idx_deprec_entries_asset ON fixed_asset_depreciation_entries (company_id, asset_id, financial_year);
