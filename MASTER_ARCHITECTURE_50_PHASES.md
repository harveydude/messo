# MASTER SYSTEM DIRECTIVE: 50-PHASE INDIAN CLOUD ERP ARCHITECTURE & AUTONOMOUS SELF-HEALING LOOP

## 1. ROLE & MISSION FOR ANTIGRAVITY
You are a Principal Distributed Systems Architect, Indian Chartered Accountant (FCA) Systems Specialist, and Autonomous Engineering Agent. 

Your mission is to:
1. Save this entire specification into the repository root as `MASTER_ARCHITECTURE_50_PHASES.md`.
2. Build an **Autonomous Self-Healing Execution Loop** (`scripts/autonomous-phase-runner.js` + `architecture-state.json`).
3. Execute the 50 Phases sequentially. For every phase:
   - **Step A (Build):** Write the database migrations, backend services, validation rules, and frontend UI wiring.
   - **Step B (Verify):** Run the automated verification gate for that phase plus all prior phases (regression check).
   - **Step C (Self-Heal Loop):** If ANY test, build step, or accounting invariant fails, automatically inspect the error trace, patch the code, and re-run Step B in a loop until `0 ERRORS` and `100% PASS` are achieved.
   - **Step D (Advance):** Only when `100% PASS` is verified, update `architecture-state.json` and advance to the next phase.

---

## 2. THREE NON-NEGOTIABLE ARCHITECTURAL PILLARS

### Pillar A: Universal Data Ingestion & Cross-Platform Translation Pipeline ("Upload Any Stack -> Meso DB -> Live UI")
Businesses and developers using any external stack (Tally Prime XML, Zoho Books CSV, Busy, Marg, Excel `.xlsx`, or SQL/JSON/CSV dumps from custom **Rust**, **Laravel**, **Django**, or **Node** databases) must be able to upload a single file and have it automatically ingested:
1. **Stage 1 — Raw File Quarantine & Checksum (`import_batches`):**
   - Compute SHA-256 file hash to prevent duplicate file imports.
   - Store original raw file metadata and parse rows into memory streams.
2. **Stage 2 — AI + Deterministic Schema Translator (`import_schema_mappings`):**
   - Automatically map foreign column names (e.g., Laravel `invoice_totals`, Rust `amount_paise`, Tally `VOUCHERNUMBER`/`LEDGERNAME`, Excel `Party Name`/`GST No`) into Meso's canonical PostgreSQL schema (`contacts`, `chart_of_accounts`, `products_services`, `transactions`, `transaction_lines`, `journal_entries`).
3. **Stage 3 — Sandbox Staging & Accounting Doctor (`import_staging_rows`):**
   - Validate every row BEFORE touching the live ledger:
     - Check double-entry balance ($\sum \text{Debits} = \sum \text{Credits}$).
     - Validate 15-digit Indian GSTIN checksum & 10-character PAN format.
     - Check historical tax rates against the transaction date.
     - If a legacy import is unbalanced or missing an account, place the difference into an isolated `Suspense / Migration Adjustment` account or flag it for 1-click AI auto-correction.
4. **Stage 4 — Atomic Promotion & Instant UI Hydration:**
   - Wrap promotion in a single PostgreSQL `BEGIN ... COMMIT` transaction into the Neon database.
   - Emit `qbo:data-mutated` so all React UI views (Dashboard widgets, Chart of Accounts, Invoices, Bills, Reports) display the imported data immediately without page reloads.

### Pillar B: Dynamic Company Policy & Jurisdictional Rules Engine (Domestic, SEZ, GIFT City IFSC, Historical Tax Versioning)
Every company logging in has a unique legal and accounting policy stored in `company_accounting_policies`:
1. **Jurisdiction & Tax Registration Modes:**
   - `REGULAR_DOMESTIC`: Standard GST (`CGST + SGST` for intra-state where `company.state_code == place_of_supply_state_code`; `IGST` for inter-state).
   - `COMPOSITION_SCHEME`: Flat turnover tax rate, blocks charging GST on sales, converts "Tax Invoice" UI into "Bill of Supply", and blocks Input Tax Credit (ITC) claims.
   - `SEZ_UNIT_OR_DEVELOPER`: Automatically treats supplies as Zero-Rated Inter-State (`IGST 0%` under LUT/Bond or `IGST with Refund`), tracks LUT expiry dates.
   - `GIFT_CITY_IFSC`: Special International Financial Services Centre rules:
     - Allows foreign functional currency (e.g., `USD` primary ledger with automated `INR` RBI reference rate parallel translation).
     - Tags transactions with IFSCA / SEZ zero-rated GST status.
     - Tracks Section 80LA Income Tax holiday periods and FEMA cross-border remittance tags.
   - `UNREGISTERED_EXEMPT`: Disables GST tax lines on sales invoices and treats all incoming GST on purchases as part of direct item cost.
2. **Effective-Dated Tax & Rule Versioning (Handling Old vs. New Updates):**
   - Never hardcode a single flat tax rate on an HSN/SAC code or TDS section.
   - Store all GST rates, TDS thresholds, and depreciation rates in `effective_dated_tax_schedules` (`hsn_or_section_code`, `rate_percent`, `effective_from_date`, `effective_to_date`).
   - When a user imports a 2022 invoice or edits a past year's bill, the engine queries the rate active on `transaction.txn_date` so historical financial statements are never corrupted by new budget updates.

### Pillar C: Zero-Destructive Deletion & MCA Audit Trail Compliance (Rule 3(1))
Under Indian Ministry of Corporate Affairs (MCA) Rule 3(1) of the Companies (Accounts) Rules, accounting software must maintain a tamper-proof edit log and never allow destructive hard-deletion of posted financial records:
1. **Transaction Deletion Workflow:**
   - Clicking `Delete` or `Void` on any transaction **NEVER** executes a SQL `DELETE FROM transactions`.
   - Instead, it marks `status = 'VOIDED'` or `is_deleted = TRUE`, records `deleted_at`, `deleted_by`, and `deletion_reason`, writes an immutable SHA-256 chained record to `audit_logs`, and posts an automatic **Reversing Journal Entry** (swapping Debits and Credits) so the General Ledger balance adjusts cleanly with full historical traceability.
2. **File / Attachment Deletion Workflow:**
   - Deleting an uploaded receipt, bill PDF, or imported Excel file marks `attachments.status = 'ARCHIVED_DELETED'` and unlinks it from active UI views while retaining the cryptographic hash and audit log trail of who removed the file and when.

---

## 3. THE 50-PHASE MASTER ARCHITECTURE SPECIFICATION

### DOMAIN 1: MULTI-TENANT CORE, POLICIES, MCA AUDIT TRAIL & SAFE DELETION (PHASES 1–5)
- **Phase 1 — Multi-Tenant Isolation & RBAC Security:** Enforce strict `company_id` isolation across all 34+ tables; implement roles (`OWNER`, `CHARTERED_ACCOUNTANT`, `FINANCE_MANAGER`, `DATA_ENTRY`, `AUDITOR_READ_ONLY`).
- **Phase 2 — Company Accounting Policy Engine:** Build `company_accounting_policies` table & UI settings for Registration Type (`REGULAR`, `COMPOSITION`, `SEZ`, `GIFT_CITY_IFSC`, `UNREGISTERED`), Accounting Method (`ACCRUAL` vs `CASH`), Inventory Valuation (`FIFO` vs `WEIGHTED_AVERAGE`), and Books Closure / Lock Date.
- **Phase 3 — MCA Rule 3(1) Tamper-Evident Audit Trail:** Upgrade `audit_logs` with `previous_hash` and `current_hash` (SHA-256 chain) capturing `before_json`, `after_json`, IP address, user agent, and timestamp on every create, edit, void, or setting change.
- **Phase 4 — Non-Destructive File & Transaction Deletion Pipeline:** Replace all hard `DELETE` operations with soft-delete tombstones, mandatory `deletion_reason` prompts, attachment archival (`attachments` table), and automatic reversing journal entry generation.
- **Phase 5 — Fiscal Year Lock & Historical Effective-Date Engine:** Prevent unauthorized backdated edits prior to `books_closed_until_date`; require `Prior Period Adjustment` journal entries when modifying closed periods.

### DOMAIN 2: UNIVERSAL DATA INGESTION & CROSS-PLATFORM MIGRATION ENGINE (PHASES 6–10)
- **Phase 6 — Multi-Format Ingestion Gateway:** Build parsers for `.xlsx`, `.csv`, Tally `.xml`, JSON, and SQL/ORM table dumps (supporting Laravel snake_case, Rust/Prisma camelCase, and legacy ERP exports).
- **Phase 7 — AI + Heuristic Schema Discovery & Mapper:** Build `POST /api/import/analyze-schema` to auto-detect source columns, map them to Meso tables, and save reusable mapping templates per external software type.
- **Phase 8 — Staging Sandbox & Trial Balance Quarantine:** Create `import_batches` and `import_staging_rows`; run pre-flight validation checking debit/credit balance, date formats, duplicate document numbers, and missing ledger accounts.
- **Phase 9 — Master Data Deduplication & Auto-Creation:** Fuzzy-match imported Customer/Vendor names and GSTINs against existing `contacts`; auto-create missing Chart of Accounts categories with proper `statement_section` and `account_type`.
- **Phase 10 — Atomic Ledger Promotion & Rollback Pipeline:** Promote validated staging batches into live tables inside a single database transaction; provide a 1-click `Undo Import Batch` that cleanly reverses an entire batch if a user uploaded the wrong file.

### DOMAIN 3: CONTINUOUS DOUBLE-ENTRY GENERAL LEDGER & MULTI-CURRENCY (PHASES 11–15)
- **Phase 11 — Paise-Precision Double-Entry Core:** Enforce `BIGINT` minor-unit (paise) math across all journal lines so floating-point rounding errors are mathematically impossible ($\sum \text{Debits} - \sum \text{Credits} = 0$).
- **Phase 12 — Multi-Currency & GIFT City IFSC Functional Currency Engine:** Support transactions in any currency (`USD`, `EUR`, `GBP`, `AED`, `INR`) with daily exchange rate tables, automatic realized forex gain/loss on payment, and month-end unrealized forex revaluation entries.
- **Phase 13 — Continuous Sub-Ledger to GL Reconciliation Guard:** Background invariant checker ensuring `SUM(contacts.open_balance)` for Customers/Vendors always equals the exact `Chart of Accounts` balance of `Accounts Receivable` and `Accounts Payable`.
- **Phase 14 — Multi-GSTIN Branches, Cost Centers & Classes:** Allow a single company PAN to manage multiple state GSTIN branches and tag every transaction line with `branch_id`, `cost_center_id`, and `project_id`.
- **Phase 15 — Automated Year-End Close & Retained Earnings Roll-Forward:** Automate Indian Financial Year (`April 1` – `March 31`) closing entries into `Retained Earnings / Reserves & Surplus`.

### DOMAIN 4: INDIAN GST COMPLIANCE ENGINE (PHASES 16–20)
- **Phase 16 — Place of Supply (PoS) & Tax Determination Matrix:** Auto-compute `CGST + SGST` (intra-state), `IGST` (inter-state/imports), `UTGST` (Union Territories), `Zero-Rated LUT` (Exports/SEZ), and `IFSC Exempt` (GIFT City) based on supplier and recipient state/zone codes.
- **Phase 17 — Effective-Dated HSN/SAC & GST Rate Registry:** Maintain historical and current GST slabs (`0%`, `5%`, `12%`, `18%`, `28%` + Cess) with `effective_from` and `effective_to` dates so old and new transactions always use the legally accurate rate for their date.
- **Phase 18 — Input Tax Credit (ITC) Ledger, Blocked Credit & RCM Engine:** Separate Electronic Credit Ledger (`ITC CGST`, `ITC SGST`, `ITC IGST`), flag Section 17(5) blocked credits (e.g., food/beverages, motor vehicles) as non-claimable expense cost, and auto-post Reverse Charge Mechanism (RCM) liability + credit entries.
- **Phase 19 — E-Invoicing (IRN / QR) & E-Way Bill Engine:** Generate NIC-compliant E-Invoice JSON schemas, simulate/connect IRN hash & signed QR code generation, enforce the 24-hour e-invoice cancellation rule, and generate Part-A/Part-B E-Way Bills for goods movement above threshold.
- **Phase 20 — GSTR-1, GSTR-2B Match & GSTR-3B Auto-Filing Engine:** Dynamically compile B2B, B2CL, B2CS, CDNR, EXP, and HSN summary tables for GSTR-1, reconcile vendor bills against GSTR-2B, and compute net cash vs. ITC offset in GSTR-3B.

### DOMAIN 5: INDIAN DIRECT TAX — TDS, TCS & FIXED ASSETS (PHASES 21–25)
- **Phase 21 — PAN/Aadhaar Validator & Lower/Higher Deduction Certificates:** Validate vendor PAN structure (4th character entity status: `C`=Company, `P`=Individual/Firm, etc.), track Section 197 lower deduction certificates, and apply 20% higher TDS (Sec 206AA) if PAN is missing.
- **Phase 22 — Cumulative Threshold & Multi-Section TDS Engine:** Track single-bill and full-year cumulative thresholds across `194C` (Contractors: 1% Ind/HUF, 2% Others), `194J` (Professional/Technical: 10% / 2%), `194H` (Commission), `194I` (Rent), and `194Q` (Purchase of Goods).
- **Phase 23 — "Whichever is Earlier" TDS Trigger & TCS Engine:** Automatically deduct TDS on whichever happens first—Vendor Bill booking or Advance Payment—and calculate TCS (`206C(1H)`) where applicable.
- **Phase 24 — ITNS 281 Challan Settlement, Interest on Late TDS & Form 26Q:** Track monthly TDS due dates (7th of following month), calculate 1%/1.5% monthly interest on delayed deduction/payment, and export Form 26Q return data.
- **Phase 25 — Fixed Assets Register & Dual Depreciation Engine:** Calculate depreciation simultaneously under the **Companies Act, 2013** (useful life SLM/WDV for book P&L) and the **Income Tax Act, 1961** (Block of Assets >180 days / <180 days rules for tax computation).

### DOMAIN 6: ORDER-TO-CASH & REVENUE RECOGNITION (PHASES 26–30)
- **Phase 26 — Estimates, Quotes & Sales Orders Pipeline:** Full lifecycle state machine (`DRAFT` -> `SENT` -> `ACCEPTED` -> `CONVERTED_TO_INVOICE`) with inventory reservation (`qty_committed`).
- **Phase 27 — Multi-Template Tax Invoice, Bill of Supply & Export Invoice Builder:** Dynamic PDF & email generator adapting automatically to whether the company is Regular GST, Composition, SEZ, or GIFT City IFSC.
- **Phase 28 — Ind AS 115 / ASC 606 Automated Revenue Recognition:** Split multi-month subscription or milestone contracts into `Deferred / Unearned Revenue` liability and auto-post monthly revenue recognition journal entries.
- **Phase 29 — Customer Receipts, GST on Advances & Payment Allocation:** Handle partial payments, multi-invoice knock-offs, bank charges deducted by customers, and TDS deducted by customers (Customer TDS Receivable / Form 26AS credit tracking).
- **Phase 30 — GST Credit Notes, Sales Returns & AI Dunning Workflows:** Link Credit Notes to original Invoice numbers (for GSTR-1 CDNR compliance), restock returned inventory, and dispatch severity-graded AI overdue payment reminders.

### DOMAIN 7: PROCURE-TO-PAY, OCR & MSME COMPLIANCE (PHASES 31–35)
- **Phase 31 — Purchase Orders (PO) & 3-Way Matching Engine:** Match Purchase Order -> Goods Receipt -> Vendor Bill (`qty` and `rate` variance checks) before approving payment.
- **Phase 32 — AI Indian Invoice & Receipt OCR Pipeline:** Extract Vendor Name, GSTIN, Invoice Number, Date, HSN/SAC codes, taxable values, CGST/SGST/IGST splits, and suggested expense accounts from uploaded images/PDFs.
- **Phase 33 — Vendor Bills, Recurring Expenses & Approval Workflows:** Multi-tier bill approval routing based on amount thresholds before posting to Accounts Payable (`A/P`).
- **Phase 34 — MSME (Udyam) 45-Day Compliance Shield (Section 43B(h)):** Tag Micro and Small enterprise vendors with Udyam Registration numbers; highlight bills approaching 15/45 days in red so the business never loses Income Tax expense deductibility.
- **Phase 35 — Batch Bill Payouts, Vendor Credits & Debit Notes:** Generate bulk NEFT/RTGS/IMPS/UPI payout files and apply vendor debit notes against open payable balances.

### DOMAIN 8: INVENTORY, MANUFACTURING & PROJECT PROFITABILITY (PHASES 36–40)
- **Phase 36 — Continuous Inventory Valuation Engine (FIFO & Weighted Average):** Automatically recalculate COGS and closing stock value even when a user inserts or edits a backdated purchase bill or sales invoice.
- **Phase 37 — Batch/Serial Tracking, Reorder Alerts & Stock Adjustments:** Track item batches, expiry dates, reorder points, and post balanced shrinkage/revaluation adjustments.
- **Phase 38 — Bill of Materials (BOM), Assemblies & Job Work (ITC-04):** Track raw material consumption into finished goods and goods sent out/received back from job workers.
- **Phase 39 — Timesheets, Contractor Hours & Billable Expenses:** Convert approved team timesheets and billable vendor expenses directly into customer invoice line items.
- **Phase 40 — Live Project & Customer Profitability Matrix:** Real-time margin analysis (`Project Revenue - Direct Labor - Billable Expenses - Allocated Overhead`).

### DOMAIN 9: CONNECTED BANKING, RECONCILIATION & TREASURY (PHASES 41–45)
- **Phase 41 — Universal Indian Bank Statement & Feed Ingestor:** Parse bank statements (CSV/XLSX/PDF/AA feeds) from HDFC, ICICI, SBI, Axis, Kotak, and corporate credit cards with duplicate-transaction prevention.
- **Phase 42 — AI + Rule-Based Bank Categorization & Split Matching:** Match single bank debits/credits against multiple invoices or bills, auto-detect bank fees, and apply user-defined categorization rules.
- **Phase 43 — Undeposited Funds, Contra Transfers & Credit Card Settlement:** Full support for cash/cheque clearing accounts, bank-to-bank transfers, and credit card bill paydowns.
- **Phase 44 — Statement Reconciliation & Post-Reconciliation Tamper Lock:** Lock reconciled journal lines (`is_reconciled = TRUE`) and alert the user immediately if anyone attempts to void or alter a previously reconciled transaction.
- **Phase 45 — 12-Month Rolling Cash Flow & Working Capital Forecaster:** Combine historical burn rates, open A/R due dates, open A/P due dates, and recurring templates into live cash balance projections.

### DOMAIN 10: AI AUTONOMOUS ACCOUNTANT, PAYROLL, REPORTS & QA (PHASES 46–50)
- **Phase 46 — Indian Payroll & Compliance Engine:** Compute Basic, HRA, Allowances, EPF (12% Employer/Employee), ESI, state-wise Professional Tax (PT), and Section 192 salary TDS with automated payslip and journal entry generation.
- **Phase 47 — MCA Schedule III Financial Statements & CA Export Pack:** Generate Balance Sheet, Statement of Profit and Loss, Cash Flow Statement, Trial Balance, AR/AP Aging, and 1-click CA Audit Export (Excel/Tally XML/JSON).
- **Phase 48 — "Meso Assist" AI Accounting Error Doctor:** Proactively scan the ledger for accounting anomalies (e.g., inter-state vendor billed with CGST/SGST instead of IGST, missing TDS on a ₹50,000 professional fee bill, negative cash balance, uncategorized suspense entries) and surface 1-click fixes in the Business Feed.
- **Phase 49 — Natural Language Command Bar & Conversational CFO:** Parse complex queries (e.g., *"Show me unpaid MSME bills over 30 days"*, *"What is my net GST payable this month?"*) into live database queries and instant charts.
- **Phase 50 — Full-System Chaos Verification & Cloud Deployment Readiness:** Run a comprehensive end-to-end automated test suite verifying all 50 phases, multi-company isolation, universal imports, soft-deletes, GST/TDS edge cases, and production build integrity.
