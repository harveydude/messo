/**
 * Customer Hub.
 * ----------------------------------------------------------------------------
 * The unified view of one relationship. Everything that has ever happened with a
 * customer -- invoices raised, money received, estimates sent and answered,
 * notes typed against them, statements sent -- in a single dated list.
 *
 * WHY THE TIMELINE IS COMPUTED RATHER THAN WRITTEN
 * ------------------------------------------------
 * The obvious way to build this screen is to keep a running log and append to it
 * as things happen. That log is a second copy of the truth: it cannot be wrong
 * on its own, only out of date, and it goes stale the moment anyone edits or
 * deletes the document it describes. So there is no log here. `buildTimeline`
 * walks the four collections that actually hold the facts -- invoices,
 * estimates, payments, customer notes -- and merges them on date at render time.
 * Delete an invoice and it leaves the timeline. There is nothing to unsynchronise.
 *
 * WHY RECORDING A PAYMENT TOUCHES THREE COLLECTIONS
 * -------------------------------------------------
 * `src/ledger.js` holds one rule that governs everything else: a bank feed is
 * the ONLY authority for cash. Money moves because a bank transaction exists.
 * So recording a payment here cannot merely write a row to `state.payments` --
 * that would create a receipt that the balance sheet has never heard of, which
 * is precisely the "figures that look correct and connect to nothing" defect
 * this app exists to remove. A payment therefore:
 *
 *   1. adds a payment record (the receipt itself, and the audit trail of it),
 *   2. adds a matching bank transaction (the authority -- this is what moves
 *      cash and credits A/R in the ledger),
 *   3. marks the invoice Paid (so the document and the money agree).
 *
 * Recording a payment and watching the receivable fall is therefore a test that
 * this screen is genuinely wired to the ledger, and not merely re-deriving its
 * own numbers.
 *
 * EVERY FIGURE IS DERIVED
 * -----------------------
 * Lifetime billed, outstanding, average days-to-pay and the statement itself are
 * all computed from the store on every render. No money figure is written into
 * this file. `daysToPay` in particular is only computed for invoices where the
 * settlement date is actually known -- from a recorded payment or a matched
 * incoming bank transaction. An invoice marked Paid with no known settlement
 * date is excluded from the average rather than counted as zero days, because
 * zero would be a claim the books cannot support.
 *
 * SUMMARY FIGURES ARE LINES, NOT TILES
 * ------------------------------------
 * The relationship summary is a labelled list down the left of the detail panel,
 * the way a statement is laid out. There are no rounded statistic cards: a grid
 * of soft number tiles reads as decoration and makes three small figures look
 * like a dashboard rather than the four facts about one customer that they are.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Search,
  ChevronDown,
  Send,
  Plus,
  Check,
  X,
  Printer,
  Trash2,
} from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';
import { invoiceTotals } from '../ledger';

/** Event kinds on the timeline, and how each is coloured and described. */
const KIND = {
  invoice: { label: 'Invoice', tone: 'bg-blue-50 text-blue-700' },
  payment: { label: 'Payment', tone: 'bg-green-50 text-green-700' },
  estimate: { label: 'Estimate', tone: 'bg-purple-50 text-purple-700' },
  note: { label: 'Note', tone: 'bg-amber-50 text-amber-800' },
  statement: { label: 'Statement', tone: 'bg-gray-100 text-gray-700' },
};

const PAYMENT_METHODS = ['Bank transfer', 'Cheque', 'Cash', 'Card'];

/** Days between two ISO dates, or null when either is missing or unparseable. */
function daysBetween(from, to) {
  if (!from || !to) return null;
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/** The month a date falls in, as 'YYYY-MM'. Unparseable dates give null. */
function monthOf(date) {
  return typeof date === 'string' && date.length >= 7 ? date.slice(0, 7) : null;
}

/** Lines to a net figure, for the documents that carry qty x rate. */
function linesNet(doc) {
  return (doc.lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
}

export default function CustomerHubView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showStatement, setShowStatement] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');

  /**
   * Everything known about every customer, computed once per store change.
   *
   * Built as one pass over the collections rather than four `filter` calls per
   * customer inside the row render: the old customer screen did the latter, so
   * selecting a customer re-scanned every invoice.
   */
  const hubs = useMemo(() => {
    const invoiceTotal = (inv) => invoiceTotals(inv, state).total;

    // Settlement date for an invoice: when money actually arrived against it.
    // A recorded payment is the explicit answer; a matched incoming bank
    // transaction is the ledger's own authority and counts equally.
    const settledOn = (invoice) => {
      const fromPayments = state.payments
        .filter((p) => (p.appliedTo || []).includes(invoice.no))
        .map((p) => p.date)
        .sort()[0];
      if (fromPayments) return fromPayments;
      const fromBank = state.bankTxns
        .filter((t) => t.state === 'Match' && t.matchedRef === invoice.no && t.amount > 0)
        .map((t) => t.date)
        .sort()[0];
      return fromBank || null;
    };

    const byCustomer = new Map();
    const blank = () => ({ invoices: [], estimates: [], payments: [], notes: [], statements: [], billed: 0, received: 0, outstanding: 0, overdue: 0, payDays: [] });

    for (const inv of state.invoices) {
      const bucket = byCustomer.get(inv.customerId) || blank();
      bucket.invoices.push(inv);
      // A draft has not been billed. It is a document in progress, not money owed.
      if (inv.status !== 'Draft') bucket.billed += invoiceTotal(inv);
      byCustomer.set(inv.customerId, bucket);
    }
    for (const est of state.estimates) {
      const bucket = byCustomer.get(est.customerId) || blank();
      bucket.estimates.push(est);
      byCustomer.set(est.customerId, bucket);
    }
    for (const note of state.customerNotes || []) {
      const bucket = byCustomer.get(note.customerId) || blank();
      bucket.notes.push(note);
      byCustomer.set(note.customerId, bucket);
    }
    for (const stmt of state.statements || []) {
      const bucket = byCustomer.get(stmt.customerId) || blank();
      bucket.statements.push(stmt);
      byCustomer.set(stmt.customerId, bucket);
    }

    const rows = state.customers.map((c) => {
      const bucket = byCustomer.get(c.id) || blank();
      // A payment is attributed to a customer through the invoice it settles.
      const paidNos = new Set(bucket.invoices.map((i) => i.no));
      bucket.payments = state.payments.filter((p) => (p.appliedTo || []).some((no) => paidNos.has(no)));
      bucket.received = bucket.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);

      // Outstanding is per-invoice, so a part payment can be expressed by the
      // customer splitting what they send across invoices at record time.
      const open = bucket.invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft');
      bucket.outstanding = open.reduce((s, i) => s + invoiceTotal(i), 0);
      bucket.overdue = open
        .filter((i) => i.status === 'Overdue')
        .reduce((s, i) => s + invoiceTotal(i), 0);

      // Average days-to-pay, over invoices where the settlement date is known.
      // An invoice marked Paid with no known date is left out of the average
      // rather than counted as instant.
      const spans = bucket.invoices
        .filter((i) => i.status === 'Paid')
        .map((i) => daysBetween(i.date, settledOn(i)))
        .filter((d) => d !== null && d >= 0);
      bucket.payDays = spans;
      bucket.avgDaysToPay = spans.length ? spans.reduce((s, d) => s + d, 0) / spans.length : null;

      return { ...c, ...bucket };
    });

    return rows;
  }, [state]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hubs;
    return hubs.filter((c) => `${c.displayName} ${c.email} ${c.phone}`.toLowerCase().includes(q));
  }, [hubs, search]);

  // Default to the first customer rather than an empty right-hand panel: a
  // master-detail screen that shows nothing until you click is a blank screen
  // for anyone who has not worked out that the left column is interactive.
  const selected = useMemo(
    () => hubs.find((c) => c.id === selectedId) || filtered[0] || hubs[0] || null,
    [hubs, filtered, selectedId]
  );

  const timeline = useMemo(
    () => (selected ? buildTimeline(selected, state) : []),
    [selected, state]
  );

  const visibleTimeline = useMemo(() => {
    const q = search.trim().toLowerCase();
    return timeline.filter((e) => {
      if (kindFilter !== 'All' && e.kind !== kindFilter) return false;
      // The list search also filters the timeline: one box, one meaning.
      if (!q) return true;
      return `${e.title} ${e.detail} ${e.ref}`.toLowerCase().includes(q);
    });
  }, [timeline, kindFilter, search]);

  const addNote = () => {
    const text = noteDraft.trim();
    if (!text || !selected) return;
    dispatch({
      type: 'ADD_CUSTOMER_NOTE',
      payload: {
        id: Date.now(),
        customerId: selected.id,
        date: todayISO(),
        text,
        author: 'Craig Carlson',
      },
    });
    setNoteDraft('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full overflow-hidden shadow-xs border border-black/10 bg-gray-950 flex items-center justify-center shrink-0">
            <img src="/app-icons/customer_hub.jpg" alt="Customer Hub" className="w-full h-full object-cover" />
          </div>
          <div>
            <button
              onClick={() => onNavigate?.('customers_list')}
              className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline mb-0.5"
            >
              <ArrowLeft size={13} />
              Customers
            </button>
            <h1 className="text-xl font-bold text-gray-900">Customer hub</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Everything that has happened with a customer, in date order.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatement(true)}
            disabled={!selected}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0077c5] border border-[#0077c5] rounded-full hover:bg-blue-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Send size={13} />
            Send statement
          </button>
          <button
            onClick={() => setShowPayment(true)}
            disabled={!selected}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-40"
          >
            <Plus size={14} />
            Record payment
          </button>
        </div>
      </div>

      {/* Toolbar: one search box, an event filter, and the two tools. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter customers and their history"
              aria-label="Filter customers and their history"
              className="pl-8 pr-3 py-1.5 w-72 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
          <div className="relative">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              aria-label="Filter the timeline by event"
              className="pl-3 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg bg-white appearance-none"
            >
              <option value="All">All events</option>
              {Object.entries(KIND).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <Printer size={15} className="text-gray-500 hover:text-gray-900 cursor-pointer" />
      </div>

      {/* Master-detail */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
        {/* Master: the customer list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-[11px] font-semibold text-gray-600">
            {hubs.length} customer{hubs.length === 1 ? '' : 's'}
            {filtered.length !== hubs.length && ` · ${filtered.length} shown`}
          </div>
          <ul className="max-h-[640px] overflow-y-auto divide-y divide-gray-100">
            {filtered.map((c) => {
              const active = selected?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedId(c.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left px-3 py-2.5 transition ${
                      active ? 'bg-[#E8F5E9] border-l-2 border-[#2ca01c] -ml-0.5 pl-2.5' : 'hover:bg-gray-50 border-l-2 border-transparent -ml-0.5 pl-2.5'
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-900 truncate">{c.displayName}</span>
                      <span className={`text-[11px] tabular-nums shrink-0 ${c.outstanding > 0 ? 'text-orange-800 font-semibold' : 'text-gray-500'}`}>
                        {formatMoney(c.outstanding)}
                      </span>
                    </span>
                    <span className="block text-[11px] text-gray-500 truncate mt-0.5">
                      {c.billed > 0 ? `${c.invoices.length} invoice${c.invoices.length === 1 ? '' : 's'} · ${c.payments.length} payment${c.payments.length === 1 ? '' : 's'}` : 'No invoices raised yet'}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-8 text-center text-xs text-gray-500">
                No customer matches “{search}”.
              </li>
            )}
          </ul>
        </div>

        {/* Detail: the relationship, then the timeline */}
        <div className="space-y-5 min-w-0">
          {!selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-sm font-semibold text-gray-900">No customers yet</p>
              <p className="text-xs text-gray-500 mt-1">
                Add a customer from the Customers screen and their whole history will appear here.
              </p>
              <button
                onClick={() => onNavigate?.('customers_list')}
                className="mt-4 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
              >
                Go to Customers
              </button>
            </div>
          ) : (
            <>
              {/* Identity, and the four facts about this relationship. A list,
                  not a card grid -- it reads as a statement header. */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
                <div className="px-4 py-3.5 border-b border-gray-200">
                  <h2 className="text-base font-bold text-gray-900">{selected.displayName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[selected.email, selected.phone].filter(Boolean).join(' · ') || 'No contact details on file'}
                  </p>
                </div>
                <dl className="divide-y divide-gray-100">
                  <SummaryLine
                    label="Lifetime billed"
                    value={formatMoney(selected.billed)}
                    note={`across ${selected.invoices.filter((i) => i.status !== 'Draft').length} invoice${selected.invoices.filter((i) => i.status !== 'Draft').length === 1 ? '' : 's'}`}
                  />
                  <SummaryLine
                    label="Outstanding"
                    value={formatMoney(selected.outstanding)}
                    note={selected.overdue > 0 ? `${formatMoney(selected.overdue)} overdue` : 'Nothing overdue'}
                    tone={selected.overdue > 0 ? 'warn' : selected.outstanding > 0 ? 'muted' : 'normal'}
                  />
                  <SummaryLine
                    label="Received to date"
                    value={formatMoney(selected.received)}
                    note={`${selected.payments.length} recorded payment${selected.payments.length === 1 ? '' : 's'}`}
                  />
                  <SummaryLine
                    label="Average days to pay"
                    value={selected.avgDaysToPay === null ? '—' : `${Math.round(selected.avgDaysToPay)} days`}
                    note={
                      selected.avgDaysToPay === null
                        ? 'No paid invoice has a known settlement date yet'
                        : `from ${selected.payDays.length} settled invoice${selected.payDays.length === 1 ? '' : 's'}`
                    }
                  />
                </dl>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    Timeline
                    <span className="ml-2 text-[11px] font-normal text-gray-500">
                      {visibleTimeline.length} event{visibleTimeline.length === 1 ? '' : 's'}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                      placeholder="Add a note"
                      aria-label="Add a note about this customer"
                      className="w-44 pl-3 pr-3 py-1 text-[11px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
                    />
                    <button
                      onClick={addNote}
                      disabled={!noteDraft.trim()}
                      className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-40"
                    >
                      Note it
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-800">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                      <tr>
                        <th className="p-3 w-28">Date</th>
                        <th className="p-3 w-24">Event</th>
                        <th className="p-3">What happened</th>
                        <th className="p-3 w-28">Reference</th>
                        <th className="p-3 text-right w-32">Amount</th>
                        <th className="p-3 w-24 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {visibleTimeline.map((e) => (
                        <tr key={`${e.kind}-${e.id}`} className="hover:bg-gray-50">
                          <td className="p-3 text-gray-600 whitespace-nowrap">{e.date}</td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${KIND[e.kind].tone}`}>
                              {KIND[e.kind].label}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-medium text-gray-900">{e.title}</span>
                            {e.detail && <span className="block text-[11px] text-gray-500 mt-0.5">{e.detail}</span>}
                          </td>
                          <td className="p-3 text-gray-600">{e.ref || '—'}</td>
                          <td className="p-3 text-right tabular-nums font-semibold text-gray-900">
                            {e.amount === null ? '—' : formatMoney(e.amount)}
                          </td>
                          <td className="p-3 text-right">
                            {e.kind === 'note' ? (
                              <button
                                onClick={() => dispatch({ type: 'DELETE_CUSTOMER_NOTE', payload: e.id })}
                                className="text-gray-400 hover:text-red-700"
                                title="Delete this note"
                              >
                                <Trash2 size={13} />
                              </button>
                            ) : e.kind === 'invoice' || e.kind === 'estimate' ? (
                              <button
                                onClick={() => onNavigate?.(e.kind === 'estimate' ? 'estimates' : 'sales_transactions')}
                                className="text-[#0077c5] font-semibold hover:underline"
                              >
                                Open
                              </button>
                            ) : '—'}
                          </td>
                        </tr>
                      ))}
                      {visibleTimeline.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-sm text-gray-500">
                            {timeline.length === 0
                              ? `Nothing has happened with ${selected.displayName} yet. Raise an invoice and it will appear here.`
                              : 'No events match these filters.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Where the figures above come from. */}
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Lifetime billed and outstanding are computed from this customer’s invoices and payments.
                Days to pay is measured from an invoice’s date to the date money actually arrived against
                it — a recorded payment or a matched bank credit — and invoices with no known settlement
                date are left out of the average. Cash in the bank account is {formatMoney(ledger.cash.total)};
                the ledger total across all accounts is not shown here because this screen is about one
                relationship, not the company’s position.
              </p>
            </>
          )}
        </div>
      </div>

      {showPayment && selected && (
        <RecordPaymentDialog
          customer={selected}
          onClose={() => setShowPayment(false)}
          onSave={({ invoiceIds, amount, date, method }) => {
            const appliedTo = invoiceIds
              .map((id) => state.invoices.find((i) => i.id === Number(id)))
              .filter(Boolean);

            // 1. The receipt, and the audit trail of it.
            dispatch({
              type: 'ADD_PAYMENT',
              payload: {
                id: Date.now(),
                customerId: selected.id,
                date,
                method,
                amount,
                appliedTo: appliedTo.map((i) => i.no),
                memo: '',
              },
            });

            // 2. The authority. A bank transaction is the only thing that moves
            //    cash in this app; without it the receipt above would be a
            //    figure connected to nothing.
            for (const inv of appliedTo) {
              dispatch({
                type: 'ADD_BANK_TXN',
                payload: {
                  id: Date.now() + inv.id,
                  date,
                  desc: `Payment from ${selected.displayName} — ${inv.no}`,
                  amount,
                  bankAccountId: state.bankAccounts[0]?.id ?? 1,
                  state: 'Match',
                  suggestion: null,
                  matchedRef: inv.no,
                  categoryAccountId: null,
                },
              });
              // 3. The document and the money now agree.
              dispatch({ type: 'UPDATE_INVOICE', payload: { ...inv, status: 'Paid', paidDate: date } });
            }

            setShowPayment(false);
          }}
        />
      )}

      {showStatement && selected && (
        <StatementDialog
          customer={selected}
          state={state}
          lastSent={(state.statements || []).filter((s) => s.customerId === selected.id).map((s) => s.date).sort().pop() || null}
          onClose={() => setShowStatement(false)}
          onSend={({ date, sentTo }) => {
            dispatch({
              type: 'SEND_STATEMENT',
              payload: { id: Date.now(), customerId: selected.id, date, sentTo },
            });
            setShowStatement(false);
          }}
        />
      )}
    </div>
  );
}

/** One labelled figure. A list row, deliberately not a card. */
function SummaryLine({ label, value, note, tone = 'normal' }) {
  const colour = tone === 'warn' ? 'text-orange-800' : tone === 'muted' ? 'text-gray-600' : 'text-gray-900';
  return (
    <div className="px-4 py-2.5 flex items-baseline justify-between gap-4">
      <dt className="text-xs text-gray-600">
        {label}
        {note && <span className="block text-[11px] text-gray-400 mt-0.5">{note}</span>}
      </dt>
      <dd className={`text-sm font-bold tabular-nums ${colour}`}>{value}</dd>
    </div>
  );
}

/** Today's date, read once per call rather than during render. */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * What this customer owes as at a given date.
 *
 * Billed up to that date, less everything received up to it. Used for the
 * statement, so the statement cannot disagree with the rest of the screen.
 */
function outstandingAsAt(customerId, state, asAt) {
  const cutoff = asAt || '9999-12-31';
  const billed = state.invoices
    .filter((i) => i.customerId === customerId && i.status !== 'Draft' && i.date <= cutoff)
    .reduce((s, i) => s + invoiceTotals(i, state).total, 0);

  const paidNos = new Set(
    state.invoices.filter((i) => i.customerId === customerId).map((i) => i.no)
  );
  const received = state.payments
    .filter((p) => p.customerId === customerId && (p.appliedTo || []).some((no) => paidNos.has(no)) && p.date <= cutoff)
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return { billed: round2(billed), received: round2(received), closing: round2(billed - received) };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Merge every collection that mentions this customer into one dated list.
 *
 * Sorted newest first, because the question a screen like this is asked is
 * almost always "what happened lately". Events without a usable date are dropped
 * rather than sorted to an arbitrary end: a row that cannot be placed in time is
 * not a timeline entry.
 */
function buildTimeline(customer, state) {
  const events = [];
  const total = (inv) => invoiceTotals(inv, state).total;

  for (const inv of customer.invoices) {
    events.push({
      id: inv.id,
      kind: 'invoice',
      date: inv.date,
      title: inv.status === 'Draft' ? `Drafted ${inv.no}` : `Raised ${inv.no}`,
      detail: `${inv.lines.length} line${inv.lines.length === 1 ? '' : 's'} · due ${inv.dueDate || 'not set'}`,
      ref: inv.no,
      amount: total(inv),
    });
  }

  for (const est of customer.estimates) {
    events.push({
      id: est.id,
      kind: 'estimate',
      date: est.date,
      title: `Estimate ${est.no} · ${est.status}`,
      detail: `Expires ${est.expiry || 'not set'}`,
      ref: est.no,
      amount: linesNet(est),
    });
  }

  for (const pay of customer.payments) {
    events.push({
      id: pay.id,
      kind: 'payment',
      date: pay.date,
      title: `Received ${pay.method || 'payment'}`,
      detail: `Applied to ${(pay.appliedTo || []).join(', ') || 'nothing'}`,
      ref: (pay.appliedTo || []).join(', '),
      amount: Number(pay.amount) || 0,
    });
  }

  for (const note of customer.notes) {
    events.push({
      id: note.id,
      kind: 'note',
      date: note.date,
      title: note.text,
      detail: note.author ? `Noted by ${note.author}` : null,
      ref: null,
      amount: null,
    });
  }

  for (const stmt of customer.statements) {
    events.push({
      id: stmt.id,
      kind: 'statement',
      date: stmt.date,
      title: 'Statement sent',
      detail: `Balance shown at that date: ${formatMoney(outstandingAsAt(customer.id, state, stmt.date).closing)}`,
      ref: stmt.sentTo,
      amount: null,
    });
  }

  return events
    .filter((e) => monthOf(e.date))
    .sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : b.date.localeCompare(a.date)));
}

/* -------------------------------------------------------- Record a payment -- */

function RecordPaymentDialog({ customer, onClose, onSave }) {
  // Open invoices only. A payment against a paid invoice is a refund, which is
  // a different document, and offering it here would let a receipt exist with
  // nothing behind it.
  const { state } = useStore();
  const open = customer.invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft');

  const [selectedIds, setSelectedIds] = useState(() => open.map((i) => i.id));
  const [amount, setAmount] = useState(() =>
    open.reduce((s, i) => s + invoiceTotals(i, state).total, 0).toFixed(2)
  );
  const [date, setDate] = useState(() => todayISO());
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [touched, setTouched] = useState(false);

  const amountValue = Number(amount);
  const amountError = touched && (!amount || Number.isNaN(amountValue) || amountValue <= 0);
  const nothingSelected = touched && selectedIds.length === 0;

  const toggle = (id) =>
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const submit = () => {
    setTouched(true);
    if (selectedIds.length === 0 || !amount || Number.isNaN(amountValue) || amountValue <= 0) return;
    onSave({ invoiceIds: selectedIds, amount: amountValue, date, method });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Record a payment from {customer.displayName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {open.length === 0 ? (
            <p className="text-sm text-gray-600">
              {customer.displayName} has no open invoices. Record a payment once there is something to settle.
            </p>
          ) : (
            <>
              <fieldset>
                <legend className="text-xs font-medium text-gray-700 mb-1.5">Apply to</legend>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {open.map((inv) => (
                    <label key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                      <span className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(inv.id)}
                          onChange={() => toggle(inv.id)}
                          className="rounded text-[#2ca01c]"
                        />
                        <span className="text-xs text-gray-900 truncate">
                          {inv.no}
                          <span className="ml-2 text-gray-500">due {inv.dueDate}</span>
                        </span>
                      </span>
                      <span className="text-xs tabular-nums text-gray-700 shrink-0">
                        {formatMoney(invoiceTotals(inv, state).total)}
                      </span>
                    </label>
                  ))}
                </div>
                {nothingSelected && <span className="block text-[11px] text-red-600 mt-1">Choose at least one invoice.</span>}
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount received" error={amountError && 'Enter an amount greater than zero'}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${amountError ? 'border-red-400' : 'border-gray-300'}`}
                  />
                </Field>
                <Field label="Date received">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </Field>
              </div>

              <Field label="Method">
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </Field>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                This writes a payment record, a matching bank credit and the invoice status. The bank
                credit is what actually reduces the receivable — a receipt with no bank transaction
                behind it would be a figure connected to nothing.
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={open.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-40"
          >
            <Check size={14} />
            Record payment
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- A statement -- */

function StatementDialog({ customer, state, lastSent, onClose, onSend }) {
  const [date, setDate] = useState(() => todayISO());
  const [sentTo, setSentTo] = useState(customer.email || '');
  const [touched, setTouched] = useState(false);

  // Every figure recomputed from the ledger for the statement date. A stored
  // snapshot could disagree with the books the moment anything was edited.
  const asAt = outstandingAsAt(customer.id, state, date);
  const opening = round2(asAt.closing - asAt.billed + asAt.received);

  const lines = customer.invoices
    .filter((i) => i.status !== 'Draft')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((inv) => ({ date: inv.date, no: inv.no, total: invoiceTotals(inv, state).total, status: inv.status }));

  const emailError = touched && !sentTo.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Statement — {customer.displayName}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Statement date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <div className="col-span-2">
              <Field label="Send to" error={emailError && 'An address is required'}>
                <input
                  value={sentTo}
                  onChange={(e) => setSentTo(e.target.value)}
                  placeholder="customer@example.com"
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${emailError ? 'border-red-400' : 'border-gray-300'}`}
                />
              </Field>
            </div>
          </div>

          {/* The statement itself, laid out as a statement. */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70">
              <p className="text-xs font-bold text-gray-900">{customer.displayName}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Account statement to {date}</p>
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-2.5 text-left">Date</th>
                  <th className="p-2.5 text-left">Document</th>
                  <th className="p-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="p-2.5 text-gray-600" colSpan={2}>Opening balance</td>
                  <td className="p-2.5 text-right tabular-nums">{formatMoney(opening)}</td>
                </tr>
                {lines.map((l) => (
                  <tr key={l.no}>
                    <td className="p-2.5 text-gray-600">{l.date}</td>
                    <td className="p-2.5 text-gray-900">{l.no} <span className="text-gray-400">· {l.status}</span></td>
                    <td className="p-2.5 text-right tabular-nums">{formatMoney(l.total)}</td>
                  </tr>
                ))}
                {customer.payments.map((p) => (
                  <tr key={`p-${p.id}`}>
                    <td className="p-2.5 text-gray-600">{p.date}</td>
                    <td className="p-2.5 text-green-700">Payment received · {(p.appliedTo || []).join(', ')}</td>
                    <td className="p-2.5 text-right tabular-nums text-green-700">-{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                  <td className="p-2.5" colSpan={2}>Balance due</td>
                  <td className="p-2.5 text-right tabular-nums">{formatMoney(asAt.closing)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[11px] text-gray-500">
            {lastSent
              ? `Last statement sent ${lastSent}. `
              : 'This customer has not been sent a statement yet. '}
            These figures are recomputed from the books each time this is opened — only the fact of
            sending is stored, so a statement can never disagree with the ledger.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => {
              setTouched(true);
              if (!sentTo.trim()) return;
              onSend({ date, sentTo: sentTo.trim() });
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            <Send size={13} />
            Send statement
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error && <span className="block text-[11px] text-red-600 mt-1">{error}</span>}
    </label>
  );
}
