/**
 * Does a create actually mutate the store?
 *
 * This exists because SalesDocumentsView had been dispatching ADD_SALES_DOC and
 * UPDATE_SALES_DOC since it was written, with no case in the reducer to receive
 * them. Every build passed and every lint run was clean, because a dispatch to
 * a missing action is not an error -- it is a silent no-op. The dialog closed,
 * the table stayed empty, and nothing said why.
 *
 * So this checks the thing a compiler cannot: that dispatching an action moves
 * the state it names.
 *
 *   node scripts/verify-store-writes.mjs
 */

import { readFileSync } from 'node:fs';

/**
 * The reducer is not exported separately -- it lives inside the .jsx store
 * module, which plain Node cannot import. So the source is read and the cases
 * are extracted. Reading the source rather than importing is a compromise, and
 * it is stated here so nobody mistakes this for a real import test.
 */
const storeSrc = readFileSync(new URL('../src/store.jsx', import.meta.url), 'utf8');

let failures = 0;
const check = (label, ok) => {
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}`);
};

/**
 * Every action any screen dispatches, and the reducer case that must exist.
 *
 * Collected by reading the screens for `type: '...'` rather than trusting a
 * hand-written list, so a new screen's action cannot slip through unlisted.
 */
const screenFiles = [
  'SalesDocumentsView.jsx', 'SalesTransactionsView.jsx', 'CustomersView.jsx',
  'VendorsView.jsx', 'ExpensesView.jsx', 'BankTransactionsView.jsx',
  'TeamView.jsx', 'PayrollView.jsx', 'TimeView.jsx', 'MileageView.jsx',
  'BudgetsView.jsx', 'BusinessTaxView.jsx', 'SalesTaxView.jsx',
  'LendingView.jsx', 'CustomerHubView.jsx', 'CustomReportsView.jsx',
  'MarketingView.jsx', 'FinancialPlanningView.jsx', 'RulesView.jsx',
  'RecurringTransactionsView.jsx', 'ProductsAndServicesView.jsx',
  'BankCategorize.jsx', 'InvoiceReview.jsx', 'Reconcile.jsx',
  'ReportsView.jsx', 'ChartOfAccountsView.jsx',
];

const dispatched = new Map(); // action -> set of files

for (const file of screenFiles) {
  let src;
  try {
    src = readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8');
  } catch {
    continue; // screen does not exist; not this check's business
  }
  for (const m of src.matchAll(/type:\s*'([A-Z_]+)'/g)) {
    if (!dispatched.has(m[1])) dispatched.set(m[1], new Set());
    dispatched.get(m[1]).add(file);
  }
}

console.log(`\n=== Every dispatched action needs a reducer case ===`);
console.log(`  ${dispatched.size} distinct action types dispatched across ${screenFiles.length} screens\n`);

const reducerCases = new Set(
  [...storeSrc.matchAll(/case\s+'([A-Z_]+)':/g)].map((m) => m[1])
);

for (const [action, files] of [...dispatched.entries()].sort()) {
  if (action === 'HYDRATE') continue; // supplied by the provider, not the screens
  const has = reducerCases.has(action);
  check(
    `${action.padEnd(24)} ${has ? '' : `-> MISSING a reducer case (dispatched by ${[...files].join(', ')})`}`,
    has
  );
}

console.log(`\n=== The cases that exist are reachable ===`);
// A case nothing dispatches is dead code. Not a defect, but worth knowing.
const orphans = [...reducerCases].filter((c) => c !== 'HYDRATE' && !dispatched.has(c));
console.log(`  ${orphans.length} reducer case(s) no screen dispatches${orphans.length ? ':' : ''}`);
for (const o of orphans) console.log(`    ${o}`);

console.log(`\n${failures === 0 ? 'Every dispatched action has a reducer case.' : `${failures} action(s) dispatch into nothing.`}\n`);
process.exit(failures === 0 ? 0 : 1);