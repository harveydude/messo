# QuickBooks Online — Workflow Reference

Source: "How to use QUICKBOOKS ONLINE (2026)" video transcript + 842 frame
extracts at `D:\ui\How_to_use_QUICKBOOKS_ONLINE__2026__1080p_frames\frame_N.jpg`
(FPS = 1, so timestamp *T* seconds = `frame_T.jpg`).

This is the **reference workflow** the Messo frontend must reproduce. Every
screen, menu and navigation path below is observed from the video, not
invented. When the prototype and this file disagree, this file wins.

---

## BUILD ORDER (from second AI prompt — Phases 0–6)

1. **Phase 0** — Global context + seed data
2. **Phase 1** — Shell feels alive: M01 (nav) → M02 (create menu) → M05 (dashboard)
3. **Phase 2** — Foundations: M07 (settings) → M09 (chart of accounts) → M10 (products)
4. **Phase 3** — Money in/out: M12 (invoices) → M13 (sales hub) → M14 (customers) → M15 (expenses) → M16 (bills/vendors)
5. **Phase 4** — Banking: M17 (link/feed/match) → M18 (categorize/rules) → M19 (reconciliation)
6. **Phase 5** — Accounting truth: M20 (reports) → M21 (statements) → M22 (journal) → M23 (tools)
7. **Phase 6** — Admin + AI polish: M08 (users) → M11 (recurring) → M24 (payroll/time) → M25 (tax) → M03 (search) → M04 (notifications) → M06 (feed)

## GLOBAL CONTEXT (paste before every workflow prompt)

- Stack: React 18 + Tailwind, hash routing, single store with localStorage persistence
- Seed: company "Acme Studio LLC", 6 customers, 5 vendors, 12 products, ~25 COA entries, 1 bank account ($24,800), 20 bank transactions, 8 invoices (2 overdue), 5 bills (1 overdue), 8.25% sales tax
- Money: USD $1,234.56 · Dates: MM/DD/YYYY with date-picker
- Every save: validate inline → disable button → success toast naming record → refresh lists/badges/widgets
- Every delete: confirm modal naming the entity
- Every list: search, sort, empty state
- AI features: sparkle icon, never blank (deterministic fallback)

## KEY DETAILS FROM SECOND PROMPT (not in first)

- **Invoice flow**: auto # (editable), Terms dropdown → Due date auto-computes (today + N), manual due date → terms = "Custom". Customer "+ Add new" inline. Product picker autofills description/rate. Discount % or fixed. Tax dropdown. Totals: Subtotal − Discount + Tax = Total.
- **Bill flow**: Terms → Due date auto. "Schedule payment" button. Partial payments allowed. Status: Open → Scheduled → Paid.
- **Bank feed**: For review / Categorized / Excluded tabs. AI payee chip (editable). Suggested category with confidence %. Match flow: green chip → confirm → invoice Paid. Uncategorized fix: payee + account + description + attach support.
- **Rules**: condition builder (field + operator + text), assign payee/category, auto-confirm toggle, applies to money in/out/both. Drag reorder = priority. "Apply to past" backfill.
- **Reconciliation**: statement ending date + balance → check off transactions → difference = $0.00 → Finish now. Non-zero → warning + adjustment JE.
- **Reports**: Standard/Custom/Management/Financial planning tabs. Star → Favorites. Basis toggle (Accrual/Cash). Date presets. Export: Print/CSV/Email.
- **Balance Sheet**: as-of date. Sections: Assets (Current/Fixed), Liabilities, Equity. Check: Assets − Liabilities = Equity ✓. Intuit Assist insight banner.
- **P&L**: from-to period. Income → COGS → Gross profit → Expenses → Net income. Compare: prior period/year.
- **Cash Flow**: Operating/Investing/Financing. Net change = bank balance delta. Star → favorites.
- **Journal entries**: debit/credit lines, must balance. Save blocked while unbalanced. Reverse creates mirrored entry.
- **Settings**: Company (logo upload, address, email, phone, website, industry), Legal (EIN/SSN, business type, legal address), Advanced (accounting method, multicurrency, form customization). Usage progress bars.
- **Manage users**: invite (name, email, role, permissions), edit role, resend invite, remove (confirm, can't remove last admin).
- **Products**: name, type (service/inventory/non-inventory), price, income account, taxable. Edit affects future picks only. Duplicate, archive.
- **Recurring**: template (type, schedule, interval, start/end, auto-send, auto-approve). Run now (demo). Engine executes on load.
- **Sales hub**: KPI strip, tabs (Estimates/Invoices/Payments), filter chips, sort, detail drawer. Overdue orange. Record payment (multi-select invoices, auto-allocate).
- **AI reminders**: severity (Friendly/Firm/Final), editable body, send now or schedule. Batch remind all.
- **Expenses**: payee, date, method, bank account, category, amount, memo, attachment. Receipt AI: upload → extract → confirm → fill. Mileage: trips, rate $0.70/mi, auto-amount.
- **Customers**: list, new (name, company, email, phone, address, terms, notes), detail drawer (overview, transactions, notes), archive. Leads pipeline (New → Contacted → Qualified → Won/Lost), convert to customer.
- **Payroll**: employees/contractors, run payroll (period, hours, preview, submit), payslips. Time: weekly grid, submit for approval, approved hours → payroll.
- **Tax**: sales tax setup (agency, rate, frequency), file return, record payment. Business tax: YTD net income, estimated tax, document checklist.

---

## 1. Global chrome

### Top bar
| Element | Behaviour |
| --- | --- |
| Intuit QuickBooks logo | Returns to dashboard |
| Company name | e.g. "Sample Company" |
| Smart search bar | "Navigate or search for transactions, contacts, reports, and more". Accepts criteria, commands, and full questions. |
| Contact experts | Reach your accountant / a certified QuickBooks professional |
| My integrations | Connected third-party apps. **This is the Integrations screen** — distinct from the left rail's "My apps". |
| Notification bell | |
| Gear (settings) | Opens the settings mega-menu (see §4) |
| Help (?) | Pop-up: grill the AI assistant or search FAQs |
| Avatar | Intuit account |

### Left rail (skinny grey bar)
| Item | Behaviour |
| --- | --- |
| **Create** (+) | Opens the create mega-menu (see §3) |
| **Bookmarks** | Customisable page shortcuts |
| **Dashboard** | Home |
| **Feed** | Business feed — AI dashboard (see §6) |
| **Reports** | Opens the **Reports flyout** (see §5) — *not* a direct navigation |
| **My apps** | Opens the **My apps flyout** (see §2) — *not* a direct navigation |
| PINNED | Customisable pinned apps (Accounting, Expenses, Sales by default) |
| Customize | Dashboard widget layout editor |

> **BUG FIXED 2026-10:** "My apps" and "Reports" were wired to navigate to
> the Integrations and Reports *screens*. In the real product they open
> flyout panels inside the rail. The user reported "when I am tapping on My
> App, it is opening the integration tab" — this was why.

---

## 2. My apps flyout

Opens from the left rail. A white panel (~240 px) listing every app module.
Each module expands to show its sub-screens.

| Module | Sub-screens |
| --- | --- |
| **Accounting** | Bank transactions, Integration transactions, Receipts, Reconcile, Rules, Chart of accounts, Recurring transactions, My accountant |
| **Sales & Get Paid** | Overview, Sales transactions, Invoices, Recurring payments, Sales orders, Sales channels, QuickBooks payouts, Channel payouts, Products & services |
| **Expenses & Bills** | Bills, Vendors, Mileage |
| **Customer Hub** | Customer & lead management, relationship tracking |
| **Team** | Team member management |
| **Time** | Time tracking, project management |
| **Sales Tax** | Sales tax management |
| **Business Tax** | Business tax management |
| **Lending** | Loans via QuickBooks marketplace |
| **Payroll** ◆ | Payroll for employees & contractors, direct deposit |
| **Marketing** ◆ | Marketing campaigns |

◆ = premium (diamond icon).

---

## 3. Create mega-menu

Four columns, opened from the rail's Create (+) button.

| Customers | Vendors | Team | Other |
| --- | --- | --- | --- |
| Invoice | Expense | Payroll ↗ | Task |
| Receive payment | Check | Add contractor | Bank deposit |
| Statement | Bill | | Transfer |
| Estimate | Pay bills | | Journal entry |
| Sales order | Purchase order | | Inventory qty adjustment |
| Credit memo | Vendor credit | | Pay down credit card |
| Sales receipt | Credit card credit | | Add product/service |
| Refund receipt | Print checks | | |
| Delayed credit | Add vendor | | |
| Delayed charge | | | |
| | | | Add customer |

---

## 4. Settings mega-menu

Four columns, opened from the top bar's gear icon.

| Your company | Lists | Tools | Profile |
| --- | --- | --- | --- |
| Account and settings | All lists | Order checks ↗ | Subscriptions and billing |
| Manage users | Products and services | Import data | What's new |
| Custom form styles | Recurring transactions | Import desktop data | Feedback |
| Chart of accounts | Attachments | Export data | Privacy |
| Payroll settings | Custom fields | Reconcile | |
| Workers' comp | Rules | Budgeting | |
| Get the desktop app | | Audit log | |
| Additional info | | Share screen | |
| | | Resolution center | |

Footer: "Video tutorials" + "Switch from Accountant view to Business view".

---

## 5. Reports flyout

Opens from the left rail.

| Item | Notes |
| --- | --- |
| Standard reports | Favorites at top; Balance sheet, P&L, Cash flow |
| Custom reports | |
| Management reports | |
| Financial planning | |

Each report has: period selector (From/To dates), View options, Display,
Filter, General options, Save As, star to favorite. Intuit Assist offers
insights on some reports.

---

## 6. Business feed

An AI dashboard that surfaces:
- Pressing issues
- Suggested tasks
- Business insights

End state: "You're all caught up!" with Generate a bill, Receipt upload,
Generate an invoice shortcuts.

---

## 7. Screen-specific workflows

### Bank transactions
- Account cards at top: bank balance + "in QuickBooks" balance + pending count
- Tabs: **For review (n)** / **Categorized** / **Excluded**
- Table: date, received, action (Add / View)
- "Link account" to connect a new bank/credit card
- Full-screen mode available
- "Match" — AI pairs a bank transaction with one already in the books
- Uncategorised transactions: select account, add description, attach support
- Bank rules can auto-categorise recurring transactions

### Rules
- Table: Priority, Rule name, Applied to, Conditions
- **Create rule** side drawer:
  - Name the rule
  - Apply to: Money out / in / All bank accounts
  - Include: All / any condition (Description / Contains / text)
  - Test rule
  - Then Assign: Transaction type, Category, Product/service, Payee, + Add a split

### Sales transactions
- **Review invoice reminder** flow: AI drafts a formal reminder based on days
  overdue. Review, edit, send. Per-customer context (since when, paid/late/
  coming-due counts), per-invoice context (total, remaining, reminders sent).
  Accepted payment methods shown. AI tone selector + Rewrite.

### Dashboard widgets
Sales funnel, Bank accounts, Profit & Loss, Expenses, Cash flow.
Customize button adds/removes/reorders. Privacy button masks sensitive figures.

---

## 8. Gaps in the Messo prototype (as of 2026-10-10)

| Gap | Priority |
| --- | --- |
| "My apps" opens Integrations instead of the app flyout | **P0 — fixed** |
| No Reports flyout | P1 |
| Create menu missing most items (Statement, Estimate, Sales order, Check, Bill, Pay bills, Purchase order, Task, Bank deposit, Transfer, …) | P1 |
| Settings menu missing items (Custom form styles, Payroll settings, Workers' comp, Get the desktop app, Attachments, Custom fields, Order checks, Import desktop data, Share screen, Resolution center, Subscriptions and billing, What's new, Feedback, Privacy) | P1 |
| Bank transactions: no account cards, no For review/Categorized/Excluded tabs | P1 |
| Rules: no Create rule drawer | P1 |
| Sales: no AI invoice reminder flow | P2 |
| No Customer Hub, Team, Time, Sales Tax, Business Tax, Lending, Payroll, Marketing screens | P2 |
| No Custom reports, Financial planning screens | P2 |

---

## 9. COMPLETE APP TREE (from third AI prompt — Part B)

```
ROOT
├─ CHROME (hidden by: Invoice overlay · ZenMode · bank fullscreen)
│  ├─ TopBar
│  │  ├─ qb logo + company name → home
│  │  ├─ SmartSearch pill → dropdown (Recent/Transactions/Contacts/Reports/AI) → search-results
│  │  ├─ Contact experts → panel
│  │  ├─ Integrations icon → integrations page
│  │  ├─ Bell (unread dot) → notifications dropdown
│  │  ├─ Gear → settings menu → routes to all settings pages
│  │  ├─ Help ? → HelpCenter popup (Assistant/FAQ) → link to shortcuts modal
│  │  └─ Avatar → account menu (settings, users, sign out)
│  ├─ Rail
│  │  ├─ Create (+) → CreateMenu mega
│  │  ├─ Bookmarks → flyout
│  │  ├─ Dashboard → home
│  │  ├─ Feed → home#feed
│  │  ├─ Reports → reports
│  │  ├─ My apps → home#apps
│  │  └─ PINNED circles: Accounting / Expenses / Sales
│  └─ SideNav (hidden on products/audit/bank-full)
│     ├─ MY APPS header
│     ├─ Accounting (collapsible) → Bank transactions, Integration transactions, Receipts, Reconcile, Rules, Chart of accounts, Recurring transactions, My accountant
│     ├─ Groups ×8: Expenses & Bills, Sales & Get Paid (expandable), Customer Hub, Team, Time, Sales Tax, Business Tax, Lending
│     └─ Payroll (gem), Marketing (gem)
├─ PAGES
│  ├─ home (dashboard) — greeting, app carousel, period select, widgets, Customize, Privacy
│  ├─ chart (COA) — header, filter, type, table → account modal, register drawer
│  ├─ products — tabs, stock banner, search, table → product modal
│  ├─ recurring — tabs Transactions|Rules, table → template editor, rule editor
│  ├─ audit — filters, table (live store audit)
│  ├─ bank — account tabs, For review count, Link, Refresh, fullscreen, feed rows
│  ├─ reconcile — account select, statement date+balance, check-off, summary
│  ├─ sales-overview — stat tiles, tabs Estimates|Invoices|Payments, table
│  ├─ expenses-hub — tabs Bills|Vendors|Mileage
│  ├─ customers — search, cards, New, profile drawer
│  ├─ team — member cards, invite
│  ├─ time — weekly grid, save, billable flag
│  ├─ payroll — Run payroll wizard, Contractors tab
│  ├─ reports — tabs Standard|Custom|Management|Planning, favorites
│  ├─ report-view — date pickers, compare, drill-down, print/export/star
│  ├─ marketing — campaign cards
│  ├─ lending — loan cards
│  ├─ sales-tax / business-tax — rates table, filing stubs
│  ├─ integrations — connected grid + find grid
│  ├─ users — table, add/edit/remove
│  ├─ budget — year grid, inline edit
│  ├─ settings — tabs Company|Usage|Sales|Expenses|Time|Advanced
│  └─ search-results — chips, grouped cards
├─ OVERLAYS
│  ├─ CreateMenu (mega, 4 columns)
│  ├─ InvoicePage (fullscreen; sub-states: edit/preview/email/success)
│  ├─ HelpModal (Additional information / keyboard shortcuts)
│  ├─ TxnModal (Select Transaction Type)
│  ├─ HelpCenter popup (Assistant + FAQ)
│  ├─ SmartSearch dropdown
│  ├─ Notifications dropdown
│  ├─ Gear menu
│  ├─ Account menu
│  ├─ Contact experts panel
│  ├─ Bookmarks flyout
│  ├─ Account modal (new/edit)
│  ├─ Product modal
│  ├─ Recurring template editor
│  ├─ Rule editor
│  ├─ User modal
│  ├─ Customer modal + drawer
│  ├─ Vendor modal + drawer
│  ├─ Expense form
│  ├─ Bill form
│  ├─ Journal entry form
│  ├─ Receive payment form
│  ├─ Pay/Schedule payment modal
│  ├─ Link account wizard (3 steps)
│  ├─ Uncategorized fix drawer
│  ├─ Reminder severity modal
│  ├─ Tax rate modal
│  ├─ Budget copy modal
│  ├─ Confirm modals (disconnect/deactivate/delete)
│  ├─ Plan picker splash
│  ├─ Order checks / Import-Export / Share screen / Resolution center
│  ├─ Campaign wizard / Loan prequal
│  ├─ Customize dashboard modal
│  ├─ Reconcile finish modal
│  └─ Estimate editor (reuse InvoicePage)
└─ DRAWERS
   ├─ Customer profile
   ├─ Vendor profile
   ├─ Uncategorized fix
   ├─ COA register
   ├─ Overdue drill-down
   ├─ Report drill-down
   └─ Timesheet → invoice
```

## 10. FULL STORE SCHEMA (from third AI prompt — Part A2)

```
company {name, legalName, logo, email, phone, website, industry, address{street,city,state,zip}, ein, businessType, legalAddress}
settings {accountingMethod:'Accrual'|'Cash', multicurrency:bool, currency:'USD'|'EUR'|'CAD', plan:'Simple Start'|'Essentials'|'Plus'|'Advanced', firstDayOfWeek, salesToggles{deliveryMethod, customTxnNums, serviceDate, discount, deposit, tips, tags}, timeSettings{firstDayOfWeek, showServiceField, billableTime}, usageLimits{users:5, accounts:250}}
users[] {id, first, last, email, role:Admin|Standard|TimeOnly|ReportsOnly, status:Active|Invited|Deactivated, rate}
customers[] {id, displayName, first, last, email, phone, billingAddress, terms, notes, balance}
vendors[] {id, displayName, company, email, phone, address, terms, balance}
accounts[] {id, name, type, badge:BAL|P&L, detail, bank:bool, qb:number|null, bankBal:number|null, action, indent, active}
products[] {id, name, sku, category, type:Inventory|Non-inventory|Service, price, cost, taxable, qty, reorder, desc, active}
categories[] ['Design','Fountains','Landscaping']
invoices[] {id, no, customerId, date, dueDate, terms, lines[{productId, desc, qty, rate, taxable}], discount{mode, value}, taxRateId, status:Draft|Sent|Paid|Overdue, sentAt, timeEntryIds[]}
estimates[] {id, no, customerId, date, expiry, lines, status:Open|Accepted|Closed, convertedTo}
bills[] {id, no, vendorId, date, dueDate, terms, lines[{accountId,desc,amount}], status:Open|Overdue|Paid|Scheduled, scheduleDate, paidDate}
expenses[] {id, payeeId, payeeName, paymentAccountId, method, date, lines[{accountId, desc, amount}], memo, attachment, source:Manual|ReceiptAI}
payments[] {id, customerId, date, method, depositToAccountId, ref, appliedTo[], amount}
journalEntries[] {id, no, date, lines[{accountId, debit, credit}], recurring:bool}
bankAccounts[] {id, name, institution, type, balance, connected:bool}
bankTxns[] {id, date, desc, amount, bankAccountId, state:Match|Uncategorized|Suggested|Reviewed, suggestion{accountId,confidence}, matchedRef, categoryAccountId}
rules[] {id, name, field:Description|Payee, contains, targetAccountId, autoConfirm}
recurring[] {id, name, type:Scheduled|Reminder|Unscheduled, txnType, interval, intervalN, startDate, entityId, lines, email:bool, reminderDays, nextDate}
mileage[] {id, date, from, to, miles, rate:0.67, vehicleAccountId}
payrollRuns[] {id, periodStart, periodEnd, lines[{userId, hours, otHours, gross}], taxes, status}
timeEntries[] {id, userId, customerId, serviceId, weekStart, days{1..7}, billed:bool}
taxRates[] {id, name, pct}
budgets[] {year, cells:{accountId:[12 numbers]}}
notifications[] {id, text, time, read:bool, route}
audit[] {date, user:'Craig Carlson', event, view:bool, ref}
dashboard {widgets[], privacy:bool, period}
favorites[] (report ids) · bookmarks[] (page ids)
ui {page, zenMode, bankFullscreen, overlays}
```

## 11. SHARED COMPONENT CONTRACTS (from third AI prompt — Part D)

| Component | Contract |
| --- | --- |
| PageHeader | 28px title · optional teal ‹ All Lists · right actions slot |
| SplitButton | main action + 1px divider + chevron square; menu items |
| ModalShell | white, radius 8, border #e3e5e8, shadow, centered, ✕ top-right, Escape closes, focus trap |
| Drawer | 480px right slide; overlay click closes; sticky footer |
| DateField | display MM/DD/YYYY · calendar segment opens MonthGrid |
| MonthGrid | ◀ ▶ month, day cells, today ring, type-to-parse (10/2025 → 10/01/2025) |
| Check | 22/18px sizes; indeterminate dash |
| MoneyInput | right-aligned, blur-format, live recompute upstream |
| StatusChip | Draft gray · Sent blue · Paid green · Overdue orange · Invited/Active/Scheduled |
| logAudit(event, view, ref) | the only write path to audit[] |
| toast(msg) | bottom-center, 3s, one at a time |

## 12. SEED DATA (from third AI prompt — Part E)

- accounts[] = COA_DATA 26 rows (Checking $1,201.00 / −$3,621.93, A/P $1,602.67, Retained Earnings + Income rows = Run report)
- products[] grouped: Design (Design $75), Fountains (Concrete $0✓, Pump $15/10/✓/25, Rock Fountain $275/125/✓/2, Lighting $0✓)
- customers[] = 11 names (Amy's Bird Sanctuary … Island Events); Cool Cars: Grace Pariente / 65 Ocean Dr. / Half Moon Bay, CA 94213 / Cool_Cars@intuit.com
- catalog (invoice picker order) = 9 items exactly
- recurring[] = Monthly Building Lease $900.00, Telephone Bill $74.36 (next 10/12/2025)
- audit[] = AUDIT_ROWS 11 entries verbatim (Timesheet teal links rows 10–11; View on 3,4,5,10,11)
- taxRates[] = California (8%), California (7.25%), Out of state (0%)
- invoices[] = 3 seeded (1 Paid, 1 Sent, 1 Overdue), estimates[] 2, bills[] 1 overdue, expenses[] 5 across 3 categories, bankTxns[] 6 (2 Match, 2 Suggested, 2 Uncategorized)
- helpCenter = 8 Q&As; integrations = 3 connected + 6 marketplace; loans = 3; proAdvisors = 3

## 13. BUILD ORDER DAG (from third AI prompt — Part F)

```
foundations → chrome → settings/users (store-heavy) → COA modal → products
→ customers/vendors/tax (single-source) → invoice pipeline (needs products+customers+tax+time)
→ money-out → banking (needs rules) → recurring+rules → payroll/time
→ reports (needs everything for math) → home (binds all) → audit verify → systems
```

Regression gate after each block: prior "✅" lists must still pass.

## 14. KEY TEST VALUES (from third AI prompt)

- Invoice math: Subtotal $30.00 − Discount $3.00 + Tax $2.40 = **Total $29.40**
- EIN mask: 12-3456789 (9 digits, invalid → red + message)
- Balance Sheet: Assets = Liabilities + Equity ✓ (red if broken)
- A/P on COA: $1,602.67 (live from bills[])
- Bank: Checking $1,201.00 / Savings $800.00
- Mileage rate: $0.67/mi (default, editable)
- Payroll tax: mock 22%
- Multicurrency rates: EUR 1.08, CAD 1.36
