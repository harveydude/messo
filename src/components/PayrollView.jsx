import React, { useMemo, useState } from 'react';
import { Search, Printer, Settings, ChevronDown, ChevronLeft, ChevronRight, X, Plus, IndianRupee, FileText, Users, Landmark, CircleAlert } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Payroll.
 *
 * Each pay run, and the money it actually moved.
 *
 * THE ONE RULE ON THIS SCREEN: net is never stored and never typed. It is gross
 * minus taxes, computed in `netOf()` every time it is drawn. A payroll table
 * with a `net` column that is filled in by hand is a table that will eventually
 * disagree with the two columns either side of it, and nobody can tell which of
 * the three is the error.
 *
 * A run is not a decoration either. Every row here names the transaction that
 * posted it -- `expenseId` or `bankTxnId` -- and "Add payroll expense" below
 * writes a genuine expense against Payroll Expenses, so recording pay moves the
 * Profit & Loss and the bank account through the same ledger as everything else.
 * A payroll screen whose totals do not appear in the accounts would be the same
 * defect as a typed-in balance.
 *
 * Payroll posts the GROSS to the expense, not the net: the gross is the cost to
 * the business and the gross is what leaves the bank, because the employee
 * receives net and the tax authority receives the rest.
 *
 * A run with status Draft has NOT been posted and contributes nothing to the
 * ledger. The summary line below the table says which runs are live so the
 * difference between the table total and the books total is explained rather than
 * discovered.
 */

const PAYROLL_EXPENSE_ACCOUNT = 35; // 'Payroll Expenses' in the chart of accounts.

const STATUS = {
  Paid: 'bg-[#EAF6EA] text-[#1B5E20]',
  Draft: 'bg-[#F1F1F1] text-[#5F6368]',
  Scheduled: 'bg-[#EEF4FB] text-[#00508A]',
};

/** Net pay: gross less tax. Computed everywhere it is shown, stored nowhere. */
const netOf = (run) => (Number(run.gross) || 0) - (Number(run.taxes) || 0);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function prettyDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1] || m} ${y}`;
}

export default function PayrollView({ onNavigate }) {
  const { state } = useStore();
  const ledger = useLedger();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const rows = useMemo(() => {
    const byName = new Map(state.users.map((u) => [u.id, `${u.first || ''} ${u.last || ''}`.trim()]));
    return [...state.payrollRuns]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((run) => ({
        ...run,
        net: netOf(run),
        payeeName: run.payeeName || byName.get(run.payeeId) || run.payee || 'Unassigned',
        // A run is only worth something if it has actually been posted. Drafts
        // are a plan; everything else named a real transaction or a real person.
        posted: run.status !== 'Draft',
      }));
  }, [state.payrollRuns, state.users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        [r.no, r.payeeName, r.period].filter(Boolean).some((f) => String(f).toLowerCase().includes(q));
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  /** Two totals, kept apart on purpose: what is listed, and what is posted. */
  const totals = useMemo(
    () => ({
      listedGross: round2(filtered.reduce((s, r) => s + (Number(r.gross) || 0), 0)),
      listedTax: round2(filtered.reduce((s, r) => s + (Number(r.taxes) || 0), 0)),
      listedNet: round2(filtered.reduce((s, r) => s + r.net, 0)),
      postedNet: round2(filtered.filter((r) => r.posted).reduce((s, r) => s + r.net, 0)),
    }),
    [filtered]
  );

  /** Payroll as the ledger carries it -- the derived expense balance. */
  const payrollInBooks = ledger.balanceOf(PAYROLL_EXPENSE_ACCOUNT);

  const selected = rows.find((r) => r.id === selectedId) || null;

  return (
    <div className="flex flex-col h-full w-full bg-white select-none overflow-y-auto">
      <div className="px-8 py-5 max-w-[1720px] w-full mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <img src="/app-icons/payroll.png" alt="Payroll" className="w-full h-full object-contain block" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold text-[#393A3D] leading-tight">Payroll</h1>
              <button
                onClick={() => onNavigate?.('all_lists')}
                className="text-[14px] text-[#0077C5] hover:underline flex items-center font-medium mt-1 cursor-pointer"
              >
                &lt; All Lists
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="h-[38px] px-6 rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[14px] font-semibold transition cursor-pointer"
          >
            Add payroll expense
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-5 mb-3">
          <div className="flex items-center space-x-2">
            <div className="relative w-[300px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search runs, payees or periods"
                className="w-full h-[38px] pl-9 pr-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5]"
              />
              <Search size={17} className="absolute left-3 top-[10px] text-[#6B6C72]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[38px] px-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5] cursor-pointer"
            >
              {['All', 'Paid', 'Draft', 'Scheduled'].map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <Printer size={18} className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer" />
            <Settings size={18} className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer" />
            <div className="text-[12px] text-[#9AA0A6] flex items-center space-x-1.5">
              <ChevronLeft size={14} className="text-[#C1C5CA]" />
              <span className="text-[#393A3D] font-medium">1-{filtered.length}</span>
              <ChevronRight size={14} className="text-[#C1C5CA]" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#D4D7DC] rounded-[4px] overflow-hidden bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="h-[42px] border-b border-[#D4D7DC] text-[13px] font-semibold text-[#393A3D]">
                <th className="w-[44px] pl-3.5 pr-1">
                  <input type="checkbox" checked={filtered.length > 0} readOnly aria-label="Select all runs" className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C]" />
                </th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">RUN</th>
                <th className="w-[150px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">DATE</th>
                <th className="w-[170px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">PAY PERIOD</th>
                <th className="w-[190px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">PAYEE</th>
                <th className="w-[120px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">GROSS</th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">TAXES</th>
                <th className="w-[120px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">NET</th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">STATUS</th>
                <th className="w-[90px] px-3 uppercase text-[12px] tracking-wider text-right pr-4">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="h-[59px] border-b border-[#E3E5E8] hover:bg-[#F7F8FA] transition cursor-pointer"
                >
                  <td className="pl-3.5 pr-1" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${r.no}`} className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C] cursor-pointer" />
                  </td>
                  <td className="px-3 border-r border-[#E3E5E8] font-medium text-[#393A3D]">{r.no}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{prettyDate(r.date)}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{r.period || '—'}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{r.payeeName}</td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums text-[#393A3D]">
                    {formatMoney(r.gross)}
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums text-[#5F6368]">
                    {formatMoney(r.taxes)}
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums font-semibold text-[#393A3D]">
                    {formatMoney(r.net)}
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8]">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${STATUS[r.status] || STATUS.Draft}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className="inline-flex items-center gap-1 text-[#0077C5] font-medium hover:underline cursor-pointer"
                    >
                      View
                      <ChevronDown size={13} />
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-[14px] text-[#6B6C72]">
                    {query.trim() || statusFilter !== 'All'
                      ? `No payroll runs match this filter. Clear it to see all ${rows.length}.`
                      : 'No payroll has been run yet. Use “Add payroll expense” to record the first one.'}
                  </td>
                </tr>
              )}
            </tbody>

            {filtered.length > 0 && (
              <tfoot>
                <tr className="h-[48px] bg-[#F7F8FA] text-[13px] font-semibold text-[#393A3D]">
                  <td colSpan={5} className="pl-3.5 pr-3">
                    {filtered.length} {filtered.length === 1 ? 'run' : 'runs'}
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums">{formatMoney(totals.listedGross)}</td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums">{formatMoney(totals.listedTax)}</td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums">{formatMoney(totals.listedNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* The reconciliation, stated rather than left for the reader to find.
            The table total and the books total differ by design: a Draft run is
            a plan and has not been posted. Saying which runs are live is the
            difference between a number that needs explaining and one that does
            not. */}
        <div className="mt-4 border border-[#E3E5E8] rounded-[4px] bg-[#F7F8FA] px-4 py-3 text-[13px] text-[#393A3D]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="flex items-center gap-1.5">
              <IndianRupee size={14} className="text-[#6B6C72]" />
              Net pay listed: <span className="font-semibold tabular-nums">{formatMoney(totals.listedNet)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <FileText size={14} className="text-[#6B6C72]" />
              Net pay posted: <span className="font-semibold tabular-nums">{formatMoney(totals.postedNet)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Landmark size={14} className="text-[#6B6C72]" />
              Payroll Expenses in the books:{' '}
              <span className="font-semibold tabular-nums">{formatMoney(payrollInBooks)}</span>
            </span>
          </div>

          <p className="mt-2 text-[12px] text-[#6B6C72] flex items-start gap-1.5">
            <CircleAlert size={13} className="mt-0.5 shrink-0" />
            <span>
              {rows.some((r) => !r.posted)
                ? 'Draft runs are shown here but have not been posted, so they are worth nothing to the accounts. The Payroll Expenses balance is the gross of every posted run.'
                : 'Every run listed has been posted. Payroll posts the gross to Payroll Expenses; the employee receives the net and the tax authority receives the difference.'}
            </span>
          </p>
        </div>
      </div>

      {selected && <RunDrawer run={selected} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />}
      {showForm && <AddPayrollForm onClose={() => setShowForm(false)} onSaved={() => setShowForm(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Drawer -- */

function RunDrawer({ run, onClose, onNavigate }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{run.no}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {run.period} · {prettyDate(run.date)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-gray-50 border-b border-gray-200">
          <Figure label="Gross" value={formatMoney(run.gross)} />
          <Figure label="Taxes" value={formatMoney(run.taxes)} />
          <Figure label="Net pay" value={formatMoney(run.net)} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <dl className="space-y-3 text-sm">
            {[
              ['Payee', run.payeeName],
              ['Pay period', run.period],
              ['Status', run.status],
            ].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-2">
                <dt className="text-gray-500">{label}</dt>
                <dd className="col-span-2 text-gray-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>

          {/* The net, shown as the arithmetic that produces it. */}
          <div className="p-3 border border-gray-200 rounded-lg bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-1">How net is worked out</p>
            <p className="text-sm text-gray-700 tabular-nums">
              {formatMoney(run.gross)} gross − {formatMoney(run.taxes)} tax ={' '}
              <span className="font-bold text-gray-900">{formatMoney(run.net)}</span>
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Net is not stored anywhere. It is recalculated from gross and tax every time
              it is shown, so a corrected tax figure cannot leave a stale amount behind.
            </p>
          </div>

          {/* What actually posted this run. */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Posted to the books</p>
            {run.posted ? (
              <ul className="space-y-1.5 text-[13px] text-gray-700">
                {run.expenseId && (
                  <li className="flex items-center gap-2">
                    <FileText size={14} className="text-[#6B6C72]" />
                    Expense #{run.expenseId} — {formatMoney(run.gross)} to Payroll Expenses
                  </li>
                )}
                {run.bankTxnId && (
                  <li className="flex items-center gap-2">
                    <Landmark size={14} className="text-[#6B6C72]" />
                    Bank transaction #{run.bankTxnId}, categorised to Payroll Expenses
                  </li>
                )}
                {run.journalEntryId && (
                  <li className="flex items-center gap-2">
                    <FileText size={14} className="text-[#6B6C72]" />
                    Journal entry #{run.journalEntryId}
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[13px] text-gray-600">
                This run is a draft. It has not been posted, so it has moved no money and
                appears in no report. Post it to put it in the accounts.
              </p>
            )}
            {run.journalEntryId === null && run.posted && (
              <p className="text-[12px] text-gray-500 mt-2">
                No journal entry has been raised against this run.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button
            onClick={() => { onClose(); onNavigate?.('chart_of_accounts'); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
          >
            View Payroll Expenses
          </button>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm font-bold tabular-nums text-gray-900">{value}</p>
    </div>
  );
}

/* --------------------------------------------------------- Add payroll run -- */

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Record a payroll expense.
 *
 * Writes a real expense into the store: the GROSS is debited to Payroll
 * Expenses and the bank account it was paid from is credited. That single entry
 * is what makes this screen worth having -- the Profit & Loss and the bank
 * balance both move, through the same ledger as every other transaction in the
 * app, and a matching run is added so the table above is not a separate list.
 *
 * Net is not entered. It is derived from the two figures below, both on screen
 * and in the run record, so it cannot be typed in wrongly.
 */
function AddPayrollForm({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState({
    payeeId: '',
    date: todayIso(),
    period: '',
    gross: '',
    taxes: '',
    paymentAccountId: state.bankAccounts[0]?.id ?? 1,
  });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Net, live, while typing. Same arithmetic the table will use.
  const grossNum = Number(form.gross);
  const taxNum = Number(form.taxes);
  const netNum =
    form.gross === '' || form.taxes === '' || !Number.isFinite(grossNum) || !Number.isFinite(taxNum)
      ? null
      : round2(grossNum - taxNum);

  const save = () => {
    if (!Number.isFinite(grossNum) || grossNum <= 0) return setError('Gross pay must be more than zero.');
    if (!Number.isFinite(taxNum) || taxNum < 0) return setError('Taxes cannot be negative.');
    if (netNum !== null && netNum < 0) return setError('Taxes cannot be more than gross — net pay cannot be negative.');

    const period = form.period.trim() || prettyDate(form.date);
    const runId = Date.now();

    // The expense is the posting. It debits Payroll Expenses and credits the
    // bank account the money left, which is what moves the P&L and the cash.
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        id: runId,
        payeeId: form.payeeId ? Number(form.payeeId) : null,
        payeeName: form.payeeId
          ? (() => {
              const u = state.users.find((x) => x.id === Number(form.payeeId));
              return u ? `${u.first} ${u.last}`.trim() : 'Payroll';
            })()
          : 'Payroll',
        paymentAccountId: Number(form.paymentAccountId),
        method: 'Transfer',
        date: form.date,
        lines: [{ accountId: PAYROLL_EXPENSE_ACCOUNT, desc: `Payroll ${period}`, amount: round2(grossNum) }],
        memo: `Gross ${formatMoney(round2(grossNum))} less tax ${formatMoney(round2(taxNum))}`,
        attachment: null,
        source: 'Payroll',
      },
    });

    // And the matching run, so the table above shows the same event rather than
    // a different one. `expenseId` points back at the entry that posted it.
    dispatch({
      type: 'ADD_PAYROLL_RUN',
      payload: {
        id: runId,
        no: `PR-${String(state.payrollRuns.length + 1).padStart(4, '0')}`,
        date: form.date,
        period,
        payeeId: form.payeeId ? Number(form.payeeId) : null,
        payee: 'Payroll',
        gross: round2(grossNum),
        taxes: round2(taxNum),
        status: 'Paid',
        expenseId: runId,
        bankTxnId: null,
        journalEntryId: null,
      },
    });

    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add payroll expense"
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add payroll expense</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-[13px] text-gray-600 flex items-start gap-1.5">
            <Users size={14} className="mt-0.5 shrink-0 text-[#6B6C72]" />
            This posts the gross to Payroll Expenses and reduces the bank account the money
            left, so the Profit &amp; Loss and your cash both move.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Paid to</label>
            <select
              value={form.payeeId}
              onChange={set('payeeId')}
              data-autofocus=""
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            >
              <option value="">Everyone (payroll run)</option>
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>{`${u.first} ${u.last}`.trim()}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pay date</label>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pay period</label>
              <input
                type="text"
                value={form.period}
                onChange={set('period')}
                placeholder="e.g. 1–31 Oct 2025"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Gross pay *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.gross}
                onChange={set('gross')}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
              <p className="text-[11px] text-gray-500 mt-1">What the payroll costs the business.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Taxes withheld</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.taxes}
                onChange={set('taxes')}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
              <p className="text-[11px] text-gray-500 mt-1">Withheld and paid to the authority.</p>
            </div>
          </div>

          {/* Net, computed and labelled as computed. */}
          <div className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg bg-gray-50">
            <span className="text-sm text-gray-700">Net pay to employees</span>
            <span className="text-base font-bold text-gray-900 tabular-nums">
              {netNum === null ? '—' : formatMoney(netNum)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Paid from</label>
            <select
              value={form.paymentAccountId}
              onChange={set('paymentAccountId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            >
              {state.bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">The account the money left.</p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button onClick={save} className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-2">
            <Plus size={16} />
            Record payroll
          </button>
        </div>
      </div>
    </div>
  );
}