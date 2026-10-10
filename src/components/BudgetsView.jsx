import React, { useMemo, useState } from 'react';
import { X, Check, PlayCircle, TrendingUp, Search, Trash2 } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Budgets.
 * ============================================================================
 * The stub was a marketing panel with three bullet points and a button wired to
 * a journal-entry modal -- clicking "Create budget" opened the wrong dialog for
 * the wrong thing, and nothing on the page was a budget.
 *
 * The rule this screen is built around:
 *
 *   A budget stores only the PLAN: a name, the account it measures, the period,
 *   and the rupee amount allowed.
 *
 * The actual is never stored. It comes from `useLedger()`, which derives every
 * account balance from the transaction history. That is the entire point of the
 * ledger existing, and it is why recording a bill coded to Telephone moves the
 * Telephone budget with no further action. A stored "actual" would be a second
 * source of truth that goes stale the instant a transaction lands -- which is
 * precisely the defect this app was built to remove.
 *
 * Variance is therefore `amount - actual`: positive is money left, negative is
 * overspend. Overspend is shown in red with a bar past 100%, not clamped or
 * quietly hidden. A budget screen that cannot say "you have overspent" is a
 * screen that cannot do its job.
 *
 * The progress bar lives inside the table row rather than in a row of stat
 * tiles above it, because a bar next to the two numbers it compares is
 * readable; a bar separated from them is decoration.
 */

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Accounts a budget can be measured against: the ones that carry a cost. */
const BUDGETABLE_TYPES = ['Expense', 'Cost of Goods Sold'];

/** `2025-10` -> `October 2025`. */
function periodLabel(period) {
  const [y, m] = String(period).split('-');
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || !full[idx]) return period;
  return `${full[idx]} ${y}`;
}

/** The month a budget covers, taken from any transaction it is compared to. */
function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetsView({ onOpenBudgetModal, onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  /**
   * Accounts a budget can be measured against: the top-level expense and
   * cost-of-goods accounts. Sub-accounts are excluded because they are the
   * breakdown of a parent, and budgeting both would count the same rupee twice.
   */
  const budgetable = useMemo(
    () => (state.accounts ?? []).filter((a) => BUDGETABLE_TYPES.includes(a.type) && !a.parentId),
    [state.accounts]
  );
  const accountById = useMemo(
    () => new Map((state.accounts ?? []).map((a) => [a.id, a])),
    [state.accounts]
  );

  /**
   * Actual is read from the ledger, never from the budget record.
   * `ledger.balanceOf` is the derived balance for that account.
   */
  const rows = useMemo(() => {
    return (state.budgets ?? [])
      .map((b) => {
        const account = accountById.get(b.accountId);
        const amount = Number(b.amount) || 0;
        const actual = round2(ledger.balanceOf(b.accountId));
        const variance = round2(amount - actual);
        const pct = amount > 0 ? (actual / amount) * 100 : null;
        return {
          ...b,
          amount,
          actual,
          variance,
          pct,
          accountName: account?.name ?? 'Unknown account',
          accountType: account?.type ?? '—',
          over: actual > amount,
          // An account with no transactions has a balance of zero, which is a
          // true statement, but a bar at 0% next to it reads as "nothing is
          // being tracked". Flag it so the row does not imply more than it knows.
          noActivity: actual === 0,
        };
      })
      .sort((a, b) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0));
  }, [state.budgets, accountById, ledger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.name, r.accountName, periodLabel(r.period)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q)));
  }, [rows, search]);

  const totals = useMemo(() => {
    const amount = round2(filtered.reduce((s, r) => s + r.amount, 0));
    const actual = round2(filtered.reduce((s, r) => s + r.actual, 0));
    return {
      amount,
      actual,
      variance: round2(amount - actual),
      over: filtered.filter((r) => r.over).length,
    };
  }, [filtered]);

  const selected = rows.find((r) => r.id === selectedId) || null;

  if (!rows.length) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-6 max-w-lg">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Plan better with budgets</h1>
              <p className="text-sm text-gray-600 mt-2">
                Set what you expect to spend against an account, and this screen will
                compare it with what the books actually record.
              </p>
            </div>
            <div className="space-y-3">
              {[
                'A budget is a plan only. The actual is derived from your transactions, so it is never out of step.',
                'See where you are on track, and where you have overspent, without doing the arithmetic.',
                'Every account you can budget against already exists in your chart of accounts.',
              ].map((line) => (
                <div key={line} className="flex items-start space-x-2.5 text-xs text-gray-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
                  <span>{line}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowNew(true)}
              className="px-6 py-2.5 bg-[#2ca01c] hover:bg-green-700 text-white font-bold text-xs rounded-full shadow-xs transition"
            >
              Create budget
            </button>
          </div>

          <div className="w-72 h-64 bg-gradient-to-tr from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center p-6 border border-emerald-100 shadow-inner">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-md flex items-center justify-center text-[#2ca01c]">
                <TrendingUp size={40} />
              </div>
              <div className="text-xs font-bold text-gray-800">Forecast with confidence</div>
              <div className="text-[11px] text-gray-500">Actuals come from your own transactions</div>
            </div>
          </div>
        </div>

        {showNew && <NewBudgetModal budgetable={budgetable} onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Budgets</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Actual spend is derived from the ledger, not stored. Record a transaction and these figures move.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenBudgetModal && (
            <button
              type="button"
              onClick={onOpenBudgetModal}
              className="px-4 py-1.5 text-xs font-bold text-[#0077c5] border border-gray-300 rounded-full hover:bg-gray-50"
            >
              View in journal
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            New budget
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Budget, account or period"
              className="w-full text-xs pl-3 pr-8 py-1.5 border border-gray-300 rounded bg-white"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Budget</th>
                <th className="p-3">Account</th>
                <th className="p-3">Period</th>
                <th className="p-3 text-right">Budgeted</th>
                <th className="p-3 text-right">Actual</th>
                <th className="p-3 text-right">Variance</th>
                <th className="p-3 w-48">Progress</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="p-3 font-medium text-gray-900">{r.name}</td>
                  <td className="p-3 text-gray-600">
                    {r.accountName}
                    <span className="text-[10px] text-gray-400 ml-1">{r.accountType}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap text-gray-600">{periodLabel(r.period)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(r.amount)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(r.actual)}</td>
                  <td className={`p-3 text-right font-semibold tabular-nums ${r.over ? 'text-red-700' : 'text-green-700'}`}>
                    {r.over ? '-' : ''}{formatMoney(Math.abs(r.variance))}
                  </td>
                  <td className="p-3">
                    <BudgetBar pct={r.pct} over={r.over} noActivity={r.noActivity} />
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'DELETE_BUDGET', payload: r.id })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 hover:underline"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-sm text-gray-500">
                    No budgets match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex flex-wrap justify-end gap-x-6 gap-y-1 text-xs font-semibold text-gray-700">
            <span>
              Budgeted <span className="tabular-nums">{formatMoney(totals.amount)}</span>
            </span>
            <span>
              Actual <span className="tabular-nums">{formatMoney(totals.actual)}</span>
            </span>
            <span className={totals.variance < 0 ? 'text-red-700' : 'text-green-700'}>
              {totals.variance < 0 ? 'Over by ' : 'Left '}
              <span className="tabular-nums">{formatMoney(Math.abs(totals.variance))}</span>
            </span>
          </div>
        )}
      </div>

      {totals.over > 0 && (
        <p className="text-xs text-red-700">
          {totals.over} {totals.over === 1 ? 'budget is' : 'budgets are'} overspent. The rows above show the overspend
          rather than rounding it away.
        </p>
      )}

      {selected && <BudgetDrawer budget={selected} onClose={() => setSelectedId(selectedId === selected.id ? null : selectedId)} onNavigate={onNavigate} />}

      {showNew && <NewBudgetModal budgetable={budgetable} onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
    </div>
  );
}

/**
 * A budget's progress, inside its own row.
 *
 * Capped at a full bar when over budget -- an uncapped bar just runs off the
 * end of the cell and the reader cannot tell 110% from 400%. The overspend is
 * carried by the red colour and the variance column instead.
 */
function BudgetBar({ pct, over, noActivity }) {
  if (pct === null) {
    return <p className="text-[11px] text-gray-400">No budget set</p>;
  }
  const width = Math.max(0, Math.min(100, pct));
  const colour = over ? 'bg-red-600' : pct >= 80 ? 'bg-amber-500' : 'bg-[#2ca01c]';
  return (
    <div>
      <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden" role="presentation">
        <div className={`h-full ${colour}`} style={{ width: `${width}%` }} />
      </div>
      <p className={`text-[10px] mt-1 tabular-nums ${over ? 'text-red-700 font-semibold' : 'text-gray-500'}`}>
        {noActivity
          ? 'Nothing recorded against this account yet'
          : `${pct.toFixed(0)}%${over ? ' — over budget' : ' of budget used'}`}
      </p>
    </div>
  );
}

function BudgetDrawer({ budget, onClose, onNavigate }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{budget.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{budget.accountName}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <dl className="space-y-3 text-sm">
            {[
              ['Period', periodLabel(budget.period)],
              ['Account', budget.accountName],
              ['Account type', budget.accountType],
              ['Budgeted', formatMoney(budget.amount)],
              ['Actual', formatMoney(budget.actual)],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="col-span-2 text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variance</span>
              <span className={`text-lg font-bold tabular-nums ${budget.over ? 'text-red-700' : 'text-green-700'}`}>
                {budget.over ? '-' : ''}{formatMoney(Math.abs(budget.variance))}
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {budget.over
                ? `Overspent by ${formatMoney(Math.abs(budget.variance))} against this budget.`
                : `${formatMoney(budget.variance)} still available in this budget.`}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <BudgetBar pct={budget.pct} over={budget.over} noActivity={budget.noActivity} />
          </div>

          <p className="text-[11px] text-gray-500">
            The actual is {formatMoney(budget.actual)}, read from the ledger balance of{' '}
            {budget.accountName}. It is not stored on this budget, so it cannot fall out of step
            with the transactions behind it.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button
            onClick={() => { onClose(); onNavigate?.('standard_reports'); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
          >
            View profit and loss
          </button>
        </div>
      </div>
    </div>
  );
}

const BLANK = { name: '', accountId: '', period: currentPeriod(), amount: '' };

function NewBudgetModal({ budgetable, onClose, onSaved }) {
  const { dispatch } = useStore();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.name.trim()) return setError('Name the budget.');
    if (!form.accountId) return setError('Choose the account to measure it against.');
    if (!(Number(form.amount) > 0)) return setError('Enter a budgeted amount greater than zero.');

    dispatch({
      type: 'ADD_BUDGET',
      payload: {
        id: Date.now(),
        name: form.name.trim(),
        accountId: Number(form.accountId),
        period: form.period,
        amount: Number(form.amount),
      },
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">New budget</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Budget name</label>
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Electricity and water"
              className={`w-full px-3 py-2 border rounded-lg text-sm ${error && !form.name.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Account</label>
            <select
              value={form.accountId}
              onChange={set('accountId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select an account</option>
              {budgetable.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              Spend already recorded against this account is what the budget will be measured against.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Period</label>
              <input
                type="month"
                value={form.period}
                onChange={set('period')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Budgeted amount</label>
              <input
                type="number" min="0" step="1"
                value={form.amount}
                onChange={set('amount')}
                placeholder="0"
                className={`w-full px-3 py-2 border rounded-lg text-sm ${error && !(Number(form.amount) > 0) ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
            <PlayCircle size={13} className="shrink-0 mt-0.5" />
            Only the plan is saved. The actual is worked out from the books every time this screen loads.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Check size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}