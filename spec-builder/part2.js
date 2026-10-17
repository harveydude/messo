// D:\quickbook\quickbook-app\spec-builder\part2.js
export function getPart2() {
  return `---

## §B4. Core Chart of Accounts & General Ledger DDL

The foundational general ledger consists of three primary tables: \`chart_of_accounts\`, \`journal_entries\`, and \`journal_entry_lines\`, governed by database-enforced integrity triggers.

\`\`\`sql
-- 1. CHART OF ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    statement_group TEXT NOT NULL CHECK (statement_group IN ('BALANCE_SHEET', 'PROFIT_AND_LOSS')),
    account_type TEXT NOT NULL CHECK (account_type IN (
        'ASSET', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'FIXED_ASSET',
        'LIABILITY', 'ACCOUNTS_PAYABLE', 'CREDIT_CARD', 'TAX_PAYABLE',
        'EQUITY', 'INCOME', 'COGS', 'EXPENSE'
    )),
    sub_type TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    is_system_account BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    cached_balance_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_account_code UNIQUE (company_id, code)
);

CREATE INDEX idx_coa_company_type ON chart_of_accounts(company_id, account_type);
CREATE INDEX idx_coa_statement_group ON chart_of_accounts(company_id, statement_group);

-- 2. JOURNAL ENTRIES (HEADERS)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    entry_number TEXT NOT NULL,
    entry_date DATE NOT NULL,
    memo TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT 'MANUAL_JE' CHECK (source_type IN (
        'MANUAL_JE', 'INVOICE', 'PAYMENT', 'EXPENSE', 'BILL', 
        'BILL_PAYMENT', 'PAYROLL', 'BANK_FEED', 'BANK_DEPOSIT', 
        'CREDIT_MEMO', 'VENDOR_CREDIT', 'TRANSFER', 'INVENTORY_ADJUSTMENT'
    )),
    source_id TEXT,
    created_by TEXT NOT NULL DEFAULT 'System User',
    status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('DRAFT', 'POSTED', 'VOID', 'REVERSED')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_entry_number UNIQUE (company_id, entry_number)
);

CREATE INDEX idx_je_company_date ON journal_entries(company_id, entry_date DESC);
CREATE INDEX idx_je_source ON journal_entries(company_id, source_type, source_id);

-- 3. JOURNAL ENTRY LINES (POSTINGS)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
    contact_id TEXT,
    project_id TEXT,
    description TEXT,
    debit_paise BIGINT NOT NULL DEFAULT 0,
    credit_paise BIGINT NOT NULL DEFAULT 0,
    is_reconciled BOOLEAN NOT NULL DEFAULT FALSE,
    reconciliation_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_positive_lines CHECK (debit_paise >= 0 AND credit_paise >= 0),
    CONSTRAINT chk_non_zero_line CHECK (debit_paise > 0 OR credit_paise > 0),
    CONSTRAINT chk_single_side CHECK (
        (debit_paise > 0 AND credit_paise = 0) OR 
        (credit_paise > 0 AND debit_paise = 0)
    )
);

CREATE INDEX idx_jel_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX idx_jel_account ON journal_entry_lines(account_id);
CREATE INDEX idx_jel_contact ON journal_entry_lines(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_jel_reconciled ON journal_entry_lines(account_id, is_reconciled);

-- 4. DATABASE-LEVEL DOUBLE-ENTRY BALANCE ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION fn_enforce_journal_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    v_total_debit BIGINT;
    v_total_credit BIGINT;
    v_entry_status TEXT;
BEGIN
    SELECT status INTO v_entry_status FROM journal_entries WHERE id = NEW.journal_entry_id;
    
    -- Only enforce zero-balance on POSTED transactions
    IF v_entry_status = 'POSTED' THEN
        SELECT COALESCE(SUM(debit_paise), 0), COALESCE(SUM(credit_paise), 0)
        INTO v_total_debit, v_total_credit
        FROM journal_entry_lines
        WHERE journal_entry_id = NEW.journal_entry_id;

        IF v_total_debit <> v_total_credit THEN
            RAISE EXCEPTION 'Double-entry balance violation in journal entry %: Debits (%) <> Credits (%)',
                NEW.journal_entry_id, v_total_debit, v_total_credit
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_enforce_journal_balance
AFTER INSERT OR UPDATE ON journal_entry_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION fn_enforce_journal_entry_balance();

-- 5. IMMUTABILITY ENFORCEMENT TRIGGER (NO UPDATE/DELETE ON POSTED ENTRIES)
CREATE OR REPLACE FUNCTION fn_prevent_posted_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'POSTED' THEN
        RAISE EXCEPTION 'Immutable Ledger Violation: Cannot modify or delete POSTED journal entry %', OLD.id
            USING ERRCODE = '23505';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_posted_je_mutation
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION fn_prevent_posted_mutation();
\`\`\`

---

## §B5. Sub-Ledgers DDL (Sales, Purchases, Banking, Catalog)

### 1. Contacts & CRM (Customers, Leads, Vendors)
\`\`\`sql
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    type TEXT NOT NULL CHECK (type IN ('CUSTOMER', 'LEAD', 'VENDOR', 'CONTRACTOR')),
    display_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    billing_address_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    billing_address TEXT,
    payment_terms TEXT NOT NULL DEFAULT 'Net 30',
    tax_id TEXT,
    gstin TEXT,
    pan TEXT,
    opening_balance_paise BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contacts_company_type ON contacts(company_id, type);
CREATE INDEX idx_contacts_name ON contacts(company_id, display_name);
\`\`\`

### 2. Products and Services Catalog (Inventory & Non-Inventory)
\`\`\`sql
CREATE TABLE IF NOT EXISTS products_and_services (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    name TEXT NOT NULL,
    sku TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL CHECK (type IN ('SERVICE', 'NON_INVENTORY', 'INVENTORY', 'BUNDLE')),
    description TEXT,
    sales_price_paise BIGINT NOT NULL DEFAULT 0,
    purchase_cost_paise BIGINT NOT NULL DEFAULT 0,
    quantity_on_hand NUMERIC(10, 2) NOT NULL DEFAULT 0,
    reorder_point NUMERIC(10, 2) NOT NULL DEFAULT 0,
    income_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    expense_or_cogs_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    inventory_asset_account_id TEXT REFERENCES chart_of_accounts(id),
    is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
    tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_company_sku ON products_and_services(company_id, sku);
\`\`\`

### 3. Invoices & Accounts Receivable Sub-Ledger
\`\`\`sql
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    doc_type TEXT NOT NULL DEFAULT 'INVOICE' CHECK (doc_type IN ('INVOICE', 'ESTIMATE')),
    invoice_number TEXT NOT NULL,
    customer_id TEXT NOT NULL REFERENCES contacts(id),
    project_id TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'
    )),
    subtotal_paise BIGINT NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'AMOUNT' CHECK (discount_type IN ('PERCENT', 'AMOUNT')),
    discount_paise BIGINT NOT NULL DEFAULT 0,
    tax_rate_id TEXT NOT NULL DEFAULT 'GST18',
    tax_paise BIGINT NOT NULL DEFAULT 0,
    total_paise BIGINT NOT NULL DEFAULT 0,
    amount_paid_paise BIGINT NOT NULL DEFAULT 0,
    balance_due_paise BIGINT NOT NULL DEFAULT 0,
    terms TEXT NOT NULL DEFAULT 'Net 30',
    notes TEXT,
    pdf_url TEXT,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_severity_level TEXT NOT NULL DEFAULT 'GENTLE' CHECK (reminder_severity_level IN ('GENTLE', 'FIRM', 'URGENT')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_invoice_num UNIQUE (company_id, invoice_number)
);

CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status_due ON invoices(company_id, status, due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_service_id TEXT REFERENCES products_and_services(id),
    product_name TEXT NOT NULL,
    description TEXT,
    qty NUMERIC(10, 2) NOT NULL DEFAULT 1,
    rate_paise BIGINT NOT NULL DEFAULT 0,
    amount_paise BIGINT NOT NULL DEFAULT 0,
    taxable BOOLEAN NOT NULL DEFAULT TRUE,
    hsn TEXT,
    tax_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 18.00
);

CREATE INDEX idx_invoice_items_inv ON invoice_items(invoice_id);
\`\`\`

### 4. Payments Received Sub-Ledger
\`\`\`sql
CREATE TABLE IF NOT EXISTS payments_received (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    customer_id TEXT NOT NULL REFERENCES contacts(id),
    payment_date DATE NOT NULL,
    deposit_to_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    amount_paise BIGINT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    reference_number TEXT,
    invoice_allocations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    unapplied_amount_paise BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_customer ON payments_received(customer_id);
\`\`\`

### 5. Bills & Accounts Payable Sub-Ledger
\`\`\`sql
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    bill_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL REFERENCES contacts(id),
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'SCHEDULED', 'PAID', 'OVERDUE', 'VOID')),
    amount_paise BIGINT NOT NULL,
    open_balance_paise BIGINT NOT NULL,
    scheduled_payment_date DATE,
    receipt_attachment_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bills_vendor ON bills(vendor_id);
CREATE INDEX idx_bills_status_due ON bills(company_id, status, due_date);
\`\`\`

### 6. Expenses & Banking Sub-Ledgers
\`\`\`sql
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    expense_number TEXT,
    payee_name TEXT NOT NULL,
    payment_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    payment_date DATE NOT NULL,
    payment_method TEXT,
    ref_no TEXT,
    memo TEXT,
    total_paise BIGINT NOT NULL,
    category TEXT,
    receipt_attachment_url TEXT,
    ai_extracted_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_connections (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    chart_of_account_id TEXT NOT NULL REFERENCES chart_of_accounts(id),
    institution_name TEXT NOT NULL,
    masked_account_number TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'CHECKING' CHECK (account_type IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD')),
    bank_balance_paise BIGINT NOT NULL DEFAULT 0,
    in_books_balance_paise BIGINT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    bank_connection_id TEXT REFERENCES bank_connections(id),
    account_code TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    payee TEXT,
    spent_paise BIGINT DEFAULT 0,
    received_paise BIGINT DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'FOR_REVIEW' CHECK (status IN ('FOR_REVIEW', 'MATCHED', 'CATEGORIZED', 'EXCLUDED')),
    match_status TEXT,
    match_detail TEXT,
    action TEXT NOT NULL DEFAULT 'Add',
    ai_suggested_account_id TEXT,
    ai_matched_journal_entry_id TEXT,
    ai_confidence_score NUMERIC(4, 2),
    attachment_url TEXT,
    linked_journal_entry_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_txns_status ON bank_transactions(account_code, status);
\`\`\`

---

## §B6. Supporting Schemas DDL

\`\`\`sql
-- 1. COMPANIES & TENANTS
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    legal_name TEXT,
    logo_url TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    industry TEXT DEFAULT 'Landscaping & Design',
    address_json JSONB DEFAULT '{}'::jsonb,
    legal_address_json JSONB DEFAULT '{}'::jsonb,
    tax_id_type TEXT DEFAULT 'PAN',
    tax_id_number TEXT DEFAULT 'AABCC1234F',
    business_type TEXT DEFAULT 'Private Limited',
    accounting_method TEXT DEFAULT 'ACCRUAL' NOT NULL CHECK (accounting_method IN ('ACCRUAL', 'CASH')),
    multicurrency_enabled BOOLEAN DEFAULT FALSE,
    home_currency TEXT DEFAULT 'INR' NOT NULL,
    subscription_tier TEXT DEFAULT 'PLUS' NOT NULL,
    sales_settings_json JSONB DEFAULT '{"deliveryMethod":"Email","customTxnNums":false,"serviceDate":true,"discount":true}'::jsonb,
    expense_settings_json JSONB DEFAULT '{"trackExpensesByCustomer":true}'::jsonb,
    timesheet_settings_json JSONB DEFAULT '{"firstDayOfWeek":"Monday","billableTime":true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS & PREFERENCES
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'ADMIN' NOT NULL CHECK (role IN ('ADMIN', 'STANDARD', 'TIME_TRACKING_ONLY', 'ACCOUNTANT')),
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    ui_preferences_json JSONB DEFAULT '{"privacy_mode_enabled":false,"pinned_apps":["bank_transactions","expense_transactions","sales_transactions"]}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. CRYPTOGRAPHIC TAMPER-EVIDENT AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp_1',
    user_id TEXT REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'AUTH', 'FEEDBACK', 'REVERSAL')),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    event_summary TEXT,
    timezone_label TEXT DEFAULT 'IST',
    before_json JSONB,
    after_json JSONB,
    previous_hash TEXT NOT NULL DEFAULT 'GENESIS_BLOCK_0000000000000000',
    entry_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_chain ON audit_logs(company_id, created_at ASC);

-- 4. IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    response_code INTEGER,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_idemp_expires ON idempotency_keys(expires_at);

-- 5. DASHBOARD LAYOUT PERSISTENCE & BOOKMARKS
CREATE TABLE IF NOT EXISTS user_bookmarks (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INTEGER DEFAULT 0
);
\`\`\`
`;
}
