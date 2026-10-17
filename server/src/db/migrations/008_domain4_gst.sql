-- ============ 008: Domain 4 - Indian GST Compliance Engine ============

-- 1. Phase 16: Place of Supply & Tax Determination Matrix --------------------
alter table invoices add column if not exists place_of_supply_state_code text default '27';
alter table invoices add column if not exists tax_scheme text default 'INTRA_STATE'; -- 'INTRA_STATE', 'INTER_STATE', 'UTGST', 'ZERO_RATED_LUT', 'IFSC_EXEMPT', 'EXPORT_WITH_PAYMENT'
alter table invoices add column if not exists cgst_paise bigint not null default 0;
alter table invoices add column if not exists sgst_paise bigint not null default 0;
alter table invoices add column if not exists igst_paise bigint not null default 0;
alter table invoices add column if not exists cess_paise bigint not null default 0;

alter table bills add column if not exists place_of_supply_state_code text default '27';
alter table bills add column if not exists tax_scheme text default 'INTRA_STATE';
alter table bills add column if not exists cgst_paise bigint not null default 0;
alter table bills add column if not exists sgst_paise bigint not null default 0;
alter table bills add column if not exists igst_paise bigint not null default 0;
alter table bills add column if not exists cess_paise bigint not null default 0;

-- 2. Phase 17: Effective-Dated HSN/SAC Registry -------------------------------
create table if not exists gst_rate_registry (
  id               uuid primary key default gen_random_uuid(),
  company_id       text not null default 'comp_1',
  hsn_or_sac_code  text not null,
  description      text,
  slab_rate_bp     int not null check (slab_rate_bp between 0 and 10000), -- 1800 = 18%
  cess_rate_bp     int not null default 0,
  effective_from   date not null,
  effective_to     date,
  category         text not null default 'SERVICES' check (category in ('GOODS', 'SERVICES')),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (company_id, hsn_or_sac_code, effective_from)
);
create index if not exists idx_gst_rate_hsn on gst_rate_registry (company_id, hsn_or_sac_code, effective_from);

-- 3. Phase 18: Electronic Credit Ledger (ITC) & RCM Engine -------------------
create table if not exists itc_ledger (
  id                uuid primary key default gen_random_uuid(),
  company_id        text not null default 'comp_1',
  doc_type          text not null default 'BILL', -- 'BILL', 'EXPENSE', 'JOURNAL_ENTRY'
  doc_id            text not null,
  itc_type          text not null check (itc_type in ('ELIGIBLE_INPUTS', 'ELIGIBLE_INPUT_SERVICES', 'ELIGIBLE_CAPITAL_GOODS', 'BLOCKED_SEC_17_5', 'RCM_TAX')),
  cgst_paise        bigint not null default 0,
  sgst_paise        bigint not null default 0,
  igst_paise        bigint not null default 0,
  cess_paise        bigint not null default 0,
  total_itc_paise   bigint not null default 0,
  is_blocked        boolean not null default false,
  block_reason      text,
  is_claimed        boolean not null default true,
  claim_period      text not null default '2026-04',
  created_at        timestamptz not null default now()
);
create index if not exists idx_itc_ledger_comp on itc_ledger (company_id, claim_period);

alter table bills add column if not exists is_rcm boolean not null default false;
alter table bills add column if not exists is_itc_blocked boolean not null default false;
alter table bills add column if not exists itc_block_reason text;

-- 4. Phase 19: E-Invoicing (IRN/QR) & E-Way Bill ------------------------------
create table if not exists e_invoices (
  id                   uuid primary key default gen_random_uuid(),
  company_id           text not null default 'comp_1',
  invoice_id           text not null references invoices(id) on delete cascade,
  irn_hash             text not null unique,
  ack_no               text not null,
  ack_date             timestamptz not null default now(),
  signed_qr_code       text not null,
  status               text not null default 'ACTIVE' check (status in ('ACTIVE', 'CANCELLED')),
  cancelled_at         timestamptz,
  cancellation_reason  text,
  eway_bill_no         text,
  eway_bill_date       timestamptz,
  eway_bill_valid_until timestamptz,
  created_at           timestamptz not null default now()
);
create index if not exists idx_e_invoices_inv on e_invoices (company_id, invoice_id);

-- 5. Phase 20: GSTR-1, GSTR-2B & GSTR-3B Tax Filing Engine --------------------
create table if not exists gst_returns_filings (
  id               uuid primary key default gen_random_uuid(),
  company_id       text not null default 'comp_1',
  return_type      text not null check (return_type in ('GSTR-1', 'GSTR-2B', 'GSTR-3B')),
  return_period    text not null, -- 'YYYY-MM'
  status           text not null default 'DRAFT' check (status in ('DRAFT', 'COMPILED', 'FILED')),
  summary_json     jsonb not null default '{}'::jsonb,
  filed_at         timestamptz,
  ack_reference    text,
  created_at       timestamptz not null default now(),
  unique (company_id, return_type, return_period)
);
create index if not exists idx_gst_filings_comp on gst_returns_filings (company_id, return_type, return_period);
