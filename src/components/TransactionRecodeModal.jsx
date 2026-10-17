import React, { useState } from 'react';
import { ArrowLeft, X, FileText, CheckCircle2, ShieldCheck, Check } from 'lucide-react';
import { useStore } from '../store';

export default function TransactionRecodeModal({ isOpen, onClose, onSaved }) {
  const [category, setCategory] = useState('prepaid');
  const [isSaved, setIsSaved] = useState(false);
  const { dispatch } = useStore();

  if (!isOpen) return null;

  const handleSave = () => {
    setIsSaved(true);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: Date.now(),
        text: 'Reclassified Kanto Outdoor Media (₹8,75,000.00) to Prepaid Expenses (Current Asset) per Indian AS 1.',
        time: 'Just now',
        read: false,
        route: '/reports'
      }
    });

    setTimeout(() => {
      setIsSaved(false);
      onSaved?.();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[1350] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-[1100px] bg-white rounded-xl shadow-2xl overflow-hidden border border-[#dfe1e6] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="h-[60px] border-b border-[#dfe1e6] flex items-center justify-between px-8 bg-[#f8f9fa]">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="p-1 hover:bg-gray-200 rounded text-[#5e6c84] hover:text-[#172b4d] transition"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-[17px] font-bold text-[#172b4d]">Expense Voucher #58 (GL Deep-Dive)</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e3fcef] text-[#00875a]">
              <ShieldCheck size={12} />
              Accrual Compliance
            </span>
          </div>
          <div className="text-[24px] font-black text-[#172b4d] font-mono">
            ₹8,75,000.00
          </div>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1.5">Payee</label>
              <input
                type="text"
                readOnly
                defaultValue="Kanto Outdoor Media Pvt Ltd"
                className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] bg-[#fafbfc] text-[#172b4d] font-semibold text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1.5">Payment Account</label>
              <input
                type="text"
                readOnly
                defaultValue="HDFC Current Account (Balance ₹29,04,425.00)"
                className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] bg-[#fafbfc] text-[#172b4d] text-[13px] outline-none"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1.5">Payment Date</label>
              <input
                type="text"
                readOnly
                defaultValue="18/05/2026"
                className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] bg-[#fafbfc] text-[#172b4d] text-[13px] outline-none font-mono"
              />
            </div>
          </div>

          {/* Reclassification Table */}
          <div className="border border-[#dfe1e6] rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#f4f5f8] border-b border-[#dfe1e6] text-left text-[12px] font-semibold text-[#5e6c84]">
                  <th className="py-2.5 px-3.5 w-[40px]">#</th>
                  <th className="py-2.5 px-3.5 w-[380px]">Category (Chart of Accounts)</th>
                  <th className="py-2.5 px-3.5">Description</th>
                  <th className="py-2.5 px-3.5 w-[180px] text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#dfe1e6]">
                  <td className="py-3 px-3.5 text-gray-500 font-mono">1</td>
                  <td className="py-3 px-3.5">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full h-[40px] px-3 rounded-md border-2 border-[#007755] bg-[#e6f4ea] font-bold text-[#007755] text-[13px] focus:outline-none"
                    >
                      <option value="prepaid">Prepaid Expenses (Current Asset)</option>
                      <option value="general">General Business Expenses (P&L Expense)</option>
                    </select>
                  </td>
                  <td className="py-3 px-3.5">
                    <input
                      type="text"
                      defaultValue="Billboard advertising deposit: Campaign active 06/07/2026 to 02/08/2026"
                      className="w-full h-[38px] px-3 rounded-md border border-[#dfe1e6] text-[12.5px] text-[#172b4d] focus:outline-none"
                    />
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-[14px] text-gray-900 font-mono">
                    ₹8,75,000.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Attached Document & Accounting Callout */}
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center bg-[#f8f9fa] border border-[#dfe1e6] rounded-lg p-4">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded bg-emerald-100 text-[#007755] flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div>
                <div className="text-[12.5px] font-semibold text-gray-900">Kanto_Media_Invoice_Deposit.pdf</div>
                <div className="text-[11px] text-[#5e6c84]">Billboard booking contract July-August 2026</div>
              </div>
            </div>

            <div className="text-[12px] text-[#5e6c84] leading-relaxed border-t sm:border-t-0 sm:border-l border-gray-300 pt-3 sm:pt-0 sm:pl-6 flex-1">
              <span className="text-[#007755] font-bold">Indian AS 1 Matching Principle:</span> Reclassifying this advance booking deposit from General Expense to a Current Asset removes the May P&L distortion and amortizes costs cleanly across the July/August campaign run.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="h-[64px] border-t border-[#dfe1e6] flex items-center justify-between px-8 bg-[#f8f9fa]">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2 rounded-md border border-[#c1c7d0] text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaved}
            className="px-6 py-2 rounded-md bg-[#007755] hover:bg-[#005f43] text-white text-[13px] font-bold transition cursor-pointer flex items-center gap-2 shadow-xs"
          >
            {isSaved ? (
              <>
                <Check size={16} />
                <span>Saved &amp; Reclassified!</span>
              </>
            ) : (
              <span>Save and Close</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
