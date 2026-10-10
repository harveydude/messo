/**
 * The chart of accounts.
 *
 * These live here rather than inside a screen because four places need them --
 * the Chart of Accounts screen, the Balance Sheet, the Profit & Loss and the
 * Cash Flow -- and a balance sheet that disagrees with its own chart of
 * accounts is not a balance sheet.
 *
 * Every account carries two names, and conflating them was the original defect:
 *
 *   `type`      canonical bucket the reports roll up on ('Accounts Receivable')
 *   `typeLabel` what the Chart of Accounts screen shows ('Accounts receivable
 *               (A/R)') -- the label QuickBooks uses in its own filter menu
 *
 * `parentId` marks a sub-account. Sub-accounts are the *breakdown* of their
 * parent, so they are shown but never rolled up: counting Truck and its
 * Original Cost child separately would double the asset.
 *
 * There is deliberately no balance field here. Balances used to be typed in --
 * A/R 5,281.52, Truck 13,495.00, Undeposited 2,062.52 -- which is why recording
 * a transaction did nothing to any report. They are derived from transactions
 * by `src/ledger.js` now. The only figures stated here are opening balances,
 * for accounts whose history predates this app, and those are disclosed as
 * "brought forward" rather than hidden inside a total.
 */

/** Canonical types. Reports bucket on these; the UI shows `typeLabel`. */
export const ACCOUNT_TYPES = [
  'Bank',
  'Accounts Receivable',
  'Other Current Asset',
  'Fixed Asset',
  'Accounts Payable',
  'Credit Card',
  'Other Current Liability',
  'Equity',
  'Income',
  'Cost of Goods Sold',
  'Expense',
];

const acct = (id, name, type, typeLabel, opts = {}) => ({
  id,
  name,
  type,
  typeLabel,
  badge: opts.badge || 'BAL',
  detail: opts.detail || name,
  bank: opts.bank || false,
  parentId: opts.parentId ?? null,
  openingBalance: opts.openingBalance ?? 0,
  openingContraId: opts.openingContraId ?? null,
  action: opts.action || 'View register',
});

/**
 * Opening balances predate this app, so they are stated here rather than
 * derived. Each one names the equity account it offsets -- that is what stops
 * them becoming a hidden plug, and it is why the balance check in
 * `deriveLedger` is a real test rather than an identity that always holds.
 */
const OPENING_CONTRA = 15; // Opening Balance Equity

export const CHART_OF_ACCOUNTS = [
  // ---- Assets: current -------------------------------------------------
  acct(1, 'Checking', 'Bank', 'Bank', { bank: true, openingBalance: 1201.00, openingContraId: OPENING_CONTRA }),
  acct(2, 'Savings', 'Bank', 'Bank', { bank: true, openingBalance: 800.00, openingContraId: OPENING_CONTRA }),
  acct(3, 'Accounts Receivable (A/R)', 'Accounts Receivable', 'Accounts receivable (A/R)'),
  acct(4, 'Inventory Asset', 'Other Current Asset', 'Other Current Assets', { detail: 'Inventory', openingBalance: 596.25, openingContraId: OPENING_CONTRA }),
  acct(5, 'Prepaid Expenses', 'Other Current Asset', 'Other Current Assets'),
  acct(6, 'Uncategorized Asset', 'Other Current Asset', 'Other Current Assets'),
  acct(7, 'Undeposited Funds', 'Other Current Asset', 'Other Current Assets', { openingBalance: 2062.52, openingContraId: OPENING_CONTRA }),

  // ---- Assets: fixed ---------------------------------------------------
  acct(8, 'Truck', 'Fixed Asset', 'Fixed Assets', { openingBalance: 13495.00, openingContraId: OPENING_CONTRA }),
  acct(9, 'Original Cost', 'Fixed Asset', 'Fixed Assets', { parentId: 8, detail: 'Vehicles' }),
  acct(10, 'Depreciation', 'Fixed Asset', 'Fixed Assets', { parentId: 8, detail: 'Accumulated Depreciation' }),

  // ---- Liabilities -----------------------------------------------------
  acct(11, 'Accounts Payable (A/P)', 'Accounts Payable', 'Accounts payable (A/P)'),
  acct(12, 'Mastercard', 'Credit Card', 'Credit Card', { bank: true }),
  acct(13, 'Sales Tax Payable', 'Other Current Liability', 'Other Current Liabilities'),

  // ---- Equity ----------------------------------------------------------
  acct(14, 'Retained Earnings', 'Equity', 'Equity', { action: 'Run report' }),
  acct(15, 'Opening Balance Equity', 'Equity', 'Equity', { action: 'Run report' }),

  // ---- Income ----------------------------------------------------------
  acct(16, 'Billable Expense Income', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(17, 'Design income', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(18, 'Discounts given', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(19, 'Fees Billed', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(20, 'Landscaping Services', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(21, 'Job Materials', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),
  acct(22, 'Decks and Patios', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(23, 'Fountains and Garden Lighting', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(24, 'Plants and Soil', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(25, 'Sprinklers and Drip Systems', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(26, 'Labor', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(27, 'Installation', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(28, 'Maintenance and Repair', 'Income', 'Income', { badge: 'P&L', parentId: 21, action: 'Run report' }),
  acct(29, 'Other Income', 'Income', 'Income', { badge: 'P&L', action: 'Run report' }),

  // ---- Expenses --------------------------------------------------------
  acct(30, 'Cost of Goods Sold', 'Cost of Goods Sold', 'Cost of Goods Sold', { badge: 'P&L', action: 'Run report' }),
  acct(31, 'Office Supplies', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(32, 'Utilities', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(33, 'Telephone', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(34, 'Mileage', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(35, 'Payroll Expenses', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(36, 'Advertising', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(37, 'Insurance', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
  acct(38, 'Rent or Lease of Buildings', 'Expense', 'Expense', { badge: 'P&L', action: 'Run report' }),
];

/**
 * The filter menu on the Chart of Accounts screen, in QuickBooks' own order.
 * Derived from the list above rather than written out again -- a second list is
 * a second thing that can drift.
 */
export const ACCOUNT_TYPE_FILTERS = ['All', ...new Set(CHART_OF_ACCOUNTS.map((a) => a.typeLabel))];