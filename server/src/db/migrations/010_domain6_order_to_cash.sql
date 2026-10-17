-- ============ 010: Domain 6 - Order-to-Cash & Revenue Recognition (Phases 26-30) ============

-- 1. Phase 26: Estimates, Quotes & Sales Orders Pipeline -------------------------
ALTER TABLE products_and_services ADD COLUMN IF NOT EXISTS quantity_committed NUMERIC(10, 2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS estimates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            TEXT NOT NULL DEFAULT 'comp_1',
  estimate_number       TEXT NOT NULL,
  customer_id           TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  estimate_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date           DATE NOT NULL DEFAULT CURRENT_DATE + 30,
  status                TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED_TO_ORDER', 'CONVERTED_TO_INVOICE', 'VOIDED')),
  subtotal_paise        BIGINT NOT NULL DEFAULT 0,
  tax_paise             BIGINT NOT NULL DEFAULT 0,
  total_paise           BIGINT NOT NULL DEFAULT 0,
  converted_order_id    UUID,
  converted_invoice_id  TEXT,
  terms                 TEXT DEFAULT 'Valid for 30 days',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, estimate_number)
);
CREATE INDEX IF NOT EXISTS idx_estimates_comp ON estimates (company_id, status);

CREATE TABLE IF NOT EXISTS estimate_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id           UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  product_id            TEXT REFERENCES products_and_services(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  tax_rate_bp           INT NOT NULL DEFAULT 1800,
  tax_amount_paise      BIGINT NOT NULL DEFAULT 0,
  total_amount_paise    BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_estimate_items_est ON estimate_items (estimate_id);

CREATE TABLE IF NOT EXISTS sales_orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            TEXT NOT NULL DEFAULT 'comp_1',
  order_number          TEXT NOT NULL,
  estimate_id           UUID REFERENCES estimates(id) ON DELETE SET NULL,
  customer_id           TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  order_date            DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_due_date     DATE,
  status                TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIRMED', 'PARTIALLY_INVOICED', 'CONVERTED_TO_INVOICE', 'CANCELLED', 'CLOSED')),
  subtotal_paise        BIGINT NOT NULL DEFAULT 0,
  tax_paise             BIGINT NOT NULL DEFAULT 0,
  total_paise           BIGINT NOT NULL DEFAULT 0,
  converted_invoice_id  TEXT,
  terms                 TEXT DEFAULT 'Net 30',
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, order_number)
);
CREATE INDEX IF NOT EXISTS idx_sales_orders_comp ON sales_orders (company_id, status);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id            TEXT REFERENCES products_and_services(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(10, 2) NOT NULL DEFAULT 1,
  quantity_invoiced     NUMERIC(10, 2) NOT NULL DEFAULT 0,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  tax_rate_bp           INT NOT NULL DEFAULT 1800,
  tax_amount_paise      BIGINT NOT NULL DEFAULT 0,
  total_amount_paise    BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_ord ON sales_order_items (order_id);

-- 2. Phase 27: Multi-Template Tax Invoice, Bill of Supply & Export Invoice Builder ---
CREATE TABLE IF NOT EXISTS invoice_templates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            TEXT NOT NULL DEFAULT 'comp_1',
  template_name         TEXT NOT NULL,
  template_type         TEXT NOT NULL DEFAULT 'TAX_INVOICE' CHECK (template_type IN ('TAX_INVOICE', 'BILL_OF_SUPPLY', 'EXPORT_INVOICE', 'IFSC_INVOICE')),
  header_title          TEXT NOT NULL DEFAULT 'TAX INVOICE',
  declaration_text      TEXT,
  bank_details          JSONB DEFAULT '{}'::jsonb,
  accent_color          TEXT DEFAULT '#2CA01C',
  show_hsn              BOOLEAN NOT NULL DEFAULT TRUE,
  show_qr_code          BOOLEAN NOT NULL DEFAULT TRUE,
  show_lut_details      BOOLEAN NOT NULL DEFAULT FALSE,
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, template_name)
);
CREATE INDEX IF NOT EXISTS idx_inv_templates_comp ON invoice_templates (company_id);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES invoice_templates(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_title TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS statutory_declaration TEXT;

-- 3. Phase 28: Ind AS 115 / ASC 606 Automated Revenue Recognition -------------------
CREATE TABLE IF NOT EXISTS revenue_contracts (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                  TEXT NOT NULL DEFAULT 'comp_1',
  contract_number             TEXT NOT NULL,
  customer_id                 TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  invoice_id                  TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  total_contract_value_paise  BIGINT NOT NULL,
  recognized_revenue_paise    BIGINT NOT NULL DEFAULT 0,
  deferred_revenue_paise      BIGINT NOT NULL DEFAULT 0,
  recognition_method          TEXT NOT NULL DEFAULT 'STRAIGHT_LINE_MONTHLY' CHECK (recognition_method IN ('STRAIGHT_LINE_MONTHLY', 'PERCENTAGE_COMPLETION', 'MILESTONE_BASED')),
  start_date                  DATE NOT NULL,
  end_date                    DATE NOT NULL,
  total_periods               INT NOT NULL DEFAULT 12,
  status                      TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'TERMINATED')),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, contract_number)
);
CREATE INDEX IF NOT EXISTS idx_rev_contracts_comp ON revenue_contracts (company_id, status);

CREATE TABLE IF NOT EXISTS revenue_schedules (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id                 UUID NOT NULL REFERENCES revenue_contracts(id) ON DELETE CASCADE,
  period_index                INT NOT NULL,
  schedule_date               DATE NOT NULL,
  amount_to_recognize_paise   BIGINT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RECOGNIZED', 'CANCELLED')),
  journal_entry_id            TEXT REFERENCES journal_entries(id) ON DELETE SET NULL,
  recognized_at               TIMESTAMPTZ,
  UNIQUE (contract_id, period_index)
);
CREATE INDEX IF NOT EXISTS idx_rev_schedules_due ON revenue_schedules (contract_id, status, schedule_date);

-- 4. Phase 29: Customer Receipts, GST on Advances & Payment Allocation ------------
CREATE TABLE IF NOT EXISTS customer_payments (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                    TEXT NOT NULL DEFAULT 'comp_1',
  receipt_number                TEXT NOT NULL,
  customer_id                   TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  payment_date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method                TEXT NOT NULL DEFAULT 'NEFT' CHECK (payment_method IN ('CASH', 'CHEQUE', 'NEFT', 'RTGS', 'UPI', 'CREDIT_CARD', 'PAYMENT_GATEWAY')),
  reference_no                  TEXT,
  total_received_paise          BIGINT NOT NULL,
  allocated_amount_paise        BIGINT NOT NULL DEFAULT 0,
  unallocated_amount_paise      BIGINT NOT NULL DEFAULT 0,
  customer_tds_deducted_paise   BIGINT NOT NULL DEFAULT 0,
  bank_charges_deducted_paise   BIGINT NOT NULL DEFAULT 0,
  deposit_account_id            TEXT NOT NULL DEFAULT 'acc_1000',
  is_advance                    BOOLEAN NOT NULL DEFAULT FALSE,
  gst_on_advance_paise          BIGINT NOT NULL DEFAULT 0,
  journal_entry_id              TEXT REFERENCES journal_entries(id) ON DELETE SET NULL,
  status                        TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'VOIDED')),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, receipt_number)
);
CREATE INDEX IF NOT EXISTS idx_customer_payments_comp ON customer_payments (company_id, customer_id);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id            UUID NOT NULL REFERENCES customer_payments(id) ON DELETE CASCADE,
  invoice_id            TEXT NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  allocated_paise       BIGINT NOT NULL,
  customer_tds_paise    BIGINT NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_alloc_inv ON payment_allocations (payment_id, invoice_id);

-- 5. Phase 30: GST Credit Notes, Sales Returns & AI Dunning Workflows ---------------
CREATE TABLE IF NOT EXISTS credit_notes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                TEXT NOT NULL DEFAULT 'comp_1',
  credit_note_number        TEXT NOT NULL,
  original_invoice_id       TEXT REFERENCES invoices(id) ON DELETE RESTRICT,
  original_invoice_number   TEXT NOT NULL,
  customer_id               TEXT NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
  credit_note_date          DATE NOT NULL DEFAULT CURRENT_DATE,
  reason                    TEXT NOT NULL CHECK (reason IN ('SALES_RETURN', 'POST_SALE_DISCOUNT', 'DEFICIENCY_IN_SERVICE', 'INVOICE_CORRECTION', 'OTHER')),
  reason_description        TEXT,
  taxable_amount_paise      BIGINT NOT NULL DEFAULT 0,
  cgst_paise                BIGINT NOT NULL DEFAULT 0,
  sgst_paise                BIGINT NOT NULL DEFAULT 0,
  igst_paise                BIGINT NOT NULL DEFAULT 0,
  total_paise               BIGINT NOT NULL DEFAULT 0,
  restock_inventory         BOOLEAN NOT NULL DEFAULT FALSE,
  journal_entry_id          TEXT REFERENCES journal_entries(id) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'APPLIED', 'VOIDED')),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, credit_note_number)
);
CREATE INDEX IF NOT EXISTS idx_credit_notes_comp ON credit_notes (company_id, customer_id);

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id        UUID NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE,
  product_id            TEXT REFERENCES products_and_services(id) ON DELETE SET NULL,
  description           TEXT NOT NULL,
  quantity              NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_price_paise      BIGINT NOT NULL DEFAULT 0,
  hsn_sac               TEXT,
  tax_rate_bp           INT NOT NULL DEFAULT 1800,
  tax_amount_paise      BIGINT NOT NULL DEFAULT 0,
  total_amount_paise    BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_credit_note_lines_cn ON credit_note_lines (credit_note_id);

CREATE TABLE IF NOT EXISTS dunning_notices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            TEXT NOT NULL DEFAULT 'comp_1',
  invoice_id            TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  customer_id           TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  notice_level          TEXT NOT NULL CHECK (notice_level IN ('GENTLE_REMINDER', 'FIRM_REMINDER', 'FINAL_LEGAL_NOTICE')),
  days_overdue          INT NOT NULL,
  balance_due_paise     BIGINT NOT NULL,
  message_body          TEXT NOT NULL,
  sent_channel          TEXT NOT NULL DEFAULT 'EMAIL' CHECK (sent_channel IN ('EMAIL', 'WHATSAPP', 'SMS')),
  sent_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dunning_notices_comp ON dunning_notices (company_id, invoice_id);
