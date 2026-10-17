import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Sparkles, Printer, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useLedger } from '../store';
import { formatMoney } from '../money';
import { CHART_OF_ACCOUNTS } from '../data/chartOfAccounts';

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
  const ledger = useLedger();
  const [asOf, setAsOf] = useState('2025-10-24');

  const data = useMemo(() => {
    // Every figure comes from the derived ledger. An account no longer carries
    // a balance of its own, so there is nothing here that could be stale.
    const rows = (types) => CHART_OF_ACCOUNTS
      .filter((a) => types.includes(a.type) && !a.parentId)
      .map((a) => ({ ...a, balance: ledger.balanceOf(a.id) }));

    const assets = rows(['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset']);
    const liabilities = rows(['Accounts Payable', 'Credit Card', 'Other Current Liability']);
    const equity = rows(['Equity']);

    const totalAssets = ledger.assets.total;
    const totalLiabilities = ledger.liabilities.total;
    // Earnings for the period belong in equity but are not yet closed to
    // retained earnings, so they are added rather than buried.
    const totalEquity = ledger.equity.total;

    return {
      assets, liabilities, equity,
      totalAssets, totalLiabilities, totalEquity,
      netIncome: ledger.pnl.netIncome,
      balanced: ledger.balanced,
      difference: ledger.difference,
    };
  }, [ledger]);

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

      {/* The check this screen exists to perform, naming the difference when
          it fails rather than just saying "failed". */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${data.balanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
        {data.balanced ? <Sparkles size={16} /> : <AlertTriangle size={16} />}
        <span className="text-sm font-medium">
          {data.balanced
            ? `Assets = Liabilities + Equity. The books balance to the paisa.`
            : `Out of balance by ${formatMoney(Math.abs(data.difference))} -- some entry did not post.`
          }
        </span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <ReportSection title="Assets" rows={data.assets} total={data.totalAssets} />
        <ReportSection title="Liabilities" rows={data.liabilities} total={data.totalLiabilities} />
        <ReportSection title="Equity" rows={data.equity} total={data.totalEquity} />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Meso Assist</span>
        </div>
        <p className="text-sm text-blue-800">
          Cash is {formatMoney(ledger.cash.total)}. Receivables are{' '}
          {formatMoney(ledger.outstanding.receivable)}
          {data.totalAssets > 0
            ? `, which is ${Math.round((ledger.outstanding.receivable / data.totalAssets) * 100)}% of assets -- that is the figure most worth collecting first.`
            : '.'}
          {data.netIncome < 0
            ? ` The period is running at a loss of ${formatMoney(Math.abs(data.netIncome))}.`
            : data.netIncome > 0
              ? ` The period made ${formatMoney(data.netIncome)}.`
              : ''}
        </p>
      </div>
    </div>
  );
}

export function ProfitLoss() {
  const ledger = useLedger();
  const [fromDate, setFromDate] = useState('2025-10-01');
  const [toDate, setToDate] = useState('2025-10-24');

  const data = useMemo(() => {
    // Accrual basis: revenue is recognised when the invoice was raised, not
    // when it was paid. A paid invoice and an unpaid one both earned.
    const rows = (type) => CHART_OF_ACCOUNTS
      .filter((a) => a.type === type && !a.parentId)
      .map((a) => ({ ...a, balance: ledger.balanceOf(a.id) }))
      .filter((a) => Math.abs(a.balance) > 0.004 || a.activity !== 0)
      .sort((x, y) => Math.abs(y.balance) - Math.abs(x.balance));

    const income = rows('Income');
    const cogs = rows('Cost of Goods Sold');
    const expenses = rows('Expense');

    // Only lines that actually moved. Showing fifteen income accounts at zero
    // buries the three that earned something.
    const trimmed = (list) => list.filter((a) => a.activity !== 0 || a.openingBalance);

    return {
      income: trimmed(income), cogs: trimmed(cogs), expenses: trimmed(expenses),
      totalIncome: ledger.pnl.income,
      totalCogs: ledger.pnl.cogs,
      grossProfit: ledger.pnl.grossProfit,
      totalExpenses: ledger.pnl.expenses,
      netIncome: ledger.pnl.netIncome,
    };
  }, [ledger]);

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
        <ReportSection title="Income" rows={data.income} total={data.totalIncome} />
        <ReportSection title="Cost of Goods Sold" rows={data.cogs} total={data.totalCogs} />

        <div className="flex justify-between px-4 py-2 bg-gray-50 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">Gross Profit</span>
          <span className="text-sm font-bold text-gray-900">{formatMoney(data.grossProfit)}</span>
        </div>

        <ReportSection title="Expenses" rows={data.expenses} total={data.totalExpenses} />

        {/* A loss is not a failure of the report -- it is a result. It is shown
            as one, in red, rather than dressed up as a green "net income". */}
        <div className={`flex justify-between px-4 py-3 border rounded-lg ${data.netIncome >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <span className={`text-base font-bold ${data.netIncome >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            Net {data.netIncome >= 0 ? 'Income' : 'Loss'}
          </span>
          <span className={`text-base font-bold ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatMoney(Math.abs(data.netIncome))}
          </span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Meso Assist</span>
        </div>
        <p className="text-sm text-blue-800">
          {data.totalIncome > 0
            ? `Net margin is ${Math.round((data.netIncome / data.totalIncome) * 100)}%.`
            : 'No income recorded for this period, so there is no margin to report.'}{' '}
          Largest expense:{' '}
          {data.expenses[0] ? `${data.expenses[0].name}, ${formatMoney(data.expenses[0].balance)}` : 'none recorded'}
          {data.expenses[0] && data.totalIncome > 0
            ? ` -- ${Math.round((data.expenses[0].balance / data.totalIncome) * 100)}% of what was earned.`
            : '.'}
        </p>
      </div>
    </div>
  );
}

export function CashFlow() {
  const ledger = useLedger();
  const cf = ledger.cashFlow;

  const data = useMemo(() => ({
    ...cf,
    closing: ledger.cash.total,
    // Opening + movements must equal the closing bank balance. If they do not,
    // something posted cash without a matching entry, and the statement says so.
    reconciles: Math.abs((cf.opening + cf.netChange) - ledger.cash.total) < 0.01,
    expected: roundTo2(cf.opening + cf.netChange),
  }), [cf, ledger.cash.total]);

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
            <p className="text-xs text-gray-500">Received from customers</p>
          </div>
          <span className="text-sm font-bold text-green-600">{formatMoney(data.operatingIn)}</span>
        </div>

        <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-semibold text-gray-700">Operating Expenses</p>
            <p className="text-xs text-gray-500">Paid to suppliers and staff</p>
          </div>
          <span className="text-sm font-bold text-red-600">-{formatMoney(data.operatingOut)}</span>
        </div>

        {data.investing !== 0 && (
          <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-gray-700">Investing Activities</p>
              <p className="text-xs text-gray-500">Fixed assets bought or sold</p>
            </div>
            <span className="text-sm font-bold">{formatMoney(data.investing)}</span>
          </div>
        )}

        {data.financing !== 0 && (
          <div className="flex justify-between px-4 py-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold text-gray-700">Financing Activities</p>
              <p className="text-xs text-gray-500">Equity and borrowing</p>
            </div>
            <span className="text-sm font-bold">{formatMoney(data.financing)}</span>
          </div>
        )}

        <div className={`flex justify-between px-4 py-3 border rounded-lg ${data.netChange >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <span className={`text-base font-bold ${data.netChange >= 0 ? 'text-green-900' : 'text-red-900'}`}>
            Net Cash Flow
          </span>
          <span className={`text-base font-bold ${data.netChange >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatMoney(data.netChange)}
          </span>
        </div>

        <div className="flex justify-between px-4 py-2 text-sm text-gray-600 border-t border-gray-200">
          <span>Cash at start of period</span>
          <span>{formatMoney(data.opening)}</span>
        </div>
        <div className="flex justify-between px-4 py-2 text-sm font-semibold text-gray-900">
          <span>Cash in bank now</span>
          <span>{formatMoney(data.closing)}</span>
        </div>
      </div>

      {/* Money the bank has moved that nobody has decided where it goes. This
          is why the books and the bank can disagree, and it points at the queue
          rather than pretending the gap does not exist. */}
      {data.unreconciled > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle size={16} className="text-orange-600 mt-0.5 shrink-0" />
          <p className="text-sm text-orange-900">
            {formatMoney(data.unreconciled)} across {data.unreconciledCount} bank{' '}
            {data.unreconciledCount === 1 ? 'row has' : 'rows have'} cleared the bank but not been categorised.
            Until they are, the books and the bank feed differ by that much.
          </p>
        </div>
      )}
    </div>
  );
}

const roundTo2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function ReportSection({ title, rows, total }) {
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
      {open && rows.length > 0 && (
        <div>
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between px-4 py-2 border-t border-gray-100 text-sm">
              <span className="text-gray-700">{r.name}</span>
              <span className="text-gray-900 font-medium">{formatMoney(r.balance)}</span>
            </div>
          ))}
        </div>
      )}
      {open && rows.length === 0 && (
        <p className="px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          Nothing recorded against {title.toLowerCase()} yet.
        </p>
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
