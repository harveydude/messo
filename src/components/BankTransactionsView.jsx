import React, { useState } from 'react';
import { RefreshCw, ChevronDown, Printer, Share2, Settings, Paperclip, Check, X, Building, CreditCard } from 'lucide-react';
import { INITIAL_BANK_TRANSACTIONS } from '../data/qbData';

export default function BankTransactionsView({ onNavigate, onCategorize, onReconcile }) {
  const [selectedAccount, setSelectedAccount] = useState('checking');
  const [activeTab, setActiveTab] = useState('review'); // 'review', 'categorized', 'excluded'
  const [transactions, setTransactions] = useState(INITIAL_BANK_TRANSACTIONS);
  const [expandedRowId, setExpandedRowId] = useState(2); // Expand row 2 (A Rental) by default to show exact UI from frame_728!
  const [updating, setUpdating] = useState(false);
  
  // Expanded form state
  const [txType, setTxType] = useState('Categorize');
  const [transCategory, setTransCategory] = useState('Deposit');
  const [payeeName, setPayeeName] = useState('Cool Cars');
  const [accountCategory, setAccountCategory] = useState('Uncategorized Income');
  const [memoText, setMemoText] = useState('A1 RENTAL BACKHOE DEPOSIT REFUND');

  const handleUpdate = () => {
    setUpdating(true);
    setTimeout(() => setUpdating(false), 800);
  };

  const handleAddRow = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
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

      {/* Account Cards Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Checking */}
        <div 
          onClick={() => setSelectedAccount('checking')}
          className={`p-4 rounded-xl cursor-pointer transition relative border ${
            selectedAccount === 'checking'
              ? 'bg-[#0077c5] text-white shadow-md border-transparent'
              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Checking</span>
            <Building size={16} className={selectedAccount === 'checking' ? 'text-white/80' : 'text-gray-400'} />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-extrabold">-$3,621.93</div>
            <div className={`text-[11px] ${selectedAccount === 'checking' ? 'text-white/80' : 'text-gray-500'}`}>
              BANK BALANCE • Updated moments ago
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/20 mt-2">
              <div className="text-xs">
                In QuickBooks: <span className="font-semibold">$1,201.00</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">
                25
              </span>
            </div>
          </div>
        </div>

        {/* Savings */}
        <div 
          onClick={() => setSelectedAccount('savings')}
          className={`p-4 rounded-xl cursor-pointer transition relative border ${
            selectedAccount === 'savings'
              ? 'bg-[#0077c5] text-white shadow-md border-transparent'
              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Savings</span>
            <Building size={16} className="text-gray-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-extrabold">$200.00</div>
            <div className="text-[11px] text-gray-500">
              BANK BALANCE • Updated moments ago
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
              <div className="text-xs">
                In QuickBooks: <span className="font-semibold">$800.00</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                1
              </span>
            </div>
          </div>
        </div>

        {/* Mastercard */}
        <div 
          onClick={() => setSelectedAccount('mastercard')}
          className={`p-4 rounded-xl cursor-pointer transition relative border ${
            selectedAccount === 'mastercard'
              ? 'bg-[#0077c5] text-white shadow-md border-transparent'
              : 'bg-white border-gray-200 hover:border-gray-300 text-gray-900'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Mastercard</span>
            <CreditCard size={16} className="text-gray-400" />
          </div>
          <div className="space-y-1">
            <div className="text-xl font-extrabold">$304.96</div>
            <div className="text-[11px] text-gray-500">
              BANK BALANCE • Updated moments ago
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
              <div className="text-xs">
                In QuickBooks: <span className="font-semibold">$157.72</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                7
              </span>
            </div>
          </div>
        </div>
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
            For review (25)
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
            <span>1-25 of 25</span>
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
