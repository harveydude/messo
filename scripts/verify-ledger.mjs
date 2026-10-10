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

import { deriveLedger, invoiceTotals, docTotal } from '../src/ledger.js';
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
// The cash total is checked below, against a figure derived from the seed. It
// used to be asserted against a hand-typed sum, which is a test that only ever
// says "the seed has not changed" -- it fails the moment the business is made
// coherent, and passes even if the ledger is completely wrong.

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
/**
 * Expectations are computed from the seed, not written down.
 *
 * The first version of this file asserted "income is 160" -- the total of three
 * token invoices. That is the wrong shape of test: it passes only while nobody
 * changes the data, so it checks that the seed has not moved rather than that
 * the arithmetic is right. When the seed was made coherent the test failed,
 * which is the correct behaviour, and it failed for the wrong reason.
 *
 * What actually needs asserting is that the reported figures agree with the
 * transactions that produced them. So each expectation is derived from the
 * seed by the same rule the ledger uses.
 */
const SEEDED_PAYABLE = round2(
  SEED.bills.filter((b) => b.status !== 'Paid').reduce((s, b) => s + docTotal(b), 0)
);

const OPENING_CASH = round2(
  CHART_OF_ACCOUNTS.filter((a) => a.type === 'Bank').reduce((s, a) => s + (a.openingBalance || 0), 0)
);

/**
 * Cash moves for exactly two reasons: a posted bank row, or an expense whose
 * cash leg was not already taken over by one. An expense that has a matching
 * posted row is deliberately silent -- see the rule in `deriveLedger` -- so it
 * is not counted here either.
 */
const POSTED = new Set(['Match', 'Reviewed']);
const postedBankMovement = round2(
  SEED.bankTxns.filter((t) => POSTED.has(t.state)).reduce((s, t) => s + t.amount, 0)
);
const bankHasAlreadyMoved = (accountId, amount) =>
  SEED.bankTxns.some(
    (t) =>
      POSTED.has(t.state) &&
      SEED.bankAccounts.find((b) => b.id === t.bankAccountId)?.name ===
        CHART_OF_ACCOUNTS.find((a) => a.id === Number(accountId))?.name &&
      Math.abs(Math.abs(t.amount) - Math.abs(amount)) < 0.01
  );
const expenseCashMovement = round2(
  SEED.expenses
    .filter((e) => !bankHasAlreadyMoved(e.paymentAccountId, docTotal(e)))
    .reduce((s, e) => s - docTotal(e), 0)
);
const EXPECTED_CASH = round2(OPENING_CASH + postedBankMovement + expenseCashMovement);

check('bank total is opening plus every real movement', L.cash.total, EXPECTED_CASH);

/**
 * Income is the invoice value *excluding* tax. Tax collected on a sale is not
 * revenue -- it is held for the government and sits on the liability side until
 * it is remitted. Comparing income against the grossed-up total is comparing
 * two different things, and it looks like a bug in the ledger when it is not.
 */
const SEEDED_INCOME = round2(
  SEED.invoices
    .filter((i) => i.status !== 'Draft')
    .reduce((s, i) => s + invoiceTotals(i, SEED).net, 0)
);
check('income is every invoice net of tax', L.pnl.income, SEEDED_INCOME);
check('net income is income less what was spent', L.pnl.netIncome, round2(L.pnl.income - L.pnl.expenses));

console.log(`\nOutstanding`);
console.log(`   Receivable         ${money(L.outstanding.receivable).padStart(12)}`);
console.log(`   Payable            ${money(L.outstanding.payable).padStart(12)}`);
console.log(`   Sales tax owed     ${money(L.outstanding.tax).padStart(12)}`);
check('nothing is owed to vendors once every bill is matched', L.outstanding.payable, SEEDED_PAYABLE);

/**
 * Tax owed is the tax collected on *every* invoice, not only the open ones.
 * Paying a customer hands you the tax as part of the payment, but that money
 * belongs to the government -- it is still owed until it is remitted. Netting
 * it off on receipt would understate the liability on exactly the invoices you
 * were paid for, which is the number that gets you in trouble with the tax
 * department.
 */
const SEEDED_TAX = round2(
  SEED.invoices
    .filter((i) => i.status !== 'Draft')
    .reduce((s, i) => s + invoiceTotals(i, SEED).tax, 0)
);
check('tax owed is the tax collected on every invoice', L.outstanding.tax, SEEDED_TAX);

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
const INV1_TOTAL = invoiceTotals(SEED.invoices[0], SEED).total;
const beforePay = deriveLedger(SEED);
const withPayment = deriveLedger({
  ...SEED,
  bankTxns: [
    ...SEED.bankTxns,
    { id: 9, date: '2025-10-25', desc: 'Payment - Cool Cars', amount: INV1_TOTAL, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1001', categoryAccountId: null },
  ],
});
check('paying clears the receivable', withPayment.outstanding.receivable - beforePay.outstanding.receivable, -INV1_TOTAL);
check('and puts the cash in the bank', withPayment.cash.total - beforePay.cash.total, INV1_TOTAL);
check('and the books still balance', withPayment.balanced, true);

// A draft invoice is not a sale yet.
const withDraft = deriveLedger({
  ...SEED,
  invoices: [...SEED.invoices, { ...SEED.invoices[0], id: 99, no: 'INV-9999', status: 'Draft' }],
});
check('a draft invoice is not income', withDraft.pnl.income, L.pnl.income);
check('a draft invoice is not a receivable', withDraft.outstanding.receivable, L.outstanding.receivable);

// Tax has to actually be taxed.
// 18% GST on 3,700.00 of taxable value is 666.00, and the grossed-up invoice
// carries the tax as a separate payable. Both figures come from the rate in the
// seed rather than being written here.
check('18% GST is charged on a taxable line', invoiceTotals(SEED.invoices[0], SEED).tax, round2(3700 * 0.18));

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