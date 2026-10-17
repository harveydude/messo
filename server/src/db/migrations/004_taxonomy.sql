-- ============ 004: taxonomy / attachments / recurring / doc states ============

-- (a) Tax authorities & rates (GST split-aware, TDS-ready) ----------------
create table if not exists tax_agencies (
  id         text primary key default ('tag_' || md5(random()::text || clock_timestamp()::text)),
  company_id text not null default 'comp_1',
  name       text not null,
  kind       text not null default 'GST' check (kind in ('GST','TDS','OTHER')),
  unique (company_id, name)
);

create table if not exists tax_rates (
  id            text primary key default ('txr_' || md5(random()::text || clock_timestamp()::text)),
  company_id    text not null default 'comp_1',
  agency_id     text references tax_agencies(id),
  kind          text not null default 'GST' check (kind in ('GST','TDS','OTHER')),
  name          text not null,          -- 'GST 18%', 'TDS 194C (others) 2%'
  rate_bp       int  not null check (rate_bp between 0 and 10000),  -- 1800 = 18%
  split         jsonb,                  -- {"CGST":900,"SGST":900} | {"IGST":1800} | {"TDS":200}
  active        boolean not null default true,
  unique (company_id, name)
);
create index if not exists idx_tax_rates_active on tax_rates (company_id) where active;

-- (b) Attachments (polymorphic; entity_id is text → type-agnostic by design)
create table if not exists attachments (
  id           text primary key default ('att_' || md5(random()::text || clock_timestamp()::text)),
  company_id   text not null default 'comp_1',
  entity_type  text not null,           -- 'expense','bill','invoice','transaction','contact'
  entity_id    text,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes > 0),
  storage_path text not null,
  sha256       text,
  uploaded_by  text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_attach_entity on attachments (company_id, entity_type, entity_id);

-- (c) Recurring schedules (cron-driven state machine)
create table if not exists recurring_schedules (
  id              text primary key default ('rec_' || md5(random()::text || clock_timestamp()::text)),
  company_id      text not null default 'comp_1',
  name            text not null,
  frequency       text not null check (frequency in ('ONCE','DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
  template        jsonb not null,       -- { workflow: 'invoice', payload: {...} }
  state           text not null default 'ACTIVE' check (state in ('ACTIVE','PAUSED','COMPLETED','EXPIRED')),
  next_run        date not null,
  end_date        date,
  max_occurrences int,
  run_count       int not null default 0,
  last_run        timestamptz,
  last_error      text,
  created_by      text,
  created_at      timestamptz not null default now(),
  check (max_occurrences is null or max_occurrences > 0)
);
create index if not exists idx_recur_due on recurring_schedules (company_id, state, next_run);

-- (d) Classes & locations (audit §2.2 completeness — UI can come later)
create table if not exists classes   (id text primary key default ('cls_' || md5(random()::text || clock_timestamp()::text)), company_id text not null default 'comp_1', name text not null, unique (company_id, name));
create table if not exists locations (id text primary key default ('loc_' || md5(random()::text || clock_timestamp()::text)), company_id text not null default 'comp_1', name text not null, unique (company_id, name));
alter table transaction_lines add column if not exists class_id    text references classes(id);
alter table transaction_lines add column if not exists location_id text references locations(id);

-- (e) Document state machines on the multiplexed transactions table -------
alter table transactions add column if not exists doc_type       text;
alter table transactions add column if not exists doc_status     text;
alter table transactions add column if not exists status_history jsonb not null default '[]';

create table if not exists doc_status_transitions (
  doc_type    text not null,
  from_status text not null,
  to_status   text not null,
  primary key (doc_type, from_status, to_status)
);

insert into doc_status_transitions (doc_type, from_status, to_status) values
  ('estimate',      'DRAFT','SENT'), ('estimate','DRAFT','VOID'),
  ('estimate',      'SENT','ACCEPTED'), ('estimate','SENT','REJECTED'),
  ('estimate',      'SENT','VOID'), ('estimate','SENT','EXPIRED'),
  ('estimate',      'ACCEPTED','CONVERTED_TO_INVOICE'),
  ('sales_order',   'DRAFT','OPEN'), ('sales_order','DRAFT','VOID'),
  ('sales_order',   'OPEN','CLOSED'), ('sales_order','OPEN','CONVERTED_TO_INVOICE'), ('sales_order','OPEN','VOID'),
  ('purchase_order','DRAFT','OPEN'), ('purchase_order','DRAFT','VOID'),
  ('purchase_order','OPEN','RECEIVED'), ('purchase_order','OPEN','CLOSED'), ('purchase_order','OPEN','VOID'),
  ('credit_memo',   'OPEN','APPLIED'), ('credit_memo','OPEN','VOID'),
  ('delayed_credit','OPEN','APPLIED'), ('delayed_credit','OPEN','VOID'),
  ('delayed_charge','OPEN','APPLIED'), ('delayed_charge','OPEN','VOID')
on conflict do nothing;

-- DB-enforced transition guard (VOID allowed from any non-terminal state)
create or replace function fn_doc_status_guard() returns trigger as $$
declare allowed boolean; prev text;
begin
  if new.doc_type is null then return new; end if;
  if new.doc_status is null then new.doc_status := 'DRAFT'; end if;
  if tg_op = 'INSERT' then return new; end if;
  prev := coalesce(old.doc_status, 'DRAFT');
  if prev = new.doc_status then return new; end if;
  if new.doc_status = 'VOID' and prev not in ('VOID', 'CONVERTED_TO_INVOICE') then return new; end if;
  select coalesce((
    select true from doc_status_transitions t
    where t.doc_type = new.doc_type and t.from_status = prev and t.to_status = new.doc_status
  ), false) into allowed;
  if not allowed then
    raise exception 'INVALID_DOC_TRANSITION: % cannot go % → % (row %)', new.doc_type, prev, new.doc_status, new.id;
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_doc_status on transactions;
create trigger trg_doc_status before update on transactions
  for each row execute function fn_doc_status_guard();

-- (f) Hook rates into existing line tables (flat percent keeps working back-compat)
alter table invoice_items     add column if not exists tax_rate_id text references tax_rates(id);
alter table transaction_lines add column if not exists tax_rate_id text references tax_rates(id);
