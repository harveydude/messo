import React, { useMemo, useState } from 'react';
import {
  Search, Printer, Settings, ChevronDown, X, Check, Plus, ArrowRight,
  Landmark, FileText, CircleAlert, Info,
} from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Sales tax — Goods and Services Tax, India-first.
 *
 * WHAT THIS SCREEN IS
 * -------------------
 * Three things a bookkeeper opens on the 11th and the 20th of every month:
 * which returns are due, what each one owes, and which slab the money was
 * charged at. Everything else here exists to make those three answerable.
 *
 * GST, NOT "SALES TAX" WITH A NEW LABEL
 * --------------------------------------
 * An Indian GST return is not a US sales-tax return with the words changed. The
 * distinctions this screen is built around, all of which were missing before:
 *
 *   · An intra-State supply is CGST + SGST, each HALF the rate, paid to two
 *     different governments. An inter-State supply is IGST at the FULL rate,
 *     later split by the Centre. So `interState` is a real field on a row, not
 *     a rounding convention.
 *   · Place of supply decides WHICH of the two applies. It follows where the
 *     goods are consumed, which is not where the seller is registered.
 *   · Input tax credit is the difference between the tax charged and the tax
 *     actually payable, and part of it can be BLOCKED -- section 17(5) is the
 *     common one. "ITC at risk" is therefore a first-class figure here, not a
 *     filter somebody has to remember to apply.
 *   · Returns are monthly (GSTR-1 by the 11th, GSTR-3B by the 20th) or annual
 *     (GSTR-9 by 31 December). The due date decides the status; nothing else.
 *
 * WHY NOTHING IS STORED AS A TOTAL
 * -------------------------------
 * Every rupee on this screen is worked out here from taxable values and rates.
 * A stored "tax payable" is a number that goes stale the moment an invoice is
 * raised, and a stale tax figure on a return is a late filing penalty. Filing
 * status works the same way: `filedOn` is stored, "Overdue" is computed against
 * today's date every render.
 *
 * ON THE TWO TAX NUMBERS THIS SCREEN SHOWS
 * -----------------------------------------
 * `ledger.outstanding.tax` (the Sales Tax Payable account) and the GST register
 * below it are deliberately DIFFERENT numbers and are labelled as such rather
 * than being reconciled into a single tidy total. The account carries tax
 * charged on sales invoices in the ledger; the register carries the B2B
 * supplies and their input credit. Showing one number for both would be a lie,
 * and the difference is shown openly at the foot of the screen.
 */

/** Today, read once at module load — reading the clock during render is impure. */
const TODAY = new Date();

/** Today's date as `YYYY-MM-DD`, from the same snapshot. */
const isoToday = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** A comparable date from `YYYY-MM-DD`, or null. */
const parseDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Whole days between two ISO dates, signed: positive means `date` is in the past. */
const daysFromToday = (iso) => {
  const d = parseDay(iso);
  if (!d) return null;
  return Math.round((TODAY - d) / 86400000);
};

const FMT_DAY = { day: '2-digit', month: 'short', year: 'numeric' };
const fmtDay = (iso) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString('en-IN', FMT_DAY) : '—';
};

/**
 * The CGST / SGST / IGST split of one taxable value.
 *
 * This is the single place the intra-State vs inter-State rule lives. Typing it
 * per row is how a return ends up with SGST on a Karnataka sale.
 */
function splitGst(rate, taxableValue, interState) {
  if (!rate) return { cgst: 0, sgst: 0, igst: 0 };
  if (interState) {
    return { cgst: 0, sgst: 0, igst: round2((taxableValue * rate.pct) / 100) };
  }
  const half = (Number(rate.cgstPct) || Number(rate.pct) / 2) / 100;
  return {
    cgst: round2(taxableValue * half),
    sgst: round2(taxableValue * half),
    igst: 0,
  };
}

/**
 * Filing status, from the one fact that is stored.
 *
 * `filedOn` decides it outright. Failing that, the due date decides it against
 * today. There is no stored "Overdue" flag, because a flag written once at seed
 * time is still saying "Not filed" on the day it becomes true.
 */
function filingStatus(returnRow) {
  if (returnRow.filedOn) {
    return { label: 'Filed', tone: 'green', note: `Filed ${fmtDay(returnRow.filedOn)}` };
  }
  const days = daysFromToday(returnRow.dueDate);
  if (days !== null && days > 0) {
    return { label: 'Overdue', tone: 'red', note: `${days} day${days === 1 ? '' : 's'} past due` };
  }
  return { label: 'Not filed', tone: 'amber', note: days === 0 ? 'Due today' : `Due in ${Math.abs(days)} days` };
}

const TONE = {
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  grey: 'bg-gray-100 text-gray-700 border-gray-200',
};

const RETURN_TYPES = ['All returns', 'GSTR-1', 'GSTR-3B', 'GSTR-9'];
const STATUS_FILTERS = ['Any status', 'Filed', 'Not filed', 'Overdue'];

export default function SalesTaxView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All returns');
  const [statusFilter, setStatusFilter] = useState('Any status');
  const [openReturnId, setOpenReturnId] = useState(null);
  const [filingId, setFilingId] = useState(null);
  const [rateFormOpen, setRateFormOpen] = useState(false);

  // Memoised so the derived values below have a dependency that only

  // changes when this data does. A filtered array built inline is a new

  // reference every render, which makes those memos never hit.

  const rates = useMemo(() => (state.taxRates || []), [state.taxRates]);
  const rateById = useMemo(
    () => Object.fromEntries(rates.map((r) => [r.id, r])),
    [rates]
  );

  const registration = state.gstRegistration;
  // Memoised so the derived values below have a dependency that only
  // changes when this data does. A filtered array built inline is a new
  // reference every render, which makes those memos never hit.
  const sales = useMemo(() => (state.gstSalesInvoices || []), [state.gstSalesInvoices]);
  // Memoised so the derived values below have a dependency that only
  // changes when this data does. A filtered array built inline is a new
  // reference every render, which makes those memos never hit.
  const itcInvoices = useMemo(() => (state.gstItcInvoices || []), [state.gstItcInvoices]);
  // Memoised so the derived values below have a dependency that only
  // changes when this data does. A filtered array built inline is a new
  // reference every render, which makes those memos never hit.
  const returns = useMemo(() => (state.gstReturns || []), [state.gstReturns]);

  /* ---- Every return, with its figures worked out from the period's rows ---- */
  const rows = useMemo(() => {
    return returns.map((r) => {
      const supplies = sales.filter((s) => s.period === r.period);
      const credits = itcInvoices.filter((c) => c.period === r.period);

      const taxable = round2(supplies.reduce((s, x) => s + (Number(x.taxableValue) || 0), 0));
      let cgst = 0; let sgst = 0; let igst = 0;
      for (const s of supplies) {
        const split = splitGst(rateById[s.taxRateId], Number(s.taxableValue) || 0, s.interState);
        cgst += split.cgst; sgst += split.sgst; igst += split.igst;
      }
      const outputTax = round2(cgst + sgst + igst);

      const itcAvailable = round2(credits
        .filter((c) => c.itcEligible)
        .reduce((s, c) => {
          const split = splitGst(rateById[c.taxRateId], Number(c.taxableValue) || 0, c.interState);
          return s + split.cgst + split.sgst + split.igst;
        }, 0));
      const itcBlocked = round2(credits
        .filter((c) => !c.itcEligible)
        .reduce((s, c) => {
          const split = splitGst(rateById[c.taxRateId], Number(c.taxableValue) || 0, c.interState);
          return s + split.cgst + split.sgst + split.igst;
        }, 0));

      const status = filingStatus(r);
      // GSTR-1 reports supplies and the tax collected. It does not set off
      // credit -- that is GSTR-3B -- so showing net of ITC on a GSTR-1 would be
      // a number that does not appear on the form the user is about to file.
      const payable = r.returnType === 'GSTR-1'
        ? outputTax
        : round2(outputTax - itcAvailable);

      return {
        ...r,
        status,
        supplies,
        credits,
        taxable,
        cgst: round2(cgst),
        sgst: round2(sgst),
        igst: round2(igst),
        outputTax,
        itcAvailable,
        itcBlocked,
        payable,
      };
    });
  }, [returns, sales, itcInvoices, rateById]);

  const filtered = rows.filter((r) => {
    if (typeFilter !== 'All returns' && r.returnType !== typeFilter) return false;
    if (statusFilter !== 'Any status' && r.status.label !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.returnType, r.period, r.title, r.arn].some((f) => String(f || '').toLowerCase().includes(q));
  });

  /* ---- Liability by rate: taxable value and the tax split across it ---- */
  const byRate = useMemo(() => {
    const map = new Map();
    for (const s of sales) {
      const rate = rateById[s.taxRateId];
      if (!map.has(s.taxRateId)) {
        map.set(s.taxRateId, { rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, invoices: 0 });
      }
      const row = map.get(s.taxRateId);
      const split = splitGst(rate, Number(s.taxableValue) || 0, s.interState);
      row.taxable = round2(row.taxable + (Number(s.taxableValue) || 0));
      row.cgst = round2(row.cgst + split.cgst);
      row.sgst = round2(row.sgst + split.sgst);
      row.igst = round2(row.igst + split.igst);
      row.invoices += 1;
    }
    return [...map.values()]
      .map((r) => ({ ...r, total: round2(r.cgst + r.sgst + r.igst) }))
      .sort((a, b) => b.total - a.total);
  }, [sales, rateById]);

  const liabilityTotal = round2(byRate.reduce((s, r) => s + r.total, 0));

  /* ---- Input tax credit: what is available, what is blocked, what is used ---- */
  const itc = useMemo(() => {
    const available = round2(itcInvoices.filter((c) => c.itcEligible).reduce((s, c) => {
      const split = splitGst(rateById[c.taxRateId], Number(c.taxableValue) || 0, c.interState);
      return s + split.cgst + split.sgst + split.igst;
    }, 0));
    const blocked = round2(itcInvoices.filter((c) => !c.itcEligible).reduce((s, c) => {
      const split = splitGst(rateById[c.taxRateId], Number(c.taxableValue) || 0, c.interState);
      return s + split.cgst + split.sgst + split.igst;
    }, 0));
    const claimed = round2(rows.filter((r) => r.filedOn).reduce((s, r) => s + r.itcAvailable, 0));
    return { available, blocked, claimed, unused: round2(available - claimed) };
  }, [itcInvoices, rateById, rows]);

  /**
   * The two tax figures this screen is honest about.
   *
   * The Sales Tax Payable account carries the tax charged on sales invoices
   * raised in the ledger. The register carries the B2B supplies. They are not
   * the same number and must not be printed as one -- so both are shown, named,
   * and the gap between them is stated rather than smoothed away.
   */
  const booksTax = round2(ledger.outstanding.tax);
  const registerTax = liabilityTotal;
  const unreconciled = round2(registerTax - booksTax);

  const selected = rows.find((r) => r.id === openReturnId) || null;
  const beingFiled = rows.find((r) => r.id === filingId) || null;

  const overdueCount = rows.filter((r) => r.status.label === 'Overdue').length;
  const filedCount = rows.filter((r) => r.status.label === 'Filed').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ---------------------------------------------------------- header -- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sales tax</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Goods and Services Tax — returns, rates and liability
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRateFormOpen(true)}
            className="px-4 py-1.5 text-xs font-bold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Add tax rate
          </button>
          <button
            type="button"
            onClick={() => setFilingId(rows.find((r) => !r.filedOn)?.id ?? rows[0]?.id ?? null)}
            disabled={rows.length === 0}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            File return
          </button>
        </div>
      </div>

      {/* --------------------------------------------- registration details -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <Landmark size={15} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">GST registration</h2>
        </div>
        {registration ? (
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-gray-100">
            {[
              ['GSTIN', registration.gstin],
              ['Legal name', registration.legalName],
              ['State', `${registration.state} (${registration.stateCode})`],
              ['Constitution', registration.constitution],
              ['Filing frequency', registration.filingFrequency],
              ['PAN', registration.pan],
            ].map(([k, v]) => (
              <div key={k} className="px-4 py-3">
                <dt className="text-[10px] uppercase tracking-wide text-gray-500">{k}</dt>
                <dd className="text-xs font-semibold text-gray-900 mt-0.5 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            No GST registration has been recorded for this company.
          </p>
        )}
      </section>

      {/* ------------------------------------------------- returns register -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by return type"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {RETURN_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by filing status"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {STATUS_FILTERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search returns"
                aria-label="Search returns"
                className="w-44 text-xs pl-3 pr-7 py-1.5 border border-gray-300 rounded focus:border-[#2ca01c] focus:outline-none"
              />
              <Search size={13} className="absolute right-2.5 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="text-[11px] text-gray-500">
              {filtered.length} of {rows.length} returns · {filedCount} filed · {overdueCount} overdue
            </span>
            <Printer size={15} className="cursor-pointer hover:text-gray-900" aria-label="Print" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" aria-label="Display options" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <caption className="sr-only">
              GST returns due, with the tax payable for each period worked out from
              the B2B supplies and input tax credit recorded for that period.
            </caption>
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="p-3">Return</th>
                <th scope="col" className="p-3">Period</th>
                <th scope="col" className="p-3">Due date</th>
                <th scope="col" className="p-3">Status</th>
                <th scope="col" className="p-3 text-right">Taxable value</th>
                <th scope="col" className="p-3 text-right">Tax payable</th>
                <th scope="col" className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setOpenReturnId(r.id)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="p-3">
                    <span className="font-semibold text-gray-900">{r.returnType}</span>
                    <span className="block text-[10px] text-gray-500">{r.title}</span>
                  </td>
                  <td className="p-3 text-gray-700">{r.period}</td>
                  <td className="p-3 text-gray-700">{fmtDay(r.dueDate)}</td>
                  <td className="p-3">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${TONE[r.status.tone]}`}>
                      {r.status.label}
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5">{r.status.note}</span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-700">{formatMoney(r.taxable)}</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(r.payable)}</td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setFilingId(r.id)}
                      className="text-[#0077c5] font-semibold hover:underline"
                    >
                      {r.filedOn ? 'View' : 'File'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-gray-500">
                    {rows.length === 0
                      ? 'No GST returns have been set up for this company yet.'
                      : `No return matches these filters.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------- liability and credit, side by side -- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Liability by rate</h2>
            <span className="text-[11px] text-gray-500">Output tax on B2B supplies</span>
          </div>
          {byRate.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No B2B supplies have been recorded, so there is no GST to pay.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-800">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th scope="col" className="p-3">Rate</th>
                    <th scope="col" className="p-3 text-right">Taxable</th>
                    <th scope="col" className="p-3 text-right">CGST</th>
                    <th scope="col" className="p-3 text-right">SGST</th>
                    <th scope="col" className="p-3 text-right">IGST</th>
                    <th scope="col" className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byRate.map((r) => (
                    <tr key={r.rate.id} className="hover:bg-gray-50">
                      <td className="p-3">
                        <span className="font-semibold text-gray-900">{r.rate.pct}%</span>
                        <span className="block text-[10px] text-gray-500">{r.rate.hsn}</span>
                      </td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(r.taxable)}</td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(r.cgst)}</td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(r.sgst)}</td>
                      <td className="p-3 text-right tabular-nums">{formatMoney(r.igst)}</td>
                      <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(r.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold text-gray-900 border-t border-gray-200">
                    <td className="p-3" colSpan={5}>Total output tax</td>
                    <td className="p-3 text-right tabular-nums">{formatMoney(liabilityTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Input tax credit</h2>
            <span className="text-[11px] text-gray-500">On inward supplies</span>
          </div>
          {itcInvoices.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500">
              No inward supplies have been recorded, so there is no credit to claim.
            </p>
          ) : (
            <table className="w-full text-left text-xs text-gray-800">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th scope="col" className="p-3">Line</th>
                  <th scope="col" className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Credit available on eligible purchases', itc.available],
                  ['Credit blocked and not claimable', itc.blocked],
                  ['Credit set off in filed returns', itc.claimed],
                  ['Credit still unused', itc.unused],
                ].map(([label, value]) => (
                  <tr key={label} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{label}</td>
                    <td className={`p-3 text-right tabular-nums font-semibold ${String(label).startsWith('Credit blocked') ? 'text-amber-800' : 'text-gray-900'}`}>
                      {formatMoney(value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {itc.blocked > 0 && (
            <p className="px-4 py-3 border-t border-gray-200 bg-amber-50 text-[11px] text-amber-900 flex gap-2">
              <CircleAlert size={14} className="shrink-0 mt-px" aria-hidden="true" />
              <span>
                {formatMoney(itc.blocked)} of credit cannot be taken. Check the blocked rows in the
                inward register before paying — this is the usual reason a payment is larger than expected.
              </span>
            </p>
          )}
        </section>
      </div>

      {/* ---------------------------------------------------------- tax rates -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Tax rates</h2>
          <button
            type="button"
            onClick={() => setRateFormOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0077c5] hover:underline"
          >
            <Plus size={12} /> Add tax rate
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="p-3">Rate</th>
                <th scope="col" className="p-3">Description</th>
                <th scope="col" className="p-3">HSN / SAC</th>
                <th scope="col" className="p-3 text-right">CGST</th>
                <th scope="col" className="p-3 text-right">SGST</th>
                <th scope="col" className="p-3 text-right">IGST</th>
                <th scope="col" className="p-3 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rates.map((r) => {
                const used = sales.filter((s) => s.taxRateId === r.id).length;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-gray-900">{r.pct}%</td>
                    <td className="p-3 text-gray-700">
                      {r.name}
                      {r.note && <span className="block text-[10px] text-gray-500">{r.note}</span>}
                    </td>
                    <td className="p-3 text-gray-600">{r.hsn || '—'}</td>
                    <td className="p-3 text-right tabular-nums">{r.pct ? `${r.cgstPct ?? r.pct / 2}%` : '—'}</td>
                    <td className="p-3 text-right tabular-nums">{r.pct ? `${r.sgstPct ?? r.pct / 2}%` : '—'}</td>
                    <td className="p-3 text-right tabular-nums">{r.pct ? `${r.igstPct ?? r.pct}%` : '—'}</td>
                    <td className="p-3 text-right tabular-nums text-gray-600">{used}</td>
                  </tr>
                );
              })}
              {rates.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-gray-500">
                    No tax rates have been set up. Add one before raising a taxable invoice.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------ the honest reconciliation -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <FileText size={15} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">How this ties to the books</h2>
        </div>
        <table className="w-full text-left text-xs text-gray-800">
          <caption className="sr-only">
            Two different tax figures: the Sales Tax Payable account in the ledger, and the
            GST register. They are shown separately because they are not the same number.
          </caption>
          <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
            <tr>
              <th scope="col" className="p-3">Figure</th>
              <th scope="col" className="p-3">Where it comes from</th>
              <th scope="col" className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="p-3 font-medium text-gray-900">Sales tax payable in the ledger</td>
              <td className="p-3 text-gray-600">
                Account “Sales Tax Payable” (Other Current Liabilities) — tax charged on sales invoices raised here
              </td>
              <td className="p-3 text-right tabular-nums font-semibold">{formatMoney(booksTax)}</td>
            </tr>
            <tr>
              <td className="p-3 font-medium text-gray-900">GST on the B2B register</td>
              <td className="p-3 text-gray-600">Output tax on every recorded B2B supply, by rate</td>
              <td className="p-3 text-right tabular-nums font-semibold">{formatMoney(registerTax)}</td>
            </tr>
            <tr className="bg-gray-50">
              <td className="p-3 font-medium text-gray-900">Not carried into the ledger</td>
              <td className="p-3 text-gray-600">The register is not yet posted to the chart of accounts</td>
              <td className={`p-3 text-right tabular-nums font-semibold ${unreconciled === 0 ? 'text-gray-900' : 'text-amber-800'}`}>
                {formatMoney(unreconciled)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-600 flex gap-2">
          <Info size={14} className="shrink-0 mt-px text-gray-400" aria-hidden="true" />
          <span>
            These are two different figures and they are deliberately not merged. The ledger account holds
            the tax charged on sales invoices raised in this app; the register holds the B2B supplies recorded
            against each return period. Until the register is posted to a GST payable account they will not
            agree, and printing one number for both would hide that.
          </span>
        </p>
      </section>

      <p className="text-[11px] text-gray-500">
        Filing status is worked out from each return’s due date against today ({fmtDay(isoToday)}).
        Nothing on this screen is a stored total.
        {' '}
        <button type="button" onClick={() => onNavigate?.('sales_transactions')} className="text-[#0077c5] font-semibold hover:underline">
          Go to sales transactions
        </button>
      </p>

      {selected && (
        <ReturnDrawer
          returnRow={selected}
          rateById={rateById}
          onClose={() => setOpenReturnId(null)}
          onFile={() => { setFilingId(selected.id); setOpenReturnId(null); }}
        />
      )}

      {beingFiled && (
        <FileReturnDialog
          returnRow={beingFiled}
          onClose={() => setFilingId(null)}
          onFile={(payload) => {
            dispatch({
              type: 'FILE_GST_RETURN',
              payload: { ...payload, id: beingFiled.id, returnType: beingFiled.returnType },
            });
            setFilingId(null);
          }}
        />
      )}

      {rateFormOpen && (
        <AddRateDialog
          onClose={() => setRateFormOpen(false)}
          onSave={(payload) => {
            dispatch({ type: 'ADD_TAX_RATE', payload });
            setRateFormOpen(false);
          }}
          nextId={rates.reduce((m, r) => Math.max(m, r.id), 0) + 1}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ drawer -- */

/** One return, opened: its period, its split, its credit, and the rows behind it. */
function ReturnDrawer({ returnRow, rateById, onClose, onFile }) {
  const rows = returnRow.supplies;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {returnRow.returnType} — {returnRow.period}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{returnRow.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <table className="w-full text-xs text-gray-800">
            <tbody className="divide-y divide-gray-200">
              {[
                ['Filing due', fmtDay(returnRow.dueDate)],
                ['Status', `${returnRow.status.label} — ${returnRow.status.note}`],
                ['ARN', returnRow.arn || 'Not filed yet'],
                ['Acknowledgement', returnRow.ackNo || '—'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="py-1.5 pr-4 text-gray-500 w-40">{k}</td>
                  <td className="py-1.5 font-medium text-gray-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <table className="w-full text-xs text-gray-800 border border-gray-200 rounded-lg overflow-hidden">
            <caption className="sr-only">Tax worked out for the period</caption>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Taxable value of supplies', returnRow.taxable],
                ['CGST', returnRow.cgst],
                ['SGST', returnRow.sgst],
                ['IGST', returnRow.igst],
                ['Output tax', returnRow.outputTax],
                ['Input tax credit available', returnRow.itcAvailable],
                ['Input tax credit blocked', returnRow.itcBlocked],
                [
                  returnRow.returnType === 'GSTR-1' ? 'Tax collected (GSTR-1)' : 'Tax payable (GSTR-3B)',
                  returnRow.payable,
                ],
              ].map(([k, v], i, arr) => {
                const strong = i === arr.length - 1 || i === 0;
                return (
                  <tr key={k} className={strong ? 'bg-gray-50 font-semibold' : ''}>
                    <td className="p-2.5 text-gray-700">{k}</td>
                    <td className={`p-2.5 text-right tabular-nums ${String(k).includes('blocked') ? 'text-amber-800' : 'text-gray-900'}`}>
                      {formatMoney(v)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {returnRow.returnType === 'GSTR-1' && (
            <p className="text-[11px] text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
              GSTR-1 reports outward supplies and the tax collected. Credit is set off on the
              GSTR-3B, so it is shown above but is not deducted here.
            </p>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
              Supplies in this period
            </h3>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center border border-dashed border-gray-200 rounded-lg">
                No B2B supplies were recorded for {returnRow.period}.
              </p>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-gray-800">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th scope="col" className="p-2.5 text-left">Invoice</th>
                      <th scope="col" className="p-2.5 text-left">Party and GSTIN</th>
                      <th scope="col" className="p-2.5 text-left">POS</th>
                      <th scope="col" className="p-2.5 text-right">Taxable</th>
                      <th scope="col" className="p-2.5 text-right">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((s) => {
                      const rate = rateById[s.taxRateId];
                      const split = splitGst(rate, Number(s.taxableValue) || 0, s.interState);
                      return (
                        <tr key={s.id}>
                          <td className="p-2.5">
                            <span className="font-medium text-gray-900">{s.invoiceNo}</span>
                            <span className="block text-[10px] text-gray-500">{fmtDay(s.date)}</span>
                          </td>
                          <td className="p-2.5">
                            <span className="text-gray-700">{s.partyName}</span>
                            <span className="block text-[10px] text-gray-500 font-mono">{s.partyGstin}</span>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.interState ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                              {s.interState ? 'IGST' : 'CGST+SGST'}
                            </span>
                            <span className="block text-[10px] text-gray-500">POS {s.placeOfSupply}</span>
                          </td>
                          <td className="p-2.5 text-right tabular-nums">{formatMoney(s.taxableValue)}</td>
                          <td className="p-2.5 text-right tabular-nums font-medium">
                            {formatMoney(round2(split.cgst + split.sgst + split.igst))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          {!returnRow.filedOn && (
            <button
              type="button"
              onClick={onFile}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
            >
              File this return <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ file a return -- */

function FileReturnDialog({ returnRow, onClose, onFile }) {
  const [filingDate, setFilingDate] = useState(isoToday);
  const [arn, setArn] = useState('');
  const [error, setError] = useState('');

  const status = filingStatus(returnRow);

  const submit = () => {
    if (!filingDate) return setError('The date of filing is required.');
    if (parseDay(filingDate) > parseDay(returnRow.dueDate) && !arn.trim()) {
      // A late filing is allowed, but the portal returns an ARN and a CA or the
      // taxpayer has to quote it. Refusing to record the filing without it would
      // be worse: the return WAS filed, and pretending otherwise hides the penalty.
      return setError('This filing is after the due date — enter the ARN the portal returned.');
    }
    onFile({
      filedOn: filingDate,
      arn: arn.trim() || null,
      ackNo: arn.trim() ? `ACK${arn.trim()}` : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">File {returnRow.returnType}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {returnRow.period} · due {fmtDay(returnRow.dueDate)} · {status.label}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              {[
                ['Taxable value', formatMoney(returnRow.taxable)],
                ['CGST', formatMoney(returnRow.cgst)],
                ['SGST', formatMoney(returnRow.sgst)],
                ['IGST', formatMoney(returnRow.igst)],
                ['Input tax credit set off', formatMoney(returnRow.itcAvailable)],
                ['Payable on this return', formatMoney(returnRow.payable)],
              ].map(([k, v], i, arr) => (
                <tr key={k} className={i === arr.length - 1 ? 'bg-gray-50 font-semibold' : ''}>
                  <td className="p-2.5 text-gray-700">{k}</td>
                  <td className="p-2.5 text-right tabular-nums text-gray-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <label htmlFor="filingDate" className="block text-xs font-semibold text-gray-600 mb-1">
              Date of filing
            </label>
            <input
              id="filingDate"
              type="date"
              value={filingDate}
              onChange={(e) => setFilingDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <div>
            <label htmlFor="arn" className="block text-xs font-semibold text-gray-600 mb-1">
              GST portal ARN <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="arn"
              type="text"
              value={arn}
              onChange={(e) => setArn(e.target.value)}
              placeholder="AA270926123456X"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              The acknowledgement number the portal returns. Keeping it is what makes an assessment of
              a filed return answerable later.
            </p>
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
            <Check size={16} /> Record filing
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- add a rate -- */

/**
 * A new GST slab.
 *
 * CGST and SGST are derived from the total rate rather than typed separately:
 * an intra-State supply is always two halves, and asking for both and then
 * letting them disagree from the rate is how an invoice gets filed wrong.
 */
function AddRateDialog({ onClose, onSave, nextId }) {
  const [name, setName] = useState('');
  const [pct, setPct] = useState('18');
  const [hsn, setHsn] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const rate = Number(pct);
  const validRate = Number.isFinite(rate) && rate >= 0 && rate <= 50;

  const submit = () => {
    if (!name.trim()) return setError('A name is required — an unnamed rate cannot be picked on an invoice.');
    if (!validRate) return setError('The rate must be a number between 0 and 50.');
    onSave({
      id: nextId,
      name: name.trim(),
      pct: rate,
      cgstPct: rate / 2,
      sgstPct: rate / 2,
      igstPct: rate,
      hsn: hsn.trim() || null,
      note: note.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add tax rate</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="rateName" className="block text-xs font-semibold text-gray-600 mb-1">Name *</label>
            <input
              id="rateName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="GST 18% — pumps and installation"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !name.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label htmlFor="ratePct" className="block text-xs font-semibold text-gray-600 mb-1">
              Total GST rate (%)
            </label>
            <input
              id="ratePct"
              type="number"
              min="0"
              max="50"
              step="0.01"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              {validRate
                ? `Intra-State: CGST ${round2(rate / 2)}% + SGST ${round2(rate / 2)}%. Inter-State: IGST ${rate}%.`
                : 'Enter a rate between 0 and 50.'}
            </p>
          </div>

          <div>
            <label htmlFor="rateHsn" className="block text-xs font-semibold text-gray-600 mb-1">
              HSN / SAC code
            </label>
            <input
              id="rateHsn"
              type="text"
              value={hsn}
              onChange={(e) => setHsn(e.target.value)}
              placeholder="8413 / SAC 995461"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <div>
            <label htmlFor="rateNote" className="block text-xs font-semibold text-gray-600 mb-1">Note</label>
            <input
              id="rateNote"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Which supplies this rate applies to"
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
            <Check size={16} /> Save rate
          </button>
        </div>
      </div>
    </div>
  );
}