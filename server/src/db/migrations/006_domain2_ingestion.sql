-- ============ 006: Domain 2 - Universal Data Ingestion & Cross-Platform Migration ============

-- 1. Phase 6 & 8: Import Batches Store -------------------------------------
create table if not exists import_batches (
  id                  uuid primary key default gen_random_uuid(),
  company_id          text not null default 'comp_1',
  file_name           text not null,
  file_format         text not null check (file_format in ('XLSX', 'CSV', 'JSON', 'TALLY_XML', 'SQL', 'TEXT')),
  file_sha256         text not null,
  source_software     text not null default 'CUSTOM',
  status              text not null default 'PENDING_VALIDATION' check (status in ('PENDING_VALIDATION', 'VALIDATED', 'PROMOTED', 'ROLLED_BACK', 'FAILED')),
  total_rows          int not null default 0,
  valid_rows          int not null default 0,
  error_rows          int not null default 0,
  promoted_at         timestamptz,
  rolled_back_at      timestamptz,
  created_by          text default 'System Import',
  created_at          timestamptz not null default now(),
  unique (company_id, file_sha256)
);
create index if not exists idx_import_batches_comp on import_batches (company_id, status);

-- 2. Phase 7: Reusable Schema Mappings ------------------------------------
create table if not exists import_schema_mappings (
  id              uuid primary key default gen_random_uuid(),
  company_id      text not null default 'comp_1',
  name            text not null,
  source_system   text not null default 'CUSTOM',
  target_entity   text not null check (target_entity in ('contacts', 'chart_of_accounts', 'invoices', 'bills', 'journal_entries', 'products_and_services')),
  column_mappings jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_schema_mappings_comp on import_schema_mappings (company_id, source_system);

-- 3. Phase 8: Sandbox Staging Rows ----------------------------------------
create table if not exists import_staging_rows (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references import_batches(id) on delete cascade,
  company_id          text not null default 'comp_1',
  row_index           int not null,
  target_entity       text not null,
  raw_data            jsonb not null default '{}'::jsonb,
  mapped_data         jsonb default '{}'::jsonb,
  validation_status   text not null default 'PENDING' check (validation_status in ('PENDING', 'VALID', 'INVALID', 'SUSPENSE_CORRECTED', 'PROMOTED')),
  validation_errors   jsonb default '[]'::jsonb,
  promoted_entity_id  text,
  created_at          timestamptz not null default now()
);
create index if not exists idx_staging_rows_batch on import_staging_rows (batch_id, validation_status);

-- 4. Phase 10: Import Batch Traceability for 1-Click Rollback -------------
alter table contacts add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table chart_of_accounts add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table invoices add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table bills add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table expenses add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
alter table journal_entries add column if not exists import_batch_id uuid references import_batches(id) on delete set null;
