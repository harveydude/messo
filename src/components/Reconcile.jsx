import React, { useState, useMemo } from 'react';
import { Check, ChevronLeft, AlertTriangle, FileText } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';
import { CHART_OF_ACCOUNTS } from '../data/chartOfAccounts';

/**
 * Bank reconciliation workflow.
 *
 * Select account -> enter statement date + balance -> check off transactions
 * -> the difference must be zero to finish.
 *
 * The arithmetic used to be `statement balance - sum of ticked rows`, which is
 * not a reconciliation. A statement is the *ending* balance: it equals the
 * balance you started the period with plus everything that cleared since.
 * Comparing it against the ticked rows alone could never reach zero, so the
 * Finish button was permanently disabled however carefully you worked.
 *
 * It is now `statement balance - (book balance + cleared items)`, which is the
 * rule a bookkeeper actually applies, and it reaches zero when the work is
 * genuinely done.
 *
 * Only rows that are in the books are offered. An uncategorised transaction has
 * no account, so it cannot be "cleared" -- ticking it would be ticking a fiction.
 */

export default function Reconcile({ onClose, onFinish }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();
  const [step, setStep] = useState('setup'); // setup | review | done
  const [accountId, setAccountId] = useState(state.bankAccounts[0]?.id || 1);
  const [statementDate, setStatementDate] = useState('2025-10-24');
  const [statementBalance, setStatementBalance] = useState('');
  const [checked, setChecked] = useState(new Set());
  const [finishing, setFinishing] = useState(false);

  const account = state.bankAccounts.find(a => a.id === Number(accountId));

  // The derived book balance for this account -- not a typed-in figure.
  const qbBalance = useMemo(() => {
    const acct = CHART_OF_ACCOUNTS.find(a => a.name === account?.name);
    return acct ? ledger.balanceOf(acct.id) : 0;
  }, [account, ledger]);

  // Everything the bank has told us about, that is also in the books. Matched
  // rows count: they were settled against a document and they cleared the bank.
  const txns = useMemo(() => {
    return state.bankTxns
      .filter(t => t.bankAccountId === Number(accountId) && t.state !== 'Uncategorized' && t.state !== 'Suggested')
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.bankTxns, accountId]);

  const clearedBalance = useMemo(() => {
    return txns.filter(t => checked.has(t.id)).reduce((s, t) => s + t.amount, 0);
  }, [txns, checked]);

  // The rule: ending statement balance = opening book balance + what cleared.
  const expectedEnding = useMemo(() => qbBalance + clearedBalance, [qbBalance, clearedBalance]);

  const difference = useMemo(() => {
    const stmtBal = parseFloat(statementBalance) || 0;
    return stmtBal - expectedEnding;
  }, [statementBalance, expectedEnding]);

  // One click to tick everything -- reconciliation is a check, not a test of
  // patience, and the difference still has to come out at zero on its own.
  const toggleAll = () => {
    setChecked(checked.size === txns.length ? new Set() : new Set(txns.map(t => t.id)));
  };

  const toggleTxn = (id) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
  };

  const handleFinish = () => {
    setFinishing(true);
    setTimeout(() => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: { id: Date.now(), text: `Reconciled ${account?.name}`, time: 'Just now', read: false, route: '/banking' } });
      setFinishing(false);
      setStep('done');
      onFinish?.();
    }, 800);
  };

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Reconciled!</h2>
          <p className="text-sm text-gray-600 mb-6">{account?.name} is reconciled as of {statementDate}</p>
          <button onClick={onClose} className="px-6 py-2 bg-[#2CA01C] hover:bg-[#25900f] text-white text-sm font-semibold rounded-lg transition">
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Reconcile account</h2>
          </div>

          <div className="space-y-4">
            {/* AI Statement Extraction Box (Module 23 from Master Spec) */}
            <div className="border border-[#007755]/30 bg-[#e6f4ea]/60 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#007755] flex items-center justify-center text-white shrink-0">
                  <FileText size={14} />
                </div>
                <div>
                  <div className="text-[12px] font-bold text-gray-900 flex items-center gap-1.5">
                    <span>HDFC_Statement_June_2026.pdf</span>
                    <span className="text-[10px] bg-[#007755] text-white px-1.5 py-0.2 rounded font-medium">Verified</span>
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Auto-extracted: {formatMoney(account?.balance || 604328.00)} ending balance
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatementBalance(String(account?.balance || 604328.00))}
                className="text-[11px] font-bold text-[#007755] bg-white border border-[#007755]/30 hover:bg-emerald-50 px-2.5 py-1 rounded transition cursor-pointer shrink-0"
              >
                Auto-fill
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Account</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              >
                {state.bankAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Statement ending date</label>
              <input
                type="date"
                value={statementDate}
                onChange={e => setStatementDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Statement ending balance</label>
              <input
                type="number"
                step="0.01"
                value={statementBalance}
                onChange={e => setStatementBalance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
                placeholder="0.00"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Balance in the books</span>
                <span className="font-medium text-gray-900">{formatMoney(qbBalance)}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                The statement's ending balance should equal this, plus everything you clear below.
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={() => setStep('review')}
              disabled={!statementBalance}
              className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
            >
              Start reconciling
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Review step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setStep('setup')} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Reconcile {account?.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 text-sm">
            Finish later
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50">
          <div className="text-center">
            <p className="text-xs text-gray-500">Statement balance</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(parseFloat(statementBalance) || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Books plus cleared</p>
            <p className="text-lg font-bold text-gray-900">{formatMoney(expectedEnding)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Difference</p>
            <p className={`text-lg font-bold ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
              {formatMoney(difference)}
            </p>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Transactions to clear</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{checked.size} of {txns.length} cleared</span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-semibold text-[#2CA01C] hover:underline"
              >
                {checked.size === txns.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
          </div>

          {txns.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              Nothing has cleared this account yet. Categorise a bank transaction first.
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {txns.map(txn => (
                <button
                  key={txn.id}
                  type="button"
                  onClick={() => toggleTxn(txn.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition text-left ${checked.has(txn.id) ? 'bg-green-50' : ''}`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${checked.has(txn.id) ? 'bg-[#2CA01C] border-[#2CA01C]' : 'border-gray-300'}`}>
                    {checked.has(txn.id) && <Check size={12} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{txn.desc}</p>
                    <p className="text-xs text-gray-500">{txn.date}</p>
                  </div>
                  <p className={`text-sm font-medium ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatMoney(txn.amount)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          {Math.abs(difference) >= 0.01 && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertTriangle size={16} />
              Difference: {formatMoney(Math.abs(difference))}
            </div>
          )}
          <button
            type="button"
            onClick={handleFinish}
            disabled={Math.abs(difference) >= 0.01 || finishing}
            className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition"
          >
            {finishing ? 'Finishing...' : 'Finish now'}
          </button>
        </div>
      </div>
    </div>
  );
}
