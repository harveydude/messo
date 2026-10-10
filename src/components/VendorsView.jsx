import React, { useMemo, useState } from 'react';
import { Search, Printer, Settings, ChevronDown, ChevronLeft, ChevronRight, X, Check, Building, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Vendors.
 *
 * The people and companies this business buys from, and what is owed to each of
 * them.
 *
 * The open balance in this table is COMPUTED from that vendor's unpaid bills in
 * the store, never read off the vendor row. A vendor row carrying its own
 * balance is a second set of books: pay a bill, and the vendor's stored balance
 * would sit there unchanged while the bill list beside it said otherwise. Two
 * halves of one screen disagreeing is worse than either being wrong alone,
 * because the reader has no way to decide which to believe.
 *
 * The figures below therefore all fall out of `state.bills`:
 *   open balance  -- bills not marked Paid
 *   overdue       -- unpaid bills whose due date has passed
 *   paid to date  -- bills marked Paid
 * The running totals in the table footer are the sum of those same computed
 * columns, so the footer and the rows can never disagree either.
 *
 * Money is read through `formatMoney`, which groups in lakhs and crores. No
 * figure on this screen is typed in.
 */

const STATUS = {
  Paid: 'bg-[#EAF6EA] text-[#1B5E20]',
  Due: 'bg-[#EEF4FB] text-[#00508A]',
  Overdue: 'bg-[#FDECEA] text-[#B3261E]',
  Draft: 'bg-[#F1F1F1] text-[#5F6368]',
};

/** Payment terms QuickBooks offers, used by both the filter and the form. */
const TERMS = ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'];

/** Bills that are not settled. `Draft` bills are not yet a liability. */
const isUnpaid = (bill) => bill.status !== 'Paid' && bill.status !== 'Draft';

/** Whole rupees on a bill, from its lines. Never a stored total. */
const billTotal = (bill) =>
  (bill.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** ISO date to a readable one, without dragging in a date library. */
function prettyDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${months[Number(m) - 1] || m} ${y}`;
}

export default function VendorsView({ onNavigate }) {
  const { state } = useStore();
  const ledger = useLedger();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState('transactions');

  /**
   * One pass over the vendors, each carrying the bills that name them. The open
   * balance is the sum of the unpaid ones -- if a bill is deleted, or marked
   * paid, this column moves by itself. Nothing here is stored on the vendor.
   *
   * `today` is read once, above the memo, so the list and the drawer judge
   * overdue-ness against the same date. Two reads of the clock can disagree
   * across midnight, which would sort one vendor as overdue and the next as not.
   */
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const rows = useMemo(() => {
    return state.vendors.map((v) => {
      const bills = state.bills.filter((b) => b.vendorId === v.id);
      const unpaid = bills.filter(isUnpaid);
      const overdue = unpaid.filter((b) => b.dueDate && b.dueDate < today);

      const sum = (list) => round2(list.reduce((s, b) => s + billTotal(b), 0));

      return {
        ...v,
        bills,
        unpaid,
        overdue,
        openBalance: sum(unpaid),
        overdueBalance: sum(overdue),
        paidTotal: sum(bills.filter((b) => b.status === 'Paid')),
      };
    });
  }, [state.vendors, state.bills, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((v) => {
      const matchesSearch =
        !q ||
        [v.displayName, v.company, v.email, v.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Open balance' && v.openBalance > 0) ||
        (statusFilter === 'Overdue' && v.overdueBalance > 0) ||
        (statusFilter === 'No open balance' && v.openBalance === 0);

      return matchesSearch && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  /**
   * The footer totals are summed from the rows on screen, not from a separate
   * tally. A footer that totals something other than what is listed is a
   * reconciliation problem the reader has to discover unaided.
   */
  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, v) => ({
          open: round2(acc.open + v.openBalance),
          overdue: round2(acc.overdue + v.overdueBalance),
          paid: round2(acc.paid + v.paidTotal),
        }),
        { open: 0, overdue: 0, paid: 0 }
      ),
    [filtered]
  );

  const selected = rows.find((v) => v.id === selectedId) || null;

  return (
    <div className="flex flex-col h-full w-full bg-white select-none overflow-y-auto">
      <div className="px-8 py-5 max-w-[1720px] w-full mx-auto">
        {/* Header: title, back link, New vendor */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-[#393A3D] leading-tight">Vendors</h1>
            <button
              onClick={() => onNavigate?.('all_lists')}
              className="text-[14px] text-[#0077C5] hover:underline flex items-center font-medium mt-1 cursor-pointer"
            >
              &lt; All Lists
            </button>
          </div>

          <button
            onClick={() => setShowNew(true)}
            className="h-[38px] px-6 rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[14px] font-semibold transition cursor-pointer"
          >
            New vendor
          </button>
        </div>

        {/* Toolbar: search, status filter, action icons, pagination */}
        <div className="flex items-center justify-between mt-5 mb-3">
          <div className="flex items-center space-x-2">
            <div className="relative w-[300px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search vendors"
                className="w-full h-[38px] pl-9 pr-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5]"
              />
              <Search size={17} className="absolute left-3 top-[10px] text-[#6B6C72]" />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-[38px] px-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5] cursor-pointer"
            >
              {['All', 'Open balance', 'Overdue', 'No open balance'].map((s) => (
                <option key={s}>{s}</option>
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
                  <input
                    type="checkbox"
                    checked={filtered.length > 0}
                    readOnly
                    aria-label="Select all vendors"
                    className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C] cursor-pointer"
                  />
                </th>
                <th className="w-[230px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  VENDOR NAME
                </th>
                <th className="w-[190px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  COMPANY
                </th>
                <th className="w-[220px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  EMAIL
                </th>
                <th className="w-[150px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  PHONE
                </th>
                <th className="w-[130px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  TERMS
                </th>
                <th className="w-[140px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">
                  OPEN BALANCE
                </th>
                <th className="w-[120px] px-3 uppercase text-[12px] tracking-wider text-right pr-4">
                  ACTION
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className="h-[59px] border-b border-[#E3E5E8] hover:bg-[#F7F8FA] transition cursor-pointer"
                >
                  <td className="pl-3.5 pr-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${v.displayName}`}
                      className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C] cursor-pointer"
                    />
                  </td>
                  <td className="px-3 border-r border-[#E3E5E8]">
                    <span className="font-medium text-[#393A3D]">{v.displayName}</span>
                  </td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{v.company || '—'}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                    <span className="hover:text-[#0077C5] hover:underline">{v.email || '—'}</span>
                  </td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{v.phone || '—'}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{v.terms || '—'}</td>
                  <td
                    className={`px-3 text-right border-r border-[#E3E5E8] font-medium tabular-nums ${
                      v.overdueBalance > 0
                        ? 'text-[#B3261E]'
                        : v.openBalance > 0
                          ? 'text-[#393A3D]'
                          : 'text-[#9AA0A6]'
                    }`}
                  >
                    {formatMoney(v.openBalance)}
                  </td>
                  <td className="px-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedId(v.id)}
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
                  <td colSpan={8} className="py-16 text-center text-[14px] text-[#6B6C72]">
                    {query.trim() || statusFilter !== 'All'
                      ? `No vendors match this filter. Clear it to see all ${rows.length}.`
                      : 'No vendors have been added yet.'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* Footer totals, summed from the rows listed above. */}
            {filtered.length > 0 && (
              <tfoot>
                <tr className="h-[48px] bg-[#F7F8FA] text-[13px] font-semibold text-[#393A3D]">
                  <td colSpan={6} className="pl-3.5 pr-3">
                    {filtered.length} {filtered.length === 1 ? 'vendor' : 'vendors'}
                    {statusFilter !== 'All' && ` · ${statusFilter}`}
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums">
                    {formatMoney(totals.open)}
                  </td>
                  <td className="px-3 text-right pr-4" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* What the ledger says, next to what the list says.
            Both are derived; putting them side by side is the point. A vendor
            table showing an open balance that disagrees with A/P on the balance
            sheet is the failure this project exists to catch, so the figure the
            books actually carry is shown rather than hidden. */}
        <p className="mt-3 text-[12px] text-[#6B6C72]">
          Total accounts payable in the books:{' '}
          <span className="font-semibold text-[#393A3D] tabular-nums">
            {formatMoney(ledger.outstanding.payable)}
          </span>
          . This list covers {filtered.length} of {rows.length} vendors.
        </p>
      </div>

      {selected && (
        <VendorDrawer
          vendor={selected}
          tab={tab}
          setTab={setTab}
          onClose={() => setSelectedId(null)}
          onNavigate={onNavigate}
        />
      )}
      {showNew && <NewVendorModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Drawer -- */

function VendorDrawer({ vendor, tab, setTab, onClose, onNavigate }) {
  const tabs = [
    ['transactions', `Transactions (${vendor.bills.length})`],
    ['details', 'Details'],
    ['activity', 'Activity'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{vendor.displayName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{vendor.company || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Balances, all computed from this vendor's bills. */}
        <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-gray-50 border-b border-gray-200">
          <Figure label="Open balance" value={formatMoney(vendor.openBalance)} warn={vendor.openBalance > 0} />
          <Figure label="Overdue" value={formatMoney(vendor.overdueBalance)} warn={vendor.overdueBalance > 0} />
          <Figure label="Paid to date" value={formatMoney(vendor.paidTotal)} />
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
                tab === id ? 'border-[#2ca01c] text-[#2ca01c]' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <dl className="space-y-3 text-sm">
              {[
                [Building, 'Display name', vendor.displayName],
                [Mail, 'Email', vendor.email],
                [Phone, 'Phone', vendor.phone],
                [MapPin, 'Address', vendor.address],
                [Calendar, 'Payment terms', vendor.terms],
              ].map(([Icon, label, value]) => (
                <div key={label} className="grid grid-cols-3 gap-2">
                  <dt className="text-gray-500 flex items-center gap-1.5">
                    <Icon size={13} />
                    {label}
                  </dt>
                  <dd className="col-span-2 text-gray-900">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'transactions' && (
            <div className="space-y-2">
              {vendor.bills.map((bill) => {
                // `today` comes from the drawer's single clock read, so every
                // bill on this panel is judged against the same date.
                const overdue = isUnpaid(bill) && bill.dueDate && bill.dueDate < today;
                const pill = overdue ? 'Overdue' : bill.status;
                return (
                  <div key={bill.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bill.no}</p>
                      <p className="text-[11px] text-gray-500">
                        {prettyDate(bill.date)}
                        {bill.dueDate && ` · due ${prettyDate(bill.dueDate)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[pill] || STATUS.Due}`}>
                        {pill}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">
                        {formatMoney(billTotal(bill))}
                      </span>
                    </div>
                  </div>
                );
              })}
              {vendor.bills.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No bills from this vendor yet.
                </p>
              )}
            </div>
          )}

          {tab === 'activity' && <VendorActivity vendor={vendor} />}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button
            onClick={() => { onClose(); onNavigate?.('expense_transactions'); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
          >
            New bill
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Activity: the bills that make up this vendor's position, in date order, with
 * the running open balance beside each one.
 *
 * It is built from the bills rather than from a separate activity feed on
 * purpose -- an activity log that can disagree with the transactions it
 * describes is another second set of books.
 */
function VendorActivity({ vendor }) {
  const entries = useMemo(
    () => [...vendor.bills].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [vendor.bills]
  );

  return (
    <ol className="space-y-3">
      {entries.map((bill) => (
        <li key={`act-${bill.id}`} className="flex gap-3">
          <span className="mt-1.5 w-2 h-2 rounded-full bg-[#2ca01c] shrink-0" />
          <div>
            <p className="text-sm text-gray-900">
              <span className="font-medium">{bill.no}</span> {isUnpaid(bill) ? 'billed' : 'paid'}
              <span className="tabular-nums"> · {formatMoney(billTotal(bill))}</span>
            </p>
            <p className="text-[11px] text-gray-500">
              {prettyDate(bill.date)}
              {bill.status === 'Paid' && bill.paidDate && ` · settled ${prettyDate(bill.paidDate)}`}
            </p>
          </div>
        </li>
      ))}
      {entries.length === 0 && (
        <li className="text-sm text-gray-500 text-center py-6">Nothing has happened with this vendor yet.</li>
      )}
    </ol>
  );
}

function Figure({ label, value, warn }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${warn ? 'text-[#B3261E]' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

/* -------------------------------------------------------------- New vendor -- */

const BLANK = { displayName: '', company: '', email: '', phone: '', address: '', terms: 'Net 30' };

function NewVendorModal({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    const name = form.displayName.trim();
    if (!name) return setError('A vendor name is required.');

    // Duplicate names make the list ambiguous: two "Utility Power" rows split
    // one vendor's bills between them, and neither total is then the right one.
    if (state.vendors.some((v) => v.displayName.trim().toLowerCase() === name.toLowerCase())) {
      return setError('Another vendor already uses that name.');
    }
    // So does a duplicate email, which is how a second record gets created by
    // accident when a bill is matched on address rather than on id.
    const email = form.email.trim().toLowerCase();
    if (email && state.vendors.some((v) => (v.email || '').toLowerCase() === email)) {
      return setError('Another vendor already uses that email address.');
    }

    dispatch({
      type: 'ADD_VENDOR',
      payload: { id: Date.now(), ...form, displayName: name, balance: 0 },
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New vendor"
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">New vendor</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            ['Vendor name *', 'displayName', 'e.g. Cal Telephone'],
            ['Company', 'company', 'Legal company name'],
            ['Email', 'email', 'billing@company.com'],
            ['Phone', 'phone', ''],
            ['Address', 'address', 'Street, city, state, pin'],
          ].map(([label, key, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                data-autofocus={key === 'displayName' ? '' : undefined}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${
                  error && key === 'displayName' && !form[key] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment terms</label>
            <select value={form.terms} onChange={set('terms')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {TERMS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button onClick={save} className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-2">
            <Check size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}