// D:\quickbook\quickbook-app\spec-builder\part4.js
export function getPart4() {
  return `---

## §B11. Workflows W1–W16 End-to-End Implementation Guides

### W1: Authentication, Tenant Context & Security Resolution
1. **Extraction**: The middleware parses \`Authorization: Bearer <token>\` and \`X-Company-Id: comp_1\`.
2. **Context Binding**: Resolves \`userId\` and attaches tenant-scoped DB connection:
\`\`\`sql
SELECT u.id, u.role, u.company_id, c.subscription_tier, c.home_currency 
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.id = $1 AND u.company_id = $2;
\`\`\`
3. **RBAC Validation**: Evaluates user role against the route permission matrix.

---

### W4: Invoice Creation to Accounts Receivable (+Create Invoice)
1. **Form Submission**: Client posts invoice line items, customer ID, terms, and issue date.
2. **Tax Engine**: Calculates GST (18% standard, split into 9% CGST + 9% SGST for intra-state).
3. **Inventory Check**: For items with \`type = 'INVENTORY'\`, verify \`quantity_on_hand >= qty\`.
4. **Atomic General Ledger Posting**:
   * \`DEBIT\` **Accounts Receivable (1100)**: Total Invoice Amount (₹43,660.00)
   * \`CREDIT\` **Sales Revenue (4000 / 4010)**: Subtotal minus Discounts (₹37,000.00)
   * \`CREDIT\` **GST Output Payable (2100)**: Tax Amount (₹6,660.00)
   * *(If Inventory item)*:
     * \`DEBIT\` **Cost of Goods Sold (5000)**: Qty × Unit Cost
     * \`CREDIT\` **Inventory Asset (1200)**: Qty × Unit Cost
5. **Inventory Decrement**:
\`\`\`sql
UPDATE products_and_services 
SET quantity_on_hand = quantity_on_hand - $1 
WHERE id = $2 AND type = 'INVENTORY';
\`\`\`

---

### W5: Payment Receipt & Subledger Allocation (+Create Receive Payment)
1. **Input Payload**: \`customerId\`, \`amountPaise\`, \`paymentDate\`, \`depositToAccountId\` (\`acc_1010\` Checking or \`acc_1020\` Undeposited Funds).
2. **Atomic Ledger Posting**:
   * \`DEBIT\` **Undeposited Funds (1010) or Bank**: Payment Amount
   * \`CREDIT\` **Accounts Receivable (1100)**: Applied Payment Amount
3. **Subledger Invalidation**: Updates invoice records using the FIFO allocation engine:
\`\`\`sql
UPDATE invoices
SET balance_due_paise = balance_due_paise - $1,
    amount_paid_paise = amount_paid_paise + $1,
    status = CASE WHEN balance_due_paise - $1 <= 0 THEN 'PAID' ELSE 'PARTIALLY_PAID' END,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2;
\`\`\`

---

### W6: Bank Deposit (+Create Bank Deposit)
1. **Clearing Function**: Clears funds accumulated in \`Undeposited Funds\` into a physical bank checking/savings account.
2. **Atomic Ledger Posting**:
   * \`DEBIT\` **Checking Account (HDFC 1010)**: Total Deposited Amount
   * \`CREDIT\` **Undeposited Funds (1020)**: Total Deposited Amount
3. **Bank Balance Cache Sync**: Updates the \`in_books_balance_paise\` for the bank account.

---

### W7: Vendor Bill & Accounts Payable (+Create Bill)
1. **Form Submission**: Client posts vendor ID, bill number, category accounts, and due date.
2. **Atomic Ledger Posting**:
   * \`DEBIT\` **Expense / COGS Accounts (5000 / 6000)**: Line Item Amounts
   * \`DEBIT\` **GST Input Tax Credit (ITC 2110)**: Input Tax Paid
   * \`CREDIT\` **Accounts Payable (2000)**: Total Bill Amount
3. **AP Aging Allocation**: Bill is tagged with \`due_date\` for automatic bucket evaluation (Current, 1-7 days, 8-14 days, 15+ days).

---

### W9: Dashboard Business-at-a-Glance Snapshot Engine
The dashboard snapshot consolidates 6 financial cards into a single sub-20ms aggregate payload.

\`\`\`sql
-- Single-Flight Unified Dashboard Metric Aggregator
WITH pnl AS (
  SELECT
    COALESCE(SUM(CASE WHEN account_type = 'INCOME' THEN cached_balance_paise ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN account_type IN ('EXPENSE', 'COGS') THEN cached_balance_paise ELSE 0 END), 0) AS total_expense
  FROM chart_of_accounts
  WHERE company_id = $1 AND statement_group = 'PROFIT_AND_LOSS'
),
ap_aging AS (
  SELECT
    COALESCE(SUM(open_balance_paise), 0) AS total_ap,
    COALESCE(SUM(CASE WHEN CURRENT_DATE <= due_date THEN open_balance_paise ELSE 0 END), 0) AS current_ap,
    COALESCE(SUM(CASE WHEN CURRENT_DATE > due_date AND CURRENT_DATE <= due_date + INTERVAL '7 days' THEN open_balance_paise ELSE 0 END), 0) AS ap_1_7,
    COALESCE(SUM(CASE WHEN CURRENT_DATE > due_date + INTERVAL '7 days' AND CURRENT_DATE <= due_date + INTERVAL '14 days' THEN open_balance_paise ELSE 0 END), 0) AS ap_8_14,
    COALESCE(SUM(CASE WHEN CURRENT_DATE > due_date + INTERVAL '14 days' THEN open_balance_paise ELSE 0 END), 0) AS ap_15_plus
  FROM bills
  WHERE company_id = $1 AND status != 'PAID'
),
invoices_funnel AS (
  SELECT
    COALESCE(SUM(CASE WHEN status != 'PAID' THEN balance_due_paise ELSE 0 END), 0) AS unpaid_total,
    COALESCE(SUM(CASE WHEN status = 'PAID' THEN total_paise ELSE 0 END), 0) AS paid_total
  FROM invoices
  WHERE company_id = $1
)
SELECT 
  pnl.total_income,
  pnl.total_expense,
  (pnl.total_income - pnl.total_expense) AS net_profit,
  ap_aging.total_ap,
  ap_aging.current_ap,
  ap_aging.ap_1_7,
  ap_aging.ap_8_14,
  ap_aging.ap_15_plus,
  invoices_funnel.unpaid_total,
  invoices_funnel.paid_total
FROM pnl, ap_aging, invoices_funnel;
\`\`\`

---

### W10: Bank Feed Ingestion & Rule Categorization
1. **Sync Source**: External bank webhook (Plaid / Salt Edge / Yodlee) posts raw bank statement lines.
2. **Review State**: Imported lines sit in \`bank_transactions\` with \`status = 'FOR_REVIEW'\`.
3. **The "Bank Balance" vs "In Books" Variance**:
   * **Bank Balance**: The external institution's declared balance ($-3,621.93$).
   * **In Books Balance**: The balance of Account \`1010\` strictly posted to the General Ledger ($₹1,201.00$).
   * **The Delta**: Exactly accounts for the **25 unreviewed bank feed transactions** that have not yet been posted to the General Ledger!

---

### W13: The Complete 29 +Create Mega-Menu Transaction Dispatch Matrix

Every single transaction accessible via the \`+ Create\` Mega-Menu (4 Columns) executes an exact, atomic double-entry accounting pipeline:

| Col | # | Workflow Name | Endpoint & Type | Posting | Debit Account(s) | Credit Account(s) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cust** | 1 | **Invoice** | \`POST /api/transactions\` (\`INVOICE\`) | YES | Accounts Receivable (\`1100\`) | Sales Revenue (\`4000\`), Tax Payable (\`2100\`) |
| **Cust** | 2 | **Receive payment** | \`POST /api/transactions\` (\`RECEIVE_PAYMENT\`) | YES | Undeposited Funds / Bank (\`1010\`) | Accounts Receivable (\`1100\`) |
| **Cust** | 3 | **Estimate** | \`POST /api/transactions\` (\`ESTIMATE\`) | NO | *(Non-posting document - quote only)* | *(Non-posting document)* |
| **Cust** | 4 | **Credit memo** | \`POST /api/transactions\` (\`CREDIT_MEMO\`) | YES | Sales Returns / Revenue (\`4000\`) | Accounts Receivable (\`1100\`) |
| **Cust** | 5 | **Sales receipt** | \`POST /api/transactions\` (\`SALES_RECEIPT\`) | YES | Cash on Hand / Bank (\`1000\`/\`1010\`) | Sales Revenue (\`4000\`), Tax Payable (\`2100\`) |
| **Cust** | 6 | **Refund receipt** | \`POST /api/transactions\` (\`REFUND_RECEIPT\`) | YES | Sales Returns / Income (\`4000\`) | Bank / Cash (\`1010\`) |
| **Cust** | 7 | **Delayed credit** | \`POST /api/transactions\` (\`DELAYED_CREDIT\`) | NO | *(Non-posting draft credit)* | *(Non-posting draft credit)* |
| **Cust** | 8 | **Delayed charge** | \`POST /api/transactions\` (\`DELAYED_CHARGE\`) | NO | *(Non-posting billable charge)* | *(Non-posting billable charge)* |
| **Cust** | 9 | **Add customer** | \`POST /api/contacts\` | NO | *(Sub-ledger CRM entity creation)* | *(Optional opening balance equity)* |
| **Cust** | 10 | **Payment links** | \`POST /api/payments/links\` | NO | *(Generates payment token / link)* | *(Non-posting)* |
| **Cust** | 11 | **Send review request**| \`POST /api/customers/review-request\` | NO | *(Triggers customer SMS / email)* | *(Non-posting)* |
| **Vend** | 12 | **Expense** | \`POST /api/transactions\` (\`EXPENSE\`) | YES | Expense Category (\`6000\`), ITC (\`2110\`) | Bank Account / Credit Card (\`1010\`/\`1020\`) |
| **Vend** | 13 | **Check** | \`POST /api/transactions\` (\`CHECK\`) | YES | Expense Category or Vendor AP (\`2000\`) | Bank Checking Account (\`1010\`) |
| **Vend** | 14 | **Bill** | \`POST /api/transactions\` (\`BILL\`) | YES | Expense Category / Inventory (\`5000\`) | Accounts Payable (\`2000\`) |
| **Vend** | 15 | **Pay bills** | \`POST /api/transactions\` (\`PAY_BILLS\`) | YES | Accounts Payable (\`2000\`) | Bank Checking Account (\`1010\`) |
| **Vend** | 16 | **Purchase order** | \`POST /api/transactions\` (\`PURCHASE_ORDER\`) | NO | *(Non-posting procurement order)* | *(Non-posting procurement order)* |
| **Vend** | 17 | **Vendor credit** | \`POST /api/transactions\` (\`VENDOR_CREDIT\`) | YES | Accounts Payable (\`2000\`) | Expense Category / Inventory (\`5000\`) |
| **Vend** | 18 | **Credit card credit** | \`POST /api/transactions\` (\`CC_CREDIT\`) | YES | Credit Card Liability (\`1020\`) | Expense Category / Refund (\`6000\`) |
| **Vend** | 19 | **Print checks** | \`POST /api/banking/print-checks\` | NO | *(Check PDF batch compilation)* | *(Non-posting queue)* |
| **Vend** | 20 | **Add vendor** | \`POST /api/contacts\` | NO | *(Sub-ledger Vendor entity creation)*| *(Non-posting)* |
| **Team** | 21 | **Single time activity**| \`POST /api/operations/time-entries\` | NO | *(Logged in timesheet sub-ledger)* | *(Non-posting until billed/payrolled)*|
| **Team** | 22 | **Weekly timesheet** | \`POST /api/operations/timesheets\` | NO | *(Batch time entries grid)* | *(Non-posting)* |
| **Team** | 23 | **Add employee** | \`POST /api/operations/employees\` | NO | *(HR sub-ledger entity creation)* | *(Non-posting)* |
| **Other**| 24 | **Bank deposit** | \`POST /api/transactions\` (\`BANK_DEPOSIT\`) | YES | Bank Account (\`1010\`) | Undeposited Funds (\`1020\`) |
| **Other**| 25 | **Transfer** | \`POST /api/transactions\` (\`TRANSFER\`) | YES | Destination Bank / CC (\`1015\`) | Source Bank Account (\`1010\`) |
| **Other**| 26 | **Journal entry** | \`POST /api/transactions\` (\`JOURNAL_ENTRY\`) | YES | Explicit User Debits (\`acc_x\`) | Explicit User Credits (\`acc_y\`) |
| **Other**| 27 | **Statement** | \`POST /api/customers/statements\` | NO | *(Customer balance PDF compilation)* | *(Non-posting)* |
| **Other**| 28 | **Inventory qty adj** | \`POST /api/transactions\` (\`INVENTORY_ADJ\`)| YES | Inventory Shrinkage Expense (\`5020\`) | Inventory Asset Account (\`1200\`) |
| **Other**| 29 | **Pay down credit card**| \`POST /api/transactions\` (\`PAY_CC\`) | YES | Credit Card Account (\`1020\`) | Bank Checking Account (\`1010\`) |
`;
}
