import React, { useState, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Share2, Printer, MoreVertical, Sparkles, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Balance Sheet.
 *
 * Every figure here was typed in: $1,001.00 of bank accounts, $5,475.92 of
 * receivables, $9,135.69 total current assets, $13,495.00 of fixed assets,
 * $22,630.69 grand total. They happened to satisfy Assets = Liabilities +
 * Equity, which is why the fiction went unnoticed -- a balanced statement looks
 * correct even when none of it is connected to a transaction.
 *
 * Now every line reads from the store, so recording an expense moves Current
 * Assets and the equation stays true. The equation check at the foot is real: it
 * turns red if the books do not balance, which is the one thing this screen is
 * for.
 *
 * Layout is unchanged: collapsible Assets / Liabilities / Equity tree, date
 * range, accrual/cash toggle, print and share.
 */

/** Groups accounts into the collapsible buckets the report is laid out in. */
function bucket(accounts) {
  const sum = (list) => list.reduce((s, a) => s + (a.qb || 0), 0);
  const byType = (t) => accounts.filter((a) => a.type === t);

  const bank = byType('Bank');
  const ar = byType('Accounts Receivable');
  const otherCurrent = accounts.filter(
    (a) => !['Bank', 'Accounts Receivable', 'Accounts Payable', 'Credit Card',
      'Other Current Liability', 'Equity', 'Fixed Asset'].includes(a.type)
  );
  const ap = accounts.filter((a) => ['Accounts Payable', 'Credit Card', 'Other Current Liability'].includes(a.type));
  const fixed = byType('Fixed Asset');
  const equity = byType('Equity');

  return {
    bank, ar, otherCurrent, ap, fixed, equity,
    bankTotal: sum(bank),
    arTotal: sum(ar),
    otherCurrentTotal: sum(otherCurrent),
    currentAssetsTotal: sum(bank) + sum(ar) + sum(otherCurrent),
    fixedTotal: sum(fixed),
    assetsTotal: sum(bank) + sum(ar) + sum(otherCurrent) + sum(fixed),
    apTotal: sum(ap),
    equityTotal: sum(equity),
  };
}

/**
 * A labelled account line.
 *
 * Defined at module scope, not inside the screen. A component created during
 * render is a *different* component every render, so React unmounts and
 * remounts the subtree each time -- losing focus on any input inside it and
 * throwing away DOM state.
 */
function Row({ label, value, indent = 'py-1 pl-12', emphasise, tone = 'text-gray-600' }) {
  const cell = indent.split(' ')[0];
  return (
    <tr className={emphasise ? 'font-semibold text-gray-800 bg-gray-50/40' : tone}>
      <td className={indent}>{label}</td>
      <td className={`${cell} text-right ${emphasise ? 'font-bold' : ''}`}>{formatMoney(value)}</td>
    </tr>
  );
}

/** A collapsible group heading. Module scope for the same reason as `Row`. */
function GroupHeader({ label, open, onToggle, indent = 'py-1.5 pl-4', chevron = 13 }) {
  const cell = indent.split(' ')[0];
  return (
    <tr className="font-semibold text-gray-800">
      <td className={`${indent} cursor-pointer flex items-center space-x-1`} onClick={onToggle}>
        {open ? <ChevronDown size={chevron} /> : <ChevronRight size={chevron} />}
        <span>{label}</span>
      </td>
      <td className={`${cell} text-right`} />
    </tr>
  );
}

export default function BalanceSheetView({ onBack }) {
  const { state } = useStore();
  const [reportPeriod, setReportPeriod] = useState('This year to date');
  // The date inputs are shown in the header but do not yet re-scope the report:
  // everything below is a point-in-time snapshot, which is what a balance sheet
  // is. Wiring them to a period would need dated balances the store does not
  // keep yet, and faking it would be worse than leaving them inert.
  const [fromDate] = useState('01/01/2025');
  const [toDate] = useState('10/24/2025');
  const [method, setMethod] = useState('Accrual');

  const [assetsOpen, setAssetsOpen] = useState(true);
  const [currentAssetsOpen, setCurrentAssetsOpen] = useState(true);
  const [bankAccountsOpen, setBankAccountsOpen] = useState(true);
  const [arOpen, setArOpen] = useState(true);
  const [otherAssetsOpen, setOtherAssetsOpen] = useState(true);
  const [fixedAssetsOpen, setFixedAssetsOpen] = useState(true);
  const [liabilitiesOpen, setLiabilitiesOpen] = useState(true);
  const [clOpen, setClOpen] = useState(true);
  const [clAccountsOpen, setClAccountsOpen] = useState(true);
  const [equityOpen, setEquityOpen] = useState(true);

  const b = useMemo(() => bucket(state.accounts.filter((a) => a.active !== false)), [state.accounts]);

  // Net income is what the period actually earned, so Equity reflects it even
  // before it is closed to retained earnings.
  const netIncome = useMemo(() => {
    const income = state.accounts.filter((a) => a.type === 'Income').reduce((s, a) => s + (a.qb || 0), 0);
    const expense = state.accounts.filter((a) => a.type === 'Expense' || a.type === 'Cost of Goods Sold')
      .reduce((s, a) => s + (a.qb || 0), 0);
    return income - expense;
  }, [state.accounts]);

  const equityWithIncome = b.equityTotal + netIncome;
  const liabilitiesAndEquity = b.apTotal + equityWithIncome;
  const balanced = Math.abs(b.assetsTotal - liabilitiesAndEquity) < 0.01;
  const difference = b.assetsTotal - liabilitiesAndEquity;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-[#0077c5] hover:underline text-xs font-semibold mb-2">
            <ArrowLeft size={13} />
            Back to standard reports
          </button>
          <h1 className="text-xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-xs text-gray-500 mt-1">
            {state.company.name} · {fromDate} to {toDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option>Accrual</option>
            <option>Cash</option>
          </select>
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white"
          >
            <option>This year to date</option>
            <option>This month</option>
            <option>Last year</option>
            <option>Custom</option>
          </select>
          <div className="flex items-center gap-1 text-gray-600 ml-2">
            <RefreshCw size={15} className="cursor-pointer hover:text-gray-900" />
            <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
            <Printer size={15} className="cursor-pointer hover:text-gray-900" />
            <MoreVertical size={15} className="cursor-pointer hover:text-gray-900" />
          </div>
        </div>
      </div>

      {/* The check this screen exists to perform. */}
      <div
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
          balanced ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}
      >
        {balanced ? (
          <>Assets equal liabilities plus equity. The books balance.</>
        ) : (
          <>
            <AlertTriangle size={16} />
            Out of balance by {formatMoney(Math.abs(difference))}. Assets are {formatMoney(b.assetsTotal)},
            liabilities plus equity come to {formatMoney(liabilitiesAndEquity)}.
          </>
        )}
      </div>

      {/* The statement */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3 text-left">Account</th>
              <th className="p-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* ASSETS */}
            <GroupHeader label="Assets" open={assetsOpen} onToggle={() => setAssetsOpen(!assetsOpen)} indent="py-2 pl-2" chevron={14} />
            {assetsOpen && (
              <>
                <GroupHeader label="Current Assets" open={currentAssetsOpen} onToggle={() => setCurrentAssetsOpen(!currentAssetsOpen)} chevron={12} />

                {currentAssetsOpen && (
                  <>
                    <GroupHeader label="Bank Accounts" open={bankAccountsOpen} onToggle={() => setBankAccountsOpen(!bankAccountsOpen)} indent="py-1 pl-8" chevron={12} />
                    {bankAccountsOpen && b.bank.map((a) => (
                      <Row key={a.id} label={a.name} value={a.qb} />
                    ))}
                    <Row label="Total for Bank Accounts" value={b.bankTotal} indent="py-1 pl-8" emphasise />

                    <GroupHeader label="Accounts Receivable" open={arOpen} onToggle={() => setArOpen(!arOpen)} indent="py-1 pl-8" chevron={12} />
                    {arOpen && (
                      <>
                        {b.ar.map((a) => (
                          <Row
                            key={a.id}
                            indent="py-1 pl-12"
                            label={
                              <span className="flex items-center space-x-1.5">
                                {a.name}
                                <Sparkles size={11} className="text-[#0077c5]" />
                              </span>
                            }
                            value={a.qb}
                          />
                        ))}
                        {b.ar.length === 0 && <Row label="No receivables" value={0} />}
                        <Row label="Total for Accounts Receivable" value={b.arTotal} indent="py-1 pl-8" emphasise />
                      </>
                    )}

                    <GroupHeader label="Other Current Assets" open={otherAssetsOpen} onToggle={() => setOtherAssetsOpen(!otherAssetsOpen)} indent="py-1 pl-8" chevron={12} />
                    {otherAssetsOpen && (
                      <>
                        {b.otherCurrent.map((a) => (
                          <Row key={a.id} label={a.name} value={a.qb} />
                        ))}
                        {b.otherCurrent.length === 0 && <Row label="Nothing in this group" value={0} />}
                        <Row label="Total for Other Current Assets" value={b.otherCurrentTotal} indent="py-1 pl-8" emphasise />
                      </>
                    )}

                    <tr className="font-bold text-gray-900 border-t border-gray-200">
                      <td className="py-2 pl-4">Total for Current Assets</td>
                      <td className="py-2 text-right">{formatMoney(b.currentAssetsTotal)}</td>
                    </tr>
                  </>
                )}

                <GroupHeader label="Fixed Assets" open={fixedAssetsOpen} onToggle={() => setFixedAssetsOpen(!fixedAssetsOpen)} chevron={12} />
                {fixedAssetsOpen && (
                  <>
                    {b.fixed.map((a) => (
                      <Row key={a.id} label={a.name} value={a.qb} indent="py-1 pl-12" />
                    ))}
                    <Row label="Total for Fixed Assets" value={b.fixedTotal} indent="py-1 pl-8" emphasise />
                  </>
                )}

                <tr className="font-bold text-gray-900 border-t border-gray-200 bg-gray-50/60">
                  <td className="py-2 pl-2">Total Assets</td>
                  <td className="py-2 text-right">{formatMoney(b.assetsTotal)}</td>
                </tr>
              </>
            )}

            {/* LIABILITIES */}
            <GroupHeader label="Liabilities" open={liabilitiesOpen} onToggle={() => setLiabilitiesOpen(!liabilitiesOpen)} indent="py-2 pl-2" chevron={14} />
            {liabilitiesOpen && (
              <>
                <GroupHeader label="Current Liabilities" open={clOpen} onToggle={() => setClOpen(!clOpen)} chevron={12} />
                {clOpen && (
                  <>
                    <GroupHeader label="Accounts Payable" open={clAccountsOpen} onToggle={() => setClAccountsOpen(!clAccountsOpen)} indent="py-1 pl-8" chevron={12} />
                    {clAccountsOpen && b.ap.map((a) => (
                      <Row key={a.id} label={a.name} value={a.qb} />
                    ))}
                    <Row label="Total for Accounts Payable" value={b.apTotal} indent="py-1 pl-8" emphasise />
                  </>
                )}
              </>
            )}

            {/* EQUITY */}
            <GroupHeader label="Equity" open={equityOpen} onToggle={() => setEquityOpen(!equityOpen)} indent="py-2 pl-2" chevron={14} />
            {equityOpen && (
              <>
                {b.equity.map((a) => (
                  <Row key={a.id} label={a.name} value={a.qb} indent="py-1 pl-8" />
                ))}
                <Row label="Net income for the period" value={netIncome} indent="py-1 pl-8" tone="text-gray-700" />
                <Row label="Total Equity" value={equityWithIncome} indent="py-1 pl-8" emphasise />
              </>
            )}

            <tr className="font-bold text-gray-900 border-t-2 border-gray-300 bg-gray-50/60">
              <td className="py-2.5 pl-2">Total Liabilities and Equity</td>
              <td className="py-2.5 text-right">{formatMoney(liabilitiesAndEquity)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Intuit Assist insight -- derived, not written. */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={15} className="text-blue-600" />
          <span className="text-xs font-bold text-blue-900">Intuit Assist</span>
        </div>
        <p className="text-xs text-blue-800">
          {netIncome >= 0
            ? `You made ${formatMoney(netIncome)} this period. `
            : `You lost ${formatMoney(Math.abs(netIncome))} this period. `}
          {b.assetsTotal > 0
            ? `Assets are ${formatMoney(b.assetsTotal)}, of which receivables are ${b.assetsTotal ? Math.round((b.arTotal / b.assetsTotal) * 100) : 0}% -- that is the figure most worth collecting first.`
            : 'Record a transaction and this report will fill itself in.'}
        </p>
      </div>
    </div>
  );
}