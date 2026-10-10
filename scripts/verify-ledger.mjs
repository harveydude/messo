/**
 * Ledger verification.
 *
 * Run with:  node scripts/verify-ledger.mjs
 *
 * This exists because the app's central defect was plausible fiction: figures
 * that looked right and were connected to nothing. A balance sheet whose
 * equation balances proves nothing on its own -- the old one balanced, by hand.
 * What matters is that the figures come *from* the transactions, so these
 * checks test derivation: change the data, the numbers must move, and the
 * books must still balance.
 *
 * No test framework -- this is a prototype and the dependency is not worth it.
 * If it fails, it exits non-zero and prints what broke.
 */

import { deriveLedger, invoiceTotals } from '../src/ledger.js';
import { SEED } from '../src/data/seed.js';
import { CHART_OF_ACCOUNTS } from '../src/data/chartOfAccounts.js';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

let failures = 0;
const check = (label, actual, expected) => {
  const ok = typeof expected === 'number' ? Math.abs(actual - expected) < 0.01 : actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};

const money = (n) => (n < 0 ? `-${Math.abs(n).toFixed(2)}` : n.toFixed(2));
console.log('\n=== Seed books ===');
const L = deriveLedger(SEED);

console.log(`\nCash`);
for (const c of L.cash.byAccount) console.log(`   ${c.name.padEnd(10)} opening ${money(c.opening).padStart(11)}   closing ${money(c.balance).padStart(11)}`);
check('bank total', L.cash.total, 1201 + 800 - 74.36 - 48.2 + 50 - 120 - 900);

console.log(`\nBalance sheet`);
console.log(`   Assets             ${money(L.assets.total).padStart(12)}`);
console.log(`   Liabilities        ${money(L.liabilities.total).padStart(12)}`);
console.log(`   Equity             ${money(L.equity.total).padStart(12)}   (retained ${money(L.equity.retainedEarnings)}, opening ${money(L.equity.opening)}, earnings ${money(L.equity.netIncome)})`);
console.log(`   L + E              ${money(L.liabilitiesAndEquity).padStart(12)}`);
check('the books balance', L.balanced, true);
check('difference is zero', L.difference, 0);

console.log(`\nProfit and loss`);
console.log(`   Income             ${money(L.pnl.income).padStart(12)}`);
console.log(`   Cost of goods sold ${money(L.pnl.cogs).padStart(12)}`);
console.log(`   Expenses           ${money(L.pnl.expenses).padStart(12)}`);
console.log(`   Net income         ${money(L.pnl.netIncome).padStart(12)}`);
// INV-1001 30.00 + INV-1002 80.00 + INV-1003 50.00 earned; expenses are the two
// bills, the electricity bill and payroll.
check('income is the three invoices', L.pnl.income, 160);
check('net income follows from it', L.pnl.netIncome, 160 - 74.36 - 48.2 - 120 - 900);

console.log(`\nOutstanding`);
console.log(`   Receivable         ${money(L.outstanding.receivable).padStart(12)}`);
console.log(`   Payable            ${money(L.outstanding.payable).padStart(12)}`);
console.log(`   Sales tax owed     ${money(L.outstanding.tax).padStart(12)}`);
// INV-1001 32.40 + INV-1002 80.00 open; INV-1003 was settled by a bank match.
check('receivable', L.outstanding.receivable, 32.4 + 80);
check('both bills were matched, so nothing is owed', L.outstanding.payable, 0);
check('tax on the one taxable open invoice', L.outstanding.tax, 2.4);

console.log(`\n=== A transaction has to move the books ===`);

// An uncategorised bank row must be worth nothing until it is reviewed.
const beforeReview = deriveLedger(SEED);
const withRowReviewed = deriveLedger({
  ...SEED,
  bankTxns: SEED.bankTxns.map((t) => (t.id === 5 ? { ...t, state: 'Reviewed', categoryAccountId: 32 } : t)),
});
check('reviewing a bank row moves cash', withRowReviewed.cash.total - beforeReview.cash.total, -35);
check('and still balances afterwards', withRowReviewed.balanced, true);

// Paying an invoice by matching a bank row must clear the receivable.
const beforePay = deriveLedger(SEED);
const withPayment = deriveLedger({
  ...SEED,
  bankTxns: [
    ...SEED.bankTxns,
    { id: 9, date: '2025-10-25', desc: 'Payment - Cool Cars', amount: 32.4, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1001', categoryAccountId: null },
  ],
});
check('paying clears the receivable', withPayment.outstanding.receivable - beforePay.outstanding.receivable, -32.4);
check('and puts the cash in the bank', withPayment.cash.total - beforePay.cash.total, 32.4);
check('and the books still balance', withPayment.balanced, true);

// A draft invoice is not a sale yet.
const withDraft = deriveLedger({
  ...SEED,
  invoices: [...SEED.invoices, { ...SEED.invoices[0], id: 99, no: 'INV-9999', status: 'Draft' }],
});
check('a draft invoice is not income', withDraft.pnl.income, L.pnl.income);
check('a draft invoice is not a receivable', withDraft.outstanding.receivable, L.outstanding.receivable);

// Tax has to actually be taxed.
check('taxable line plus 8%', invoiceTotals(SEED.invoices[0], SEED).total, 32.4);

// A discount must reduce what is owed AND what is earned, by the same amount.
const discountedInvoice = {
  ...SEED.invoices[1],
  id: 50,
  no: 'INV-DISC',
  taxRateId: null,
  lines: [{ productId: 1, desc: 'Design', qty: 1, rate: 100 }],
  discount: { mode: '%', value: 10 },
};
const withDiscount = deriveLedger({ ...SEED, invoices: [...SEED.invoices, discountedInvoice] });

check('a 10% discount on 100 is 90', invoiceTotals(discountedInvoice, SEED).total, 90);
check('and the books still balance with it', withDiscount.balanced, true);
check('a discount must not inflate income', withDiscount.pnl.income, L.pnl.income + 90);

// A discount is an amount, not the number typed into the box. Getting this
// wrong silently over-credits revenue by the whole gross value.
const incomePostings = CHART_OF_ACCOUNTS
  .filter((a) => a.type === 'Income')
  .reduce((s, a) => s + withDiscount.byAccount[a.id].balance, 0);
check('income postings agree with reported income', round2(incomePostings), round2(-withDiscount.pnl.income));

console.log(`\n=== Sub-accounts must not be double counted ===`);
const truck = L.byAccount[8];
check('Truck carries its opening balance', truck.balance, 13495);
check('Original Cost is its breakdown, not a second asset', L.byAccount[9].balance, 0);

console.log(`\n${failures === 0 ? 'All ledger checks passed.' : `${failures} ledger check(s) FAILED.`}\n`);
process.exit(failures === 0 ? 0 : 1);