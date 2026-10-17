-- ============ 007: Domain 3 - Continuous Double-Entry General Ledger & Multi-Currency ============

-- 1. Phase 11: Paise-Precision Double-Entry Core -------------------------------
alter table journal_entry_lines add column if not exists foreign_currency text default 'INR';
alter table journal_entry_lines add column if not exists foreign_amount_minor bigint default 0;
alter table journal_entry_lines add column if not exists exchange_rate numeric(14, 6) default 1.0;

-- 2. Phase 12: Multi-Currency & GIFT City IFSC Exchange Rate Registry --------
create table if not exists exchange_rates (
  id              uuid primary key default gen_random_uuid(),
  company_id      text not null default 'comp_1',
  from_currency   text not null,
  to_currency     text not null,
  rate            numeric(14, 6) not null check (rate > 0),
  effective_date  date not null,
  source          text not null default 'RBI_REFERENCE',
  created_at      timestamptz not null default now(),
  unique (company_id, from_currency, to_currency, effective_date)
);
create index if not exists idx_exchange_rates_lookup on exchange_rates (company_id, from_currency, to_currency, effective_date);

create table if not exists forex_gain_loss_logs (
  id                 uuid primary key default gen_random_uuid(),
  company_id         text not null default 'comp_1',
  entity_type        text not null, -- 'INVOICE', 'BILL', 'EXPENSE', 'BANK_REVALUATION'
  entity_id          text not null,
  foreign_currency   text not null,
  foreign_amount     bigint not null, -- in foreign minor units (e.g. cents)
  booking_rate       numeric(14, 6) not null,
  settlement_rate    numeric(14, 6) not null,
  gain_loss_paise    bigint not null, -- positive = gain, negative = loss
  is_realized        boolean not null default true,
  journal_entry_id   text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_forex_logs_comp on forex_gain_loss_logs (company_id, entity_type, entity_id);

alter table invoices add column if not exists currency text default 'INR';
alter table invoices add column if not exists exchange_rate numeric(14, 6) default 1.0;
alter table bills add column if not exists currency text default 'INR';
alter table bills add column if not exists exchange_rate numeric(14, 6) default 1.0;
alter table expenses add column if not exists currency text default 'INR';
alter table expenses add column if not exists exchange_rate numeric(14, 6) default 1.0;

-- 3. Phase 13: Continuous Sub-Ledger to GL Reconciliation Guard ---------------
create table if not exists subledger_reconciliation_reports (
  id                          uuid primary key default gen_random_uuid(),
  company_id                  text not null default 'comp_1',
  checked_at                  timestamptz not null default now(),
  ar_gl_paise                 bigint not null,
  ar_subledger_paise          bigint not null,
  ar_variance_paise           bigint not null,
  ap_gl_paise                 bigint not null,
  ap_subledger_paise          bigint not null,
  ap_variance_paise           bigint not null,
  is_balanced                 boolean not null,
  details                     jsonb default '{}'::jsonb
);
create index if not exists idx_subledger_recon_comp on subledger_reconciliation_reports (company_id, checked_at);

-- 4. Phase 14: Multi-GSTIN Branches, Cost Centers & Classes -------------------
create table if not exists company_branches (
  id              uuid primary key default gen_random_uuid(),
  company_id      text not null default 'comp_1',
  branch_code     text not null,
  branch_name     text not null,
  gstin           text not null,
  state_code      text not null,
  state_name      text not null,
  address         text,
  is_head_office  boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (company_id, branch_code)
);
create index if not exists idx_branches_comp on company_branches (company_id);

create table if not exists cost_centers (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null default 'comp_1',
  code        text not null,
  name        text not null,
  department  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, code)
);
create index if not exists idx_cost_centers_comp on cost_centers (company_id);

alter table journal_entry_lines add column if not exists branch_id uuid;
alter table journal_entry_lines add column if not exists cost_center_id uuid;
alter table invoices add column if not exists branch_id uuid;
alter table invoices add column if not exists cost_center_id uuid;
alter table bills add column if not exists branch_id uuid;
alter table bills add column if not exists cost_center_id uuid;
alter table expenses add column if not exists branch_id uuid;
alter table expenses add column if not exists cost_center_id uuid;

-- 5. Phase 15: Automated Year-End Close & Retained Earnings Roll-Forward ------
create table if not exists fiscal_year_closes (
  id                         uuid primary key default gen_random_uuid(),
  company_id                 text not null default 'comp_1',
  fiscal_year                text not null,
  start_date                 date not null,
  end_date                   date not null,
  total_income_paise         bigint not null default 0,
  total_expense_paise        bigint not null default 0,
  net_income_paise           bigint not null default 0,
  retained_earnings_entry_id text references journal_entries(id) on delete set null,
  closed_by                  text not null default 'System Year-End Close',
  closed_at                  timestamptz not null default now(),
  is_locked                  boolean not null default true,
  unique (company_id, fiscal_year)
);
create index if not exists idx_fy_closes_comp on fiscal_year_closes (company_id);
