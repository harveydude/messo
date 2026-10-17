-- ============ 003: write-integrity ============
-- (a) Idempotency store -------------------------------------------------
create table if not exists idempotency_keys (
  key            text   not null,
  company_id     text   not null,
  user_id        text,
  method         text   not null,
  path           text   not null,
  request_hash   text   not null,
  response_status int,
  response_body  jsonb,
  locked_at      timestamptz,
  created_at     timestamptz not null default now(),
  primary key (key, company_id)
);
create index if not exists idx_idem_gc on idempotency_keys (created_at);

-- (b) Optimistic locking columns ---------------------------------------
alter table companies            add column if not exists version int not null default 1;
alter table companies            add column if not exists settings jsonb not null default '{}';
alter table invoices             add column if not exists version int not null default 1;
alter table bills                add column if not exists version int not null default 1;
alter table expenses             add column if not exists version int not null default 1;
alter table contacts             add column if not exists version int not null default 1;
alter table customers            add column if not exists version int not null default 1;
alter table vendors              add column if not exists version int not null default 1;
alter table products_and_services add column if not exists version int not null default 1;
alter table chart_of_accounts    add column if not exists version int not null default 1;

-- Default generators for journal_entries id and entry_number
alter table journal_entries alter column id set default ('je_' || md5(random()::text || clock_timestamp()::text));
alter table journal_entries alter column entry_number set default ('JE-' || floor(random() * 900000 + 100000)::text);

-- Compatibility columns on journal_entry_lines so both entry_id and journal_entry_id, and debit/credit and paise work
alter table journal_entry_lines add column if not exists entry_id text;
alter table journal_entry_lines add column if not exists debit numeric;
alter table journal_entry_lines add column if not exists credit numeric;

create or replace function sync_journal_entry_lines_compat() returns trigger as $$
begin
  if new.journal_entry_id is null and new.entry_id is not null then
    new.journal_entry_id := new.entry_id;
  end if;
  if new.entry_id is null and new.journal_entry_id is not null then
    new.entry_id := new.journal_entry_id;
  end if;
  if coalesce(new.debit_paise, 0) = 0 and new.debit is not null then
    new.debit_paise := round(new.debit * 100)::bigint;
  end if;
  if new.debit is null and new.debit_paise is not null then
    new.debit := (new.debit_paise::numeric / 100.0);
  end if;
  if coalesce(new.credit_paise, 0) = 0 and new.credit is not null then
    new.credit_paise := round(new.credit * 100)::bigint;
  end if;
  if new.credit is null and new.credit_paise is not null then
    new.credit := (new.credit_paise::numeric / 100.0);
  end if;
  if new.id is null then
    new.id := 'jl_' || md5(random()::text || clock_timestamp()::text);
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_sync_journal_entry_lines_compat on journal_entry_lines;
create trigger trg_sync_journal_entry_lines_compat
  before insert or update on journal_entry_lines
  for each row execute function sync_journal_entry_lines_compat();

-- (c) DB-enforced balanced entries (deferred to COMMIT) -----------------
create or replace function journal_entry_balanced() returns trigger as $$
declare
  d numeric;
  c numeric;
  tgt text;
begin
  tgt := coalesce(new.journal_entry_id, new.entry_id, old.journal_entry_id, old.entry_id);
  select coalesce(sum(coalesce(debit_paise, 0)), 0), coalesce(sum(coalesce(credit_paise, 0)), 0) into d, c
    from journal_entry_lines
    where journal_entry_id = tgt or entry_id = tgt;
  if d <> c then
    raise exception 'UNBALANCED_ENTRY: debits=% credits=% (entry %)', d, c, tgt;
  end if;
  return null;
end $$ language plpgsql;

drop trigger if exists trg_journal_balanced on journal_entry_lines;
create constraint trigger trg_journal_balanced
after insert or update or delete on journal_entry_lines
deferrable initially deferred
for each row execute function journal_entry_balanced();

-- (d) Ledger immutability (works regardless of connect role, unlike REVOKE)
create or replace function journal_immutable() returns trigger as $$
begin
  -- escape hatch for seed/maintenance scripts ONLY:
  --   set app.allow_journal_mutation = 'on';   (per-session)
  if coalesce(current_setting('app.allow_journal_mutation', true), 'off') = 'on' then
    return null;
  end if;
  raise exception 'JOURNAL_IMMUTABLE: posted ledger rows are immutable — post a reversing entry instead';
end $$ language plpgsql;

drop trigger if exists trg_journal_no_mutate_entries on journal_entries;
create trigger trg_journal_no_mutate_entries
  before update or delete on journal_entries
  for each row execute function journal_immutable();

drop trigger if exists trg_journal_no_mutate_lines on journal_entry_lines;
create trigger trg_journal_no_mutate_lines
  before update or delete on journal_entry_lines
  for each row execute function journal_immutable();

-- (e) No negative document balances (column-sniffed)
do $$
declare col text; t text;
begin
  foreach t in array array['invoices','bills'] loop
    select column_name into col from information_schema.columns
      where table_name = t and column_name in ('balance_due_paise','open_balance_paise','balance_minor','balance','balance_due') limit 1;
    if col is not null then
      execute format('alter table %I drop constraint if exists chk_%s_nonneg', t, t);
      execute format('alter table %I add constraint chk_%s_nonneg check (%I >= 0)', t, t, col);
    end if;
  end loop;
exception when duplicate_object then null;
end $$;
