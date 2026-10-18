import React, { useMemo, useState } from 'react';
import {
  Search, Printer, Settings, ChevronDown, X, Check, ArrowRight,
  Gavel, FileText, CircleAlert, Info, ScrollText,
} from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Business tax — tax deducted at source, and advance tax on the presumption.
 *
 * WHAT THIS SCREEN IS
 * -------------------
 * The two things an Indian business has to get right on direct tax that the
 * sales-tax screen cannot tell it:
 *
 *   · TDS. Money paid OUT is still taxable to the payee, and the deductor --
 *     not the payee -- is the one who has to deposit it. Forgetting is not a
 *     mistake of records, it is interest on the shortfall plus a fee.
 *   · Advance tax. Tax on business income is payable in instalments during the
 *     year, before the return is filed. Missing an instalment costs interest
 *     whether or not the final liability turns out to be higher.
 *
 * WHY THE RATE IS AUTHORITATIVE AND THE AMOUNT IS NOT STORED
 * --------------------------------------------------------
 * Every row stores `grossAmount` and `ratePct`; the deduction is worked out
 * here as gross × rate. Storing both would let them drift apart the first time
 * someone corrects a rate, and a TDS register whose deducted figure disagrees
 * with its own rate is worse than no register: the Form 26Q will not reconcile.
 *
 * Section 194C is the sharp edge. The rate is 1% where the payee is an
 * individual or HUF and 2% for everyone else — and it is on the PAYEE's status,
 * not on how big the payment is. So the payee type is carried on the row and the
 * screen refuses to guess it.
 *
 * WHY THE PRESUMPTION IS SHOWN AGAINST THE LEDGER
 * ----------------------------------------------
 * u/s 44AD deems the profit to be 6% of turnover and u/s 44ADA 50% of receipts.
 * Neither is a stored figure: turnover is read from `useLedger()` — the same
 * income the P&L is built from — and everything downstream (the deemed profit,
 * the tax on it, the four instalments) is derived from it. So a change in the
 * books moves the instalment, which is the entire point of computing it.
 * Advance tax is only due at all above 90% of the assessed tax (section 209);
 * below that, the schedule says so rather than inventing four payments.
 */

/** Today, read once at module load — reading the clock during render is impure. */
const TODAY = new Date();

const isoToday = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const parseDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const daysFromToday = (iso) => {
  const d = parseDay(iso);
  return d ? Math.round((TODAY - d) / 86400000) : null;
};

const fmtDay = (iso) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

/**
 * The sections this product handles, with their standard rates.
 *
 * Kept as a table rather than free text so the "Record TDS" form can offer a
 * real choice and so the rate printed on the register is the rate that was
 * actually applied. `byPayeeType` is the part that matters on 194C.
 */
const TDS_SECTIONS = [
  { section: '194C', label: 'Payment to contractors', ratePct: 2, note: '1% where the payee is an individual or HUF, 2% otherwise', byPayeeType: true },
  { section: '194J', label: 'Professional fees', ratePct: 10, note: 'Fees to lawyers, consultants, architects and auditors', byPayeeType: false },
  { section: '194I', label: 'Rent', ratePct: 10, note: '10% on land and buildings, 2% on plant and machinery', byPayeeType: true },
  { section: '194H', label: 'Commission or brokerage', ratePct: 5, note: 'Commission paid by a person other than an insurance agent', byPayeeType: false },
  { section: '194DD', label: 'Insurance commission', ratePct: 5, note: 'Commission RECEIVED by an insurance agent', byPayeeType: false },
];

const sectionInfo = (code) => TDS_SECTIONS.find((s) => s.section === code);

/**
 * When tax deducted on a payment dated `paymentDate` falls due.
 *
 * The 7th of the following month, and 30 April for a March payment — the
 * March deadline is annual, not monthly, so a naive "7th of next month" puts
 * the March quarter in the wrong month and hides it behind a later due date.
 */
function tdsDueDate(paymentDate) {
  const d = parseDay(paymentDate);
  if (!d) return null;
  return d.getMonth() === 2
    ? `${d.getFullYear()}-04-30`
    : `${d.getFullYear()}-${String(d.getMonth() + 2).padStart(2, '0')}-07`;
}

const payeeStatus = (t) => (t.depositDate ? 'Deposited' : 'Pending');

function depositStatus(entry) {
  if (entry.depositDate) {
    return { label: 'Deposited', tone: 'green', note: `Challan ${entry.challanNo || '—'} · ${fmtDay(entry.depositDate)}` };
  }
  const due = tdsDueDate(entry.paymentDate);
  const days = daysFromToday(due);
  if (days !== null && days > 0) {
    return { label: 'Overdue', tone: 'red', note: `${days} day${days === 1 ? '' : 's'} past the ${fmtDay(due)} due date` };
  }
  return { label: 'Pending', tone: 'amber', note: `Due ${fmtDay(due)}` };
}

const TONE = {
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  grey: 'bg-gray-100 text-gray-700 border-gray-200',
};

const SECTION_FILTERS = ['All sections', ...TDS_SECTIONS.map((s) => s.section)];
const STATUS_FILTERS = ['Any status', 'Deposited', 'Pending', 'Overdue'];

export default function BusinessTaxView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All sections');
  const [statusFilter, setStatusFilter] = useState('Any status');
  const [openId, setOpenId] = useState(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [depositFor, setDepositFor] = useState(null);

  // Memoised so the derived values below have a dependency that only

  // changes when this data does. A filtered array built inline is a new

  // reference every render, which makes those memos never hit.

  const entries = useMemo(() => (state.tdsEntries || []), [state.tdsEntries]);
  // Memoised so the derived values below have a dependency that only
  // changes when this data does. A filtered array built inline is a new
  // reference every render, which makes those memos never hit.
  const tdsReturns = useMemo(() => (state.tdsReturns || []), [state.tdsReturns]);
  const advance = state.advanceTax;
  // Memoised so the derived values below have a dependency that only
  // changes when this data does. A filtered array built inline is a new
  // reference every render, which makes those memos never hit.
  const dueDates = useMemo(() => (state.advanceTaxDueDates || []), [state.advanceTaxDueDates]);

  /* ---- The register. TDS is computed from the amount and the rate. ---- */
  const rows = useMemo(() => {
    return entries.map((t) => {
      const gross = Number(t.grossAmount) || 0;
      const rate = Number(t.ratePct) || 0;
      return {
        ...t,
        gross,
        rate,
        tds: round2((gross * rate) / 100),
        status: depositStatus(t),
        dueDate: tdsDueDate(t.paymentDate),
        sectionLabel: sectionInfo(t.section)?.label || t.section,
      };
    }).sort((a, b) => (a.paymentDate < b.paymentDate ? 1 : -1));
  }, [entries]);

  const filtered = rows.filter((t) => {
    if (sectionFilter !== 'All sections' && t.section !== sectionFilter) return false;
    if (statusFilter !== 'Any status' && t.status.label !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [t.section, t.payeeName, t.payeePan, t.voucherNo, t.nature]
      .some((f) => String(f || '').toLowerCase().includes(q));
  });

  const totals = useMemo(() => {
    const deposited = rows.filter((r) => payeeStatus(r) === 'Deposited');
    const pending = rows.filter((r) => payeeStatus(r) === 'Pending');
    return {
      paidOut: round2(rows.reduce((s, r) => s + r.gross, 0)),
      deducted: round2(rows.reduce((s, r) => s + r.tds, 0)),
      deposited: round2(deposited.reduce((s, r) => s + r.tds, 0)),
      outstanding: round2(pending.reduce((s, r) => s + r.tds, 0)),
      overdue: round2(pending.filter((r) => r.status.label === 'Overdue').reduce((s, r) => s + r.tds, 0)),
    };
  }, [rows]);

  /* ---- By section, so the rate actually used is visible next to the total. -- */
  const bySection = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.section)) {
        map.set(r.section, { section: r.section, label: r.sectionLabel, count: 0, paidOut: 0, deducted: 0, outstanding: 0 });
      }
      const row = map.get(r.section);
      row.count += 1;
      row.paidOut = round2(row.paidOut + r.gross);
      row.deducted = round2(row.deducted + r.tds);
      if (payeeStatus(r) === 'Pending') row.outstanding = round2(row.outstanding + r.tds);
    }
    return [...map.values()].sort((a, b) => b.deducted - a.deducted);
  }, [rows]);

  /* ---- Form 26Q: each quarter's figure is summed from the payments in it. -- */
  const quarterRows = useMemo(() => {
    return tdsReturns.map((ret) => {
      const from = parseDay(ret.dueDate);
      // The three months the return covers are the quarter BEFORE the due date,
      // because the return is filed after the quarter has closed.
      const to = new Date(from.getFullYear(), from.getMonth() - 3, 0);
      const fromMonth = new Date(from.getFullYear(), from.getMonth() - 4, 1);
      const inQuarter = rows.filter((r) => {
        const d = parseDay(r.paymentDate);
        return d && d >= fromMonth && d <= to;
      });
      const deducted = round2(inQuarter.reduce((s, r) => s + r.tds, 0));
      const days = daysFromToday(ret.dueDate);
      const status = ret.filedOn
        ? { label: 'Filed', tone: 'green', note: `Filed ${fmtDay(ret.filedOn)}` }
        : days !== null && days > 0
          ? { label: 'Overdue', tone: 'red', note: `${days} day${days === 1 ? '' : 's'} past due` }
          : { label: 'Not filed', tone: 'amber', note: `Due ${fmtDay(ret.dueDate)}` };
      return { ...ret, deducted, payees: inQuarter.length, status };
    });
  }, [tdsReturns, rows]);

  /* -------------------------- advance tax, derived from the ledger's income -- */
  const advancePlan = useMemo(() => {
    if (!advance) return null;

    // u/s 44AD: 6% of turnover is deemed to be the profit. u/s 44ADA: 50% of
    // receipts for a profession. The basis is the SAME income the P&L reports,
    // read from the ledger rather than restated here.
    const turnover = Math.max(0, Number(ledger.pnl.income) || 0);
    const deemedProfit = round2((turnover * (Number(advance.declaredRatePct) || 0)) / 100);
    const taxOnProfit = round2((deemedProfit * (Number(advance.slabRatePct) || 0)) / 100);
    // Section 209: no advance tax at all below 90% of the assessed tax.
    const liability = round2((taxOnProfit * (Number(advance.paidThresholdPct) || 90)) / 100);

    const paidMap = new Map((advance.payments || []).map((p) => [p.instalmentNo, p]));
    const instalments = dueDates.map((i) => {
      const amount = round2((liability * (Number(i.share) || 0)) / 100);
      const paid = paidMap.get(i.instalmentNo) || null;
      const days = daysFromToday(i.dueDate);
      let status;
      if (paid) status = { label: 'Paid', tone: 'green', note: `${fmtDay(paid.paidOn)} · ${paid.challanNo || 'challan recorded'}` };
      else if (days !== null && days > 0) status = { label: 'Overdue', tone: 'red', note: `${days} day${days === 1 ? '' : 's'} past due` };
      else if (days !== null && days <= 30) status = { label: 'Due', tone: 'amber', note: `Due ${fmtDay(i.dueDate)}` };
      else status = { label: 'Upcoming', tone: 'grey', note: `Due ${fmtDay(i.dueDate)}` };
      return { ...i, amount, paid, status };
    });

    return {
      ...advance,
      turnover,
      deemedProfit,
      taxOnProfit,
      liability,
      instalments,
      paid: round2(instalments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0)),
      due: round2(liability - instalments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0)),
    };
  }, [advance, dueDates, ledger.pnl.income]);

  const selected = rows.find((r) => r.id === openId) || null;
  const beingDeposited = rows.find((r) => r.id === depositFor) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ---------------------------------------------------------- header -- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
            <img src="/app-icons/tds.png" alt="TDS & Direct Tax" className="w-full h-full object-contain block" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">TDS &amp; Direct Tax</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Tax deducted at source, quarterly TDS returns (Form 26Q/24Q) and advance tax
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEntryFormOpen(true)}
            className="px-4 py-1.5 text-xs font-bold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Record TDS
          </button>
          <button
            type="button"
            onClick={() => setDepositFor(rows.find((r) => !r.depositDate)?.id ?? null)}
            disabled={rows.every((r) => r.depositDate)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deposit challan
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------- totals, as a table -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-gray-800">
          <caption className="sr-only">Summary of the tax deducted register, all figures derived</caption>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <th scope="row" className="p-3 pl-4 text-gray-500 font-normal">Payments made subject to TDS</th>
              <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(totals.paidOut)}</td>
              <td className="p-3 pr-4 text-right text-[11px] text-gray-500">{rows.length} payments</td>
            </tr>
            <tr>
              <th scope="row" className="p-3 pl-4 text-gray-500 font-normal">TDS deducted (gross × rate, per row)</th>
              <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(totals.deducted)}</td>
              <td className="p-3 pr-4 text-right text-[11px] text-gray-500">across {bySection.length} sections</td>
            </tr>
            <tr>
              <th scope="row" className="p-3 pl-4 text-gray-500 font-normal">Deposited with the government</th>
              <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(totals.deposited)}</td>
              <td className="p-3 pr-4 text-right text-[11px] text-gray-500">challan recorded</td>
            </tr>
            <tr className="bg-gray-50">
              <th scope="row" className="p-3 pl-4 text-gray-500 font-normal">Still to be deposited</th>
              <td className="p-3 text-right tabular-nums font-semibold text-amber-800">{formatMoney(totals.outstanding)}</td>
              <td className="p-3 pr-4 text-right text-[11px] text-amber-800">
                {formatMoney(totals.overdue)} of it is past the due date
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* -------------------------------------------------------- TDS register -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                aria-label="Filter by TDS section"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {SECTION_FILTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by deposit status"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search payee, PAN or voucher"
                aria-label="Search TDS entries"
                className="w-56 text-xs pl-3 pr-7 py-1.5 border border-gray-300 rounded focus:border-[#2ca01c] focus:outline-none"
              />
              <Search size={13} className="absolute right-2.5 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="text-[11px] text-gray-500">{filtered.length} of {rows.length} entries</span>
            <Printer size={15} className="cursor-pointer hover:text-gray-900" aria-label="Print" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" aria-label="Display options" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <caption className="sr-only">
              Tax deducted at source by section, payee, amount, rate, PAN and deposit status
            </caption>
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="p-3">Section</th>
                <th scope="col" className="p-3">Payee</th>
                <th scope="col" className="p-3">PAN</th>
                <th scope="col" className="p-3">Payment date</th>
                <th scope="col" className="p-3 text-right">Amount paid</th>
                <th scope="col" className="p-3 text-right">Rate</th>
                <th scope="col" className="p-3 text-right">TDS deducted</th>
                <th scope="col" className="p-3">Status</th>
                <th scope="col" className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setOpenId(t.id)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="p-3">
                    <span className="font-semibold text-gray-900">u/s {t.section}</span>
                    <span className="block text-[10px] text-gray-500">{t.sectionLabel}</span>
                  </td>
                  <td className="p-3 text-gray-700">
                    {t.payeeName}
                    <span className="block text-[10px] text-gray-500">{t.nature}</span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-gray-600">{t.payeePan}</td>
                  <td className="p-3 text-gray-700">{fmtDay(t.paymentDate)}</td>
                  <td className="p-3 text-right tabular-nums text-gray-700">{formatMoney(t.gross)}</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{t.rate}%</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(t.tds)}</td>
                  <td className="p-3">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${TONE[t.status.tone]}`}>
                      {t.status.label}
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{t.status.note}</span>
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setDepositFor(t.id)}
                      className="text-[#0077c5] font-semibold hover:underline"
                    >
                      {t.depositDate ? 'View' : 'Deposit'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-gray-500">
                    {rows.length === 0
                      ? 'No TDS has been recorded. Record the first deduction to start the register and the Form 26Q.'
                      : 'No entry matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* --------------------------------------------- by section, and Form 26Q -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
            <ScrollText size={15} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Deduction by section</h2>
          </div>
          {bySection.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">Nothing has been deducted yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-800">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="p-3">Section</th>
                    <th scope="col" className="p-3 text-right">Payments</th>
                    <th scope="col" className="p-3 text-right">Paid out</th>
                    <th scope="col" className="p-3 text-right">Deducted</th>
                    <th scope="col" className="p-3 text-right">To deposit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bySection.map((s) => (
                    <tr key={s.section} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-semibold text-gray-900">u/s {s.section}</span>
                        <span className="block text-[10px] text-gray-500">{s.label}</span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{s.count}</td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(s.paidOut)}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(s.deducted)}</td>
                      <td className={`p-3 text-right tabular-nums ${s.outstanding > 0 ? 'text-amber-800 font-semibold' : 'text-gray-600'}`}>
                        {formatMoney(s.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Quarterly TDS returns (Form 26Q)</h2>
            <span className="text-[11px] text-gray-500">Ann. 26AQ</span>
          </div>
          {quarterRows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">No quarterly returns have been set up.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-800">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="p-3">Quarter</th>
                    <th scope="col" className="p-3">Due</th>
                    <th scope="col" className="p-3 text-right">Deducted</th>
                    <th scope="col" className="p-3">Status</th>
                    <th scope="col" className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quarterRows.map((q) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-semibold text-gray-900">{q.quarter}</span>
                        <span className="block text-[10px] text-gray-500">{q.financialYear} · {q.payees} payees</span>
                      </td>
                      <td className="p-3 text-gray-700">{fmtDay(q.dueDate)}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(q.deducted)}</td>
                      <td className="p-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${TONE[q.status.tone]}`}>
                          {q.status.label}
                        </span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">{q.status.note}</span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => dispatch({
                            type: 'FILE_TDS_RETURN',
                            payload: q.filedOn
                              ? { id: q.id }
                              : { id: q.id, filedOn: isoToday, form26AQ: `26AAPFU0931F1ZV${q.quarter}` },
                          })}
                          className="text-[#0077c5] font-semibold hover:underline"
                        >
                          {q.filedOn ? 'Filed' : 'Mark filed'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ------------------------------------------------------ advance tax -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <Gavel size={15} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
            Advance tax — {advancePlan ? advancePlan.assessmentYear : 'not set up'}
          </h2>
        </div>

        {!advancePlan ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No advance-tax schedule has been set up for this company.
          </p>
        ) : (
          <>
            <table className="w-full text-left text-xs text-gray-800">
              <caption className="sr-only">
                Presumptive income, the advance-tax liability derived from it, and the instalment schedule
              </caption>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <th scope="row" className="p-3 pl-4 font-normal text-gray-500">Turnover from the books</th>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(advancePlan.turnover)}</td>
                  <td className="p-3 pr-4 text-right text-[11px] text-gray-500">Profit and loss income, from the ledger</td>
                </tr>
                <tr>
                  <th scope="row" className="p-3 pl-4 font-normal text-gray-500">
                    Deemed profit — {advancePlan.sectionLabel}
                  </th>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(advancePlan.deemedProfit)}</td>
                  <td className="p-3 pr-4 text-right text-[11px] text-gray-500">
                    {advancePlan.declaredRatePct}% of turnover · {advancePlan.basis}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="p-3 pl-4 font-normal text-gray-500">Tax on the deemed profit</th>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(advancePlan.taxOnProfit)}</td>
                  <td className="p-3 pr-4 text-right text-[11px] text-gray-500">at {advancePlan.slabRatePct}% basic rate</td>
                </tr>
                <tr className="bg-gray-50">
                  <th scope="row" className="p-3 pl-4 font-normal text-gray-600">
                    Advance tax payable during the year
                  </th>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(advancePlan.liability)}</td>
                  <td className="p-3 pr-4 text-right text-[11px] text-gray-500">
                    {advancePlan.paidThresholdPct}% of the assessed tax — below this nothing is due
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="overflow-x-auto border-t border-gray-200">
              <table className="w-full text-left text-xs text-gray-800">
                <caption className="sr-only">Advance tax instalments, with paid or unpaid state computed from each due date</caption>
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="p-3">Instalment</th>
                    <th scope="col" className="p-3">Due date</th>
                    <th scope="col" className="p-3 text-right">Share</th>
                    <th scope="col" className="p-3 text-right">Amount</th>
                    <th scope="col" className="p-3">State</th>
                    <th scope="col" className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {advancePlan.instalments.map((i) => (
                    <tr key={i.instalmentNo} className="hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{i.label}</td>
                      <td className="p-3 text-gray-700">{fmtDay(i.dueDate)}</td>
                      <td className="p-3 text-right tabular-nums text-gray-600">{i.share}%</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(i.amount)}</td>
                      <td className="p-3">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${TONE[i.status.tone]}`}>
                          {i.status.label}
                        </span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">{i.status.note}</span>
                      </td>
                      <td className="p-3 text-right">
                        {!i.paid && (
                          <button
                            type="button"
                            onClick={() => dispatch({
                              type: 'PAY_ADVANCE_TAX',
                              payload: {
                                instalmentNo: i.instalmentNo,
                                amount: i.amount,
                                paidOn: isoToday,
                                challanNo: `CHL-ADV-${advancePlan.assessmentYear.slice(-4)}-${i.instalmentNo}`,
                                bank: 'HDFC Bank',
                              },
                            })}
                            className="text-[#0077c5] font-semibold hover:underline"
                          >
                            Mark paid
                          </button>
                        )}
                        {i.paid && <span className="text-[11px] text-gray-500">{i.paid.challanNo}</span>}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                    <td className="p-3" colSpan={3}>Paid so far</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(advancePlan.paid)}</td>
                    <td className="p-3 text-[11px] text-gray-600" colSpan={2}>Still to pay {formatMoney(advancePlan.due)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {advancePlan.liability === 0 && (
              <p className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-600 flex gap-2">
                <Info size={14} className="shrink-0 mt-px text-gray-400" aria-hidden="true" />
                <span>
                  No advance tax is due, because the deemed profit falls below the 90% threshold in
                  section 209. The instalments above are shown as nil rather than hidden, so the
                  position is visible instead of inferred from an empty table.
                </span>
              </p>
            )}
          </>
        )}
      </section>

      {/* ------------------------------------------------- the books, honestly -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <FileText size={15} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">How this ties to the books</h2>
        </div>
        <table className="w-full text-left text-xs text-gray-800">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="p-3 pl-4 text-gray-600">Tax owed to the government, per the ledger</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">
                {formatMoney(round2(ledger.outstanding.tax))}
              </td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">TDS deducted and not yet deposited, per the register</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-amber-800">
                {formatMoney(totals.outstanding)}
              </td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Advance tax still to pay this year</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">
                {formatMoney(advancePlan ? advancePlan.due : 0)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-600 flex gap-2">
          <CircleAlert size={14} className="shrink-0 mt-px text-amber-600" aria-hidden="true" />
          <span>
            The ledger figure is the “Sales Tax Payable” account, which holds GST charged on sales
            invoices. It does not hold TDS or advance tax — those are separate statutory registers and
            are not yet posted to the chart of accounts. They are listed separately above rather than
            folded into one total, because adding them together would produce a number that means
            nothing.
          </span>
        </p>
      </section>

      <p className="text-[11px] text-gray-500">
        Every TDS figure is gross × rate, worked out on this screen. Nothing in the register is a
        stored deduction, so a corrected rate corrects the deduction.
        {' '}
        <button type="button" onClick={() => onNavigate?.('sales_tax')} className="text-[#0077c5] font-semibold hover:underline">
          Go to sales tax
        </button>
      </p>

      {selected && (
        <TdsDrawer
          entry={selected}
          onClose={() => setOpenId(null)}
          onDeposit={() => { setDepositFor(selected.id); setOpenId(null); }}
        />
      )}

      {beingDeposited && (
        <DepositDialog
          entry={beingDeposited}
          onClose={() => setDepositFor(null)}
          onDeposit={(payload) => {
            dispatch({ type: 'DEPOSIT_TDS', payload: { id: beingDeposited.id, ...payload } });
            setDepositFor(null);
          }}
        />
      )}

      {entryFormOpen && (
        <RecordTdsDialog
          onClose={() => setEntryFormOpen(false)}
          onSave={(payload) => {
            dispatch({ type: 'ADD_TDS_ENTRY', payload });
            setEntryFormOpen(false);
          }}
          nextId={entries.reduce((m, t) => Math.max(m, Number(t.id) || 0), 0) + 1}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ drawer -- */

function TdsDrawer({ entry, onClose, onDeposit }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{entry.payeeName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">u/s {entry.section} — {entry.sectionLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <table className="w-full text-xs text-gray-800 border border-gray-200 rounded-lg overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              {[
                ['Nature of payment', entry.nature],
                ['Payment date', fmtDay(entry.paymentDate)],
                ['Voucher', entry.voucherNo || '—'],
                ['PAN of payee', entry.payeePan],
                ['Amount paid', formatMoney(entry.gross)],
                ['Rate applied', `${entry.rate}%`],
                ['TDS deducted', formatMoney(entry.tds)],
                ['Deposit due', fmtDay(entry.dueDate)],
                ['Challan number', entry.challanNo || 'Not deposited'],
                ['Deposit date', entry.depositDate ? fmtDay(entry.depositDate) : '—'],
                ['Deposited through', entry.depositBank || '—'],
              ].map(([k, v]) => (
                <tr key={k} className={i === 6 ? 'bg-gray-50 font-semibold' : ''}>
                  <td className="p-2.5 text-gray-500 w-44">{k}</td>
                  <td className="p-2.5 text-gray-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
            {formatMoney(entry.gross)} × {entry.rate}% = {formatMoney(entry.tds)}. The deduction is
            worked out here rather than stored, so the rate printed against the payee and the amount
            deposited can never disagree.
          </p>

          <p className="text-[11px] text-gray-600 flex gap-2">
            <Info size={14} className="shrink-0 mt-px text-gray-400" aria-hidden="true" />
            <span>{sectionInfo(entry.section)?.note}</span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          {!entry.depositDate && (
            <button
              type="button"
              onClick={onDeposit}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
            >
              Record deposit <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- deposit a TDS -- */

function DepositDialog({ entry, onClose, onDeposit }) {
  const [depositDate, setDepositDate] = useState(isoToday);
  const [challanNo, setChallanNo] = useState('');
  const [bank, setBank] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    if (!depositDate) return setError('The date of deposit is required.');
    if (!challanNo.trim()) return setError('A challan number is required — it is what Form 26AS matches against.');
    onDeposit({ depositDate, challanNo: challanNo.trim(), depositBank: bank.trim() || null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Deposit TDS</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {entry.payeeName} · u/s {entry.section} · {formatMoney(entry.tds)} due {fmtDay(entry.dueDate)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="depositDate" className="block text-xs font-semibold text-gray-600 mb-1">Date of deposit</label>
            <input
              id="depositDate"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
          <div>
            <label htmlFor="challanNo" className="block text-xs font-semibold text-gray-600 mb-1">Challan number *</label>
            <input
              id="challanNo"
              type="text"
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="CHL-241100045512"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !challanNo.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>
          <div>
            <label htmlFor="depositBank" className="block text-xs font-semibold text-gray-600 mb-1">Paid through</label>
            <input
              id="depositBank"
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Bank and branch"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
          >
            <Check size={16} /> Record deposit
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ record a TDS -- */

/**
 * Record a deduction.
 *
 * The TDS amount is shown live as the gross × the rate, and the rate is chosen
 * from the section the user picked. On section 194C the form asks whether the
 * payee is an individual or HUF, because that — not the size of the payment —
 * is what decides between 1% and 2%, and getting it wrong is a short-deduction
 * with interest attached.
 */
function RecordTdsDialog({ onClose, onSave, nextId }) {
  const [section, setSection] = useState(TDS_SECTIONS[0].section);
  const [payeeName, setPayeeName] = useState('');
  const [payeePan, setPayeePan] = useState('');
  const [nature, setNature] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [paymentDate, setPaymentDate] = useState(isoToday);
  const [grossAmount, setGrossAmount] = useState('');
  const [payeeIsIndividual, setPayeeIsIndividual] = useState(false);
  const [rateOverride, setRateOverride] = useState('');
  const [error, setError] = useState('');

  const info = sectionInfo(section);
  const standardRate = info.byPayeeType && section === '194C'
    ? (payeeIsIndividual ? 1 : 2)
    : info.byPayeeType && section === '194I'
      ? 2
      : info.ratePct;

  const gross = Number(grossAmount) || 0;
  const rate = rateOverride === '' ? standardRate : (Number(rateOverride) || 0);
  const tds = round2((gross * rate) / 100);

  const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const submit = () => {
    if (!payeeName.trim()) return setError('The payee name is required.');
    if (!PAN_PATTERN.test(payeePan.trim().toUpperCase())) {
      return setError('A PAN in the form ABCDE1234F is required — Form 26AS will not match without it.');
    }
    if (!gross) return setError('Enter the amount paid — a deduction without an amount is not a record.');
    onSave({
      id: nextId,
      section,
      payeeName: payeeName.trim(),
      payeePan: payeePan.trim().toUpperCase(),
      nature: nature.trim() || info.label,
      voucherNo: voucherNo.trim() || null,
      paymentDate,
      grossAmount: gross,
      ratePct: rate,
      depositDate: null,
      challanNo: null,
      depositBank: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Record TDS</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tdsSection" className="block text-xs font-semibold text-gray-600 mb-1">Section</label>
              <select
                id="tdsSection"
                value={section}
                onChange={(e) => { setSection(e.target.value); setRateOverride(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {TDS_SECTIONS.map((s) => <option key={s.section} value={s.section}>u/s {s.section} — {s.label}</option>)}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">{info?.note}</p>
            </div>

            <div>
              <label htmlFor="tdsPayee" className="block text-xs font-semibold text-gray-600 mb-1">Payee *</label>
              <input
                id="tdsPayee"
                type="text"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="Name of the person or firm"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !payeeName.trim() ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="tdsPan" className="block text-xs font-semibold text-gray-600 mb-1">PAN of payee *</label>
              <input
                id="tdsPan"
                type="text"
                value={payeePan}
                onChange={(e) => setPayeePan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`w-full px-3 py-2 border rounded-lg font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !PAN_PATTERN.test(payeePan) ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="tdsDate" className="block text-xs font-semibold text-gray-600 mb-1">Date of payment</label>
              <input
                id="tdsDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                To deposit by {fmtDay(tdsDueDate(paymentDate))}
              </p>
            </div>

            <div>
              <label htmlFor="tdsGross" className="block text-xs font-semibold text-gray-600 mb-1">Amount paid *</label>
              <input
                id="tdsGross"
                type="number"
                min="0"
                step="0.01"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !gross ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="tdsRate" className="block text-xs font-semibold text-gray-600 mb-1">Rate applied (%)</label>
              <input
                id="tdsRate"
                type="number"
                min="0"
                step="0.01"
                value={rateOverride === '' ? String(standardRate) : rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
          </div>

          {section === '194C' && (
            <label className="flex items-start gap-2 text-xs text-gray-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <input
                type="checkbox"
                checked={payeeIsIndividual}
                onChange={(e) => setPayeeIsIndividual(e.target.checked)}
                className="mt-0.5 rounded text-[#2ca01c]"
              />
              <span>
                The payee is an individual or a HUF. TDS is 1% for an individual or HUF and 2% for
                every other kind of payee — it depends on who they are, not on how much was paid.
              </span>
            </label>
          )}

          <div>
            <label htmlFor="tdsNature" className="block text-xs font-semibold text-gray-600 mb-1">Nature of payment</label>
            <input
              id="tdsNature"
              type="text"
              value={nature}
              onChange={(e) => setNature(e.target.value)}
              placeholder={info?.label}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <div>
            <label htmlFor="tdsVoucher" className="block text-xs font-semibold text-gray-600 mb-1">Bill or voucher number</label>
            <input
              id="tdsVoucher"
              type="text"
              value={voucherNo}
              onChange={(e) => setVoucherNo(e.target.value)}
              placeholder="BILL-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2.5 text-gray-600">TDS to deduct</td>
                <td className="p-2.5 text-right tabular-nums text-gray-900">
                  {formatMoney(gross)} × {rate}% = <span className="font-bold">{formatMoney(tds)}</span>
                </td>
              </tr>
            </tbody>
          </table>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
          >
            <Check size={16} /> Save entry
          </button>
        </div>
      </div>
    </div>
  );
}