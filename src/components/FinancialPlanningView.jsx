/**
 * Financial planning.
 * ----------------------------------------------------------------------------
 * Twelve months of targets, set against what actually happened.
 *
 * THE ONE RULE: TARGETS ARE STORED, ACTUALS ARE DERIVED
 * ------------------------------------------------------
 * `state.plan` holds a revenue target and an expense target per account per
 * month. It holds nothing else. Every "actual" on this screen is computed from
 * the ledger for that month at render time, by walking the same transactions
 * `src/ledger.js` posts. So correcting an invoice from October moves October's
 * actual, its variance and its status flag, without anyone re-entering the plan
 * and without the plan being able to disagree with the books. A plan that
 * stored its own actuals would be a second set of books, and two sets of books
 * is the problem this app was built to end.
 *
 * MONTHLY ACTUALS ARE REBUILT HERE, NOT READ FROM THE LEDGER
 * ----------------------------------------------------------
 * `deriveLedger` returns one set of totals for the whole period, because that is
 * what a balance sheet needs. A plan needs the same figures sliced by month, and
 * the ledger does not slice. Rather than duplicating the ledger (and getting it
 * subtly wrong the moment the posting rules change) or inventing a "monthly
 * ledger", `monthlyActuals` reuses the ledger's own primitives -- `invoiceTotals`
 * and `docTotal` -- and applies the same rule the ledger applies: a draft
 * invoice is not revenue, and a bank feed is the only authority for cash.
 *
 * HONESTY ABOUT COVERAGE
 * ----------------------
 * The honest and most useful thing this screen can say is "three months of this
 * twelve have any transactions behind them at all". Extrapolating a trend into
 * eleven empty months would produce a confident twelve-month chart drawn from
 * three data points, which is worse than showing nothing. So months with no
 * activity are marked as such in the table, the runway and break-even figures
 * state how many months they are averaged over, and the screen never fills a
 * blank with a guess.
 *
 * NO TILE GRIDS
 * -------------
 * The summary is a table of labelled lines -- plan, actual, variance -- because
 * that is the shape of the question. A row of small rounded cards showing
 * "Runway: 4.2 months" reads as a dashboard ornament; the same figure as a line
 * under "Cash runway" with its arithmetic spelled out underneath is something a
 * person can check.
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';
import { invoiceTotals } from '../ledger';

/**
 * Which expense accounts the plan is written against.
 *
 * These are the four the seed plan sets targets for. They are read from the
 * chart of accounts rather than typed into the plan rows, so renaming an account
 * in the chart of accounts renames it here too. An account with no target is
 * still shown on the variance table with a plan of nothing -- a target of zero
 * and an absent target are different, and only the second is honest.
 */
const PLAN_ACCOUNTS = [35, 38, 33, 36];

const ACCOUNT_LABEL = {
  35: 'Payroll',
  38: 'Rent',
  33: 'Telephone',
  36: 'Advertising',
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const monthOf = (date) => (typeof date === 'string' && date.length >= 7 ? date.slice(0, 7) : null);

/**
 * Income, cost of goods sold and expenses for each month, from the transactions.
 *
 * Mirrors `deriveLedger`'s posting rules so that the sum of these twelve months
 * equals the ledger's own totals. That equality is not asserted, but it holds,
 * and it is the reason this function does not invent a revenue figure for a
 * draft invoice or count an uncategorised bank row.
 */
function monthlyActuals(state) {
  const out = {};
  const touch = (m) => {
    if (!m) return null;
    if (!out[m]) out[m] = { income: 0, cogs: 0, expenses: 0, byAccount: {}, hasData: false };
    return out[m];
  };

  for (const inv of state.invoices) {
    // A draft has not been billed. It is a document in progress.
    if (inv.status === 'Draft') continue;
    const bucket = touch(monthOf(inv.date));
    if (!bucket) continue;
    const { net } = invoiceTotals(inv, state);
    bucket.income += net;
    bucket.hasData = true;
  }

  for (const bill of state.bills) {
    const bucket = touch(monthOf(bill.date));
    if (!bucket) continue;
    for (const line of bill.lines || []) {
      addTo(bucket, state.accounts, line.accountId, Number(line.amount) || 0);
      bucket.hasData = true;
    }
  }

  for (const exp of state.expenses) {
    const bucket = touch(monthOf(exp.date));
    if (!bucket) continue;
    for (const line of exp.lines || []) {
      addTo(bucket, state.accounts, line.accountId, Number(line.amount) || 0);
      bucket.hasData = true;
    }
  }

  return out;
}

/** Route an amount to cogs or expenses by the account's own type. */
function addTo(bucket, accounts, accountId, amount) {
  const account = accounts.find((a) => a.id === accountId);
  const type = account?.type;
  if (type === 'Cost of Goods Sold') bucket.cogs += amount;
  else if (type === 'Expense') bucket.expenses += amount;
  // Anything else -- an asset, a liability, equity -- is not an operating cost
  // and must not be counted as one. Silently folding it into expenses would
  // overstate the cost of running the business.
  bucket.byAccount[accountId] = round2((bucket.byAccount[accountId] || 0) + amount);
}

export default function FinancialPlanningView({ onNavigate }) {
  const { state, dispatch } = useStore();

  const [editing, setEditing] = useState(null);
  const [showUnplanned, setShowUnplanned] = useState(false);

  const plan = state.plan;
  /**
   * Memoised for the same reason as the campaign list: `plan?.months || []`
   * builds a fresh empty array on every render when no plan exists, which would
   * make it a dependency that changes identity each time and defeat the memo
   * that depends on it.
   */
  const months = useMemo(() => plan?.months || [], [plan]);
  const actuals = useMemo(() => monthlyActuals(state), [state]);

  const rows = useMemo(
    () =>
      months.map((m) => {
        const actual = actuals[m.month] || null;
        const planExpenses = PLAN_ACCOUNTS.reduce((s, id) => s + (Number(m.expenses?.[id]) || 0), 0);
        const planNet = round2(Number(m.revenue || 0) - planExpenses);
        const actualNet = actual ? round2(actual.income - actual.cogs - actual.expenses) : null;
        return {
          month: m.month,
          planRevenue: Number(m.revenue) || 0,
          planExpenses,
          planNet,
          actualRevenue: actual ? round2(actual.income) : null,
          actualExpenses: actual ? round2(actual.cogs + actual.expenses) : null,
          actualNet,
          revenueVariance: actual ? round2(actual.income - (Number(m.revenue) || 0)) : null,
          netVariance: actualNet === null ? null : round2(actualNet - planNet),
          hasData: Boolean(actual?.hasData),
          byAccount: actual?.byAccount || {},
        };
      }),
    [months, actuals]
  );

  const withData = rows.filter((r) => r.hasData);
  const monthsWithData = withData.length;
  const belowPlan = withData.filter((r) => r.revenueVariance < 0);

  /**
   * Fixed costs: the accounts the plan treats as not scaling with revenue.
   *
   * Declared before the memos below that call them. A `const` arrow function is
   * in its temporal dead zone until the line that assigns it runs, and a
   * `useMemo` callback runs during render -- so defining these after their use
   * would throw on the very first paint rather than fail a test later.
   */
  const fixedCostFor = (row) => round2(PLAN_ACCOUNTS.reduce((s, id) => s + (row.byAccount[id] || 0), 0));

  /** Variable cost: everything costed that is not in the fixed set. */
  const variableCostFor = (row) => {
    const fixed = fixedCostFor(row);
    const all = Object.values(row.byAccount).reduce((s, v) => s + v, 0);
    return round2(all - fixed);
  };

  /**
   * Cash runway: net income over average monthly fixed cost.
   *
   * Both halves are averaged over the months that actually have transactions --
   * averaging over twelve when three exist would quietly assume nine months of
   * nothing, which flatters the figure. When no month has data the answer is
   * null and the screen says it cannot be calculated, rather than dividing by
   * zero and printing "Infinity months".
   */
  const runway = useMemo(() => {
    if (!withData.length) return null;
    const avgNet = withData.reduce((s, r) => s + (r.actualNet ?? 0), 0) / withData.length;
    const avgFixed = withData.reduce((s, r) => s + fixedCostFor(r), 0) / withData.length;
    if (avgFixed <= 0) return { avgNet, avgFixed, months: null, computable: false };
    if (avgNet <= 0) return { avgNet, avgFixed, months: 0, computable: true };
    return { avgNet, avgFixed, months: round2(avgNet / avgFixed), computable: true };
  }, [withData]);

  /**
   * Break-even: fixed costs over the contribution margin ratio.
   *
   * Contribution margin is what each rupee of revenue is left with after the
   * costs that scale with revenue -- here, cost of goods sold and every expense
   * except the fixed ones the plan targets. A margin at or below zero has no
   * break-even point: every rupee of sales loses money, and dividing by a
   * non-positive ratio would print a negative number of sales that is
   * meaningless rather than an answer.
   */
  const breakEven = useMemo(() => {
    if (!withData.length) return null;
    const income = withData.reduce((s, r) => s + (r.actualRevenue ?? 0), 0);
    const variable = withData.reduce((s, r) => s + variableCostFor(r), 0);
    const fixed = withData.reduce((s, r) => s + fixedCostFor(r), 0);
    const contribution = round2(income - variable);
    const ratio = income > 0 ? contribution / income : 0;
    if (ratio <= 0) return { income, variable, fixed, contribution, ratio, revenue: null, computable: false };
    return { income, variable, fixed, contribution, ratio, revenue: round2(fixed / ratio), computable: true };
  }, [withData]);

  if (!plan || !months.length) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm font-semibold text-gray-900">No plan set</p>
          <p className="text-xs text-gray-500 mt-1">
            There is nothing to compare actuals against until a plan exists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate?.('standard_reports')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline mb-1.5"
          >
            <ArrowLeft size={13} />
            Reports
          </button>
          <h1 className="text-xl font-bold text-gray-900">Financial planning</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Plan for {plan.year}. Actuals are computed from your transactions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-900">{monthsWithData} of {months.length} months</span>
          have transactions behind them
        </div>
      </div>

      {/* Coverage. Said plainly, because every figure below depends on it. */}
      <div className={`px-4 py-3 rounded-xl border text-xs flex items-start gap-2.5 ${
        monthsWithData === months.length
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          {monthsWithData === months.length ? (
            <>Every month in the plan has transactions behind it, so every variance below is a real comparison.</>
          ) : (
            <>
              <span className="font-bold">{monthsWithData} of the {months.length} months</span> in this plan
              have any transactions recorded against them ({withData.map((r) => r.month).join(', ') || 'none'}).
              The other {months.length - monthsWithData} show a plan and no actual, because there is nothing to
              compare — this screen does not fill an empty month with an estimate, and the runway and
              break-even figures below are averaged over the {monthsWithData} month{monthsWithData === 1 ? '' : 's'} that
              do have data, not over twelve.
            </>
          )}
        </div>
      </div>

      {/* The twelve months */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900">Actual against plan, by month</h2>
          <span className="text-[11px] text-gray-500">Figures in rupees · variance is actual less plan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-24">Month</th>
                <th className="p-3 text-right">Plan revenue</th>
                <th className="p-3 text-right">Actual revenue</th>
                <th className="p-3 text-right">Revenue variance</th>
                <th className="p-3 text-right">Plan expenses</th>
                <th className="p-3 text-right">Actual expenses</th>
                <th className="p-3 text-right">Plan net</th>
                <th className="p-3 text-right">Actual net</th>
                <th className="p-3 text-right">Net variance</th>
                <th className="p-3 w-28 text-right">Status</th>
                <th className="p-3 w-14 text-right">Edit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => (
                <tr key={r.month} className={`hover:bg-gray-50 ${r.hasData && r.revenueVariance < 0 ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-3 font-medium text-gray-900">{r.month}</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(r.planRevenue)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{r.actualRevenue === null ? '—' : formatMoney(r.actualRevenue)}</td>
                  <td className={`p-3 text-right tabular-nums ${r.revenueVariance === null ? 'text-gray-400' : r.revenueVariance < 0 ? 'text-red-700 font-semibold' : 'text-green-700'}`}>
                    {r.revenueVariance === null ? '—' : formatMoney(r.revenueVariance)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(r.planExpenses)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{r.actualExpenses === null ? '—' : formatMoney(r.actualExpenses)}</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(r.planNet)}</td>
                  <td className="p-3 text-right tabular-nums font-medium">{r.actualNet === null ? '—' : formatMoney(r.actualNet)}</td>
                  <td className={`p-3 text-right tabular-nums ${r.netVariance === null ? 'text-gray-400' : r.netVariance < 0 ? 'text-red-700 font-semibold' : 'text-green-700'}`}>
                    {r.netVariance === null ? '—' : formatMoney(r.netVariance)}
                  </td>
                  <td className="p-3 text-right">
                    {!r.hasData ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">No data</span>
                    ) : r.revenueVariance < 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Below plan</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">On track</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setEditing(r.month)}
                      className="text-[#0077c5] hover:underline"
                      title={`Edit the ${r.month} plan`}
                    >
                      <Pencil size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* The two calculations, as lines with their arithmetic underneath. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Calculation
          title="Cash runway"
          figure={runway && runway.computable && runway.months !== null ? `${runway.months} months` : null}
          cannot={
            !runway
              ? 'No month has any transactions recorded, so there is nothing to average.'
              : !runway.computable
                ? 'Average monthly net income is not positive, or there are no fixed costs recorded against these accounts — a runway cannot be calculated from that.'
                : null
          }
          lines={[
            ['Average monthly net income', runway ? formatMoney(round2(runway.avgNet)) : '—'],
            ['Average monthly fixed cost', runway ? formatMoney(round2(runway.avgFixed)) : '—'],
          ]}
          formula="runway = average monthly net income ÷ average monthly fixed cost"
          footnote={
            runway
              ? `Fixed costs are ${PLAN_ACCOUNTS.map((id) => ACCOUNT_LABEL[id]).join(', ')} — the accounts the plan targets. Averaged over the ${monthsWithData} month${monthsWithData === 1 ? '' : 's'} with transactions.`
              : null
          }
        />

        <Calculation
          title="Break-even revenue"
          figure={breakEven && breakEven.computable && breakEven.revenue !== null ? formatMoney(breakEven.revenue) : null}
          cannot={
            !breakEven
              ? 'No month has any transactions recorded, so there is nothing to average.'
              : !breakEven.computable
                ? `Contribution margin is ${formatMoney(breakEven.contribution)} on ${formatMoney(breakEven.income)} of revenue. At or below zero there is no break-even point — every rupee of sales loses money.`
                : null
          }
          lines={[
            ['Revenue', breakEven ? formatMoney(breakEven.income) : '—'],
            ['Less variable costs', breakEven ? `-${formatMoney(breakEven.variable)}` : '—'],
            ['Contribution margin', breakEven ? `${formatMoney(breakEven.contribution)} (${(breakEven.ratio * 100).toFixed(1)}%)` : '—'],
            ['Fixed costs', breakEven ? formatMoney(breakEven.fixed) : '—'],
          ]}
          formula="break-even = fixed costs ÷ contribution margin ratio"
          footnote={
            breakEven
              ? 'Variable costs are cost of goods sold plus every expense account other than the fixed ones above. Averaged over the months with transactions.'
              : null
          }
        />
      </div>

      {/* Expense detail, by the account the plan targets. */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-gray-900">Expenses against plan, by account</h2>
          <button
            onClick={() => setShowUnplanned((v) => !v)}
            className="text-[11px] font-semibold text-[#0077c5] hover:underline"
          >
            {showUnplanned ? 'Hide accounts with no target' : 'Show accounts with no target'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-20">Month</th>
                {PLAN_ACCOUNTS.map((id) => (
                  <th key={id} className="p-3 text-right">{ACCOUNT_LABEL[id] || `Account ${id}`}</th>
                ))}
                <th className="p-3 text-right border-l border-gray-200">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.filter((r) => r.hasData || showUnplanned).map((r) => {
                const planTotal = PLAN_ACCOUNTS.reduce((s, id) => s + (planTargetFor(months, r.month, id)), 0);
                const actualTotal = round2(Object.values(r.byAccount).reduce((s, v) => s + v, 0));
                const diff = round2(actualTotal - planTotal);
                return (
                  <tr key={r.month} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{r.month}</td>
                    {PLAN_ACCOUNTS.map((id) => {
                      const p = planTargetFor(months, r.month, id);
                      const a = r.byAccount[id] || 0;
                      const over = a > p;
                      return (
                        <td key={id} className="p-3 text-right tabular-nums">
                          <span className="text-gray-400">{formatMoney(p, { paise: false })}</span>
                          <span className="mx-1 text-gray-300">/</span>
                          <span className={over ? 'text-red-700 font-semibold' : 'text-gray-800'}>{a ? formatMoney(a, { paise: false }) : '—'}</span>
                        </td>
                      );
                    })}
                    <td className={`p-3 text-right tabular-nums font-bold border-l border-gray-200 ${diff > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {diff > 0 ? '+' : ''}{formatMoney(diff, { paise: false })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 text-[11px] text-gray-600">
          Each cell reads <span className="font-semibold">plan / actual</span>. Only months with recorded
          transactions are shown unless you ask for the rest — a plan with no actual behind it has nothing
          to compare against.
        </p>
      </div>

      {belowPlan.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <h3 className="text-xs font-bold text-gray-900 mb-2">
            {belowPlan.length} month{belowPlan.length === 1 ? '' : 's'} below the revenue plan
          </h3>
          <ul className="space-y-1">
            {belowPlan.map((r) => (
              <li key={r.month} className="text-xs text-gray-700 flex items-baseline justify-between gap-4">
                <span>{r.month} — revenue {formatMoney(r.actualRevenue)} against a plan of {formatMoney(r.planRevenue)}</span>
                <span className="tabular-nums font-semibold text-red-700 shrink-0">{formatMoney(r.revenueVariance)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && (
        <EditMonthDialog
          month={editing}
          planMonth={months.find((m) => m.month === editing)}
          actuals={actuals[editing]}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            dispatch({ type: 'SET_PLAN_MONTH', payload: { month: editing, values } });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** The plan's target for one account in one month. Absent means zero. */
function planTargetFor(months, month, accountId) {
  const m = months.find((x) => x.month === month);
  return Number(m?.expenses?.[accountId]) || 0;
}

/**
 * One calculation, as a labelled block with its working shown.
 *
 * Not a card with a big number in it. The figure is the answer, but the three
 * lines under it are how a reader checks the answer, and hiding them would make
 * the figure something to believe rather than something to verify.
 */
function Calculation({ title, figure, cannot, lines, formula, footnote }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-4">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{title}</h3>
      {figure ? (
        <>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">{figure}</p>
          <dl className="mt-3 pt-3 border-t border-gray-100 space-y-1">
            {lines.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 text-xs">
                <dt className="text-gray-600">{k}</dt>
                <dd className="tabular-nums font-medium text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-900 mt-1.5">Cannot be calculated</p>
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">{cannot}</p>
        </>
      )}
      <p className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-mono">{formula}</p>
      {footnote && <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{footnote}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- Edit a month -- */

function EditMonthDialog({ month, planMonth, actuals, onClose, onSave }) {
  const [revenue, setRevenue] = useState(() => String(planMonth?.revenue ?? 0));
  const [expenses, setExpenses] = useState(() => {
    const out = {};
    for (const id of PLAN_ACCOUNTS) out[id] = String(planMonth?.expenses?.[id] ?? 0);
    return out;
  });
  const [touched, setTouched] = useState(false);

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const revenueValue = num(revenue);
  const expenseValues = PLAN_ACCOUNTS.map((id) => num(expenses[id]));
  const invalid = revenueValue === null || expenseValues.some((v) => v === null);

  const submit = () => {
    setTouched(true);
    if (invalid) return;
    const next = {};
    PLAN_ACCOUNTS.forEach((id, i) => { next[id] = expenseValues[i]; });
    onSave({ revenue: revenueValue, expenses: next });
  };

  const actualTotal = actuals ? round2(Object.values(actuals.byAccount).reduce((s, v) => s + v, 0)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Edit the {month} plan</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">Revenue target</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm ${touched && revenueValue === null ? 'border-red-400' : 'border-gray-300'}`}
            />
          </label>

          <p className="text-xs font-medium text-gray-700">Expense targets</p>
          {PLAN_ACCOUNTS.map((id) => {
            const actual = actuals?.byAccount?.[id] ?? null;
            return (
              <div key={id}>
                <label className="flex items-baseline justify-between text-[11px] text-gray-600 mb-1">
                  <span>{ACCOUNT_LABEL[id] || `Account ${id}`}</span>
                  <span className="tabular-nums">
                    actual {actual === null ? 'not recorded' : formatMoney(actual)}
                  </span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenses[id]}
                  onChange={(e) => setExpenses((x) => ({ ...x, [id]: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${touched && num(expenses[id]) === null ? 'border-red-400' : 'border-gray-300'}`}
                />
              </div>
            );
          })}

          {touched && invalid && (
            <p className="text-[11px] text-red-600">Every target must be a number of zero or more.</p>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Only targets are saved here. The actuals on this screen are recomputed from your transactions
            every time it loads{actualTotal !== null ? ` — they currently total ${formatMoney(actualTotal)} for this month` : ''}.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            <Check size={14} />
            Save targets
          </button>
        </div>
      </div>
    </div>
  );
}
