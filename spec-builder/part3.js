// D:\quickbook\quickbook-app\spec-builder\part3.js
export function getPart3() {
  return `---

## §B7. The General Ledger Posting Engine & Atomic Pipelines

The General Ledger Posting Engine is the central processing kernel through which all posting transactions pass. It guarantees balance invariants, prevents race conditions, and synchronizes cached account balances atomically.

### 1. Atomic Posting Function Implementation (\`postJournalEntry\`)

\`\`\`javascript
/**
 * Atomic Journal Entry Posting Unit of Work
 * @param {import('pg').PoolClient} client - Dedicated PostgreSQL transaction client
 * @param {Object} entry - Validated journal entry payload
 */
export async function postJournalEntry(client, entry) {
  const {
    id,
    companyId = 'comp_1',
    entryNumber,
    entryDate,
    memo = '',
    sourceType = 'MANUAL_JE',
    sourceId = null,
    createdBy = 'System User',
    lines = []
  } = entry;

  // 1. Invariant Validation: Line Count & Balancing
  if (!lines || lines.length < 2) {
    throw new Error('LEDGER_VALIDATION_ERROR: A journal entry must contain at least two posting lines.');
  }

  let totalDebits = 0n;
  let totalCredits = 0n;
  const affectedAccountIds = new Set();

  for (const line of lines) {
    const debit = BigInt(line.debitPaise || 0);
    const credit = BigInt(line.creditPaise || 0);

    if (debit < 0n || credit < 0n) {
      throw new Error('LEDGER_VALIDATION_ERROR: Debits and credits must be non-negative integers.');
    }
    if (debit > 0n && credit > 0n) {
      throw new Error('LEDGER_VALIDATION_ERROR: A line cannot contain both a debit and a credit.');
    }
    if (debit === 0n && credit === 0n) {
      throw new Error('LEDGER_VALIDATION_ERROR: A line must contain a non-zero debit or credit.');
    }

    totalDebits += debit;
    totalCredits += credit;
    affectedAccountIds.add(line.accountId);
  }

  if (totalDebits !== totalCredits) {
    throw new Error(
      \`LEDGER_UNBALANCED_ERROR: Debits (\${totalDebits}) do not equal Credits (\${totalCredits}). Delta: \${totalDebits - totalCredits} paise.\`
    );
  }

  // 2. Deadlock Prevention Protocol: Lock Affected Accounts in Ascending Numerical Order
  const sortedAccountIds = Array.from(affectedAccountIds).sort();
  await client.query(
    \`SELECT id, account_type FROM chart_of_accounts 
     WHERE id = ANY($1) 
     ORDER BY id ASC 
     FOR UPDATE\`,
    [sortedAccountIds]
  );

  // 3. Insert Header Record
  await client.query(
    \`INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'POSTED')\`,
    [id, companyId, entryNumber, entryDate, memo, sourceType, sourceId, createdBy]
  );

  // 4. Batch Insert Lines
  for (const line of lines) {
    await client.query(
      \`INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, contact_id, project_id, description, debit_paise, credit_paise)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\`,
      [
        line.id || \`jel_\${crypto.randomUUID()}\`,
        id,
        line.accountId,
        line.contactId || null,
        line.projectId || null,
        line.description || '',
        Number(line.debitPaise || 0),
        Number(line.creditPaise || 0)
      ]
    );

    // 5. Atomic Cached Balance Delta Update
    // Debit-normal: +Debit, -Credit. Credit-normal: +Credit, -Debit.
    await client.query(
      \`UPDATE chart_of_accounts
       SET cached_balance_paise = cached_balance_paise + (
         CASE 
           WHEN account_type IN ('ASSET', 'BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'FIXED_ASSET', 'COGS', 'EXPENSE')
           THEN ($1::bigint - $2::bigint)
           ELSE ($2::bigint - $1::bigint)
         END
       ),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = $3\`,
      [Number(line.debitPaise || 0), Number(line.creditPaise || 0), line.accountId]
    );
  }

  return { success: true, entryId: id, totalAmountPaise: totalDebits };
}
\`\`\`

---

## §B8. Payment Allocation & Subledger Reconciliation Engine

When a customer submits a lump-sum payment or a partial remittance, the Payment Allocation Engine applies funds across open invoices using standard accounting priority rules.

### 1. FIFO Invoice Allocation Algorithm

\`\`\`javascript
/**
 * FIFO Payment Allocator for Accounts Receivable
 * @param {Array<Object>} openInvoices - List of unpaid invoices ordered by due_date ASC
 * @param {bigint} paymentAmountPaise - Available unapplied payment amount in paise
 */
export function allocatePaymentFIFO(openInvoices, paymentAmountPaise) {
  let remainingFunds = paymentAmountPaise;
  const allocations = [];

  for (const inv of openInvoices) {
    if (remainingFunds <= 0n) break;

    const balanceDue = BigInt(inv.balance_due_paise);
    if (balanceDue <= 0n) continue;

    let appliedAmount = 0n;
    let newStatus = 'PARTIALLY_PAID';

    if (remainingFunds >= balanceDue) {
      appliedAmount = balanceDue;
      remainingFunds -= balanceDue;
      newStatus = 'PAID';
    } else {
      appliedAmount = remainingFunds;
      remainingFunds = 0n;
      newStatus = 'PARTIALLY_PAID';
    }

    allocations.push({
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      appliedAmountPaise: appliedAmount,
      newBalanceDuePaise: balanceDue - appliedAmount,
      status: newStatus
    });
  }

  return {
    allocations,
    unappliedCreditPaise: remainingFunds // Remainder held in Customer Prepayments
  };
}
\`\`\`

---

## §B9. RESTful API Design Standards & Error Conventions

All API endpoints strictly follow **RFC 7807 (Problem Details for HTTP APIs)** and use predictable HTTP status codes.

### 1. Standard Request Headers
* \`X-Company-Id\` (Required): Identifies the active tenant organization (e.g. \`comp_1\`).
* \`Idempotency-Key\` (Required for mutating calls): UUIDv4 string to prevent duplicate execution.
* \`Authorization\` (Required): Bearer JWT session token.
* \`X-Request-Id\` (Optional/Injected): Distributed tracing correlation ID.

### 2. Standard RFC 7807 Error Response Schema
\`\`\`json
{
  "type": "https://api.meso.in/errors/ledger-unbalanced-transaction",
  "title": "Unbalanced Journal Entry",
  "status": 422,
  "code": "LEDGER_UNBALANCED_TRANSACTION",
  "detail": "Debits (₹83,470.00) do not equal Credits (₹81,470.00). Delta of ₹2,000.00 detected.",
  "instance": "/api/transactions/txn_89283419",
  "invalid_params": [
    {
      "name": "lines",
      "reason": "Sum of debits must balance with sum of credits"
    }
  ]
}
\`\`\`

---

## §B10. Comprehensive API Surface Table & Latency Budgets

| Method | Endpoint Path | Controller / Service | Cache Strategy | Target p50 / p95 | Frontend Binding (SPEC.md) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| \`GET\` | \`/api/dashboard/business-at-a-glance\` | \`dashboardController.getMetrics\` | Redis 60s (Stale-While-Reval) | **4ms / 18ms** | §13–§16 Edit Grid & Master Cards |
| \`POST\` | \`/api/dashboard/feedback/layout-customization\` | \`dashboardController.postFeedback\` | No Cache (Audit Write) | **12ms / 25ms** | §13.3 Feedback Banner (Thumbs Up/Down) |
| \`POST\` | \`/api/transactions\` | \`transactionsController.processTxn\` | Cache Eviction (Dashboard/GL) | **16ms / 35ms** | QuickCreate Mega-Menu (29 Workflows) |
| \`GET\` | \`/api/invoices\` | \`invoicesController.listInvoices\` | Redis 30s | **8ms / 22ms** | Sales & Invoices List View |
| \`POST\` | \`/api/invoices\` | \`invoicesController.createInvoice\` | Cache Eviction (AR, Metrics) | **15ms / 32ms** | Customer Column: +Invoice Modal |
| \`GET\` | \`/api/invoices/:id\` | \`invoicesController.getInvoiceById\` | Redis 120s | **3ms / 10ms** | Invoice Detail & PDF Preview |
| \`POST\` | \`/api/customers/receive-payment\` | \`paymentsController.receivePayment\` | Cache Eviction (AR, Cash) | **18ms / 38ms** | Customer Column: +Receive Payment |
| \`GET\` | \`/api/bills\` | \`billsController.listBills\` | Redis 30s | **8ms / 20ms** | Vendors & Expenses List View |
| \`POST\` | \`/api/bills\` | \`billsController.createBill\` | Cache Eviction (AP, Metrics) | **15ms / 32ms** | Vendor Column: +Bill Modal |
| \`GET\` | \`/api/banking/accounts\` | \`bankingController.getBankAccounts\` | Redis 60s | **4ms / 15ms** | Bank Accounts Card (§16) |
| \`GET\` | \`/api/banking/feed\` | \`bankingController.getBankFeed\` | Redis 15s | **10ms / 24ms** | Bank Transactions Hub (25 to review) |
| \`POST\` | \`/api/banking/categorize\` | \`bankingController.categorizeTxn\` | Cache Eviction (Feed, PnL) | **14ms / 30ms** | Unreviewed Bank Feed Row "Add/Match" |
| \`GET\` | \`/api/accounting/chart-of-accounts\` | \`accountingController.getCOA\` | Redis 300s | **5ms / 15ms** | Chart of Accounts View |
| \`GET\` | \`/api/reports/profit-and-loss\` | \`reportsController.getProfitAndLoss\` | Redis 120s | **12ms / 28ms** | Standard Reports: Profit & Loss |
| \`GET\` | \`/api/reports/balance-sheet\` | \`reportsController.getBalanceSheet\` | Redis 120s | **14ms / 30ms** | Standard Reports: Balance Sheet |
| \`GET\` | \`/api/reports/ap-aging-summary\` | \`reportsController.getApAging\` | Redis 60s | **8ms / 22ms** | Accounts Payable Card & Report |
| \`GET\` | \`/api/contacts/customers\` | \`contactsController.getCustomers\` | Redis 120s | **6ms / 18ms** | Customer Hub Table |
| \`GET\` | \`/api/contacts/vendors\` | \`contactsController.getVendors\` | Redis 120s | **6ms / 18ms** | Vendor Hub Table |
| \`GET\` | \`/api/search/suggest\` | \`searchController.suggest\` | Redis 30s | **2ms / 8ms** | Top Navigation Omnibox Search Bar |
| \`GET\` | \`/api/ai/feed\` | \`aiController.getBusinessFeed\` | Redis 45s | **7ms / 19ms** | Intuit Assist / Meso AI Feed Drawer |
| \`GET\` | \`/api/audit-logs\` | \`auditController.getLogs\` | No Cache | **9ms / 25ms** | Gear Menu: Audit Log Screen |
`;
}
