/**
 * The dashboard, derived.
 *
 * Every card on the home screen was fed from `data/dashboard.json` -- 382 lines
 * of plausible fiction: net profit ₹1,393 "up 673% from prior month", spending
 * ₹1,117 "down 81%", ₹8,347 of income with "8 to review", a donut chart split
 * between Cost of Goods Sold, Legal & Professional Fees and Automobile, none of
 * which had anything to do with the transactions in the app. The percentages
 * were typed in. The trend figures were typed in. The comparison to a "prior
 * month" that contains no data at all was typed in.
 *
 * It is the worst instance of the defect this app is trying to remove, because
 * it is the first screen anyone sees.
 *
 * So the cards are no longer given data. They are given *facts*, derived from
 * the same ledger as every report, and where a number genuinely cannot be known
 * -- a prior period, because this app has no history to compare against -- the
 * card says so rather than inventing a trend.
 */

import { CHART_OF_ACCOUNTS } from './data/chartOfAccounts.js';

/** Donut slice colours, in the order Meso uses them. */
const SLICE_COLORS = ['#0077C5', '#00A699', '#1E3A8A', '#F97316', '#7C3AED', '#0AA574', '#E5346B'];

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Money the bank has moved but nobody has categorised. This is what "N to
 * review" means on the dashboard, and it is the same number the Cash Flow
 * statement flags as the reason the books and the bank disagree.
 */
function reviewQueue(state) {
  const open = state.bankTxns.filter((t) => t.state === 'Uncategorized' || t.state === 'Suggested');
  return {
    count: open.length,
    value: open.reduce((s, t) => s + Math.abs(t.amount), 0),
  };
}

/**
 * The ledger gives every account a movement figure for the period. "Booked" is
 * the part that is in the books; "to review" is the part sitting in the queue.
 * The split is computed rather than drawn at 73/27.
 */
function bookedSplit(ledger, queue) {
  const booked = Math.max(0, ledger.assets.total - queue.value);
  const bookedPercent = booked + queue.value > 0 ? pct(booked, booked + queue.value) : 100;
  return {
    bookedPercent,
    unreviewedPercent: 100 - bookedPercent,
  };
}

/**
 * Trend wording. There is no prior period anywhere in this app, so there is no
 * honest percentage change to show. Saying "no earlier data to compare" is the
 * true statement; "up 673%" was a number with nothing behind it.
 */
function noTrend() {
  return 'No earlier period to compare';
}

/** The full dashboard payload, in the shape the six cards already consume. */
export function buildDashboard(state, ledger) {
  const queue = reviewQueue(state);
  const income = ledger.pnl.income;
  const expenses = ledger.pnl.expenses;
  const netIncome = ledger.pnl.netIncome;

  // Expense mix, largest first, coloured for the donut. Only accounts that
  // actually carry a balance appear -- a slice for an account that spent
  // nothing is a lie told in a circle.
  const expenseAccounts = CHART_OF_ACCOUNTS
    .filter((a) => (a.type === 'Expense' || a.type === 'Cost of Goods Sold') && !a.parentId)
    .map((a) => ({ name: a.name, amount: ledger.balanceOf(a.id) }))
    .filter((c) => c.amount > 0)
    .sort((x, y) => y.amount - x.amount);

  // Everything else folds into "Other" so the donut adds to 100 rather than
  // silently showing a partial circle.
  const top = expenseAccounts.slice(0, 5);
  const rest = expenseAccounts.slice(5).reduce((s, c) => s + c.amount, 0);
  const categories = [
    ...top.map((c, i) => ({ name: c.name, color: SLICE_COLORS[i % SLICE_COLORS.length], percent: pct(c.amount, expenses) })),
    ...(rest > 0 ? [{ name: 'Other', color: SLICE_COLORS[top.length % SLICE_COLORS.length], percent: pct(rest, expenses) }] : []),
  ];

  const incomeSplit = bookedSplit(ledger, queue);
  const expenseSplit = bookedSplit(ledger, queue);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';

  return {
    greeting,

    pnl: {
      period: 'This period',
      title: 'PROFIT & LOSS',
      subtitle: netIncome >= 0 ? 'Net profit for the period to date' : 'Net loss for the period to date',
      amount: formatSigned(netIncome),
      marginBadge: income > 0 ? `${pct(netIncome, income)}%` : '—',
      trendText: noTrend(),
      trendDirection: netIncome >= 0 ? 'up' : 'down',
      income: {
        amount: formatSigned(income),
        label: 'Income',
        bookedPercent: incomeSplit.bookedPercent,
        unreviewedPercent: incomeSplit.unreviewedPercent,
        reviewText: queue.count ? `${plural(queue.count, 'transaction', 'transactions')} to review` : 'Nothing to review',
      },
      expenses: {
        amount: formatSigned(expenses),
        label: 'Expenses',
        bookedPercent: expenseSplit.bookedPercent,
        unreviewedPercent: expenseSplit.unreviewedPercent,
        reviewText: queue.count ? `${plural(queue.count, 'transaction', 'transactions')} to review` : 'Nothing to review',
      },
      footerLink: queue.count ? `Categorize ${plural(queue.count, 'transaction', 'transactions')}` : 'All transactions categorised',
    },

    expenses: {
      period: 'This period',
      title: 'EXPENSES',
      subtitle: 'Spending for the period to date',
      amount: formatSigned(expenses),
      percentBadge: income > 0 ? `${pct(expenses, income)}%` : '—',
      trendText: noTrend(),
      trendDirection: 'down',
      categories: categories.length
        ? categories
        : [{ name: 'No expenses recorded', color: '#9E9E9E', percent: 100 }],
      reviewText: queue.count ? `${plural(queue.count, 'transaction', 'transactions')} to review` : 'Nothing to review',
      footerLink: queue.count ? `Categorize ${plural(queue.count, 'transaction', 'transactions')}` : 'All transactions categorised',
    },

    /**
     * Two balances, and the gap between them, on every account. The bank figure
     * is the institution's; the book figure is derived. The orange line names
     * what is unreviewed rather than leaving the reader to find the
     * discrepancy themselves.
     */
    bank: {
      asOf: 'As of today',
      todaysBalance: formatSigned(ledger.cash.total),
      accounts: ledger.cash.byAccount.map((c) => {
        const feed = state.bankAccounts.find((b) => b.name === c.name);
        const unreviewed = state.bankTxns.filter(
          (t) => t.bankAccountId === feed?.id && (t.state === 'Uncategorized' || t.state === 'Suggested')
        );
        return {
          name: c.name,
          bankBalance: formatSigned(feed ? feed.balance : 0),
          inBooks: formatSigned(c.balance),
          updated: feed?.connected ? 'Connected' : 'Not connected',
          reviewList: unreviewed.length,
        };
      }),
    },

    cashflow: {
      title: 'CASH FLOW TREND',
      amount: formatSigned(ledger.cash.total),
      period: '12 months',
      activeToggle: 'Cash balance',
      // Twelve invented bars were the worst of it. One real figure, and the
      // card says what it is rather than implying a year of history.
      months: [],
      note: queue.count
        ? `${plural(queue.count, 'transaction', 'transactions')} worth ${formatSigned(queue.value)} cleared the bank but is not categorised, so the cash figure will move.`
        : 'Every bank transaction is categorised.',
    },

    accountsPayable: {
      title: 'ACCOUNTS PAYAB...',
      asOf: 'As of today',
      updated: queue.count ? `${plural(queue.count, 'transaction', 'transactions')} awaiting categorisation` : 'All categorised',
      totalLabel: 'Total A/P amount',
      total: formatSigned(ledger.outstanding.payable),
      aging: agingBuckets(state),
      footerLink: 'Go to report',
    },

    /**
     * The sales funnel, stage by stage.
     *
     * "Paid" means settled -- an invoice a bank transaction has been matched to.
     * That is the only definition this app can support: it has no separate
     * concept of a payment sitting undeposited, and inventing one is how the old
     * ₹1,276.15 "Deposited" column came to exist with no mechanism behind it.
     */
    funnel: {
      period: 'This period',
      invoiced: formatSigned(invoicedTotal(state)),
      outstanding: formatSigned(ledger.outstanding.receivable),
      outstandingCount: openInvoiceCount(state),
      paid: formatSigned(settledTotal(state)),
      paidCount: settledCount(state),
      note: 'Paid means matched against a bank transaction.',
      stages: [
        { title: 'Invoiced', value: formatSigned(invoicedTotal(state)) },
        { title: 'Collected', value: formatSigned(settledTotal(state)) },
        { title: 'Still owed', value: formatSigned(ledger.outstanding.receivable) },
        { title: 'Awaiting categorisation', value: formatSigned(queue.value) },
      ],
    },
  };
}

/**
 * Bills that are still owed, banded by how late they are.
 *
 * Aging is the whole question a supplier asks, so it has to come from the due
 * dates. The previous card showed Current 0.00, 1-7 days 755.00, 8-14 days 0.00
 * with a gauge drawn from three hardcoded percentages that summed to the total
 * by coincidence.
 *
 * "Today" is the latest transaction date rather than the wall clock. The seed
 * books are dated 2025 and the system date is not, so ageing every bill against
 * today's real date would put everything decades overdue and teach the reader
 * nothing. Using the book's own date keeps the bands meaningful.
 */
function agingBuckets(state) {
  const open = state.bills.filter((b) => b.status !== 'Paid');
  const asOf = state.bankTxns.reduce((latest, t) => (t.date > latest ? t.date : latest), '');
  const today = asOf ? new Date(`${asOf}T00:00:00`) : new Date();

  const bands = [
    { label: 'Current', max: 0, color: '#2CA01C' },
    { label: '1-7 days', max: 7, color: '#4E9FD4' },
    { label: '8-14 days', max: 14, color: '#E8A33D' },
    { label: '15-30 days', max: 30, color: '#E08A33' },
    { label: 'Over 30 days', max: Infinity, color: '#E5348B' },
  ].map((b) => ({ ...b, amount: 0 }));

  for (const bill of open) {
    const daysLate = Math.floor((today - new Date(`${bill.dueDate}T00:00:00`)) / 86400000);
    const band = bands.find((b) => daysLate <= b.max);
    band.amount += (bill.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }

  return bands.map(({ label, color, amount }) => ({ label, color, amount: round2(amount) }));
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function openInvoiceCount(state) {
  return state.invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft').length;
}

/** Everything ever invoiced and not still a draft. */
function invoicedTotal(state) {
  return round2(
    state.invoices
      .filter((i) => i.status !== 'Draft')
      .reduce((s, i) => s + (i.lines || []).reduce((ls, l) => ls + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0), 0)
  );
}

/** Invoices a bank transaction has been matched to -- i.e. genuinely settled. */
function settledInvoices(state) {
  const refs = new Set(
    state.bankTxns.filter((t) => t.state === 'Match' && t.matchedRef).map((t) => t.matchedRef)
  );
  return state.invoices.filter((i) => refs.has(i.no));
}

const settledTotal = (state) =>
  round2(
    settledInvoices(state).reduce(
      (s, i) => s + (i.lines || []).reduce((ls, l) => ls + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0),
      0
    )
  );

const settledCount = (state) => settledInvoices(state).length;

/**
 * Cards take pre-formatted strings, because they also render a privacy mask
 * that must not have to parse a number. Formatting happens here so there is one
 * rupee formatter in the app rather than six.
 */
function formatSigned(n) {
  return `${n < 0 ? '-' : ''}${formatRupees(Math.abs(Number(n) || 0))}`;
}

/** Indian digit grouping: the lakh and crore separators, as an Indian book needs. */
export function formatRupees(value) {
  return `₹${(Number(value) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}