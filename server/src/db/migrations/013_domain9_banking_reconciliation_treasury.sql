-- ============ 013: Domain 9 - Connected Banking, Reconciliation & Treasury (Phases 41-45) ============

-- 1. Phase 41: Universal Indian Bank Statement & Feed Ingestor
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT 'comp_1';
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS hash_dedup TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS utr_number TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS bank_account_id TEXT;
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS raw_statement_line JSONB;

DROP INDEX IF EXISTS idx_bt_dedup;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bt_dedup ON bank_transactions (company_id, hash_dedup);
CREATE INDEX IF NOT EXISTS idx_bt_utr ON bank_transactions (company_id, utr_number);

-- 2. Phase 42: Bank Categorization Rules & Split Matches
CREATE TABLE IF NOT EXISTS bank_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  name                TEXT NOT NULL,
  priority            INT NOT NULL DEFAULT 1,
  direction           TEXT NOT NULL DEFAULT 'MONEY_OUT' CHECK (direction IN ('MONEY_OUT', 'MONEY_IN', 'BOTH')),
  conditions          JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_account_id   TEXT NOT NULL,
  target_contact_id   TEXT,
  auto_add            BOOLEAN NOT NULL DEFAULT FALSE,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_rules_comp ON bank_rules (company_id, priority);

CREATE TABLE IF NOT EXISTS bank_split_matches (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  bank_transaction_id     TEXT NOT NULL,
  target_doc_type         TEXT NOT NULL CHECK (target_doc_type IN ('INVOICE', 'BILL')),
  target_doc_id           TEXT NOT NULL,
  allocated_amount_paise  BIGINT NOT NULL,
  fee_deducted_paise      BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_split_bt ON bank_split_matches (company_id, bank_transaction_id);

-- 3. Phase 43: Undeposited Funds, Contra Transfers & Credit Card Paydowns
CREATE TABLE IF NOT EXISTS bank_transfers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          TEXT NOT NULL DEFAULT 'comp_1',
  transfer_number     TEXT NOT NULL,
  transfer_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  transfer_type       TEXT NOT NULL DEFAULT 'CONTRA' CHECK (transfer_type IN ('CONTRA', 'DEPOSIT', 'CREDIT_CARD_PAYDOWN')),
  from_account_id     TEXT NOT NULL,
  to_account_id       TEXT NOT NULL,
  amount_paise        BIGINT NOT NULL,
  journal_entry_id    TEXT,
  reference_no        TEXT,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, transfer_number)
);
CREATE INDEX IF NOT EXISTS idx_transfers_comp ON bank_transfers (company_id, transfer_date);

-- 4. Phase 44: Statement Reconciliation & Post-Reconciliation Tamper Lock
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS reconciled_by TEXT DEFAULT 'Finance Manager';
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS cleared_deposits_paise BIGINT DEFAULT 0;
ALTER TABLE bank_reconciliations ADD COLUMN IF NOT EXISTS cleared_payments_paise BIGINT DEFAULT 0;

ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT FALSE;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS reconciliation_id TEXT;
ALTER TABLE journal_entry_lines ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jel_reconciled ON journal_entry_lines (is_reconciled, reconciliation_id);

-- 5. Standard Treasury Accounts Seed in Chart of Accounts
INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type, is_active)
VALUES 
  ('acc_undeposited_funds', 'comp_1', '1099', 'Undeposited Funds Clearing', 'BALANCE_SHEET', 'CURRENT_ASSET', TRUE),
  ('acc_bank_fees', 'comp_1', '6050', 'Bank & Merchant Processing Fees', 'PROFIT_AND_LOSS', 'EXPENSE', TRUE),
  ('acc_hdfc_bank', 'comp_1', '1011', 'HDFC Current Account', 'BALANCE_SHEET', 'BANK', TRUE),
  ('acc_icici_bank', 'comp_1', '1021', 'ICICI Operating Account', 'BALANCE_SHEET', 'BANK', TRUE),
  ('acc_corporate_card', 'comp_1', '2011', 'Corporate Credit Card Liability', 'BALANCE_SHEET', 'CREDIT_CARD', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. Allow reconciliation status stamps on journal_entry_lines without violating ledger immutability
CREATE OR REPLACE FUNCTION journal_immutable() RETURNS trigger AS $$
BEGIN
  IF COALESCE(current_setting('app.allow_journal_mutation', true), 'off') = 'on' THEN
    IF tg_op = 'DELETE' THEN
      RETURN old;
    ELSE
      RETURN new;
    END IF;
  END IF;

  -- Allow updating reconciliation stamp on journal_entry_lines if financial amounts remain untouched
  IF tg_table_name = 'journal_entry_lines' AND tg_op = 'UPDATE' THEN
    IF old.account_id = new.account_id AND 
       old.debit_paise = new.debit_paise AND 
       old.credit_paise = new.credit_paise AND 
       old.journal_entry_id = new.journal_entry_id THEN
      RETURN new;
    END IF;
  END IF;

  RAISE EXCEPTION 'JOURNAL_IMMUTABLE: posted ledger rows are immutable — post a reversing entry instead';
END $$ LANGUAGE plpgsql;
