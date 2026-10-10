import React, { useState, useMemo } from 'react';
import { RefreshCw, ChevronDown, Printer, Share2, Settings, Paperclip, Check, X, Building, CreditCard } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';
import { CHART_OF_ACCOUNTS } from '../data/chartOfAccounts';

/**
 * Bank transactions.
 *
 * The account cards used to show fixed figures -- Checking -3,621.93 with
 * 1,201.00 "in QuickBooks", Savings 200.00, Mastercard 304.96 -- regardless of
 * what the app contained. Categorising a transaction left the card unchanged, so
 * the headline balance disagreed with the table directly beneath it.
 *
 * The bank-side balance is still a stated figure: it belongs to the institution,
 * which this app does not talk to. The "in QuickBooks" figure is now derived by
 * the ledger, the pending count is the real number rather than a literal 25, and
 * the money sitting in the review queue is shown as a value, because that gap
 * is what a reconciliation is for.
 */
export default function BankTransactionsView({ onNavigate, onCategorize, onReconcile }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();
  const [selectedAccount, setSelectedAccount] = useState('checking');
  const [activeTab, setActiveTab] = useState('review'); // 'review', 'categorized', 'excluded'
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [updating, setUpdating] = useState(false);

  // Expanded form state
  const [txType, setTxType] = useState('Categorize');
  const [transCategory, setTransCategory] = useState('Deposit');
  const [payeeName, setPayeeName] = useState('Cool Cars');
  const [accountCategory, setAccountCategory] = useState('Uncategorized Income');
  const [memoText, setMemoText] = useState('A1 RENTAL BACKHOE DEPOSIT REFUND');

  const selectedAccountId = state.bankAccounts.find((a) => a.name === selectedAccount)?.id ?? state.bankAccounts[0]?.id;

  /**
   * The two balances side by side, which is the whole reason this screen exists.
   *
   * "Bank balance" is the institution's figure -- this app does not connect to a
   * bank, so that number is stated, not computed. "In QuickBooks" is the ledger's
   * own figure and therefore derived: it moves the instant a transaction is
   * categorised. Before, it was typed in at 1,201.00 and did not move at all, so
   * reconciling against it could never have reached zero.
   *
   * The gap between them is not a bug to be hidden -- it is the outstanding
   * review queue, so it is computed and shown.
   */
  const accountStats = useMemo(() => {
    return state.bankAccounts.map((acct) => {
      const txns = state.bankTxns.filter((t) => t.bankAccountId === acct.id);
      const bookAccount = CHART_OF_ACCOUNTS.find((a) => a.name === acct.name);
      const unreviewed = txns.filter((t) => t.state === 'Uncategorized' || t.state === 'Suggested');
      const bookBalance = bookAccount ? ledger.balanceOf(bookAccount.id) : null;
      return {
        ...acct,
        bankBalance: acct.balance,
        bookBalance,
        pending: unreviewed.length,
        // Money that has cleared the bank but is not in the books yet.
        pendingValue: unreviewed.reduce((s, t) => s + Math.abs(t.amount), 0),
      };
    });
  }, [state.bankAccounts, state.bankTxns, ledger]);

  const reviewCount = state.bankTxns.filter(
    (t) => t.state === 'Uncategorized' || t.state === 'Suggested'
  ).length;

  const transactions = useMemo(() => {
    return state.bankTxns
      .filter((t) => t.bankAccountId === selectedAccountId)
      .map((t) => ({
        ...t,
        date: t.date,
        description: t.desc,
        payee: t.payee || t.desc,
        category: t.suggestion
          ? `${state.accounts.find((a) => a.id === t.suggestion.accountId)?.name} · ${t.suggestion.confidence}% sure`
          : t.categoryAccountId
            ? state.accounts.find((a) => a.id === t.categoryAccountId)?.name
            : 'Uncategorized',
        matchStatus: t.state === 'Match' ? 'Recorded' : t.state === 'Reviewed' ? 'Categorized' : null,
        matchDetail:
          t.state === 'Match'
            ? `Matched to ${t.matchedRef}`
            : t.state === 'Uncategorized'
              ? 'Not yet categorised'
              : '',
        spent: t.amount < 0 ? Math.abs(t.amount) : 0,
        received: t.amount > 0 ? t.amount : 0,
        memo: t.desc,
        action: t.state === 'Reviewed' || t.state === 'Match' ? 'View' : 'Categorize',
      }));
  }, [state.bankTxns, state.accounts, selectedAccountId]);

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => setUpdating(false), 800);
  };

  const handleAddRow = (id) => {
    const txn = state.bankTxns.find((t) => t.id === id);
    if (txn) {
      dispatch({
        type: 'UPDATE_BANK_TXN',
        payload: { ...txn, state: 'Reviewed', categoryAccountId: txn.categoryAccountId ?? null },
      });
    }
    if (expandedRowId === id) setExpandedRowId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Bank transactions</h1>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => onNavigate && onNavigate('rules')}
            className="px-3.5 py-1.5 text-xs font-semibold text-[#0077c5] bg-white border border-[#0077c5] rounded-full hover:bg-blue-50 flex items-center space-x-1 transition cursor-pointer"
          >
            <span>Rules</span>
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50">
            Try new banking page
          </button>
          <button className="px-3 py-1.5 text-xs font-semibold text-white bg-[#2ca01c] rounded-full hover:bg-green-700 flex items-center space-x-1">
            <span>Link account</span>
            <ChevronDown size={14} />
          </button>
          <button 
            onClick={handleUpdate}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 flex items-center space-x-1.5"
          >
            <RefreshCw size={13} className={updating ? "animate-spin text-[#2ca01c]" : ""} />
            <span>Update</span>
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50">
            Explore
          </button>
          {onReconcile && (
            <button
              onClick={onReconcile}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#0077c5] bg-white border border-[#0077c5] rounded-full hover:bg-blue-50 flex items-center space-x-1 transition cursor-pointer"
            >
              <span>Reconcile</span>
            </button>
          )}
        </div>
      </div>

      {/* Account cards. The bank-side balance is the institution's own figure --
          this app does not connect to a bank. The "in QuickBooks" figure and the
          pending count are ours, so they are computed. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accountStats.map((acct) => {
          const isSelected = acct.id === selectedAccountId;
          const Icon = acct.type === 'Credit Card' ? CreditCard : Building;
          return (
            <div
              key={acct.id}
              onClick={() => setSelectedAccount(acct.name)}
              className={`p-4 rounded-xl cursor-pointer transition relative border ${
                isSelected
                  ? 'bg-[#0077c5] text-white shadow-md border-transparent'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm">{acct.name}</span>
                <Icon size={16} className={isSelected ? 'text-white/80' : 'text-gray-400'} />
              </div>
              <div className="space-y-1">
                <div className="text-xl font-extrabold">{formatMoney(acct.bankBalance)}</div>
                <div className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                  BANK BALANCE • stated by {acct.institution}
                </div>
                <div className={`flex items-center justify-between pt-2 mt-2 ${isSelected ? 'border-t border-white/20' : 'border-t border-gray-100'}`}>
                  <div className="text-xs">
                    In the books: <span className="font-semibold">{formatMoney(acct.bookBalance)}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      acct.pending
                        ? 'font-bold bg-orange-500 text-white'
                        : isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {acct.pending}
                  </span>
                </div>
                {/* The two balances are only allowed to differ by what is still
                    in the queue. Stating the gap turns a confusing mismatch
                    into the actionable number it actually is. */}
                {acct.pending > 0 && (
                  <div className={`text-[11px] pt-1 ${isSelected ? 'text-orange-200' : 'text-orange-700'}`}>
                    {formatMoney(acct.pendingValue)} cleared the bank but is not categorised yet
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs and Tutorial links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200 pb-2">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveTab('review')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              activeTab === 'review' ? 'bg-[#393a3d] text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            For review ({reviewCount})
          </button>
          <button 
            onClick={() => setActiveTab('categorized')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'categorized' ? 'bg-[#393a3d] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Categorized
          </button>
          <button 
            onClick={() => setActiveTab('excluded')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
              activeTab === 'excluded' ? 'bg-[#393a3d] text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Excluded
          </button>
        </div>

        <div className="flex items-center space-x-4 text-xs text-[#0077c5] font-medium mt-2 sm:mt-0">
          <button className="hover:underline">Video tutorials</button>
          <button className="hover:underline">Take a tour</button>
          <button className="hover:underline">Go to bank register</button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            <input type="checkbox" className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" />
            <span>1-{transactions.length} of {transactions.length}</span>
          </div>
          <div className="flex items-center space-x-3">
            <Printer size={15} className="cursor-pointer hover:text-gray-900" />
            <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3 cursor-pointer hover:text-gray-900">DATE ▼</th>
                <th className="p-3">DESCRIPTION</th>
                <th className="p-3">PAYEE</th>
                <th className="p-3">CATEGORIZE OR MATCH</th>
                <th className="p-3 text-right">SPENT</th>
                <th className="p-3 text-right">RECEIVED</th>
                <th className="p-3 text-center"><Paperclip size={13} /></th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx) => {
                const isExpanded = expandedRowId === tx.id;
                return (
                  <React.Fragment key={tx.id}>
                    <tr
                      className={`hover:bg-blue-50/40 transition cursor-pointer ${isExpanded ? 'bg-blue-50/60 font-medium' : ''}`}
                      onClick={() => {
                        if (onCategorize) onCategorize(tx);
                        else setExpandedRowId(isExpanded ? null : tx.id);
                      }}
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" />
                      </td>
                      <td className="p-3 text-gray-600 whitespace-nowrap">{tx.date}</td>
                      <td className="p-3 font-medium text-gray-900">{tx.description}</td>
                      <td className="p-3 text-gray-700">{tx.payee}</td>
                      <td className="p-3">
                        {tx.matchStatus ? (
                          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-green-50 text-green-700 border border-green-200">
                            <Check size={11} />
                            <span>{tx.matchStatus}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600">{tx.category}</span>
                        )}
                        {tx.matchDetail && (
                          <div className="text-[10px] text-gray-400 mt-0.5">{tx.matchDetail}</div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {tx.spent ? `$${tx.spent.toFixed(2)}` : ''}
                      </td>
                      <td className="p-3 text-right font-medium text-green-700">
                        {tx.received ? `$${tx.received.toFixed(2)}` : ''}
                      </td>
                      <td className="p-3 text-center text-gray-400"></td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleAddRow(tx.id)}
                          className="px-3 py-1 text-xs font-bold text-[#0077c5] hover:text-[#005e9e] hover:underline"
                        >
                          {tx.action}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Drawer (Matching frame_728.jpg exactly) */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="bg-gray-50/90 p-5 border-y-2 border-green-500 shadow-inner">
                          <div className="max-w-4xl space-y-4">
                            {/* Radio row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-6 text-xs font-semibold text-gray-800">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="txType" 
                                    checked={txType === 'Categorize'} 
                                    onChange={() => setTxType('Categorize')}
                                    className="text-[#2ca01c] focus:ring-[#2ca01c]" 
                                  />
                                  <span>Categorize</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="txType" 
                                    checked={txType === 'Match'} 
                                    onChange={() => setTxType('Match')}
                                    className="text-[#2ca01c] focus:ring-[#2ca01c]" 
                                  />
                                  <span>Match</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                  <input 
                                    type="radio" 
                                    name="txType" 
                                    checked={txType === 'Transfer'} 
                                    onChange={() => setTxType('Transfer')}
                                    className="text-[#2ca01c] focus:ring-[#2ca01c]" 
                                  />
                                  <span>Record as transfer</span>
                                </label>
                              </div>
                              <button 
                                onClick={() => setExpandedRowId(null)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X size={16} />
                              </button>
                            </div>

                            {/* Dropdowns row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                  Type of transaction *
                                </label>
                                <select 
                                  value={transCategory}
                                  onChange={(e) => setTransCategory(e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white focus:border-[#2ca01c] focus:outline-none"
                                >
                                  <option>Deposit</option>
                                  <option>Expense</option>
                                  <option>Transfer</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                  Vendor/Customer/project
                                </label>
                                <select 
                                  value={payeeName}
                                  onChange={(e) => setPayeeName(e.target.value)}
                                  className="w-full text-xs border border-green-600 rounded p-2 bg-white focus:outline-none ring-1 ring-green-600"
                                >
                                  <option>Cool Cars</option>
                                  <option>Books By Bessie</option>
                                  <option>Pam Seitz</option>
                                  <option>Hicks Hardware</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-medium text-gray-600 mb-1">
                                  Account *
                                </label>
                                <select 
                                  value={accountCategory}
                                  onChange={(e) => setAccountCategory(e.target.value)}
                                  className="w-full text-xs border border-gray-300 rounded p-2 bg-white focus:border-[#2ca01c] focus:outline-none"
                                >
                                  <option>Uncategorized Income</option>
                                  <option>Sales of Product Income</option>
                                  <option>Automobile Expense</option>
                                </select>
                              </div>
                            </div>

                            {/* Memo input */}
                            <div>
                              <label className="block text-[11px] font-medium text-gray-600 mb-1">Memo</label>
                              <input 
                                type="text"
                                value={memoText}
                                onChange={(e) => setMemoText(e.target.value)}
                                className="w-full text-xs border border-gray-300 rounded p-2 bg-white focus:border-[#2ca01c] focus:outline-none"
                              />
                            </div>

                            {/* Bank Detail text */}
                            <div className="text-[11px] text-gray-500 font-medium">
                              <span className="font-bold text-gray-700">BANK DETAIL:</span> {tx.memo || "A1 RENTAL BACKHOE DEPOSIT REFUND"}
                            </div>

                            {/* Action links & footer buttons */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-3 border-t border-gray-200 gap-3">
                              <div className="flex items-center space-x-4 text-xs text-[#0077c5] font-medium">
                                <button className="hover:underline flex items-center space-x-1">
                                  <Paperclip size={12} />
                                  <span>Add attachment</span>
                                </button>
                                <button className="hover:underline">Create a rule</button>
                                <button className="hover:underline">Exclude</button>
                                <button className="hover:underline">Categorization history</button>
                              </div>

                              <div className="flex items-center space-x-2">
                                <button className="px-4 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700">
                                  Split
                                </button>
                                <button 
                                  onClick={() => handleAddRow(tx.id)}
                                  className="px-5 py-1.5 rounded-full bg-[#2ca01c] hover:bg-green-700 text-xs font-bold text-white shadow-xs"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
