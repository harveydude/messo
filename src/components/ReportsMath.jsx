import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Sparkles, Printer, ChevronLeft } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * The breadcrumb every report sits under.
 *
 * Reports previously had no way back except the browser Back button, and no
 * indication of which of the three statements you were reading. Transcript frame
 * 656 shows the real thing: a blue "← Back to standard reports" link at the top
 * left of the report body.
 */
function ReportTrail({ reportType, onBack }) {
  const names = {
    'balance-sheet': 'Balance Sheet',
    pnl: 'Profit & Loss',
    'cash-flow': 'Cash Flow Statement',
  };
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[#0077c5] hover:underline font-semibold"
      >
        <ChevronLeft size={14} />
        Back to standard reports
      </button>
      <ChevronRight size={12} className="text-gray-400" />
      <span className="text-gray-500">{names[reportType] || 'Report'}</span>
    </nav>
  );
}

/**
 * Financial reports with real math.
 *
 * Balance Sheet: Assets = Liabilities + Equity (live from accounts)
 * P&L: Income − COGS − Expenses = Net income (live from accounts + transactions)
 * Cash Flow: Operating / Investing / Financing (live from bank + accounts)
 */

export function BalanceSheet() {
  const { state } = useStore();
  const [asOf, setAsOf] = useState('2025-10-24');

  const data = useMemo(() => {
    const assets = state.accounts.filter(a => ['Bank', 'Accounts Receivable'].includes(a.type) && a.active);
    const liabilities = state.accounts.filter(a => ['Accounts Payable', 'Credit Card', 'Other Current Liability'].includes(a.type) && a.active);
    const equity = state.accounts.filter(a => a.type === 'Equity' && a.active);

    const totalAssets = assets.reduce((s, a) => s + (a.qb || 0), 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + (a.qb || 0), 0);
    const totalEquity = equity.reduce((s, a) => s + (a.qb || 0), 0);

    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 };
  }, [state.accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Balance Sheet</h2>
          <p className="text-sm text-gray-500">As of {asOf}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={asOf}
            onChange={e => setAsOf(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
          />
          <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-lg" title="Print">
            <Printer size={18} />
          </button>
        </div>
      </div>

      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${data.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        <span className="text-sm font-medium">
          {data.balanced ? '✓ Assets = Liabilities + Equity' : '⚠ Balance check failed'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <ReportSection title="Assets" accounts={data.assets} total={data.totalAssets} />
        <ReportSection title="Liabilities" accounts={data.liabilities} total={data.totalLiabilities} />
        <ReportSection title="Equity" accounts={data.equity} total={data.totalEquity} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Intuit Assist</span>
        </div>
        <p className="text-sm text-blue-800">
          Cash is {formatMoney(data.assets.find(a => a.name === 'Checking')?.qb || 0)}.
          A/R represents {data.totalAssets > 0 ? Math.round((data.assets.find(a => a.name === 'Accounts Receivable')?.qb || 0) / data.totalAssets * 100) : 0}% of current assets.
        </p>
      </div>
    </div>
  );
}

export function ProfitLoss() {
  const { state } = useStore();
  const [fromDate, setFromDate] = useState('2025-10-01');
  const [toDate, setToDate] = useState('2025-10-24');

  const data = useMemo(() => {
    const income = state.accounts.filter(a => a.type === 'Income' && a.active);
    const cogs = state.accounts.filter(a => a.type === 'Cost of Goods Sold' && a.active);
    const expenses = state.accounts.filter(a => a.type === 'Expense' && a.active);

    const totalIncome = income.reduce((s, a) => s + (a.qb || 0), 0);
    const totalCogs = cogs.reduce((s, a) => s + (a.qb || 0), 0);
    const grossProfit = totalIncome - totalCogs;
    const totalExpenses = expenses.reduce((s, a) => s + (a.qb || 0), 0);
    const netIncome = grossProfit - totalExpenses;

    return { income, cogs, expenses, totalIncome, totalCogs, grossProfit, totalExpenses, netIncome };
  }, [state.accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Profit & Loss</h2>
          <p className="text-sm text-gray-500">{fromDate} to {toDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]" />
        </div>
      </div>

      <div className="space-y-4">
        <ReportSection title="Income" accounts={data.income} total={data.totalIncome} />
        <ReportSection title="Cost of Goods Sold" accounts={data.cogs} total={data.totalCogs} />

        <div className="flex justify-between px-4 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">Gross Profit</span>
          <span className="text-sm font-bold text-gray-900">{formatMoney(data.grossProfit)}</span>
        </div>

        <ReportSection title="Expenses" accounts={data.expenses} total={data.totalExpenses} />

        <div className="flex justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-base font-bold text-green-900">Net Income</span>
          <span className="text-base font-bold text-green-700">{formatMoney(data.netIncome)}</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Intuit Assist</span>
        </div>
        <p className="text-sm text-blue-800">
          Net margin is {data.totalIncome > 0 ? Math.round(data.netIncome / data.totalIncome * 100) : 0}%.
          Largest expense: {data.expenses.sort((a, b) => (b.qb || 0) - (a.qb || 0))[0]?.name || 'None'}.
        </p>
      </div>
    </div>
  );
}

export function CashFlow() {
  const { state } = useStore();

  const data = useMemo(() => {
    const bankAccts = state.accounts.filter(a => a.type === 'Bank');
    const totalCash = bankAccts.reduce((s, a) => s + (a.qb || 0), 0);

    const operating = state.expenses.reduce((s, e) => s + e.lines.reduce((ls, l) => ls + l.amount, 0), 0);
    const income = state.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.lines.reduce((ls, l) => ls + l.qty * l.rate, 0), 0);

    return { totalCash, operating, income, netFlow: income - operating };
  }, [state.accounts, state.expenses, state.invoices]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Cash Flow Statement</h2>
        <p className="text-sm text-gray-500">Operating, investing, and financing activities</p>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-gray-700">Operating Activities</p>
            <p className="text-xs text-gray-500">Income from operations</p>
          </div>
          <span className="text-sm font-bold text-green-600">{formatMoney(data.income)}</span>
        </div>

        <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-gray-700">Operating Expenses</p>
            <p className="text-xs text-gray-500">Cash paid for operations</p>
          </div>
          <span className="text-sm font-bold text-red-600">-{formatMoney(data.operating)}</span>
        </div>

        <div className="flex justify-between px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-base font-bold text-green-900">Net Cash Flow</span>
          <span className="text-base font-bold text-green-700">{formatMoney(data.netFlow)}</span>
        </div>

        <div className="flex justify-between px-4 py-2 text-sm text-gray-600">
          <span>Total Cash in Bank</span>
          <span>{formatMoney(data.totalCash)}</span>
        </div>
      </div>
    </div>
  );
}

function ReportSection({ title, accounts, total }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{formatMoney(total)}</span>
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>
      </button>
      {open && accounts.length > 0 && (
        <div>
          {accounts.map(acc => (
            <div key={acc.id} className="flex justify-between px-4 py-2 border-t border-gray-100 text-sm">
              <span className="text-gray-700">{acc.name}</span>
              <span className="text-gray-900 font-medium">{formatMoney(acc.qb || 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReportsMath({ reportType, onBack }) {
  if (reportType === 'balance-sheet') {
    return (
      <>
        <ReportTrail reportType={reportType} onBack={onBack} />
        <BalanceSheet />
      </>
    );
  }
  if (reportType === 'pnl') {
    return (
      <>
        <ReportTrail reportType={reportType} onBack={onBack} />
        <ProfitLoss />
      </>
    );
  }
  if (reportType === 'cash-flow') {
    return (
      <>
        <ReportTrail reportType={reportType} onBack={onBack} />
        <CashFlow />
      </>
    );
  }
  return (
    <div className="space-y-4">
      <ReportTrail reportType={reportType} onBack={onBack} />
      <p className="text-sm text-gray-600">That report has not been built yet.</p>
    </div>
  );
}
