import React, { useMemo, useState } from 'react';
import {
  Search, Printer, Settings, ChevronDown, X, Check, Plus, ArrowRight,
  Landmark, Wallet, CircleAlert, Info,
} from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Lending — loans taken, what they cost, and what is still owed.
 *
 * WHY THE AMORTISATION IS COMPUTED, NOT STORED
 * --------------------------------------------
 * A schedule is not data, it is arithmetic. Principal, rate and term determine
 * every EMI, every interest figure and the closing balance of the last
 * instalment. Typing those in means the schedule is a claim rather than a
 * consequence: change the rate and the stored instalments are quietly wrong.
 * So `buildSchedule` walks the loan and works them out, and the screen prints
 * what it just calculated.
 *
 * WHY A REPAYMENT STORES AN INSTALMENT NUMBER, NOT AN AMOUNT
 * ----------------------------------------------------------
 * The same argument, one level down. If a repayment carried its own amount, it
 * could disagree with the instalment it claims to have settled — and then the
 * outstanding balance would be a number that disagrees with the schedule above
 * it. A repayment therefore records WHICH instalment and WHEN; the money comes
 * off the computed schedule. The form also accepts a custom amount for the
 * genuine case of a part payment or a foreclosure.
 *
 * WHY THE OUTSTANDING BALANCE IS NEVER STORED
 * -------------------------------------------
 * It is principal minus the repayments. Nothing writes it, so nothing can leave
 * it stale. The same reasoning the rest of this app uses for account balances.
 *
 * INTEREST IS NOT THE SAME EVERY MONTH
 * ------------------------------------
 * The first instalment carries a full month of interest and the last carries
 * almost none, because the balance falls. A summary that divides total interest
 * by the number of instalments would show a neat average that matches no row of
 * the schedule below it, so the summary shows total interest and the schedule
 * shows the real shape.
 *
 * These loans are a register. They are not yet posted to the chart of accounts,
 * and the screen says so rather than implying a liability the balance sheet
 * does not carry.
 */

const TODAY = new Date();

const isoToday = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

const parseDay = (iso) => {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const fmtDay = (iso) => {
  const d = parseDay(iso);
  return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
};

/** `n` months after an ISO date. */
const addMonths = (iso, n) => {
  const d = parseDay(iso);
  if (!d) return null;
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  const pad = (v) => String(v).padStart(2, '0');
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
};

/**
 * The level-payment instalment for a loan.
 *
 * The annuity formula. Guarded for a zero rate — an interest-free vendor loan
 * divides by the rate here, and without the guard it is a division by zero that
 * takes the whole screen with it.
 */
function emiFor(principal, annualRatePct, termMonths) {
  const n = Number(termMonths) || 0;
  const p = Number(principal) || 0;
  const r = (Number(annualRatePct) || 0) / 12 / 100;
  if (n <= 0 || p <= 0) return 0;
  if (r === 0) return round2(p / n);
  return round2((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/**
 * A loan's full amortisation schedule, period by period.
 *
 * Reducing balance: interest on what is still owed, the rest of the instalment
 * against the principal. The final period is trimmed so the closing balance is
 * exactly zero — without that the last row overpays by a few paise and the
 * "total repaid" figure contradicts the sum of the rows above it.
 */
function buildSchedule(loan) {
  const principal = Number(loan.principal) || 0;
  const months = Number(loan.termMonths) || 0;
  const r = (Number(loan.annualRatePct) || 0) / 12 / 100;
  const emi = emiFor(principal, loan.annualRatePct, months);

  const schedule = [];
  let balance = principal;
  for (let i = 1; i <= months && balance > 0.005; i++) {
    const interest = round2(balance * r);
    const principalPart = round2(Math.min(emi - interest, balance));
    const payment = round2(principalPart + interest);
    const closing = round2(balance - principalPart);
    schedule.push({
      instalmentNo: i,
      dueDate: addMonths(loan.startDate, i - 1),
      opening: round2(balance),
      principal: principalPart,
      interest,
      payment,
      closing,
    });
    balance = closing;
  }
  return schedule;
}

/** The money a repayment actually moved, whether it names an instalment or an amount. */
const repaymentAmount = (repayment, schedule) => {
  if (repayment.amount != null) return Number(repayment.amount) || 0;
  const row = schedule.find((s) => s.instalmentNo === repayment.instalmentNo);
  return row ? row.payment : 0;
};

const LENDER_FILTERS = ['All lenders', 'Bank', 'NBFC', 'Vendor'];
const REPAYMENT_MODES = ['NEFT', 'RTGS', 'UPI', 'Cheque', 'Auto-debit'];

export default function LendingView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [lenderFilter, setLenderFilter] = useState('All lenders');
  const [statusFilter, setStatusFilter] = useState('All loans');
  const [openId, setOpenId] = useState(null);
  const [repayFor, setRepayFor] = useState(null);
  const [loanFormOpen, setLoanFormOpen] = useState(false);

  // Memoised so the derived values below have a dependency that only

  // changes when this data does. A filtered array built inline is a new

  // reference every render, which makes those memos never hit.

  const loans = useMemo(() => (state.loans || []), [state.loans]);

  /* ---- Every loan with its schedule, outstanding balance and progress ---- */
  const rows = useMemo(() => {
    return loans.map((loan) => {
      const schedule = buildSchedule(loan);
      const emi = schedule.length ? schedule[0].payment : 0;
      const repayments = loan.repayments || [];

      const repaid = round2(repayments.reduce((s, r) => s + repaymentAmount(r, schedule), 0));
      const outstanding = round2(Math.max(0, (Number(loan.principal) || 0) - repaid));
      const interestTotal = round2(schedule.reduce((s, p) => s + p.interest, 0));
      const cost = round2(repaid + outstanding > 0 ? interestTotal : 0);

      // Which instalments the recorded repayments have actually settled, so the
      // schedule can mark them rather than implying the whole loan is current.
      const settled = new Set();
      let running = 0;
      for (const p of schedule) {
        running = round2(running + p.payment);
        if (running <= repaid + 0.005) settled.add(p.instalmentNo);
      }

      const paidCount = settled.size;
      const progress = schedule.length ? Math.min(100, (paidCount / schedule.length) * 100) : 0;
      const nextDue = schedule.find((p) => !settled.has(p.instalmentNo)) || null;

      return {
        ...loan,
        schedule,
        emi,
        repayments,
        repaid,
        outstanding,
        interestTotal,
        cost,
        settled,
        paidCount,
        progress,
        nextDue,
        status: outstanding <= 0.005 ? 'Closed' : paidCount > 0 ? 'Repaying' : 'Not started',
      };
    }).sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
  }, [loans]);

  const filtered = rows.filter((l) => {
    if (lenderFilter !== 'All lenders' && l.lenderType !== lenderFilter) return false;
    if (statusFilter !== 'All loans' && l.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [l.name, l.lender, l.accountNo, l.purpose].some((f) => String(f || '').toLowerCase().includes(q));
  });

  /* ---- The summary, as table rows rather than decorative tiles. ---- */
  const summary = useMemo(() => {
    const borrowed = round2(rows.reduce((s, l) => s + (Number(l.principal) || 0), 0));
    const outstanding = round2(rows.reduce((s, l) => s + l.outstanding, 0));
    const repaid = round2(rows.reduce((s, l) => s + l.repaid, 0));
    const monthly = round2(rows.filter((l) => l.status === 'Repaying' || l.status === 'Not started').reduce((s, l) => s + l.emi, 0));
    const interest = round2(rows.reduce((s, l) => s + l.interestTotal, 0));
    const weightedRate = borrowed === 0
      ? null
      : round2(rows.reduce((s, l) => s + (Number(l.principal) || 0) * (Number(l.annualRatePct) || 0), 0) / borrowed);
    return { borrowed, outstanding, repaid, monthly, interest, weightedRate };
  }, [rows]);

  const selected = rows.find((l) => l.id === openId) || null;
  const repaying = rows.find((l) => l.id === repayFor) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* ---------------------------------------------------------- header -- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lending</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Loans taken, what they cost, and what is still outstanding
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLoanFormOpen(true)}
            className="px-4 py-1.5 text-xs font-bold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Record loan
          </button>
          <button
            type="button"
            onClick={() => setRepayFor(rows.find((l) => l.status !== 'Closed')?.id ?? null)}
            disabled={rows.length === 0}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Record repayment
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- summary, as rows -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs text-gray-800">
          <caption className="sr-only">
            Lending position across every loan. Borrowed, repaid and outstanding are summed from
            the loan register; the monthly obligation is the sum of the computed instalments.
          </caption>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Total borrowed', summary.borrowed, `${rows.length} loan${rows.length === 1 ? '' : 's'} on the register`],
              ['Repaid so far', summary.repaid, 'from recorded repayments'],
              ['Outstanding principal', summary.outstanding, summary.borrowed ? `${Math.round((summary.outstanding / summary.borrowed) * 100)}% of what was borrowed` : '—'],
              ['Monthly obligation', summary.monthly, 'instalments due each month on live loans'],
              ['Interest over the full term', summary.interest, 'summed from each computed schedule'],
              ['Weighted average rate', null, summary.weightedRate === null ? 'no loans on the register' : `${summary.weightedRate}% a year, weighted by principal`],
            ].map(([label, value, note]) => (
              <tr key={label} className="hover:bg-gray-50">
                <th scope="row" className="p-3 pl-4 font-normal text-gray-600">{label}</th>
                <td className="p-3 text-right tabular-nums font-semibold text-gray-900">
                  {value === null ? '—' : formatMoney(value)}
                </td>
                <td className="p-3 pr-4 text-right text-[11px] text-gray-500">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* -------------------------------------------------------- loan table -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select
                value={lenderFilter}
                onChange={(e) => setLenderFilter(e.target.value)}
                aria-label="Filter by lender type"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {LENDER_FILTERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by loan status"
                className="appearance-none text-xs font-semibold text-gray-700 border border-gray-300 rounded-full pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {['All loans', 'Not started', 'Repaying', 'Closed'].map((t) => <option key={t}>{t}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lender or loan"
                aria-label="Search loans"
                className="w-48 text-xs pl-3 pr-7 py-1.5 border border-gray-300 rounded focus:border-[#2ca01c] focus:outline-none"
              />
              <Search size={13} className="absolute right-2.5 top-2.5 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="text-[11px] text-gray-500">{filtered.length} of {rows.length} loans</span>
            <Printer size={15} className="cursor-pointer hover:text-gray-900" aria-label="Print" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" aria-label="Display options" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <caption className="sr-only">
              Loans with lender, principal, rate, term, computed instalment and outstanding balance
            </caption>
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="p-3">Loan</th>
                <th scope="col" className="p-3">Lender</th>
                <th scope="col" className="p-3">Start</th>
                <th scope="col" className="p-3 text-right">Principal</th>
                <th scope="col" className="p-3 text-right">Rate</th>
                <th scope="col" className="p-3 text-right">Term</th>
                <th scope="col" className="p-3 text-right">Instalment</th>
                <th scope="col" className="p-3 text-right">Outstanding</th>
                <th scope="col" className="p-3">Progress</th>
                <th scope="col" className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpenId(l.id)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="p-3">
                    <span className="font-medium text-gray-900">{l.name}</span>
                    <span className="block text-[10px] text-gray-500">{l.repaymentType}{l.secured ? ' · secured' : ''}</span>
                  </td>
                  <td className="p-3 text-gray-700">
                    {l.lender}
                    <span className="block text-[10px] text-gray-500">{l.lenderType}</span>
                  </td>
                  <td className="p-3 text-gray-700">{fmtDay(l.startDate)}</td>
                  <td className="p-3 text-right tabular-nums font-medium text-gray-900">{formatMoney(l.principal)}</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{Number(l.annualRatePct) || 0}%</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{l.termMonths} mo</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(l.emi)}</td>
                  <td className={`p-3 text-right tabular-nums font-semibold ${l.outstanding > 0 ? 'text-amber-800' : 'text-green-700'}`}>
                    {formatMoney(l.outstanding)}
                  </td>
                  <td className="p-3">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-[#2ca01c]" style={{ width: `${l.progress}%` }} />
                    </div>
                    <span className="block text-[10px] text-gray-500 mt-1">
                      {l.paidCount} of {l.schedule.length}
                    </span>
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setRepayFor(l.id)}
                      disabled={l.status === 'Closed'}
                      className="text-[#0077c5] font-semibold hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      {l.status === 'Closed' ? 'Closed' : 'Repay'}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-sm text-gray-500">
                    {rows.length === 0
                      ? 'No loans have been recorded. Record a loan to see its instalment and repayment schedule worked out.'
                      : 'No loan matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------- next payments table -- */}
      {rows.some((l) => l.status !== 'Closed') && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
            <Wallet size={15} className="text-gray-500" aria-hidden="true" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Next payment on each loan</h2>
          </div>
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th scope="col" className="p-3 pl-4">Loan</th>
                <th scope="col" className="p-3">Instalment due</th>
                <th scope="col" className="p-3 text-right">Principal</th>
                <th scope="col" className="p-3 text-right">Interest</th>
                <th scope="col" className="p-3 text-right">Payment</th>
                <th scope="col" className="p-3 pr-4 text-right">Balance after</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.filter((l) => l.nextDue).map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-3 pl-4 text-gray-700">{l.name}</td>
                  <td className="p-3 text-gray-700">
                    No. {l.nextDue.instalmentNo}
                    <span className="block text-[10px] text-gray-500">{fmtDay(l.nextDue.dueDate)}</span>
                  </td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(l.nextDue.principal)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(l.nextDue.interest)}</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-gray-900">{formatMoney(l.nextDue.payment)}</td>
                  <td className="p-3 pr-4 text-right tabular-nums text-gray-700">{formatMoney(l.nextDue.closing)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ------------------------------------------- the books, stated honestly -- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <Landmark size={15} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">How this ties to the books</h2>
        </div>
        <table className="w-full text-left text-xs text-gray-800">
          <tbody className="divide-y divide-gray-100">
            <tr>
              <td className="p-3 pl-4 text-gray-600">Outstanding principal, per the loan register</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(summary.outstanding)}</td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Interest charged over the life of these loans</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(summary.interest)}</td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Outstanding principal, per the loan register</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(round2(outstandingPrincipal))}</td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Interest charged over the life of these loans</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(round2(totalInterest))}</td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Liabilities carried in the chart of accounts</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(round2(ledger.liabilities.total))}</td>
            </tr>
            <tr>
              <td className="p-3 pl-4 text-gray-600">Cash in the books</td>
              <td className="p-3 pr-4 text-right tabular-nums font-semibold text-gray-900">{formatMoney(round2(ledger.cash.total))}</td>
            </tr>
          </tbody>
        </table>
        <p className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-600 flex gap-2">
          <CircleAlert size={14} className="shrink-0 mt-px text-amber-600" aria-hidden="true" />
          <span>
            These loans are a register, not a posting. The disbursement and its repayments have not
            been entered as bank transactions, so no loan principal appears in the balance sheet yet
            and the two figures above will not agree. That is a real gap in the books rather than a
            display error, so it is shown instead of being tidied away.
          </span>
        </p>
      </section>

      <p className="text-[11px] text-gray-500">
        Every instalment, interest figure and outstanding balance on this screen is worked out from
        the principal, the rate and the term. Nothing is typed in, so a changed rate changes the
        whole schedule.
        {' '}
        <button type="button" onClick={() => onNavigate?.('balance_sheet')} className="text-[#0077c5] font-semibold hover:underline">
          Go to the balance sheet
        </button>
      </p>

      {selected && (
        <LoanDrawer
          loan={selected}
          onClose={() => setOpenId(null)}
          onRepay={() => { setRepayFor(selected.id); setOpenId(null); }}
        />
      )}

      {repaying && (
        <RepaymentDialog
          loan={repaying}
          onClose={() => setRepayFor(null)}
          onSave={(repayment) => {
            dispatch({
              type: 'RECORD_LOAN_REPAYMENT',
              payload: { loanId: repaying.id, loanName: repaying.name, repayment },
            });
            setRepayFor(null);
          }}
          nextRepaymentId={repaying.repayments.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1}
        />
      )}

      {loanFormOpen && (
        <RecordLoanDialog
          onClose={() => setLoanFormOpen(false)}
          onSave={(payload) => {
            dispatch({ type: 'ADD_LOAN', payload });
            setLoanFormOpen(false);
          }}
          nextId={loans.reduce((m, l) => Math.max(m, Number(l.id) || 0), 0) + 1}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ drawer -- */

/** One loan: its terms, and the amortisation schedule period by period. */
function LoanDrawer({ loan, onClose, onRepay }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? loan.schedule : loan.schedule.slice(0, 12);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{loan.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loan.lender} · {loan.repaymentType} · {loan.status}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <table className="w-full text-xs text-gray-800 border border-gray-200 rounded-lg overflow-hidden">
            <caption className="sr-only">Loan terms</caption>
            <tbody className="divide-y divide-gray-100">
              {[
                ['Lender', `${loan.lender}${loan.accountNo ? ` · ${loan.accountNo}` : ''}`],
                ['Type of lender', loan.lenderType],
                ['Purpose', loan.purpose],
                ['Security', loan.secured ? loan.collateral || 'Secured' : 'Unsecured — no collateral'],
                ['Principal', formatMoney(loan.principal)],
                ['Interest rate', `${Number(loan.annualRatePct) || 0}% a year, reducing balance`],
                ['Term', `${loan.termMonths} months from ${fmtDay(loan.startDate)}`],
                ['Instalment', formatMoney(loan.emi)],
                ['Repaid to date', formatMoney(loan.repaid)],
                ['Outstanding', formatMoney(loan.outstanding)],
                ['Interest over the term', formatMoney(loan.interestTotal)],
                ['Ledger account', loan.ledgerAccount],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="p-2.5 text-gray-500 w-48">{k}</td>
                  <td className="p-2.5 text-gray-900">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {loan.repayments.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">Repayments received</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs text-gray-800">
                  <thead className="bg-gray-50 text-gray-600 font-semibold">
                    <tr>
                      <th scope="col" className="p-2.5 text-left">Date</th>
                      <th scope="col" className="p-2.5 text-left">Mode</th>
                      <th scope="col" className="p-2.5 text-left">Reference</th>
                      <th scope="col" className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loan.repayments.map((r) => (
                      <tr key={r.id}>
                        <td className="p-2.5 text-gray-700">{fmtDay(r.date)}</td>
                        <td className="p-2.5 text-gray-600">{r.mode}</td>
                        <td className="p-2.5 font-mono text-[11px] text-gray-600">{r.reference || '—'}</td>
                        <td className="p-2.5 text-right tabular-nums font-medium">{formatMoney(repaymentAmount(r, loan.schedule))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
              Amortisation schedule
            </h3>
            <p className="text-[11px] text-gray-500 mb-2">
              Worked out from {formatMoney(loan.principal)} at {Number(loan.annualRatePct) || 0}% over{' '}
              {loan.termMonths} months. Interest falls every period because the balance does.
            </p>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs text-gray-800">
                <caption className="sr-only">
                  Principal and interest for each period, with the opening and closing balance
                </caption>
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th scope="col" className="p-2.5 text-left">No.</th>
                    <th scope="col" className="p-2.5 text-left">Date</th>
                    <th scope="col" className="p-2.5 text-right">Opening</th>
                    <th scope="col" className="p-2.5 text-right">Principal</th>
                    <th scope="col" className="p-2.5 text-right">Interest</th>
                    <th scope="col" className="p-2.5 text-right">Payment</th>
                    <th scope="col" className="p-2.5 text-right">Closing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.map((p) => {
                    const paid = loan.settled.has(p.instalmentNo);
                    return (
                      <tr key={p.instalmentNo} className={paid ? 'bg-green-50/40' : 'hover:bg-gray-50'}>
                        <td className="p-2.5 text-gray-700">
                          {p.instalmentNo}
                          {paid && <span className="ml-1.5 text-[9px] font-bold text-green-700">PAID</span>}
                        </td>
                        <td className="p-2.5 text-gray-600">{fmtDay(p.dueDate)}</td>
                        <td className="p-2.5 text-right tabular-nums text-gray-600">{formatMoney(p.opening)}</td>
                        <td className="p-2.5 text-right tabular-nums text-gray-800">{formatMoney(p.principal)}</td>
                        <td className="p-2.5 text-right tabular-nums text-gray-600">{formatMoney(p.interest)}</td>
                        <td className="p-2.5 text-right tabular-nums font-semibold text-gray-900">{formatMoney(p.payment)}</td>
                        <td className="p-2.5 text-right tabular-nums text-gray-700">{formatMoney(p.closing)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {loan.schedule.length > 12 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="mt-2 text-[11px] font-semibold text-[#0077c5] hover:underline inline-flex items-center gap-1"
              >
                {showAll ? 'Show only the first 12 periods' : `Show all ${loan.schedule.length} periods`}
                <ChevronDown size={12} className={showAll ? 'rotate-180' : ''} />
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-600 flex gap-2">
            <Info size={14} className="shrink-0 mt-px text-gray-400" aria-hidden="true" />
            <span>
              Total interest over the term is {formatMoney(loan.interestTotal)}, which works out at
              {loan.interestTotal > 0 && loan.repaid > 0
                ? ` ${Math.round((loan.interestTotal / Math.max(loan.repaid, 1)) * 100)}% of what has been repaid so far`
                : ' a figure that depends entirely on how much is actually repaid'}
              . Early repayment and a falling rate both change it, which is why the schedule is
              computed rather than typed.
            </span>
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          {loan.status !== 'Closed' && (
            <button
              type="button"
              onClick={onRepay}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg inline-flex items-center gap-2"
            >
              Record a repayment <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ record a payment -- */

function RepaymentDialog({ loan, onClose, onSave, nextRepaymentId }) {
  const next = loan.schedule.find((p) => !loan.settled.has(p.instalmentNo));
  const [instalmentNo, setInstalmentNo] = useState(next ? String(next.instalmentNo) : '');
  const [date, setDate] = useState(isoToday);
  const [mode, setMode] = useState('NEFT');
  const [reference, setReference] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');

  const row = loan.schedule.find((p) => String(p.instalmentNo) === String(instalmentNo));
  const amount = customAmount === '' ? (row ? row.payment : 0) : (Number(customAmount) || 0);
  const after = round2(Math.max(0, loan.outstanding - amount));

  const submit = () => {
    if (!amount || amount <= 0) return setError('Enter the amount received. A repayment without an amount does not reduce anything.');
    if (amount > loan.outstanding + 0.01) {
      return setError(`That is more than the ${formatMoney(loan.outstanding)} still outstanding on this loan.`);
    }
    onSave({
      id: nextRepaymentId,
      instalmentNo: row ? row.instalmentNo : null,
      amount: customAmount === '' ? null : amount,
      date,
      mode,
      reference: reference.trim() || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record a repayment</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loan.name} · {loan.lender}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="repayInstalment" className="block text-xs font-semibold text-gray-600 mb-1">
              Instalment being settled
            </label>
            <select
              id="repayInstalment"
              value={instalmentNo}
              onChange={(e) => { setInstalmentNo(e.target.value); setCustomAmount(''); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            >
              <option value="">Other amount — part payment or foreclosure</option>
              {loan.schedule
                .filter((p) => !loan.settled.has(p.instalmentNo))
                .map((p) => (
                  <option key={p.instalmentNo} value={p.instalmentNo}>
                    Instalment {p.instalmentNo} · due {fmtDay(p.dueDate)} · {formatMoney(p.payment)}
                  </option>
                ))}
            </select>
          </div>

          {row && (
            <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2.5 text-gray-600">Principal</td>
                  <td className="p-2.5 text-right tabular-nums">{formatMoney(row.principal)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-gray-600">Interest</td>
                  <td className="p-2.5 text-right tabular-nums">{formatMoney(row.interest)}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="p-2.5">Payment</td>
                  <td className="p-2.5 text-right tabular-nums">{formatMoney(row.payment)}</td>
                </tr>
              </tbody>
            </table>
          )}

          <div>
            <label htmlFor="repayAmount" className="block text-xs font-semibold text-gray-600 mb-1">
              Amount received
            </label>
            <input
              id="repayAmount"
              type="number"
              min="0"
              step="0.01"
              value={customAmount === '' ? (row ? String(row.payment) : '') : customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder={row ? String(row.payment) : '0.00'}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !amount ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="repayDate" className="block text-xs font-semibold text-gray-600 mb-1">Date received</label>
              <input
                id="repayDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
            <div>
              <label htmlFor="repayMode" className="block text-xs font-semibold text-gray-600 mb-1">Mode</label>
              <select
                id="repayMode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {REPAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="repayRef" className="block text-xs font-semibold text-gray-600 mb-1">Reference</label>
            <input
              id="repayRef"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="UTR or cheque number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2.5 text-gray-600">Outstanding now</td>
                <td className="p-2.5 text-right tabular-nums">{formatMoney(loan.outstanding)}</td>
              </tr>
              <tr>
                <td className="p-2.5 text-gray-600">After this repayment</td>
                <td className="p-2.5 text-right tabular-nums font-bold text-gray-900">{formatMoney(after)}</td>
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
            <Check size={16} /> Save repayment
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- record a loan -- */

function RecordLoanDialog({ onClose, onSave, nextId }) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [lenderType, setLenderType] = useState('Bank');
  const [accountNo, setAccountNo] = useState('');
  const [purpose, setPurpose] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('10.5');
  const [termMonths, setTermMonths] = useState('60');
  const [startDate, setStartDate] = useState(isoToday);
  const [repaymentType] = useState('EMI');
  const [secured, setSecured] = useState(true);
  const [collateral, setCollateral] = useState('');
  const [error, setError] = useState('');

  const amount = Number(principal) || 0;
  const term = Number(termMonths) || 0;
  const instalment = emiFor(amount, rate, term);

  const submit = () => {
    if (!name.trim()) return setError('Give the loan a name — a register of unnamed loans cannot be reviewed.');
    if (!lender.trim()) return setError('The lender is required.');
    if (amount <= 0) return setError('Enter the principal advanced.');
    if (term <= 0) return setError('Enter the term in months.');
    onSave({
      id: nextId,
      name: name.trim(),
      lender: lender.trim(),
      lenderType,
      accountNo: accountNo.trim() || null,
      purpose: purpose.trim() || null,
      principal: amount,
      annualRatePct: Number(rate) || 0,
      termMonths: term,
      repaymentType,
      startDate,
      secured,
      collateral: secured ? collateral.trim() || null : null,
      ledgerAccount: `${lender.trim()} (long-term liability)`,
      repayments: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Record a loan</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="loanName" className="block text-xs font-semibold text-gray-600 mb-1">Loan name *</label>
              <input
                id="loanName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Working capital term loan"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !name.trim() ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="loanLender" className="block text-xs font-semibold text-gray-600 mb-1">Lender *</label>
              <input
                id="loanLender"
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                placeholder="Bank, NBFC or supplier"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && !lender.trim() ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="loanType" className="block text-xs font-semibold text-gray-600 mb-1">Type of lender</label>
              <select
                id="loanType"
                value={lenderType}
                onChange={(e) => setLenderType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              >
                {LENDER_FILTERS.slice(1).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="loanAccount" className="block text-xs font-semibold text-gray-600 mb-1">Loan account number</label>
              <input
                id="loanAccount"
                type="text"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>

            <div>
              <label htmlFor="loanPrincipal" className="block text-xs font-semibold text-gray-600 mb-1">Principal advanced *</label>
              <input
                id="loanPrincipal"
                type="number"
                min="0"
                step="0.01"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && amount <= 0 ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="loanRate" className="block text-xs font-semibold text-gray-600 mb-1">Interest rate (% a year)</label>
              <input
                id="loanRate"
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>

            <div>
              <label htmlFor="loanTerm" className="block text-xs font-semibold text-gray-600 mb-1">Term (months) *</label>
              <input
                id="loanTerm"
                type="number"
                min="1"
                step="1"
                value={termMonths}
                onChange={(e) => setTermMonths(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${error && term <= 0 ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
              <label htmlFor="loanStart" className="block text-xs font-semibold text-gray-600 mb-1">First instalment date</label>
              <input
                id="loanStart"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="loanPurpose" className="block text-xs font-semibold text-gray-600 mb-1">Purpose</label>
            <input
              id="loanPurpose"
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="What the money was taken for"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={secured} onChange={(e) => setSecured(e.target.checked)} className="rounded text-[#2ca01c]" />
            The loan is secured against an asset
          </label>

          {secured && (
            <div>
              <label htmlFor="loanCollateral" className="block text-xs font-semibold text-gray-600 mb-1">Security</label>
              <input
                id="loanCollateral"
                type="text"
                value={collateral}
                onChange={(e) => setCollateral(e.target.value)}
                placeholder="What is pledged or mortgaged"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
              />
            </div>
          )}

          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <caption className="sr-only">The instalment worked out from the terms entered</caption>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="p-2.5 text-gray-600">Monthly instalment</td>
                <td className="p-2.5 text-right tabular-nums font-bold text-gray-900">{formatMoney(instalment)}</td>
              </tr>
              <tr>
                <td className="p-2.5 text-gray-600">Repayment type</td>
                <td className="p-2.5 text-right text-gray-900">{repaymentType}</td>
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
            <Plus size={16} /> Save loan
          </button>
        </div>
      </div>
    </div>
  );
}
