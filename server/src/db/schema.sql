-- ============================================================================
-- MASTER ACCOUNTING & ERP POSTGRESQL SCHEMA (QUICKBOOKS ONLINE 2026 SPECIFICATION)
-- High-speed continuous accounting, strict double-entry invariant, Indian GST localization
-- ============================================================================

-- A. COMPANY, SETTINGS, USERS & AUDIT
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
    accounting_method TEXT DEFAULT 'ACCRUAL' NOT NULL, -- 'ACCRUAL' or 'CASH'
    multicurrency_enabled BOOLEAN DEFAULT FALSE,
    home_currency TEXT DEFAULT 'INR' NOT NULL,
    subscription_tier TEXT DEFAULT 'PLUS' NOT NULL, -- 'SIMPLE_START', 'ESSENTIALS', 'PLUS', 'ADVANCED'
    sales_settings_json JSONB DEFAULT '{"deliveryMethod":"Email","customTxnNums":false,"serviceDate":true,"discount":true}'::jsonb,
    expense_settings_json JSONB DEFAULT '{"trackExpensesByCustomer":true}'::jsonb,
    timesheet_settings_json JSONB DEFAULT '{"firstDayOfWeek":"Monday","billableTime":true}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'ADMIN' NOT NULL, -- 'ADMIN', 'STANDARD', 'TIME_TRACKING_ONLY', 'ACCOUNTANT'
    status TEXT DEFAULT 'ACTIVE' NOT NULL,
    ui_preferences_json JSONB DEFAULT '{"privacy_mode_enabled":false,"pinned_apps":["bank_transactions","expense_transactions","sales_transactions"]}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    user_id TEXT,
    action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- 'INVOICE', 'EXPENSE', 'BILL', 'PAYMENT', 'JOURNAL_ENTRY', 'CONTACT', 'SETTING'
    entity_id TEXT NOT NULL,
    before_json JSONB,
    after_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- B. ACCOUNTING CORE & CHART OF ACCOUNTS
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    statement_group TEXT NOT NULL, -- 'BALANCE_SHEET', 'PROFIT_AND_LOSS'
    account_type TEXT NOT NULL, -- 'ASSET', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'FIXED_ASSET', 'LIABILITY', 'ACCOUNTS_PAYABLE', 'CREDIT_CARD', 'TAX_PAYABLE', 'EQUITY', 'INCOME', 'COGS', 'EXPENSE'
    sub_type TEXT,
    currency TEXT DEFAULT 'INR' NOT NULL,
    is_system_account BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    cached_balance_paise BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Backwards compatibility alias view for accounts
CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    sub_type TEXT,
    balance_paise BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    entry_number TEXT NOT NULL UNIQUE,
    entry_date DATE NOT NULL,
    memo TEXT DEFAULT '',
    source_type TEXT DEFAULT 'MANUAL_JE' NOT NULL, -- 'MANUAL_JE', 'INVOICE', 'PAYMENT', 'EXPENSE', 'BILL', 'BILL_PAYMENT', 'PAYROLL', 'BANK_FEED'
    source_id TEXT,
    created_by TEXT DEFAULT 'Craig Carlson',
    status TEXT DEFAULT 'POSTED' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id TEXT PRIMARY KEY,
    journal_entry_id TEXT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    contact_id TEXT,
    project_id TEXT,
    description TEXT,
    debit_paise BIGINT DEFAULT 0 NOT NULL,
    credit_paise BIGINT DEFAULT 0 NOT NULL,
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciliation_id TEXT,
    CONSTRAINT balance_positive CHECK (debit_paise >= 0 AND credit_paise >= 0)
);

-- C. CRM & CATALOG (Customers, Leads, Vendors, Products)
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    type TEXT DEFAULT 'CUSTOMER' NOT NULL, -- 'CUSTOMER', 'LEAD', 'VENDOR', 'CONTRACTOR'
    display_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    billing_address_json JSONB DEFAULT '{}'::jsonb,
    billing_address TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    tax_id TEXT,
    gstin TEXT,
    pan TEXT,
    opening_balance_paise BIGINT DEFAULT 0 NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    billing_address TEXT,
    gstin TEXT,
    pan TEXT,
    terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    pan TEXT,
    track_1099 BOOLEAN DEFAULT FALSE,
    open_balance_paise BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products_and_services (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    type TEXT DEFAULT 'SERVICE' NOT NULL, -- 'SERVICE', 'NON_INVENTORY', 'INVENTORY'
    description TEXT,
    sales_price_paise BIGINT DEFAULT 0 NOT NULL,
    purchase_cost_paise BIGINT DEFAULT 0 NOT NULL,
    quantity_on_hand NUMERIC(10, 2) DEFAULT 0,
    reorder_point NUMERIC(10, 2) DEFAULT 0,
    income_account_id TEXT DEFAULT 'acc_4000',
    expense_or_cogs_account_id TEXT DEFAULT 'acc_5000',
    inventory_asset_account_id TEXT DEFAULT 'acc_1200',
    is_taxable BOOLEAN DEFAULT TRUE,
    tax_rate_pct NUMERIC(5, 2) DEFAULT 18.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- D. SALES & ACCOUNTS RECEIVABLE
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    doc_type TEXT DEFAULT 'INVOICE' NOT NULL, -- 'INVOICE', 'ESTIMATE'
    invoice_number TEXT NOT NULL UNIQUE,
    customer_id TEXT NOT NULL,
    project_id TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'DRAFT' NOT NULL, -- 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID'
    subtotal_paise BIGINT NOT NULL,
    discount_type TEXT DEFAULT 'AMOUNT',
    discount_paise BIGINT DEFAULT 0 NOT NULL,
    tax_rate_id TEXT DEFAULT 'GST18',
    tax_paise BIGINT DEFAULT 0 NOT NULL,
    total_paise BIGINT NOT NULL,
    amount_paid_paise BIGINT DEFAULT 0 NOT NULL,
    balance_due_paise BIGINT NOT NULL,
    terms TEXT DEFAULT 'Net 30',
    notes TEXT,
    pdf_url TEXT,
    last_reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_severity_level TEXT DEFAULT 'GENTLE', -- 'GENTLE', 'FIRM', 'URGENT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_service_id TEXT,
    product_name TEXT NOT NULL,
    description TEXT,
    qty NUMERIC(10, 2) DEFAULT 1 NOT NULL,
    rate_paise BIGINT NOT NULL,
    amount_paise BIGINT NOT NULL,
    taxable BOOLEAN DEFAULT TRUE,
    hsn TEXT,
    tax_rate_pct NUMERIC(5, 2) DEFAULT 18.00
);

CREATE TABLE IF NOT EXISTS payments_received (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    customer_id TEXT NOT NULL,
    payment_date DATE NOT NULL,
    deposit_to_account_id TEXT DEFAULT 'acc_1010' NOT NULL,
    amount_paise BIGINT NOT NULL,
    payment_method TEXT DEFAULT 'Bank Transfer',
    reference_number TEXT,
    invoice_allocations_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- E. PURCHASES, EXPENSES & ACCOUNTS PAYABLE
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    bill_number TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'UNPAID' NOT NULL, -- 'UNPAID', 'SCHEDULED', 'PAID', 'OVERDUE'
    amount_paise BIGINT NOT NULL,
    open_balance_paise BIGINT NOT NULL,
    scheduled_payment_date DATE,
    receipt_attachment_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    expense_number TEXT,
    payee_name TEXT NOT NULL,
    payment_account_id TEXT DEFAULT 'acc_1010' NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    ref_no TEXT,
    memo TEXT,
    total_paise BIGINT NOT NULL,
    category TEXT,
    receipt_attachment_url TEXT,
    ai_extracted_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_bill_lines (
    id TEXT PRIMARY KEY,
    expense_bill_id TEXT NOT NULL,
    category_account_id TEXT NOT NULL,
    product_service_id TEXT,
    project_id TEXT,
    description TEXT,
    amount_paise BIGINT NOT NULL
);

-- F. BANKING & BANK CONNECTIONS
CREATE TABLE IF NOT EXISTS bank_connections (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    chart_of_account_id TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    masked_account_number TEXT NOT NULL,
    account_type TEXT DEFAULT 'CHECKING' NOT NULL, -- 'CHECKING', 'SAVINGS', 'CREDIT_CARD'
    bank_balance_paise BIGINT DEFAULT 0 NOT NULL,
    in_books_balance_paise BIGINT DEFAULT 0 NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    bank_connection_id TEXT,
    account_code TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    payee TEXT,
    spent_paise BIGINT DEFAULT 0,
    received_paise BIGINT DEFAULT 0,
    status TEXT DEFAULT 'FOR_REVIEW' NOT NULL, -- 'FOR_REVIEW', 'MATCHED', 'CATEGORIZED', 'EXCLUDED'
    match_status TEXT,
    match_detail TEXT,
    action TEXT DEFAULT 'Add',
    ai_suggested_account_id TEXT,
    ai_matched_journal_entry_id TEXT,
    ai_confidence_score NUMERIC(4, 2),
    attachment_url TEXT,
    linked_journal_entry_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    rule_type TEXT DEFAULT 'BANK_RULE' NOT NULL, -- 'BANK_RULE', 'RECURRING_INVOICE', 'RECURRING_EXPENSE', 'RECURRING_BILL'
    name TEXT NOT NULL,
    apply_to TEXT DEFAULT 'Money out' NOT NULL,
    condition_field TEXT NOT NULL,
    condition_op TEXT NOT NULL,
    condition_val TEXT NOT NULL,
    action_type TEXT DEFAULT 'Assign',
    category_id TEXT,
    payee TEXT,
    auto_post BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_reconciliations (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    account_id TEXT NOT NULL,
    statement_ending_date DATE NOT NULL,
    statement_ending_balance_paise BIGINT NOT NULL,
    cleared_balance_paise BIGINT NOT NULL,
    difference_paise BIGINT DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS' NOT NULL, -- 'IN_PROGRESS', 'COMPLETED'
    completed_at TIMESTAMP WITH TIME ZONE
);

-- G. OPERATIONS (Mileage, Time, Projects, Payroll, Budgets, AI Feed)
CREATE TABLE IF NOT EXISTS mileage_logs (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    user_id TEXT,
    trip_date DATE NOT NULL,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    distance_km NUMERIC(8, 2) NOT NULL,
    rate_per_km_paise BIGINT DEFAULT 1200 NOT NULL, -- ₹12.00 per km
    calculated_deduction_paise BIGINT NOT NULL,
    purpose TEXT NOT NULL,
    vehicle_name TEXT DEFAULT 'Company Utility Truck',
    is_business BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    customer_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'IN_PROGRESS' NOT NULL, -- 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD'
    budget_paise BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    project_id TEXT,
    user_id TEXT,
    work_date DATE NOT NULL,
    hours NUMERIC(6, 2) NOT NULL,
    hourly_rate_paise BIGINT DEFAULT 0 NOT NULL,
    billable BOOLEAN DEFAULT TRUE,
    invoiced BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'Field Technician',
    compensation_type TEXT DEFAULT 'SALARY' NOT NULL, -- 'SALARY', 'HOURLY'
    pay_rate_paise BIGINT NOT NULL,
    bank_routing TEXT,
    bank_account_masked TEXT,
    tax_withholding_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    total_gross_paise BIGINT NOT NULL,
    total_taxes_paise BIGINT NOT NULL,
    total_net_paise BIGINT NOT NULL,
    status TEXT DEFAULT 'PROCESSED' NOT NULL, -- 'DRAFT', 'PROCESSED'
    journal_entry_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    fiscal_year TEXT NOT NULL,
    name TEXT NOT NULL,
    monthly_allocations_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_business_feed_items (
    id TEXT PRIMARY KEY,
    company_id TEXT DEFAULT 'comp_1',
    category TEXT NOT NULL, -- 'OVERDUE_INVOICE', 'UNCATEGORIZED_TXN', 'CASH_FLOW_ALERT', 'BILL_DUE', 'ANOMALY'
    title TEXT NOT NULL,
    summary_text TEXT NOT NULL,
    action_label TEXT NOT NULL,
    action_payload_json JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'UNREAD' NOT NULL, -- 'UNREAD', 'DISMISSED', 'COMPLETED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_bookmarks (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT FALSE NOT NULL,
    sort_order INTEGER DEFAULT 0
);


-- ============================================================================
-- SECTION 4 MASTER ENTERPRISE TABLES & UNIFIED SCHEMAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  txn_type VARCHAR(64) NOT NULL,
  doc_number VARCHAR(64),
  txn_date DATE NOT NULL,
  due_date DATE,
  contact_id TEXT,
  project_id TEXT,
  primary_account_id TEXT,
  transfer_to_account_id TEXT,
  payment_method VARCHAR(64),
  payment_terms VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  print_status VARCHAR(32) DEFAULT 'NOT_SET',
  is_posting BOOLEAN NOT NULL DEFAULT TRUE,
  subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  discount_type VARCHAR(16) DEFAULT 'PERCENT',
  discount_value NUMERIC(15, 2) DEFAULT 0.00,
  discount_amount NUMERIC(15, 2) DEFAULT 0.00,
  tax_rate_percent NUMERIC(6, 3) DEFAULT 0.000,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  exchange_rate NUMERIC(15, 6) NOT NULL DEFAULT 1.000000,
  memo TEXT,
  customer_message TEXT,
  attachment_urls JSONB DEFAULT '[]'::jsonb,
  ai_extracted_metadata JSONB,
  last_reminder_sent_at TIMESTAMPTZ,
  created_by TEXT DEFAULT 'Craig Carlson',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transaction_lines (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  line_type VARCHAR(32) NOT NULL DEFAULT 'ITEM',
  product_service_id TEXT,
  account_id TEXT,
  linked_txn_id TEXT,
  description TEXT,
  quantity NUMERIC(15, 4) DEFAULT 1,
  rate NUMERIC(15, 4) DEFAULT 0.00,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
  is_billable BOOLEAN NOT NULL DEFAULT FALSE,
  customer_or_project_id TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products_services (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  item_type VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(64),
  category VARCHAR(128),
  sales_description TEXT,
  sales_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  purchase_description TEXT,
  purchase_cost NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  qty_on_hand NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  qty_committed NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  qty_on_order NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  reorder_point NUMERIC(15, 2) DEFAULT 0.00,
  income_account_id TEXT,
  expense_account_id TEXT,
  inventory_asset_account_id TEXT,
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_feed_transactions (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  bank_account_id TEXT NOT NULL,
  posted_date DATE NOT NULL,
  description TEXT NOT NULL,
  payee_name VARCHAR(255),
  amount NUMERIC(15, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'FOR_REVIEW',
  match_type VARCHAR(32) DEFAULT 'NONE',
  matched_transaction_id TEXT,
  suggested_category_account_id TEXT,
  suggested_contact_id TEXT,
  ai_confidence NUMERIC(4, 2) DEFAULT 0.00,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_rules_and_recurring (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  record_kind VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  direction VARCHAR(16) DEFAULT 'MONEY_OUT',
  bank_account_filter_id TEXT,
  conditions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  assign_txn_type VARCHAR(32) DEFAULT 'EXPENSE',
  assign_account_id TEXT,
  assign_contact_id TEXT,
  auto_confirm BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_cron VARCHAR(64),
  template_payload_json JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks_and_feed_items (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  item_type VARCHAR(32) NOT NULL,
  category VARCHAR(64),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  priority VARCHAR(16) DEFAULT 'MEDIUM',
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  action_label VARCHAR(64),
  action_route VARCHAR(255),
  linked_entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mileage_trips (
  id TEXT PRIMARY KEY,
  company_id TEXT DEFAULT 'comp_1',
  trip_date DATE NOT NULL,
  start_address VARCHAR(255) NOT NULL,
  end_address VARCHAR(255) NOT NULL,
  distance_miles NUMERIC(10, 2) NOT NULL,
  irs_rate_per_mile NUMERIC(6, 3) NOT NULL DEFAULT 0.670,
  deduction_amount NUMERIC(15, 2) NOT NULL,
  trip_purpose VARCHAR(255),
  purpose_type VARCHAR(16) NOT NULL DEFAULT 'BUSINESS',
  vehicle_name VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
