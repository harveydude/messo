// D:\quickbook\quickbook-app\spec-builder\part1.js
export function getPart1() {
  return `# BACKEND.md — QuickBooks Online (2026 Edition) Master Accounting & Backend Specification

> **Architectural Status**: Production-Grade Master Blueprint  
> **Target Audience**: Principal Backend Engineers, Financial Systems Architects, CPA Auditors  
> **Standard Compliance**: US GAAP, IFRS, Indian GST Localization, RFC 7807 (Problem Details), ISO 4217  
> **Execution Constraint**: Strict Disk D Storage (\`D:\\quickbook\\quickbook-app\`), Zero UI Floating-Point Math, Zero Hardcoded Mock Data  

---

## §B0. Architectural Overview & Technology Stack Justification

QuickBooks Online (2026 Edition) requires a continuous accounting backend capable of serving dense financial dashboards with sub-20ms p95 latencies while enforcing strict, ACID-compliant double-entry ledger invariants. The architectural selection balances execution speed, concurrency, mathematical safety, and strict regulatory auditability.

\`\`\`
+---------------------------------------------------------------------------------------------------+
|                                QUICKBOOKS ONLINE 2026 CORE ARCHITECTURE                           |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|   +------------------------+      +-------------------------+      +--------------------------+   |
|   |   React 19 SPA (Vite)  | <--> | Cloudflare / Nginx RevP | <--> |   Node.js 20 LTS Core    |   |
|   |  Tailwind / Lucide UI  |      |   SSL / Edge Rate-Limit |      |  Express / Fastify Engine|   |
|   +------------------------+      +-------------------------+      +--------------------------+   |
|                                                                                  |                |
|               +------------------------------------------------------------------+                |
|               |                                  |                               |                |
|               v                                  v                               v                |
|   +------------------------+        +--------------------------+   +--------------------------+   |
|   |   PostgreSQL 16 DB     |        |      Redis 7 Cluster     |   |   BullMQ Worker Tier     |   |
|   |  - ACID Double-Entry   |        |  - Sub-5ms Read Cache    |   |  - Plaid Bank Feed Sync  |   |
|   |  - BIGINT Minor Units  |        |  - Redlock Distributed   |   |  - Scheduled Recurring   |   |
|   |  - Deferred Triggers   |        |  - Pub/Sub Invalidation  |   |  - Audit Hash Chain Verif|   |
|   +------------------------+        +--------------------------+   +--------------------------+   |
|               ^                                                                                   |
|               |                                                                                   |
|   +------------------------+                                                                      |
|   |   PgBouncer Pooler     |                                                                      |
|   |  - Transaction Mode    |                                                                      |
|   |  - 1000 -> 25 Backend  |                                                                      |
|   +------------------------+                                                                      |
+---------------------------------------------------------------------------------------------------+
\`\`\`

### 1. Technology Selection & Justifications

| Layer | Technology | Version | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Runtime Engine** | Node.js | v20.x LTS (Iron) | V8 engine delivers deterministic high-throughput asynchronous I/O; native \`BigInt\` eliminates JavaScript IEEE 754 floating-point truncation; native \`crypto\` module powers high-speed SHA-256 audit hash chaining. |
| **API Application Framework** | Express.js / Fastify | v4.21 / v4.26 | Minimal micro-kernel overhead (< 1.5ms routing latency per request); unified middleware pipeline for tenant isolation, distributed tracing, idempotency key locking, and RFC 7807 error serialisation. |
| **Relational Database** | PostgreSQL | v16.3 Enterprise | Enterprise-grade ACID compliance; transaction-scoped deferred constraint triggers (\`SET CONSTRAINTS ALL DEFERRED\`) enabling balanced ledger entry bundles; native \`JSONB\` with GIN indexing for flexible metadata; serializable isolation and row-level locking (\`SELECT ... FOR UPDATE\`). |
| **Connection Pooling** | PgBouncer | v1.22 | Transaction pooling mode (\`pool_mode = transaction\`) allows 1,000+ concurrent client connections to be multiplexed into 25–30 dedicated PostgreSQL backend threads, preventing backend thread exhaustion during burst periods. |
| **In-Memory Cache & Mutex** | Redis | v7.2 Cluster | Serves pre-aggregated dashboard snapshots (\`/api/dashboard/business-at-a-glance\`) with < 3ms read latency; implements distributed Redlock primitives to prevent race conditions during concurrent payment allocations; provides Pub/Sub bus for cache tag invalidations. |
| **Asynchronous Task Queue** | BullMQ | v5.8 | Redis Streams-backed persistent queue for non-blocking asynchronous jobs: Plaid bank feed ingestion, invoice PDF compilation, automated recurring transaction scheduling, and periodic ledger balance integrity scans. |
| **Query & Migration Layer** | Kysely / Raw SQL | v0.27 / ANSI SQL | Type-safe SQL query generation without ORM query overhead; zero N+1 query leaks; explicit, developer-controlled index utilization and query plan determinism. |

---

## §B1. System Architecture & Request-Response Lifecycles

### 1. Master Request Lifecycle Flow

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client as React Client (UI)
    participant Edge as Reverse Proxy / Nginx
    participant API as Express API Server
    participant Cache as Redis 7 Cache
    participant DB as PostgreSQL 16 (PgBouncer)
    participant Queue as BullMQ Worker

    Client->>Edge: POST /api/transactions (with Idempotency-Key & X-Company-Id)
    Edge->>API: Route Request (Inject TLS Client IP & Trace-ID)
    API->>Cache: Check Idempotency Key (GET idemp:{key})
    alt Key Exists & Completed
        Cache-->>API: Return Cached Response Body
        API-->>Client: 200 OK (Idempotent Cached Replay)
    else Key Pending (In-Flight)
        API-->>Client: 409 Conflict (Concurrent Mutation in Progress)
    else Key Is New
        API->>Cache: SET idemp:{key} "PROCESSING" EX 120 NX
        API->>DB: BEGIN Transaction (Isolation: READ COMMITTED)
        API->>DB: Lock Account Rows (SELECT ... FOR UPDATE ORDER BY id ASC)
        API->>DB: Insert journal_entries & journal_entry_lines
        DB->>DB: Deferred Trigger: Enforce SUM(Debits) - SUM(Credits) = 0
        API->>DB: Update Sub-ledger (invoices / bills / payments)
        API->>DB: Insert Cryptographic Audit Log (SHA-256 Hash Chain)
        API->>DB: COMMIT Transaction
        API->>Cache: Evict Invalidation Tags (company:{id}:dashboard, company:{id}:pnl)
        API->>Cache: SET idemp:{key} Response JSON EX 86400
        API->>Queue: Enqueue Async Webhook / Notification Job
        API-->>Client: 201 Created (Journal Entry & Updated Entity)
    end
\`\`\`

---

## §B2. The 10 Invariant Laws of the Accounting Engine

Every line of backend code, database trigger, and background job must adhere strictly to these ten invariants. Any code execution attempting to violate these rules will be rejected at the database level with a transaction rollback.

### Law 1: The Fundamental Double-Entry Invariant
For every posting financial transaction recorded in the system, the sum of debits must balance with the sum of credits to the exact penny/paise:
$$\\sum_{i=1}^{n} \\text{Debit}_i - \\sum_{i=1}^{n} \\text{Credit}_i = 0.00$$
Transactions where debits do not equal credits are rejected with error code \`LEDGER_UNBALANCED_TRANSACTION\`.

### Law 2: Account Normal Balances
Each account belongs to one of five fundamental financial account types and adheres to standard normal balance rules:
* **Debit-Normal Accounts** (Increased by Debits, Decreased by Credits):
  $$\\text{Balance} = \\sum \\text{Debits} - \\sum \\text{Credits}$$
  * \`ASSET\` (e.g., Bank Accounts, Accounts Receivable, Inventory, Fixed Assets)
  * \`EXPENSE\` (e.g., Operating Expenses, Payroll, Depreciation)
  * \`COST_OF_GOODS_SOLD\` (Job Materials, Subcontractor Costs)
* **Credit-Normal Accounts** (Increased by Credits, Decreased by Debits):
  $$\\text{Balance} = \\sum \\text{Credits} - \\sum \\text{Debits}$$
  * \`LIABILITY\` (e.g., Accounts Payable, Payroll Taxes, Credit Cards)
  * \`EQUITY\` (e.g., Owner's Capital, Common Stock, Retained Earnings)
  * \`INCOME\` / \`REVENUE\` (e.g., Sales Revenue, Service Income)

### Law 3: Absolute Ledger Immutability
Once a journal entry is committed with status \`POSTED\`, its header and line records can **never** be updated (\`UPDATE\`) or deleted (\`DELETE\`). 
* Modifications require creating an explicit reversal journal entry (\`REVERSAL\`) that negates the original entry.
* Database triggers strictly revoke \`UPDATE\` and \`DELETE\` privileges on \`journal_entries\` and \`journal_entry_lines\` where \`status = 'POSTED'\`.

### Law 4: Minor Unit Integer Precision (Zero-Float Standard)
All monetary fields across all database schemas, API contracts, and calculations are stored and transmitted as 64-bit integers (\`BIGINT\`) representing the smallest currency denomination (minor units):
* INR / USD / EUR: Represented in **cents / paise** ($1.00 = 100$ minor units; ₹1,201.00 = 120,100 minor units).
* JPY / KRW: Represented in integer whole units (0 decimal places).
* IEEE 754 double-precision floating-point types (\`REAL\`, \`FLOAT\`, \`DOUBLE PRECISION\`, JS \`Number\`) are prohibited in persistent financial calculations.

### Law 5: Sub-Ledger to General Ledger Parity
The sum of balances in any sub-ledger must at all times equal the balance of its corresponding controlling account on the General Ledger:
$$\\sum_{k} \\text{Customer Open Balance}_k = \\text{Balance}(\\text{GL Account 1100: Accounts Receivable})$$
$$\\sum_{m} \\text{Vendor Open Balance}_m = \\text{Balance}(\\text{GL Account 2000: Accounts Payable})$$
Automated reconciliation assertions verify this parity on every nightly audit pass.

### Law 6: Dual-Basis Financial Reporting Integrity (Accrual vs. Cash)
The system supports instantaneous reporting in both **Accrual** and **Cash** accounting bases from the exact same underlying transaction graph:
* **Accrual Basis**: Revenue is recognized upon issuance of the Invoice (\`doc_type = 'INVOICE'\`), and expenses are recognized upon receipt of the Bill (\`doc_type = 'BILL'\`).
* **Cash Basis**: Revenue is recognized only when cash/bank is debited via \`RECEIVE_PAYMENT\` or \`SALES_RECEIPT\`; expenses are recognized only when cash/bank is credited via \`BILL_PAYMENT\` or \`EXPENSE\`.
Both accounting modes query the identical transactional dataset with dynamic filtering on payment realization dates.

### Law 7: Strict Idempotency Invariance
All mutating endpoints (\`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`) accept an \`Idempotency-Key\` header (UUIDv4). If an operation is retried due to network timeout or client retry, the system guarantees that:
1. The transaction is executed exactly once in the database.
2. The second request returns the exact identical response payload without re-posting to the ledger.

### Law 8: Concurrency & Lock Ordering Protocol
To prevent database deadlocks under high-frequency concurrent postings, all transactions modifying multiple accounts must acquire row-level locks on \`chart_of_accounts\` in strictly ascending numerical order of account IDs:
\`\`\`sql
SELECT id FROM chart_of_accounts 
WHERE id IN (account_ids...) 
ORDER BY id ASC 
FOR UPDATE;
\`\`\`

### Law 9: Reversible Clearing Account Invariance (Undeposited Funds)
Customer payments deposited to \`Undeposited Funds\` (Account \`1020\` / \`1010\`) represent an asset holding account. Every payment placed in Undeposited Funds must eventually be cleared to zero via a \`BANK_DEPOSIT\` transaction. The net balance of \`Undeposited Funds\` reflects unbanked physical checks and cash awaiting bank presentation.

### Law 10: Cryptographic Tamper-Evident Audit Chain
Every database write operation generates an immutable entry in the \`audit_logs\` table. Each audit log row computes a SHA-256 cryptographic digest of:
$$\\text{Hash}_n = \\text{SHA-256}(\\text{Hash}_{n-1} \\parallel \\text{Timestamp} \\parallel \\text{UserId} \\parallel \\text{Action} \\parallel \\text{EntityId} \\parallel \\text{Payload})$$
Any manual out-of-band database modification breaks the cryptographic chain and triggers an instant administrative security alarm.

---

## §B3. Money, Decimals & Precision Policy

### 1. Minor Units Representation Table

| Currency Code | Currency Name | Minor Unit Name | Ratio to Major Unit | Sample Display | Internal \`BIGINT\` Value |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **INR** | Indian Rupee | Paisa | $1:100$ | ₹1,201.00 | \`120100\` |
| **USD** | US Dollar | Cent | $1:100$ | $8,347.00 | \`834700\` |
| **EUR** | Euro | Cent | $1:100$ | €6,953.00 | \`695300\` |
| **GBP** | British Pound | Penny | $1:100$ | £1,394.00 | \`139400\` |
| **JPY** | Japanese Yen | Yen | $1:1$ | ¥150,000 | \`150000\` |

### 2. Rounding Strategy: Half-Up Standard (\`ROUND_HALF_UP\`)
When calculating taxes, line item discounts, or currency conversions that result in fractional minor units:
* Round to nearest integer. If the fractional part is exactly $\\ge 0.5$, round away from zero.
* For multi-line invoices, taxes are calculated **per line item** and summed, with any 1-paisa rounding difference assigned to the line item with the highest taxable value to preserve invoice total integrity.

\`\`\`javascript
// Standard Financial Rounding Implementation
export function roundMinorUnits(fractionalValue) {
  if (fractionalValue >= 0) {
    return BigInt(Math.floor(fractionalValue + 0.5));
  } else {
    return BigInt(Math.ceil(fractionalValue - 0.5));
  }
}
\`\`\`

### 3. Multi-Currency Exchange Rates
Exchange rates are stored in 6 decimal places of precision as integers using a fixed multiplier of $10^6$ ($1.000000 = 1,000,000$).
$$\\text{Base Minor Units} = \\text{round}\\left(\\frac{\\text{Foreign Minor Units} \\times \\text{Exchange Rate Integer}}{10^6}\\right)$$
`;
}
