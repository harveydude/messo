-- ============ 014: Domain 10 - AI Autonomous Accountant, Payroll, Reports & QA (Phases 46-50) ============

-- 1. Phase 46: Indian Payroll & Compliance Engine (Schema Extensions)
ALTER TABLE employees ALTER COLUMN pay_rate_paise DROP NOT NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_code TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pan TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS uan TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS esi_ip_number TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'MH';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ctc_annual_paise BIGINT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS basic_monthly_paise BIGINT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hra_monthly_paise BIGINT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS allowances_monthly_paise BIGINT DEFAULT 0;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_regime TEXT DEFAULT 'NEW';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_epf_eligible BOOLEAN DEFAULT TRUE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_esi_eligible BOOLEAN DEFAULT TRUE;

DROP INDEX IF EXISTS idx_emp_code;
CREATE UNIQUE INDEX IF NOT EXISTS idx_emp_code ON employees (company_id, employee_code);
CREATE INDEX IF NOT EXISTS idx_employees_comp ON employees (company_id, is_active);

-- Extend payroll_runs table (both Domain 10 & legacy columns compatibility)
ALTER TABLE payroll_runs ALTER COLUMN pay_period_start DROP NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN pay_period_end DROP NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN pay_date DROP NOT NULL;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS total_gross_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS total_taxes_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS total_deductions_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS total_net_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ALTER COLUMN total_gross_paise DROP NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN total_taxes_paise DROP NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN total_deductions_paise DROP NOT NULL;
ALTER TABLE payroll_runs ALTER COLUMN total_net_paise DROP NOT NULL;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS period_month TEXT;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DRAFT';
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS gross_pay_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS employee_epf_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS employer_epf_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS employee_esi_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS employer_esi_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS professional_tax_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS tds_192_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS net_pay_paise BIGINT DEFAULT 0;
ALTER TABLE payroll_runs ADD COLUMN IF NOT EXISTS journal_entry_id TEXT;

DROP INDEX IF EXISTS idx_payroll_comp_period;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_comp_period ON payroll_runs (company_id, period_month);

-- Create payslips table
CREATE TABLE IF NOT EXISTS payslips (
  id                          TEXT PRIMARY KEY,
  payroll_run_id              TEXT NOT NULL,
  employee_id                 TEXT NOT NULL,
  company_id                  TEXT NOT NULL DEFAULT 'comp_1',
  period_month                TEXT NOT NULL,
  basic_paise                 BIGINT NOT NULL,
  hra_paise                   BIGINT NOT NULL,
  allowances_paise            BIGINT NOT NULL,
  gross_paise                 BIGINT NOT NULL,
  employee_epf_paise          BIGINT NOT NULL DEFAULT 0,
  employer_epf_paise          BIGINT NOT NULL DEFAULT 0,
  employee_esi_paise          BIGINT NOT NULL DEFAULT 0,
  employer_esi_paise          BIGINT NOT NULL DEFAULT 0,
  professional_tax_paise      BIGINT NOT NULL DEFAULT 0,
  tds_192_paise               BIGINT NOT NULL DEFAULT 0,
  net_pay_paise               BIGINT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payslips_run ON payslips (payroll_run_id, employee_id);

-- Extend companies, contacts & bills compatibility columns
ALTER TABLE companies ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '27AABCM1234F1Z5';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_msme_registered BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS msme_registration_no TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS total_paise BIGINT;
UPDATE bills SET total_paise = amount_paise WHERE total_paise IS NULL;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_amount_paise BIGINT DEFAULT 0;

-- 2. Phase 47: MCA Schedule III Financial Statements & CA Export Pack
CREATE TABLE IF NOT EXISTS audit_export_packs (
  id                          TEXT PRIMARY KEY,
  company_id                  TEXT NOT NULL DEFAULT 'comp_1',
  financial_year              TEXT NOT NULL,
  as_of_date                  DATE NOT NULL,
  pack_type                   TEXT NOT NULL DEFAULT 'SCHEDULE_III_CA_PACK',
  summary_json                JSONB NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_packs_comp ON audit_export_packs (company_id, financial_year);

-- 3. Phase 48: Meso Assist AI Accounting Error Doctor
CREATE TABLE IF NOT EXISTS accounting_anomalies (
  id                          TEXT PRIMARY KEY,
  company_id                  TEXT NOT NULL DEFAULT 'comp_1',
  anomaly_type                TEXT NOT NULL,
  severity                    TEXT NOT NULL DEFAULT 'HIGH',
  entity_type                 TEXT NOT NULL,
  entity_id                   TEXT NOT NULL,
  description                 TEXT NOT NULL,
  remediation_action          TEXT NOT NULL,
  remediation_payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  status                      TEXT NOT NULL DEFAULT 'OPEN',
  resolved_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_anomalies_comp_status ON accounting_anomalies (company_id, status);

-- 4. Phase 49: Conversational CFO Query History
CREATE TABLE IF NOT EXISTS cfo_query_history (
  id                          TEXT PRIMARY KEY,
  company_id                  TEXT NOT NULL DEFAULT 'comp_1',
  query_text                  TEXT NOT NULL,
  parsed_intent               TEXT NOT NULL,
  response_json               JSONB NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cfo_query_comp ON cfo_query_history (company_id, created_at DESC);

-- 5. Chart of Accounts Seed for Payroll & Suspense Accounts
INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, is_active)
VALUES 
  ('acc_salaries_expense', 'comp_1', '5010', 'Salaries & Wages Expense', 'PROFIT_AND_LOSS', 'EXPENSE', TRUE),
  ('acc_employer_epf_exp', 'comp_1', '5015', 'Employer EPF Contribution Expense', 'PROFIT_AND_LOSS', 'EXPENSE', TRUE),
  ('acc_employer_esi_exp', 'comp_1', '5020', 'Employer ESI Contribution Expense', 'PROFIT_AND_LOSS', 'EXPENSE', TRUE),
  ('acc_salaries_payable', 'comp_1', '2050', 'Salaries Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE),
  ('acc_epf_payable', 'comp_1', '2055', 'EPF Payable (Employee & Employer)', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE),
  ('acc_esi_payable', 'comp_1', '2060', 'ESI Payable (Employee & Employer)', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE),
  ('acc_pt_payable', 'comp_1', '2065', 'Professional Tax Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE),
  ('acc_tds_192_payable', 'comp_1', '2070', 'TDS Section 192 (Salaries) Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE),
  ('acc_suspense_clearing', 'comp_1', '2080', 'Suspense & Uncategorized Clearing', 'BALANCE_SHEET', 'CURRENT_LIABILITY', TRUE)
ON CONFLICT (code) DO NOTHING;
