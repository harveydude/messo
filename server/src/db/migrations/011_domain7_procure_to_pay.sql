-- ============ 011: Domain 7 - Procure-to-Pay, OCR & MSME Compliance (Phases 31-35) ============

-- 1. Phase 31: Purchase Orders & 3-Way Matching Engine
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  po_number               TEXT NOT NULL,
  vendor_id               TEXT NOT NULL,
  po_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_expected_date  DATE,
  status                  TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED')),
  subtotal_paise          BIGINT NOT NULL DEFAULT 0,
  tax_paise               BIGINT NOT NULL DEFAULT 0,
  total_paise             BIGINT NOT NULL DEFAULT 0,
  terms                   TEXT DEFAULT 'Net 30',
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, po_number)
);
CREATE INDEX IF NOT EXISTS idx_po_comp ON purchase_orders (company_id, status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id                   UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id              TEXT,
  description             TEXT NOT NULL,
  quantity_ordered        NUMERIC(10, 2) NOT NULL DEFAULT 1,
  quantity_received       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quantity_billed         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price_paise        BIGINT NOT NULL DEFAULT 0,
  hsn_sac                 TEXT,
  tax_rate_bp             INT NOT NULL DEFAULT 1800,
  tax_amount_paise        BIGINT NOT NULL DEFAULT 0,
  total_amount_paise      BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items (po_id);

CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  grn_number              TEXT NOT NULL,
  po_id                   UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  vendor_id               TEXT NOT NULL,
  receipt_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by             TEXT DEFAULT 'Warehouse Team',
  status                  TEXT NOT NULL DEFAULT 'ACCEPTED' CHECK (status IN ('ACCEPTED', 'PARTIALLY_REJECTED', 'REJECTED')),
  notes                   TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, grn_number)
);
CREATE INDEX IF NOT EXISTS idx_grn_comp ON goods_receipt_notes (company_id);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id                  UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  po_item_id              UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  product_id              TEXT,
  description             TEXT NOT NULL,
  quantity_received       NUMERIC(10, 2) NOT NULL,
  quantity_accepted       NUMERIC(10, 2) NOT NULL,
  quantity_rejected       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rejection_reason        TEXT
);
CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON goods_receipt_items (grn_id);

CREATE TABLE IF NOT EXISTS three_way_match_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  po_id                   UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_id                  UUID REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
  bill_id                 TEXT,
  match_status            TEXT NOT NULL CHECK (match_status IN ('PERFECT_MATCH', 'VARIANCE_WITHIN_TOLERANCE', 'BLOCKED_VARIANCE')),
  qty_variance            NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_variance_paise    BIGINT NOT NULL DEFAULT 0,
  tolerance_percentage    NUMERIC(5, 2) DEFAULT 2.00,
  is_approved_for_payment BOOLEAN NOT NULL DEFAULT FALSE,
  variance_details        JSONB DEFAULT '{}'::jsonb,
  matched_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_match_logs_comp ON three_way_match_logs (company_id, match_status);

-- 2. Phase 32: AI Indian Invoice & Receipt OCR Pipeline
CREATE TABLE IF NOT EXISTS ocr_scans (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  file_name               TEXT NOT NULL,
  file_type               TEXT NOT NULL DEFAULT 'application/pdf',
  raw_text                TEXT,
  extracted_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score        NUMERIC(5, 2) NOT NULL DEFAULT 95.00,
  status                  TEXT NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PENDING', 'PROCESSED', 'CONVERTED_TO_BILL', 'REJECTED')),
  converted_bill_id       TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ocr_scans_comp ON ocr_scans (company_id, status);

-- 3. Phase 33: Vendor Bills, Recurring Expenses & Multi-Tier Approvals
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approval_tier TEXT DEFAULT 'TIER_1';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'APPROVED';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS recurring_rule_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS po_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS grn_id UUID;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS subtotal_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tax_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS cgst_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS sgst_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS igst_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_deducted_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS tds_section TEXT;

CREATE TABLE IF NOT EXISTS bill_approval_audit (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id                 TEXT NOT NULL,
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  action                  TEXT NOT NULL CHECK (action IN ('SUBMIT', 'APPROVE', 'REJECT')),
  user_id                 TEXT NOT NULL,
  user_role               TEXT NOT NULL,
  tier                    TEXT NOT NULL,
  comments                TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bill_approval_comp ON bill_approval_audit (company_id, bill_id);

CREATE TABLE IF NOT EXISTS recurring_bill_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  vendor_id               TEXT NOT NULL,
  template_name           TEXT NOT NULL,
  frequency               TEXT NOT NULL CHECK (frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY')),
  amount_paise            BIGINT NOT NULL,
  category_account_id     TEXT NOT NULL DEFAULT 'acc_5000',
  next_run_date           DATE NOT NULL,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_bills_comp ON recurring_bill_templates (company_id, is_active);

-- 4. Phase 34: MSME (Udyam) 45-Day Compliance Shield (Section 43B(h))
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS msme_category TEXT DEFAULT 'NON_MSME' CHECK (msme_category IN ('MICRO', 'SMALL', 'MEDIUM', 'NON_MSME'));
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS udyam_registration_no TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS msme_has_written_agreement BOOLEAN DEFAULT TRUE;

ALTER TABLE bills ADD COLUMN IF NOT EXISTS msme_due_date DATE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS msme_status TEXT DEFAULT 'NOT_APPLICABLE' CHECK (msme_status IN ('NOT_APPLICABLE', 'SAFE', 'APPROACHING_DEADLINE', 'BREACHED_DISALLOWED', 'PAID_ON_TIME', 'PAID_LATE'));
ALTER TABLE bills ADD COLUMN IF NOT EXISTS msme_interest_penalty_paise BIGINT DEFAULT 0;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS msme_disallowed_amount_paise BIGINT DEFAULT 0;

-- 5. Phase 35: Batch Bill Payouts, Vendor Credits & Debit Notes
CREATE TABLE IF NOT EXISTS vendor_debit_notes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  debit_note_number       TEXT NOT NULL,
  original_bill_id        TEXT,
  original_bill_number    TEXT NOT NULL,
  vendor_id               TEXT NOT NULL,
  debit_note_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  reason                  TEXT NOT NULL CHECK (reason IN ('PURCHASE_RETURN', 'DEFECTIVE_GOODS', 'RATE_DIFFERENCE', 'DISCOUNT_NOT_OFFERED', 'OTHER')),
  reason_description      TEXT,
  taxable_amount_paise    BIGINT NOT NULL DEFAULT 0,
  cgst_paise              BIGINT NOT NULL DEFAULT 0,
  sgst_paise              BIGINT NOT NULL DEFAULT 0,
  igst_paise              BIGINT NOT NULL DEFAULT 0,
  total_paise             BIGINT NOT NULL DEFAULT 0,
  journal_entry_id        TEXT,
  status                  TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'APPLIED', 'VOIDED')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, debit_note_number)
);
CREATE INDEX IF NOT EXISTS idx_vdn_comp ON vendor_debit_notes (company_id, vendor_id);

CREATE TABLE IF NOT EXISTS vendor_debit_note_lines (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_id           UUID NOT NULL REFERENCES vendor_debit_notes(id) ON DELETE CASCADE,
  product_id              TEXT,
  description             TEXT NOT NULL,
  quantity                NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price_paise        BIGINT NOT NULL DEFAULT 0,
  hsn_sac                 TEXT,
  tax_rate_bp             INT NOT NULL DEFAULT 1800,
  tax_amount_paise        BIGINT NOT NULL DEFAULT 0,
  total_amount_paise      BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_vdn_lines_dn ON vendor_debit_note_lines (debit_note_id);

CREATE TABLE IF NOT EXISTS batch_payouts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              TEXT NOT NULL DEFAULT 'comp_1',
  batch_number            TEXT NOT NULL,
  payout_channel          TEXT NOT NULL DEFAULT 'NEFT' CHECK (payout_channel IN ('NEFT', 'RTGS', 'IMPS', 'UPI', 'ACH')),
  bank_format             TEXT NOT NULL DEFAULT 'GENERIC_CSV' CHECK (bank_format IN ('HDFC_CMS', 'ICICI_EAP', 'SBI_CMP', 'NPCI_UPI', 'GENERIC_CSV')),
  total_bills_count       INT NOT NULL DEFAULT 0,
  total_payout_paise      BIGINT NOT NULL DEFAULT 0,
  journal_entry_id        TEXT,
  payout_file_content     TEXT,
  status                  TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'GENERATED', 'COMPLETED', 'CANCELLED')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, batch_number)
);
CREATE INDEX IF NOT EXISTS idx_batch_payouts_comp ON batch_payouts (company_id);

CREATE TABLE IF NOT EXISTS batch_payout_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id                UUID NOT NULL REFERENCES batch_payouts(id) ON DELETE CASCADE,
  bill_id                 TEXT NOT NULL,
  vendor_id               TEXT NOT NULL,
  beneficiary_name        TEXT NOT NULL,
  account_number          TEXT NOT NULL,
  ifsc_code               TEXT NOT NULL,
  amount_paise            BIGINT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'SUCCESS'
);
CREATE INDEX IF NOT EXISTS idx_batch_items_batch ON batch_payout_items (batch_id);
