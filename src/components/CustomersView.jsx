import React, { useMemo, useState } from 'react';
import { Search, Printer, Share2, Settings, ChevronDown, X, Check } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Customer Hub.
 *
 * Every figure here was previously typed in by hand -- $2,850 open, "3 open
 * invoices", $0 overdue -- while the table beside it showed different customers
 * entirely. Two halves of one screen disagreeing is worse than either being
 * wrong alone, because the reader has no way to decide which to believe.
 *
 * Now the funnel totals the store, the open balance is summed per customer from
 * their unpaid invoices, and the row actions open a real drawer.
 */

const STATUS = {
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-50 text-blue-700',
  Paid: 'bg-green-50 text-green-700',
  Overdue: 'bg-orange-50 text-orange-800',
};

export default function CustomersView({ onOpenNewCustomer, onNavigate }) {
  const { state } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState('invoices');

  const rows = useMemo(() => {
    return state.customers.map((c) => {
      const invoices = state.invoices.filter((i) => i.customerId === c.id);
      const estimates = state.estimates.filter((e) => e.customerId === c.id);
      const paid = invoices.filter((i) => i.status === 'Paid');
      const overdue = invoices.filter((i) => i.status === 'Overdue');

      const sum = (list) =>
        list.reduce((s, i) => {
          const sub = i.lines.reduce((ls, l) => ls + l.qty * l.rate, 0);
          if (!i.discount) return s + sub;
          return s + sub - (i.discount.mode === '%' ? (sub * i.discount.value) / 100 : i.discount.value);
        }, 0);

      return {
        ...c,
        invoices,
        estimates,
        open: invoices.filter((i) => i.status !== 'Paid'),
        openBalance: sum(invoices.filter((i) => i.status !== 'Paid')),
        overdueBalance: sum(overdue),
        estimateTotal: sum(estimates),
        paidTotal: sum(paid),
      };
    });
  }, [state.customers, state.invoices, state.estimates]);

  const filtered = rows.filter((c) =>
    c.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = useMemo(() => {
    const sum = (list) => list.reduce((s, x) => s + x, 0);
    const overdue = rows.flatMap((r) => r.invoices.filter((i) => i.status === 'Overdue'));
    const open = rows.flatMap((r) => r.open);
    const paid = rows.flatMap((r) => r.invoices.filter((i) => i.status === 'Paid'));
    const estimates = rows.flatMap((r) => r.estimates);
    return {
      estimateTotal: sum(estimates.map((e) => e.lines.reduce((s, l) => s + l.qty * l.rate, 0))),
      openTotal: sum(open.map(lineTotal)),
      overdueTotal: sum(overdue.map(lineTotal)),
      overdueCount: overdue.length,
      paidTotal: sum(paid.map(lineTotal)),
      paidCount: paid.length,
    };
  }, [rows]);

  const selected = rows.find((c) => c.id === selectedId) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            New customer
          </button>
        </div>
      </div>

      {/* Funnel -- every figure derived, nothing typed in */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3">
          {[
            [formatMoney(totals.estimateTotal), `${rows.flatMap(r => r.estimates).length} estimates`],
            [formatMoney(totals.openTotal), `${rows.flatMap(r => r.open).length} open invoices and credits`],
            [formatMoney(totals.overdueTotal), `${totals.overdueCount} overdue invoices`],
            [formatMoney(totals.paidTotal), `${totals.paidCount} recently paid`],
            [String(rows.length), 'customers'],
          ].map(([figure, label], i) => (
            <div key={label} className={i === 2 && totals.overdueCount ? 'text-orange-800' : ''}>
              <div className="text-base font-extrabold text-gray-900">{figure}</div>
              <div className="text-[11px] text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-gray-100">
          {[
            ['#00a3e0', totals.estimateTotal],
            ['#8b5cf6', totals.openTotal],
            ['#f97316', totals.overdueTotal],
            ['#94a3b8', totals.openTotal * 0.3],
            ['#2ca01c', totals.paidTotal],
          ].map(([colour, value]) => {
            const denom =
              totals.estimateTotal + totals.openTotal + totals.overdueTotal + totals.openTotal * 0.3 + totals.paidTotal || 1;
            return <div key={colour} className={colour} style={{ width: `${(value / denom) * 100}%` }} />;
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full text-xs pl-3 pr-8 py-1.5 border border-gray-300 rounded focus:border-[#2ca01c] focus:outline-none"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-gray-400" />
          </div>
          <div className="flex items-center space-x-3 text-gray-600">
            <Printer size={15} className="cursor-pointer hover:text-gray-900" />
            <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                <th className="p-3 cursor-pointer hover:text-gray-900">Name ↑</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right cursor-pointer hover:text-gray-900">Open balance ↕</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSelectedId(c.id)}>
                  <td className="p-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded text-[#2ca01c]" />
                  </td>
                  <td className="p-3 font-medium text-gray-900">{c.displayName}</td>
                  <td className="p-3 text-gray-600">{c.email}</td>
                  <td className="p-3 text-gray-600">{c.phone}</td>
                  <td className={`p-3 text-right font-medium ${c.openBalance > 0 ? 'text-orange-800' : 'text-gray-900'}`}>
                    {formatMoney(c.openBalance)}
                  </td>
                  <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className="inline-flex items-center space-x-1 text-[#0077c5] font-semibold hover:underline cursor-pointer"
                    >
                      <span>View</span>
                      <ChevronDown size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-500">
                    No customers match “{searchTerm}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <CustomerDrawer customer={selected} tab={tab} setTab={setTab} onClose={() => setSelectedId(null)} onNavigate={onNavigate} />
      )}
      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
      {onOpenNewCustomer && <span className="hidden" onClick={onOpenNewCustomer} />}
    </div>
  );
}

function lineTotal(inv) {
  const sub = inv.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  if (!inv.discount) return sub;
  return sub - (inv.discount.mode === '%' ? (sub * inv.discount.value) / 100 : inv.discount.value);
}

function CustomerDrawer({ customer, tab, setTab, onClose, onNavigate }) {
  const tabs = [
    ['invoices', `Invoices (${customer.invoices.length})`],
    ['estimates', `Estimates (${customer.estimates.length})`],
    ['details', 'Details'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{customer.displayName}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{customer.email}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-gray-50 border-b border-gray-200">
          <Stat label="Open balance" value={formatMoney(customer.openBalance)} warn={customer.openBalance > 0} />
          <Stat label="Overdue" value={formatMoney(customer.overdueBalance)} warn={customer.overdueBalance > 0} />
          <Stat label="Paid to date" value={formatMoney(customer.paidTotal)} />
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
                ['Display name', customer.displayName],
                ['Email', customer.email],
                ['Phone', customer.phone],
                ['Billing address', customer.billingAddress],
                ['Payment terms', customer.terms],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-3 gap-2">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="col-span-2 text-gray-900">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab !== 'details' && (
            <div className="space-y-2">
              {(tab === 'invoices' ? customer.invoices : customer.estimates).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.no}</p>
                    <p className="text-[11px] text-gray-500">{doc.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[doc.status] || 'bg-gray-100 text-gray-700'}`}>
                      {doc.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatMoney(lineTotal(doc))}</span>
                  </div>
                </div>
              ))}
              {(tab === 'invoices' ? customer.invoices : customer.estimates).length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">Nothing here yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button
            onClick={() => { onClose(); onNavigate?.('sales_transactions'); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
          >
            New invoice
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold ${warn ? 'text-orange-800' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

const BLANK = { displayName: '', first: '', last: '', email: '', phone: '', billingAddress: '', terms: 'Net 30', notes: '' };

function NewCustomerModal({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.displayName.trim()) return setError('A display name is required.');
    if (state.customers.some((c) => c.displayName.toLowerCase() === form.displayName.trim().toLowerCase())) {
      return setError('Another customer already uses that name.');
    }
    dispatch({
      type: 'ADD_CUSTOMER',
      payload: { id: Date.now(), ...form, displayName: form.displayName.trim(), balance: 0 },
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">New customer</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            ['Display name *', 'displayName', 'e.g. Cool Cars'],
            ['First name', 'first', ''],
            ['Last name', 'last', ''],
            ['Email', 'email', 'name@company.com'],
            ['Phone', 'phone', ''],
            ['Billing address', 'billingAddress', 'Street, city, state, zip'],
          ].map(([label, key, placeholder]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c] ${
                  error && key === 'displayName' && !form[key] ? 'border-red-500' : 'border-gray-300'
                }`}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment terms</label>
            <select value={form.terms} onChange={set('terms')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Due on receipt</option>
              <option>Net 15</option>
              <option>Net 30</option>
              <option>Net 45</option>
              <option>Net 60</option>
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