import React, { useState, useMemo } from 'react';
import { ArrowLeft, Search, Printer, Settings as SettingsIcon, Check, X, ChevronDown } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Estimates, sales orders, purchase orders, credit memos and bills.
 *
 * These five are one screen because they are one shape: a dated document with
 * lines, a party, a total and a status. Splitting them into five near-identical
 * files would have produced five places for the same bug.
 *
 * Two of them (bills, purchase orders) are also where the Create menu's vendor
 * items land, which is correct -- they are vendor documents. Estimates and
 * orders are sales documents and live with sales.
 *
 * Totals are computed from the lines. Nothing here stores a total, so a line
 * edited on the document form moves the figure on screen and in the ledger.
 */

/** What each document type means, and what a row shows. */
const KINDS = {
  estimates: {
    title: 'Estimates',
    singular: 'estimate',
    subtitle: 'Quotes you have sent, before they become invoices',
    party: 'Customer',
    partyKey: 'customerId',
    counterparties: 'customers',
    statuses: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'],
    statusTone: {
      Draft: 'gray', Sent: 'blue', Accepted: 'green',
      Rejected: 'red', Expired: 'gray', Converted: 'green',
    },
  },
  orders: {
    title: 'Sales orders',
    singular: 'sales order',
    subtitle: 'Confirmed orders for goods or services',
    party: 'Customer',
    partyKey: 'customerId',
    counterparties: 'customers',
    statuses: ['Draft', 'Open', 'Closed', 'Cancelled'],
    statusTone: { Draft: 'gray', Open: 'blue', Closed: 'green', Cancelled: 'red' },
  },
  purchase_orders: {
    title: 'Purchase orders',
    singular: 'purchase order',
    subtitle: 'Orders you have placed with vendors',
    party: 'Vendor',
    partyKey: 'vendorId',
    counterparties: 'vendors',
    statuses: ['Draft', 'Open', 'Received', 'Billed', 'Closed', 'Cancelled'],
    statusTone: {
      Draft: 'gray', Open: 'blue', Received: 'amber',
      Billed: 'green', Closed: 'green', Cancelled: 'red',
    },
  },
  credit_memos: {
    title: 'Credit memos',
    singular: 'credit memo',
    subtitle: 'Credit given back to a customer or taken from a vendor',
    party: 'Customer',
    partyKey: 'customerId',
    counterparties: 'customers',
    statuses: ['Draft', 'Sent', 'Applied', 'Voided'],
    statusTone: { Draft: 'gray', Sent: 'blue', Applied: 'green', Voided: 'red' },
  },
  bills: {
    title: 'Bills',
    singular: 'bill',
    subtitle: 'What vendors have invoiced you and you owe',
    party: 'Vendor',
    partyKey: 'vendorId',
    counterparties: 'vendors',
    statuses: ['Draft', 'Open', 'Overdue', 'Scheduled', 'Paid'],
    statusTone: {
      Draft: 'gray', Open: 'blue', Overdue: 'red',
      Scheduled: 'purple', Paid: 'green',
    },
  },
};

const TONE_CLASS = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-800',
  purple: 'bg-purple-50 text-purple-700',
};

/**
 * Lines to a total.
 *
 * Bills and expenses carry an `amount`; invoices, estimates and orders carry
 * qty × rate. Reading the wrong one gives zero, which looks like a real figure,
 * so the shape is detected rather than assumed.
 */
function docTotal(doc) {
  const lines = doc.lines || [];
  if (!lines.length) return 0;
  if ('amount' in lines[0]) {
    return lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  }
  const net = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  if ('discount' in doc) {
    const disc = doc.discount?.mode === '%'
      ? net * ((Number(doc.discount.value) || 0) / 100)
      : Number(doc.discount?.value) || 0;
    return Math.max(0, net - disc);
  }
  return net;
}

export default function SalesDocumentsView({ kind, onNavigate }) {
  const { state, dispatch } = useStore();
  const config = KINDS[kind];

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Which store collection this document type lives in. Bills already exist as
  // a real entity; the sales documents are held under one collection per type.
  const documents = useMemo(() => {
    if (kind === 'bills') return state.bills;
    const collection = state.salesDocs?.[kind] || [];
    return collection;
  }, [kind, state.bills, state.salesDocs]);

  /**
   * Counterparties resolved once per render into a map, rather than by searching
   * the customer list inside the row memo. The lookup was the expensive part, and
   * it also made the memo's dependencies a lie: it listed state.customers and
   * state.vendors, which it never read directly.
   */
  const partyNames = useMemo(() => {
    const map = new Map();
    for (const person of state[config.counterparties] || []) {
      map.set(person.id, person.displayName || person.name || '-');
    }
    return map;
  }, [state, config.counterparties]);

  const rows = useMemo(() => {
    let all = documents.map((doc) => ({
      ...doc,
      party: partyNames.get(doc[config.partyKey]) || '-',
      total: docTotal(doc),
    }));

    const q = query.trim().toLowerCase();
    if (q) {
      all = all.filter((d) => `${d.no} ${d.party} ${d.status}`.toLowerCase().includes(q));
    }
    if (statusFilter !== 'All') {
      all = all.filter((d) => d.status === statusFilter);
    }
    return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [documents, partyNames, config.partyKey, query, statusFilter]);

  const totals = useMemo(() => {
    const byStatus = {};
    for (const status of config.statuses) {
      byStatus[status] = rows
        .filter((r) => r.status === status)
        .reduce((s, r) => s + r.total, 0);
    }
    return {
      byStatus,
      all: rows.reduce((s, r) => s + r.total, 0),
      count: rows.length,
    };
  }, [rows, config.statuses]);

  /**
   * Bills are the one type that exists in the store and posts to the ledger.
   * Adding one writes a real A/P, which is why `deriveLedger` has an A/P line at
   * all. The other four are sales documents: they record an intent to trade,
   * not a posting, so they are held separately and deliberately do not move the
   * books until converted.
   */
  const addDocument = ({ no, partyId, date, dueDate, amount, status, memo }) => {
    if (kind === 'bills') {
      dispatch({
        type: 'ADD_BILL',
        payload: {
          id: Date.now(),
          no: no || nextNumber(state.bills, 'BILL'),
          vendorId: Number(partyId),
          date,
          dueDate: dueDate || date,
          terms: 'Net 30',
          lines: [{ accountId: 31, desc: memo || 'Bill from vendor', amount: Number(amount) }],
          status: status || 'Open',
          scheduleDate: null,
          paidDate: null,
        },
      });
      return;
    }
    dispatch({
      type: 'ADD_SALES_DOC',
      payload: {
        kind,
        id: Date.now(),
        no: no || nextNumber(documents, docPrefix(kind)),
        [config.partyKey]: Number(partyId),
        date,
        dueDate: dueDate || date,
        terms: 'Net 30',
        lines: [{ productId: 1, desc: memo || config.singular, qty: 1, rate: Number(amount) }],
        discount: { mode: '%', value: 0 },
        status: status || 'Draft',
        memo: memo || '',
      },
    });
  };

  const changeStatus = (doc, status) => {
    if (kind === 'bills') {
      dispatch({ type: 'UPDATE_BILL', payload: { ...doc, status } });
    } else {
      dispatch({
        type: 'UPDATE_SALES_DOC',
        payload: { kind, doc: { ...doc, status } },
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate?.('all_lists')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline mb-1.5"
          >
            <ArrowLeft size={13} />
            All lists
          </button>
          <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            New {config.singular}
          </button>
        </div>
      </div>

      {/* Per-status summary, as a table rather than tiles. */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3 text-left">Status</th>
              {config.statuses.map((s) => (
                <th key={s} className="p-3 text-right">{s}</th>
              ))}
              <th className="p-3 text-right border-l border-gray-200">All</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-gray-100">
              <td className="p-3 text-gray-700 font-medium">
                {totals.count} document{totals.count === 1 ? '' : 's'}
              </td>
              {config.statuses.map((s) => (
                <td key={s} className="p-3 text-right text-gray-700 tabular-nums">
                  {totals.byStatus[s] ? formatMoney(totals.byStatus[s]) : '—'}
                </td>
              ))}
              <td className="p-3 text-right font-bold text-gray-900 tabular-nums border-l border-gray-200">
                {formatMoney(totals.all)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter by name or ${config.party.toLowerCase()}`}
              className="pl-8 pr-3 py-1.5 w-64 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg bg-white appearance-none"
            >
              <option>All</option>
              {config.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <Printer size={15} className="hover:text-gray-900 cursor-pointer" />
          <SettingsIcon size={15} className="hover:text-gray-900 cursor-pointer" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                <th className="p-3">Date</th>
                <th className="p-3">No.</th>
                <th className="p-3">{config.party}</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((doc) => (
                <React.Fragment key={doc.id}>
                  <tr className="hover:bg-gray-50 transition">
                    <td className="p-3">
                      <input type="checkbox" className="rounded text-[#2ca01c]" />
                    </td>
                    <td className="p-3 text-gray-600">{doc.date}</td>
                    <td className="p-3 font-medium text-gray-900">{doc.no}</td>
                    <td className="p-3">{doc.party}</td>
                    <td className="p-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatMoney(doc.total)}
                    </td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TONE_CLASS[config.statusTone[doc.status]] || TONE_CLASS.gray}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                        className="text-[#0077c5] font-semibold hover:underline"
                      >
                        {expandedId === doc.id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === doc.id && (
                    <tr>
                      <td colSpan={7} className="bg-gray-50/70 px-3 py-4">
                        <div className="flex items-start gap-6">
                          <div className="flex-1 space-y-2">
                            <h4 className="text-xs font-bold text-gray-700">Lines</h4>
                            <table className="w-full text-xs">
                              <thead className="text-gray-500">
                                <tr>
                                  <th className="py-1 text-left">Description</th>
                                  <th className="py-1 text-right">Qty</th>
                                  <th className="py-1 text-right">Rate</th>
                                  <th className="py-1 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(doc.lines || []).map((line, i) => {
                                  const amt = 'amount' in line
                                    ? Number(line.amount) || 0
                                    : (Number(line.qty) || 0) * (Number(line.rate) || 0);
                                  return (
                                    <tr key={i} className="border-t border-gray-200">
                                      <td className="py-1 text-gray-700">{line.desc}</td>
                                      <td className="py-1 text-right tabular-nums text-gray-600">
                                        {'amount' in line ? '—' : line.qty}
                                      </td>
                                      <td className="py-1 text-right tabular-nums text-gray-600">
                                        {'amount' in line ? '—' : formatMoney(line.rate)}
                                      </td>
                                      <td className="py-1 text-right tabular-nums font-medium">{formatMoney(amt)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-300">
                                  <td colSpan={3} className="py-1.5 text-right font-bold text-gray-700">Total</td>
                                  <td className="py-1.5 text-right font-bold tabular-nums">{formatMoney(docTotal(doc))}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          <div className="w-56 space-y-3">
                            <h4 className="text-xs font-bold text-gray-700">Change status</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {config.statuses.map((s) => (
                                <button
                                  key={s}
                                  onClick={() => changeStatus(doc, s)}
                                  className={`text-[11px] px-2 py-1 rounded-full border ${
                                    doc.status === s
                                      ? 'bg-[#2ca01c] text-white border-[#2ca01c]'
                                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                >
                                  {doc.status === s && <Check size={10} className="inline mr-1" />}
                                  {s}
                                </button>
                              ))}
                            </div>
                            {doc.status === 'Paid' && (
                              <p className="text-[11px] text-green-700">
                                Marking a bill paid records the A/P liability as cleared.
                              </p>
                            )}
                            {kind !== 'bills' && (
                              <p className="text-[11px] text-gray-500">
                                A {config.singular} records an intention to trade. It posts to
                                the ledger when it becomes an invoice.
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-gray-500">
                    {documents.length === 0
                      ? `No ${config.title.toLowerCase()} yet. Create one with the New button above.`
                      : 'Nothing matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewDocumentDialog
          config={config}
          counterparties={state[config.counterparties] || []}
          existing={documents}
          onClose={() => setShowNew(false)}
          onSave={(payload) => {
            addDocument(payload);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

/** Create form. Amount is required, because a document with no amount is not a document. */
function NewDocumentDialog({ config, counterparties, onClose, onSave }) {
  const [no, setNo] = useState('');
  const [partyId, setPartyId] = useState(counterparties[0]?.id ?? '');
  // Today's date, read once when the form opens rather than on every render.
  // Reading the clock during render makes the component impure: two renders in
  // the same millisecond could disagree, and React's compiler refuses to
  // reason about it.
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(today);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState(config.statuses[0]);
  const [memo, setMemo] = useState('');
  const [touched, setTouched] = useState(false);

  const amountValue = Number(amount);
  const amountError = touched && (!amount || Number.isNaN(amountValue) || amountValue <= 0);
  const partyError = touched && !partyId;

  const submit = () => {
    setTouched(true);
    if (!partyId || !amount || Number.isNaN(amountValue) || amountValue <= 0) return;
    onSave({ no: no.trim(), partyId, date, dueDate, amount: amountValue, status, memo: memo.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">New {config.singular}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <Field label={config.party} error={partyError && 'Choose a ' + config.party.toLowerCase()}>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-white ${
                partyError ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">Select a {config.party.toLowerCase()}</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName || c.name}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label={config.singular === 'bill' ? 'Due date' : 'Expiry'}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Number" hint="left blank, one is assigned">
              <input
                value={no}
                onChange={(e) => setNo(e.target.value)}
                placeholder="auto"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </Field>
            <Field label="Amount" error={amountError && 'Enter an amount greater than zero'}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm ${
                  amountError ? 'border-red-400' : 'border-gray-300'
                }`}
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
            >
              {config.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>

          <Field label="Description">
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder={`What this ${config.singular} is for`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            Save {config.singular}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error ? (
        <span className="block text-[11px] text-red-600 mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-gray-400 mt-1">{hint}</span>
      ) : null}
    </label>
  );
}

const PREFIXES = {
  estimates: 'EST',
  orders: 'SO',
  purchase_orders: 'PO',
  credit_memos: 'CM',
  bills: 'BILL',
};

const docPrefix = (kind) => PREFIXES[kind] || 'DOC';

/** Next sequential number, so nothing has to be typed. */
function nextNumber(list, prefix) {
  const highest = list.reduce((max, d) => {
    const n = Number(String(d.no || '').replace(/\D/g, ''));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}

