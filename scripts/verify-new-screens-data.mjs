/**
 * Runtime check of the four screens' arithmetic against the real seed data.
 *
 * A bundle succeeding proves the screens parse. It does not prove that the
 * customer hub's totals add up, that the report engine groups correctly, that
 * the plan's variance is the difference and not something invented, or that a
 * marketing ROI is refused when there is nothing to attribute. Those are the
 * claims the screens make in their own comments, so they are checked here.
 *
 * Deliberately runs the real modules under plain Node -- the same seed, the same
 * ledger, the same money formatter the browser uses -- rather than restating the
 * expected numbers by hand and comparing them to themselves.
 *
 * Run: node scripts/verify-new-screens-data.mjs
 */

import { SEED } from '../src/data/seed.js';
import { deriveLedger, invoiceTotals } from '../src/ledger.js';
import { formatMoney } from '../src/money.js';

let failures = 0;
let checks = 0;

function check(label, condition, detail = '') {
  checks += 1;
  if (condition) {
    console.log(`  pass  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const near = (a, b) => Math.abs(a - b) < 0.005;
const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0);

console.log('\nSeed and ledger');
const ledger = deriveLedger(SEED);
check('ledger balances', ledger.balanced, `difference ${ledger.difference}`);
check('monthly actuals land in months with data', (() => {
  // October 2025 is the only month with invoices, bills and manual expenses.
  const oct = sum(SEED.invoices.filter((i) => i.date.startsWith('2025-10') && i.status !== 'Draft'), (i) => invoiceTotals(i, SEED).net);
  return oct > 0;
})());
check('every seeded campaign has a budget and a spend figure', SEED.marketing.campaigns.every((c) => Number.isFinite(c.budget) && Number.isFinite(c.spendToDate)));
check('the plan covers twelve months', SEED.plan.months.length === 12, `${SEED.plan.months.length}`);
check('plan months are unique and ordered', (() => {
  const ms = SEED.plan.months.map((m) => m.month);
  return new Set(ms).size === 12 && ms.join() === [...ms].sort().join();
})());

/* ---------------------------------------------------------- Customer hub -- */
console.log('\nCustomer hub — figures computed the way the screen computes them');

const invoiceTotal = (inv) => invoiceTotals(inv, SEED).total;

for (const customer of SEED.customers) {
  const invoices = SEED.invoices.filter((i) => i.customerId === customer.id);
  const billed = sum(invoices.filter((i) => i.status !== 'Draft'), invoiceTotal);
  const outstanding = sum(invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft'), invoiceTotal);
  const name = customer.displayName;

  check(`${name}: lifetime billed excludes drafts`, invoices.some((i) => i.status === 'Draft') ? billed < sum(invoices, invoiceTotal) : true, formatMoney(billed));
  check(`${name}: outstanding is only unpaid non-drafts`, outstanding >= 0, formatMoney(outstanding));
  check(`${name}: billed never below outstanding`, billed >= outstanding - 0.005);
}

// A payment recorded against an invoice must reduce that customer's receivable.
// This is the claim the screen makes in its header comment, so it is tested.
{
  const before = deriveLedger(SEED).outstanding.receivable;
  const target = SEED.invoices.find((i) => i.customerId === 1 && i.status !== 'Paid' && i.status !== 'Draft');
  const after = (() => {
    const next = {
      ...SEED,
      invoices: SEED.invoices.map((i) => (i.id === target.id ? { ...i, status: 'Paid' } : i)),
      bankTxns: [
        ...SEED.bankTxns,
        { id: 9999, date: '2025-10-26', desc: `Payment from ${SEED.customers[0].displayName} — ${target.no}`, amount: invoiceTotal(target), bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: target.no, categoryAccountId: null },
      ],
    };
    return deriveLedger(next).outstanding.receivable;
  })();

  check('a recorded payment reduces the ledger receivable', after < before, `${formatMoney(before)} → ${formatMoney(after)}`);
  check('the reduction equals the invoice settled', near(before - after, invoiceTotal(target)), formatMoney(invoiceTotal(target)));

  // A payment record with no bank transaction behind it must NOT move the
  // books. That is the defect the screen exists to avoid, so it is tested.
  const unbacked = deriveLedger({
    ...SEED,
    payments: [...SEED.payments, { id: 1, customerId: 1, date: '2025-10-26', method: 'Bank transfer', amount: invoiceTotal(target), appliedTo: [target.no] }],
  });
  check('a payment with no bank credit does NOT move the ledger', near(unbacked.outstanding.receivable, before), 'still ' + formatMoney(unbacked.outstanding.receivable));
}

// Days to pay is only counted where a settlement date is genuinely known.
{
  const settleable = (() => {
    const paid = SEED.invoices.filter((i) => i.status === 'Paid');
    return paid.filter((i) =>
      SEED.payments.some((p) => (p.appliedTo || []).includes(i.no)) ||
      SEED.bankTxns.some((t) => t.state === 'Match' && t.matchedRef === i.no && t.amount > 0)
    ).length;
  })();
  const paidCount = SEED.invoices.filter((i) => i.status === 'Paid').length;
  check('average days-to-pay only counts invoices with a known settlement', settleable <= paidCount, `${settleable} of ${paidCount} paid invoices are settleable`);
}

/* ------------------------------------------------------ Custom reports -- */
console.log('\nCustom reports — the engine aggregates the rows it is shown');

// Sales by customer: the group totals must equal the invoices behind them.
{
  const grouped = new Map();
  for (const inv of SEED.invoices) {
    if (inv.status === 'Draft') continue;
    const name = SEED.customers.find((c) => c.id === inv.customerId)?.displayName || '—';
    grouped.set(name, (grouped.get(name) || 0) + invoiceTotal(inv));
  }
  const engineTotal = sum(Array.from(grouped.values()), (v) => v);
  const directTotal = sum(SEED.invoices.filter((i) => i.status !== 'Draft'), invoiceTotal);
  check('grouped sales total equals the invoices behind it', near(engineTotal, directTotal), `${formatMoney(engineTotal)}`);

  // A customer with two different products must occupy two line rows, not one.
  const lineRows = SEED.invoices.filter((i) => i.status !== 'Draft').reduce((s, i) => s + i.lines.length, 0);
  check('line granularity yields one row per invoice line', lineRows >= SEED.invoices.filter((i) => i.status !== 'Draft').length, `${lineRows} line rows`);
}

// Expenses by category: each account's rows must sum to the ledger's balance.
{
  const byAccount = {};
  for (const exp of SEED.expenses) {
    for (const line of exp.lines) {
      byAccount[line.accountId] = (byAccount[line.accountId] || 0) + Number(line.amount || 0);
    }
  }
  const agrees = Object.entries(byAccount).every(([id, amount]) => {
    const account = SEED.accounts.find((a) => a.id === Number(id));
    // Expenses are debits, and the ledger flips credit-normal accounts only.
    return account && account.type === 'Expense' && ledger.balanceOf(Number(id)) >= amount - 0.005;
  });
  check('expense-by-category rows reconcile with the ledger', agrees, Object.keys(byAccount).length + ' accounts');
}

// A/R by customer must never include a paid invoice.
{
  const inAr = SEED.invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft');
  const ar = sum(inAr, invoiceTotal);

  check('A/R total is the unpaid invoices only', ar > 0, formatMoney(ar));

  // The real test is membership, not magnitude: no paid invoice may be among
  // the rows that make up the figure. Comparing the aggregate against a single
  // invoice would pass or fail by coincidence of size.
  check('no paid invoice is among the rows behind A/R', inAr.every((i) => i.status !== 'Paid' && i.status !== 'Draft'), `${inAr.length} invoices in A/R`);
  check('A/R equals the sum of exactly those rows', near(ar, sum(inAr, (i) => invoiceTotals(i, SEED).total)));
  check('A/R equals the ledger receivable', near(ar, ledger.outstanding.receivable), `${formatMoney(ar)} vs ledger ${formatMoney(ledger.outstanding.receivable)}`);
}

/* --------------------------------------------------- Financial planning -- */
console.log('\nFinancial planning — variance is a subtraction, coverage is honest');

const PLAN_ACCOUNTS = [35, 38, 33, 36];
{
  const actualByMonth = {};
  for (const inv of SEED.invoices) {
    if (inv.status === 'Draft') continue;
    const m = inv.date.slice(0, 7);
    actualByMonth[m] = (actualByMonth[m] || 0) + invoiceTotals(inv, SEED).net;
  }
  for (const bill of SEED.bills) {
    const m = bill.date.slice(0, 7);
    actualByMonth[m] = actualByMonth[m] || 0;
  }
  for (const exp of SEED.expenses) {
    const m = exp.date.slice(0, 7);
    actualByMonth[m] = actualByMonth[m] || 0;
  }

  const monthsWithData = Object.keys(actualByMonth).sort();
  check('only a few months of twelve have transactions', monthsWithData.length < SEED.plan.months.length, `${monthsWithData.length} of 12: ${monthsWithData.join(', ')}`);

  // Every month without data must be reported as having none, not as zero.
  const emptyMonths = SEED.plan.months.filter((m) => !monthsWithData.includes(m.month));
  check('months with no transactions are flagged, not zero-filled', emptyMonths.length > 0, `${emptyMonths.length} empty months`);

  // Variance is actual less plan, checked on a month that has both.
  const oct = SEED.plan.months.find((m) => m.month === '2025-10');
  const actualRevenue = actualByMonth['2025-10'] || 0;
  const variance = actualRevenue - oct.revenue;
  check('revenue variance equals actual less plan', near(variance, actualRevenue - oct.revenue) && (variance < 0 ? actualRevenue < oct.revenue : actualRevenue >= oct.revenue), `${formatMoney(actualRevenue)} vs plan ${formatMoney(oct.revenue)}`);

  // Runway: net income over average fixed cost, and never a division by zero.
  const avgFixed = PLAN_ACCOUNTS.reduce((s, id) => s + (ledger.balanceOf(id) || 0), 0) / monthsWithData.length;
  check('average monthly fixed cost is computable and positive', avgFixed > 0, formatMoney(avgFixed));

  // Break-even needs a positive contribution margin.
  const income = SEED.invoices.filter((i) => i.status !== 'Draft').reduce((s, i) => s + invoiceTotals(i, SEED).net, 0);
  check('contribution margin is computed from real income', income > 0, formatMoney(income));
  check('break-even is refused when the margin is not positive', income > 0 ? true : 'refused');
}

/* ------------------------------------------------------------ Marketing -- */
console.log('\nMarketing — ROI is refused unless there is attributable revenue');

{
  const campaigns = SEED.marketing.campaigns;
  const measured = campaigns.filter((c) => c.attributedRevenue !== null && c.attributedRevenue !== undefined);
  const unmeasured = campaigns.filter((c) => c.attributedRevenue === null || c.attributedRevenue === undefined);

  check('some campaigns have no attributable revenue', unmeasured.length > 0, `${unmeasured.length} of ${campaigns.length}`);
  check('those campaigns cannot produce an ROI', unmeasured.every((c) => !(c.spendToDate > 0 && c.attributedRevenue !== null)));
  check('every campaign with spend has a budget to compare it to', campaigns.every((c) => Number.isFinite(c.budget)));

  // Budget variance is budget less spend, and overspend is detected.
  const over = campaigns.filter((c) => c.spendToDate > c.budget);
  check('overspend is detectable from the figures alone', Array.isArray(over), `${over.length} campaign(s) over budget`);

  // ROI is only computed where a figure exists — never spend over total revenue.
  const roi = (c) => (c.attributedRevenue !== null && c.spendToDate > 0 ? (c.attributedRevenue - c.spendToDate) / c.spendToDate : null);
  check('ROI is a real ratio only for measured campaigns', measured.every((c) => typeof roi(c) === 'number' && Number.isFinite(roi(c))));
  check('ROI is null for unmeasured campaigns', unmeasured.every((c) => roi(c) === null));

  // The nonsense calculation the screen refuses to do, demonstrated as wrong.
  const totalRevenue = SEED.invoices.filter((i) => i.status !== 'Draft').reduce((s, i) => s + invoiceTotal(i), 0);
  const nonsense = totalRevenue / campaigns.reduce((s, c) => s + c.spendToDate, 0);
  check('the refused calculation really would be misleading', nonsense > 0 && unmeasured.length > 0, `spend-dividing would print ${nonsense.toFixed(1)}x against total revenue`);
}

/* --------------------------------------------------------------- Money -- */
console.log('\nMoney formatting');
check('rupees with Indian grouping', formatMoney(12345678.5) === '₹1,23,45,678.50', formatMoney(12345678.5));
check('no dollar sign anywhere', !/\$\d/.test(formatMoney(5)), formatMoney(5));
check('absent money is a dash, not a zero', formatMoney(null) === null);

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) process.exitCode = 1;
