# Frame-by-frame analysis — frames 401 to 842

Every frame read, none skipped. Source:
`D:\ui\How_to_use_QUICKBOOKS_ONLINE__2026__1080p_frames\frame_NNN.jpg`

Each entry records: what is on screen, the exact text, the layout geometry, the
colours, and what the frontend currently does differently.

---

## Frame 401 — Chart of Accounts

**Left rail (expanded tree, not the compact icon rail):**

```
INTUIT quickbooks   Sample Company
MY APPS                          [menu icon]
  ⌃  Accounting
       Bank transactions
       Integration transactions
       Receipts
       Reconcile
       Rules
       Chart of accounts          <-- ACTIVE (grey pill)
       Recurring transactions
     My accountant
PINNED
     Expenses & Bills
     Sales & Get Paid
     Customer Hub
     Team
     Time
     Sales Tax
     Business Tax
     Lending
     Payroll                       <-- diamond/gem marker
```

The rail is a **full navigation tree with two collapsible sections** (MY APPS,
PINNED), each item a labelled row with a small coloured icon. Icons observed:
Expenses & Bills (green circle glyph), Sales & Get Paid (green), Customer Hub
(green), Team (green), Time (blue), Sales Tax (red), Business Tax (dark red),
Lending (green), Payroll (grey diamond).

**Toolbar row (above the content, right-aligned):**
`Feedback` (chat-bubble icon + text) · `Run report` (white, green border, green
text) · `New account` (filled green) with a chevron-down split.

**Content header:**
`‹ All lists` in blue, then `Chart of accounts` as a 20px semibold heading.

**Filter row, left to right:**
`Batch actions ⌄` (bordered dropdown) · search input reading
`Filter by name or numl` · `All` (dropdown) · then right-aligned glyphs:
pencil, printer, gear.

**Pagination:** `‹ Previous   1 - 75   Next ›` — **75 accounts in total**.

**Table columns:** checkbox · `NAME ⇅` · `ACCOUNT TYPE ? ⇅` · `DETAIL TYPE ⇅` ·
`QUICKBOOKS BALANCE ⇅` · `BANK BALANCE ⇅` · `ACTION`

`ACCOUNT TYPE` carries a small `?` help icon. The ⇅ glyph on each sortable
column renders as text, not an icon component.

**Account rows (verbatim):**

| Name | Account type | Detail type | QBO balance | Bank balance |
|---|---|---|---|---|
| Checking | Bank | Checking | $1,201.00 | -$3,621.93 |
| Savings | Bank | Savings | $800.00 | $200.00 |
| Accounts Receivable (A/R) | Accounts receivable (A/R) | Accounts Receivable (A/R) | $5,281.52 | |
| Inventory Asset | Other Current Assets | Inventory | $596.25 | |
| Prepaid Expenses | Other Current Assets | Prepaid Expenses | $0.00 | |
| Uncategorized Asset | Other Current Assets | Other Current Assets | $0.00 | |
| Undeposited Funds | Other Current Assets | Undeposited Funds | $2,062.52 | |
| Truck | Fixed Assets | Vehicles | $13,495.00 | |
| Depreciation | Fixed Assets | Accumulated Depreciation | $0.00 | |
| Original Cost | Fixed Assets | Vehicles | $13,495.00 | |

Every row shows a green `BAL` badge in the Account type column and
`View register ⌄` as its action.

**Search box text:** the top bar search reads
`Show me open invoices for the last 30 days` with an `×` clear button — this is
a *filled* state carrying AI-suggested prompt text, not a placeholder.

### What the app does differently
- Left rail is the compact icon rail (84px), not this expanded tree. The whole
  MY APPS / PINNED structure and its ~20 destinations do not exist.
- No `Batch actions`, no `Filter by name or numl`, no `All` type filter, no
  pencil/printer/gear glyphs, no pagination control.
- Chart of Accounts screen has the `RULE`-style dropdown but not this toolbar.
- Bank balance column renders an em dash; the reference leaves it blank.
- No `Feedback` / `Run report` / `New account` toolbar split-button.
