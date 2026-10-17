-- ============ 005: Domain 1 - Multi-Tenant Governance, MCA Audit Trail & Effective Dates ============

-- 1. Phase 1: RBAC Users Table -------------------------------------------
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null default 'comp_1',
  email       text not null,
  name        text not null,
  role        text not null check (role in ('OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER', 'DATA_ENTRY', 'AUDITOR_READ_ONLY')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);
create index if not exists idx_users_company_role on users (company_id, role);

-- 2. Phase 2: Company Accounting Policies ---------------------------------
create table if not exists company_accounting_policies (
  id                             uuid primary key default gen_random_uuid(),
  company_id                     text not null unique,
  registration_type              text not null default 'REGULAR' check (registration_type in ('REGULAR', 'COMPOSITION', 'SEZ', 'GIFT_CITY_IFSC', 'UNREGISTERED')),
  accounting_method              text not null default 'ACCRUAL' check (accounting_method in ('ACCRUAL', 'CASH')),
  inventory_valuation            text not null default 'FIFO' check (inventory_valuation in ('FIFO', 'WEIGHTED_AVERAGE')),
  functional_currency            text not null default 'INR',
  lut_arn                        text,
  lut_expiry_date                date,
  books_closed_until             date,
  allow_prior_period_adjustments boolean not null default false,
  version                        int not null default 1,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);
create index if not exists idx_policies_comp on company_accounting_policies (company_id);

-- 3. Phase 3: MCA Rule 3(1) SHA-256 Audit Trail Enhancements --------------
alter table audit_logs alter column id set default gen_random_uuid()::text;
alter table audit_logs add column if not exists user_id text;
alter table audit_logs add column if not exists user_role text default 'OWNER';
alter table audit_logs add column if not exists entity_type text default 'transaction';
alter table audit_logs add column if not exists entity_id text;
alter table audit_logs add column if not exists action text default 'CREATE';
alter table audit_logs add column if not exists ip_address text default '127.0.0.1';
alter table audit_logs add column if not exists user_agent text default 'Meso-Client/2.0';
alter table audit_logs add column if not exists previous_hash text default 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';
alter table audit_logs add column if not exists current_hash text default '';
create index if not exists idx_audit_logs_chain on audit_logs (company_id, created_at);

-- 4. Phase 4: Non-Destructive Soft-Deletion & Reversals -------------------
alter table invoices add column if not exists is_deleted boolean not null default false;
alter table invoices add column if not exists deleted_at timestamptz;
alter table invoices add column if not exists deleted_by text;
alter table invoices add column if not exists deletion_reason text;
alter table invoices add column if not exists reversing_entry_id text;

alter table bills add column if not exists is_deleted boolean not null default false;
alter table bills add column if not exists deleted_at timestamptz;
alter table bills add column if not exists deleted_by text;
alter table bills add column if not exists deletion_reason text;
alter table bills add column if not exists reversing_entry_id text;

alter table expenses add column if not exists is_deleted boolean not null default false;
alter table expenses add column if not exists deleted_at timestamptz;
alter table expenses add column if not exists deleted_by text;
alter table expenses add column if not exists deletion_reason text;
alter table expenses add column if not exists reversing_entry_id text;

alter table journal_entries add column if not exists doc_number text;
alter table journal_entries add column if not exists is_deleted boolean not null default false;
alter table journal_entries add column if not exists deleted_at timestamptz;
alter table journal_entries add column if not exists deleted_by text;
alter table journal_entries add column if not exists deletion_reason text;
alter table journal_entries add column if not exists is_reversal boolean not null default false;
alter table journal_entries add column if not exists reverses_entry_id text;
alter table journal_entries add column if not exists reversed_by_entry_id text;
alter table journal_entries add column if not exists reversing_entry_id text;

alter table journal_entry_lines add column if not exists debit_minor numeric;
alter table journal_entry_lines add column if not exists credit_minor numeric;

-- Add attachment status and deletion columns if attachments table exists
do $$
begin
  if exists (select from information_schema.tables where table_name = 'attachments') then
    alter table attachments add column if not exists status text not null default 'ACTIVE';
    alter table attachments add column if not exists deleted_at timestamptz;
    alter table attachments add column if not exists deleted_by text;
    alter table attachments add column if not exists deletion_reason text;
  end if;
end $$;

-- 5. Phase 5: Effective-Dated Tax Schedules -------------------------------
create table if not exists effective_dated_tax_schedules (
  id                  uuid primary key default gen_random_uuid(),
  company_id          text not null default 'comp_1',
  hsn_or_section_code text not null,
  kind                text not null check (kind in ('GST', 'TDS', 'TCS')),
  description         text not null,
  rate_bp             int not null check (rate_bp between 0 and 10000),
  effective_from      date not null,
  effective_to        date not null default '2099-12-31',
  created_at          timestamptz not null default now()
);
create index if not exists idx_tax_sched_lookup on effective_dated_tax_schedules (company_id, hsn_or_section_code, effective_from, effective_to);

-- 6. Correct trigger return for journal_immutable when allow_journal_mutation is on
create or replace function journal_immutable() returns trigger as $$
begin
  if coalesce(current_setting('app.allow_journal_mutation', true), 'off') = 'on' then
    if tg_op = 'DELETE' then
      return old;
    else
      return new;
    end if;
  end if;
  raise exception 'JOURNAL_IMMUTABLE: posted ledger rows are immutable — post a reversing entry instead';
end $$ language plpgsql;
