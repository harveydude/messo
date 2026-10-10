import React, { useMemo, useState } from 'react';
import { Printer, Share2, Settings } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Expenses & Bills hub.
 *
 * This screen listed a frozen constant. Two consequences: an expense recorded
 * anywhere else never appeared here, and deleting one here changed nothing --
 * it was a screenshot of a screen rather than a screen. It also formatted money
 * by hand (`$${x.toFixed(2)}`), so it ignored the shared rupee formatter.
 *
 * It now reads expenses and bills out of the store, the category selector writes
 * back, and every figure goes through `formatMoney`.
 */

const BILL_STATUS = {
  Open: 'bg-blue-50 text-blue-700',
  Overdue: 'bg-orange-50 text-orange-800',
  Scheduled: 'bg-purple-50 text-purple-700',
  Paid: 'bg-green-50 text-green-700',
};

export default function ExpensesView({ onOpenExpenseModal }) {
  const { state, dispatch } = useStore();
  const [kind, setKind] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const expenseAccounts = useMemo(
    () => state.accounts.filter((a) => a.type === 'Expense' || a.type === 'Cost of Goods Sold'),
    [state.accounts]
  );

  const rows = useMemo(() => {
    const fromExpenses = state.expenses.map((e) => ({
      key: `e${e.id}`,
      id: e.id,
      kind: 'Expense',
      date: e.date,
      no: '',
      payee: e.payeeName,
      accountId: e.lines[0]?.accountId ?? null,
      total: -e.lines.reduce((s, l) => s + l.amount, 0),
      memo: e.memo,
    }));

    const fromBills = state.bills.map((b) => ({
      key: `b${b.id}`,
      id: b.id,
      kind: 'Bill',
      date: b.date,
      no: b.no,
      payee: state.vendors.find((v) => v.id === b.vendorId)?.displayName || '—',
      accountId: b.lines[0]?.accountId ?? null,
      total: -b.lines.reduce((s, l) => s + l.amount, 0),
      status: b.status,
      dueDate: b.dueDate,
      memo: '',
    }));

    let all = [...fromExpenses, ...fromBills].sort((a, b) => b.date.localeCompare(a.date));

    if (kind !== 'all') all = all.filter((r) => r.kind.toLowerCase() === kind);
    if (statusFilter !== 'all') all = all.filter((r) => r.status === statusFilter);

    return all;
  }, [state.expenses, state.bills, state.vendors, kind, statusFilter]);

  const totals = useMemo(() => {
    const overdue = state.bills.filter((b) => b.status === 'Overdue');
    const amount = (b) => b.lines.reduce((s, l) => s + l.amount, 0);
    return {
      spent: state.expenses.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + l.amount, 0), 0),
      owed: state.bills.filter((b) => b.status !== 'Paid').reduce((s, b) => s + amount(b), 0),
      overdue: overdue.reduce((s, b) => s + amount(b), 0),
      overdueCount: overdue.length,
    };
  }, [state.expenses, state.bills]);

  /** Re-coding an expense writes to the store; bills are edited on their own form. */
  const recategorise = (row, accountId) => {
    if (row.kind !== 'Expense') return;
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        ...state.expenses.find((e) => e.id === row.id),
        lines: [{ ...state.expenses.find((e) => e.id === row.id).lines[0], accountId: Number(accountId) }],
      },
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Expenses &amp; bills</h1>

        <div className="flex items-center space-x-2">
          {onOpenExpenseModal && (
            <button
              onClick={onOpenExpenseModal}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
            >
              New transaction
            </button>
          )}
        </div>
      </div>

      {/* Totals -- computed, so they move when a record is added or edited. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          ['Spent', formatMoney(totals.spent), false],
          ['Owed to vendors', formatMoney(totals.owed), totals.owed > 0],
          ['Overdue', totals.overdueCount ? `${formatMoney(totals.overdue)} (${totals.overdueCount})` : formatMoney(0), totals.overdueCount > 0],
        ].map(([label, value, warn]) => (
          <div key={label} className={`rounded-xl border p-4 ${warn ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-[11px] ${warn ? 'text-orange-800' : 'text-gray-500'}`}>{label}</p>
            <p className={`text-lg font-extrabold ${warn ? 'text-orange-950' : 'text-gray-900'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          {[
            ['all', 'All transactions'],
            ['expense', 'Expenses'],
            ['bill', 'Bills'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition ${
                kind === id ? 'border-[#2ca01c] bg-green-50 text-green-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option value="all">Any status</option>
            <option value="Open">Open</option>
            <option value="Overdue">Overdue</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Paid">Paid</option>
          </select>
        </div>

        <div className="flex items-center space-x-3 text-gray-600">
          <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
          <Printer size={15} className="cursor-pointer hover:text-gray-900" />
          <Settings size={15} className="cursor-pointer hover:text-gray-900" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">No.</th>
                <th className="p-3">Payee</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => {
                const account = expenseAccounts.find((a) => a.id === row.accountId);
                return (
                  <tr key={row.key} className="hover:bg-gray-50 transition">
                    <td className="p-3">
                      <input type="checkbox" className="rounded text-[#2ca01c]" />
                    </td>
                    <td className="p-3 text-gray-600">{row.date}</td>
                    <td className="p-3 font-medium text-gray-900">{row.kind}</td>
                    <td className="p-3 text-gray-600">{row.no || '—'}</td>
                    <td className="p-3 text-gray-800 font-medium">{row.payee}</td>
                    <td className="p-3">
                      {row.kind === 'Expense' ? (
                        <select
                          value={row.accountId ?? ''}
                          onChange={(e) => recategorise(row, e.target.value)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:border-[#2ca01c] focus:outline-none max-w-[200px]"
                        >
                          <option value="">Uncategorised</option>
                          {expenseAccounts.map((a) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-gray-600">{account?.name || '—'}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-gray-900">{formatMoney(row.total)}</td>
                    <td className="p-3">
                      {row.status ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BILL_STATUS[row.status] || 'bg-gray-100 text-gray-700'}`}>
                          {row.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button className="text-[#0077c5] font-semibold hover:underline">
                        {row.kind === 'Bill' ? 'Pay' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-sm text-gray-500">
                    Nothing matches these filters.
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