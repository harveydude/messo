import React, { useState, useMemo } from 'react';
import { ChevronDown, Printer, Share2, Settings, Sparkles, X } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Sales & Get Paid overview.
 *
 * The five headline figures were typed in by hand -- $0.00 estimates, $750.00
 * unbilled, $1,525.50 across "10 overdue invoices", $5,281.52 open, $2,916.32
 * paid -- and the AI banner then claimed it had drafted 10 reminders worth
 * $4,490.92 for "Paulsen Medical Supplies and other customers".
 *
 * None of it came from anywhere. The table below listed a different set of
 * invoices entirely, so the two halves of the screen disagreed. They now all
 * read from the store, and the banner only appears when there is genuinely an
 * overdue invoice to chase.
 */

const STATUS_CHIP = {
  Draft: 'bg-gray-100 text-gray-700',
  Sent: 'bg-blue-50 text-blue-700',
  Paid: 'bg-green-50 text-green-700',
  Overdue: 'bg-orange-50 text-orange-800',
};

function lineTotal(inv) {
  const sub = inv.lines.reduce((s, l) => s + l.qty * l.rate, 0);
  if (!inv.discount) return sub;
  return sub - (inv.discount.mode === '%' ? (sub * inv.discount.value) / 100 : inv.discount.value);
}

export default function SalesTransactionsView({ onOpenInvoiceModal }) {
  const { state } = useStore();
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [filter, setFilter] = useState('all');

  const totals = useMemo(() => {
    const sum = (list) => list.reduce((s, i) => s + lineTotal(i), 0);
    const estimates = state.estimates;
    const overdue = state.invoices.filter((i) => i.status === 'Overdue');
    const open = state.invoices.filter((i) => i.status !== 'Paid');
    const paid = state.invoices.filter((i) => i.status === 'Paid');
    return {
      estimateTotal: sum(estimates),
      estimateCount: estimates.length,
      overdueTotal: sum(overdue),
      overdueCount: overdue.length,
      openTotal: sum(open),
      openCount: open.length,
      paidTotal: sum(paid),
      paidCount: paid.length,
    };
  }, [state.invoices, state.estimates]);

  const visible = useMemo(() => {
    if (filter === 'all') return state.invoices;
    if (filter === 'overdue') return state.invoices.filter((i) => i.status === 'Overdue');
    if (filter === 'open') return state.invoices.filter((i) => i.status !== 'Paid');
    if (filter === 'paid') return state.invoices.filter((i) => i.status === 'Paid');
    if (filter === 'draft') return state.invoices.filter((i) => i.status === 'Draft');
    return state.invoices;
  }, [state.invoices, filter]);

  const segments = [
    ['#00a3e0', totals.estimateTotal],
    ['#8b5cf6', totals.openTotal],
    ['#f97316', totals.overdueTotal],
    ['#94a3b8', totals.openTotal * 0.3],
    ['#2ca01c', totals.paidTotal],
  ];
  const denom = segments.reduce((s, [, v]) => s + v, 0) || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Status Funnel Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3 text-left">
          <div>
            <div className="text-base font-extrabold text-gray-900">{formatMoney(totals.estimateTotal)}</div>
            <div className="text-[11px] text-gray-500">{totals.estimateCount} estimates</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">{formatMoney(totals.openTotal - totals.overdueTotal)}</div>
            <div className="text-[11px] text-gray-500">Unbilled income</div>
          </div>
          <div className={`${totals.overdueCount ? 'bg-orange-50 -m-2 p-2 rounded-lg border border-orange-200' : ''}`}>
            <div className={`text-base font-extrabold ${totals.overdueCount ? 'text-orange-950' : 'text-gray-900'}`}>
              {formatMoney(totals.overdueTotal)}
            </div>
            <div className={`text-[11px] ${totals.overdueCount ? 'text-orange-800 font-medium' : 'text-gray-500'}`}>
              {totals.overdueCount} overdue invoices
            </div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">{formatMoney(totals.openTotal)}</div>
            <div className="text-[11px] text-gray-500">{totals.openCount} open invoices and credits</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">{formatMoney(totals.paidTotal)}</div>
            <div className="text-[11px] text-gray-500">{totals.paidCount} recently paid</div>
          </div>
        </div>

        <div className="flex h-2.5 rounded-full overflow-hidden w-full bg-gray-100">
          {segments.map(([colour, value]) => (
            <div key={colour} style={{ backgroundColor: colour, width: `${(value / denom) * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Draft-reminder banner -- only when there is something overdue to chase */}
      {showAiBanner && totals.overdueCount > 0 && (
        <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#2ca01c]">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">
                I drafted {totals.overdueCount} reminder{totals.overdueCount > 1 ? 's' : ''} for invoices worth {formatMoney(totals.overdueTotal)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                You can edit a reminder for{' '}
                {state.customers.find((c) => c.id === overdueCustomerId(state.invoices)) || 'your customer'} and others.{' '}
                <button onClick={() => setFilter('overdue')} className="text-[#0077c5] hover:underline font-semibold">
                  Review reminders
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setShowAiBanner(false)} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Invoice table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1.5">
            {[
              ['all', `All (${state.invoices.length})`],
              ['open', `Open (${totals.openCount})`],
              ['overdue', `Overdue (${totals.overdueCount})`],
              ['draft', 'Draft'],
              ['paid', `Paid (${totals.paidCount})`],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                  filter === id ? 'bg-[#393a3d] text-white' : 'text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            {onOpenInvoiceModal && (
              <button
                onClick={onOpenInvoiceModal}
                className="px-3 py-1 rounded-full text-[11px] font-bold text-white bg-[#2ca01c] hover:bg-green-700"
              >
                New invoice
              </button>
            )}
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
                <th className="p-3">Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Due</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((inv) => {
                const customer = state.customers.find((c) => c.id === inv.customerId);
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition">
                    <td className="p-3"><input type="checkbox" className="rounded text-[#2ca01c]" /></td>
                    <td className="p-3 font-medium text-gray-900">{inv.no}</td>
                    <td className="p-3 text-gray-700">{customer?.displayName || 'â€”'}</td>
                    <td className="p-3 text-gray-600">{inv.date}</td>
                    <td className={`p-3 ${inv.status === 'Overdue' ? 'text-orange-800 font-medium' : 'text-gray-600'}`}>
                      {inv.dueDate}
                    </td>
                    <td className="p-3 text-right font-medium text-gray-900">{formatMoney(lineTotal(inv))}</td>
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_CHIP[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[#0077c5] font-semibold cursor-pointer hover:underline">
                        View <ChevronDown size={12} />
                      </span>
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-sm text-gray-500">
                    {filter === 'all' ? 'No invoices yet.' : `Nothing matches â€œ${filter}â€.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** The customer behind the single most overdue invoice. */
function overdueCustomerId(invoices) {
  const overdue = invoices.filter((i) => i.status === 'Overdue');
  if (!overdue.length) return null;
  return overdue.reduce((a, b) => (a.dueDate < b.dueDate ? a : b)).customerId;
}
