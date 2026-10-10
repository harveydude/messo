import React, { useState } from 'react';
import { X, Check, Paperclip, Search } from 'lucide-react';
import { useStore } from '../store.jsx';
import { formatMoney } from '../money';

/**
 * Bank transaction categorization drawer.
 *
 * Triggered by clicking an uncategorized or suggested transaction.
 * Shows: payee, account selector, description, attach support.
 * Confirm → updates bankTxn, logs audit, updates account balances.
 */

export default function BankCategorize({ txn, onClose, onConfirm }) {
  const { state, dispatch } = useStore();
  const [payee, setPayee] = useState(txn.desc);
  const [accountId, setAccountId] = useState(txn.categoryAccountId || '');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState(null);

  const expenseAccounts = state.accounts.filter(a => a.type === 'Expense' || a.type === 'Cost of Goods Sold');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAccounts = searchTerm
    ? expenseAccounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : expenseAccounts;

  const handleConfirm = () => {
    if (!accountId) return;
    const updated = {
      ...txn,
      state: 'Reviewed',
      categoryAccountId: Number(accountId),
      payee,
    };
    dispatch({ type: 'UPDATE_BANK_TXN', payload: updated });
    dispatch({ type: 'ADD_NOTIFICATION', payload: { id: Date.now(), text: `Categorized ${txn.desc}`, time: 'Just now', read: false, route: '/banking' } });
    onConfirm?.(updated);
    onClose();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachment(file.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Categorize transaction</h2>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{txn.desc}</p>
                <p className="text-xs text-gray-500">{txn.date}</p>
              </div>
              <p className={`text-lg font-bold ${txn.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatMoney(txn.amount)}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payee</label>
            <input
              type="text"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category account *</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C] mb-2"
              />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredAccounts.map(acc => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => { setAccountId(String(acc.id)); setSearchTerm(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition ${accountId === String(acc.id) ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700'}`}
                >
                  {acc.name}
                  <span className="text-xs text-gray-400 ml-2">{acc.detail}</span>
                </button>
              ))}
              {filteredAccounts.length === 0 && (
                <p className="px-3 py-2 text-sm text-gray-500">No accounts found</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              placeholder="Add a note..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Attach support</label>
            <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2CA01C] transition">
              <Paperclip size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">{attachment || 'Upload receipt or document'}</span>
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!accountId}
            className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            <Check size={16} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
