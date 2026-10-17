import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  MessageSquare,
  Settings,
  HelpCircle,
  X,
  Calendar,
  Copy,
  Trash2,
  Table,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { useStore } from '../store';
import api from '../api/client';

/**
 * JournalEntryModal — Meso Journal Entry creation/editing overlay.
 * Replicates the exact UI from the reference screenshot:
 * - Full-screen layout with top bar: circular history icon, "Journal Entry #1", Feedback, Gear, ?, ✕
 * - Form inputs: "Journal date" (10/20/2025, calendar icon, green active border) & "Journal no." (1, full-width input spanning right half)
 * - Table tools: customize table and print/view icons top-right
 * - 8 rows pre-rendered:
 *     Col 0: Grip dots (::)
 *     Col 1: # (1 to 8)
 *     Col 2: ACCOUNT (dropdown input with accounts)
 *     Col 3: DEBITS (numeric input, right-aligned)
 *     Col 4: CREDITS (numeric input, right-aligned, dotted border divider)
 *     Col 5: DESCRIPTION (text input)
 *     Col 6: NAME (customer/vendor/employee select)
 *     Col 7: Action icons (Copy sheet, Trash can)
 *   Row 1 with subtle light-gray highlight (#f2f4f7)
 * - Full-width gray total row (#eaedf1): "Total", Debits sum ($0.00), Credits sum ($0.00)
 * - Action buttons: "Add lines", "Clear all lines"
 * - Bottom split: Memo (textarea) & Attachments card ("Add attachment", "Max file size: 20 MB", "Show existing", "Privacy")
 * - Fixed bottom action bar: Cancel, Clear, Make recurring / Reverse, Save, Save and close
 */

const SEED_ACCOUNTS = [
  'Checking',
  'Savings',
  'Accounts Receivable (A/R)',
  'Accounts Payable (A/P)',
  'Opening Balance Equity',
  'Retained Earnings',
  'Sales / Income',
  'Cost of Goods Sold',
  'Advertising & Marketing',
  'Automobile Expense',
  'Bookkeeper',
  'Insurance',
  'Legal & Professional Fees',
  'Office Expenses',
  'Rent Expense',
  'Supplies',
  'Utilities'
];

const SEED_NAMES = [
  'Amy\'s Bird Sanctuary',
  'Bill\'s Windsurf Shop',
  'Bob\'s Burger Joint',
  'Books by Bessie',
  'Cal Telephone',
  'Chin\'s Gas and Oil',
  'Cool Cars',
  'Diego Rodriguez',
  'Dylan Sollfrank',
  'Grace Pariente',
  'Lawns & Paws'
];

function GripDots() {
  return (
    <div className="flex flex-col gap-[3px] items-center justify-center cursor-grab opacity-60 hover:opacity-100">
      <div className="flex gap-[3px]">
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
      </div>
      <div className="flex gap-[3px]">
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
      </div>
      <div className="flex gap-[3px]">
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
        <div className="w-[3px] h-[3px] rounded-full bg-[#8d9096]" />
      </div>
    </div>
  );
}

export default function JournalEntryModal({ isOpen, onClose }) {
  const { dispatch } = useStore();

  const [date, setDate] = useState('10/20/2025');
  const [journalNo, setJournalNo] = useState('1');
  const [memo, setMemo] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize exactly 8 rows as shown in the screenshot
  const [rows, setRows] = useState([
    { id: 1, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 2, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 3, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 4, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 5, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 6, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 7, account: '', debit: '', credit: '', desc: '', name: '' },
    { id: 8, account: '', debit: '', credit: '', desc: '', name: '' },
  ]);

  if (!isOpen) return null;

  const updateRow = (id, field, value) => {
    setRows(prev =>
      prev.map(row => {
        if (row.id !== id) return row;
        // If updating debit, clear credit or vice versa if mutually exclusive in typical entry
        return { ...row, [field]: value };
      })
    );
  };

  const addLines = () => {
    const nextId = rows.length ? Math.max(...rows.map(r => r.id)) + 1 : 1;
    setRows(prev => [
      ...prev,
      { id: nextId, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: nextId + 1, account: '', debit: '', credit: '', desc: '', name: '' }
    ]);
  };

  const clearAllLines = () => {
    setRows([
      { id: 1, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 2, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 3, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 4, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 5, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 6, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 7, account: '', debit: '', credit: '', desc: '', name: '' },
      { id: 8, account: '', debit: '', credit: '', desc: '', name: '' }
    ]);
  };

  const duplicateRow = (row) => {
    const nextId = Math.max(...rows.map(r => r.id)) + 1;
    const index = rows.findIndex(r => r.id === row.id);
    const newRows = [...rows];
    newRows.splice(index + 1, 0, { ...row, id: nextId });
    setRows(newRows);
  };

  const removeRow = (id) => {
    if (rows.length <= 1) {
      setRows([{ id: 1, account: '', debit: '', credit: '', desc: '', name: '' }]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  // Calculations
  const totalDebits = rows.reduce((sum, r) => sum + (parseFloat((r.debit || '').replace(/,/g, '')) || 0), 0);
  const totalCredits = rows.reduce((sum, r) => sum + (parseFloat((r.credit || '').replace(/,/g, '')) || 0), 0);

  const formatMoney = (val) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSave = async (closeAfter = true) => {
    if (isSaving) return;
    if (Math.abs(totalDebits - totalCredits) > 0.001) {
      alert(`Double-entry balance violation: Total Debits (₹${totalDebits.toFixed(2)}) must equal Total Credits (₹${totalCredits.toFixed(2)}). Difference: ₹${Math.abs(totalDebits - totalCredits).toFixed(2)}`);
      return;
    }

    setIsSaving(true);
    try {
      const activeLines = rows.filter(r => r.account || r.debit || r.credit);
      if (activeLines.length < 2) {
        alert('A balanced journal entry must contain at least two lines.');
        setIsSaving(false);
        return;
      }

      // Map account name to account ID
      const mappedLines = activeLines.map(r => {
        let accId = 'acc_6020';
        const name = (r.account || '').toLowerCase();
        if (name.includes('check')) accId = 'acc_1010';
        else if (name.includes('receiv')) accId = 'acc_1100';
        else if (name.includes('payab')) accId = 'acc_2000';
        else if (name.includes('saving')) accId = 'acc_1015';
        else if (name.includes('sales') || name.includes('income')) accId = 'acc_4000';
        else if (name.includes('cogs') || name.includes('cost of goods')) accId = 'acc_5000';
        else if (name.includes('legal')) accId = 'acc_6010';
        else if (name.includes('auto')) accId = 'acc_6000';
        else if (name.includes('supplies')) accId = 'acc_6020';
        else if (name.includes('retained')) accId = 'acc_3900';
        else if (name.includes('equity')) accId = 'acc_3000';

        return {
          accountId: accId,
          debit: parseFloat((r.debit || '').replace(/,/g, '')) || 0,
          credit: parseFloat((r.credit || '').replace(/,/g, '')) || 0,
          description: r.desc || memo || 'Manual journal adjustment'
        };
      });

      // 1. Post to PostgreSQL Backend & General Ledger
      await api.createJournalEntry({
        entryNumber: `JE-${journalNo || Date.now().toString().slice(-4)}`,
        entryDate: date || new Date().toISOString().split('T')[0],
        memo: memo || 'Journal entry created from Meso UI',
        lines: mappedLines
      });

      // 2. Hydrate local store
      try {
        dispatch({
          type: 'ADD_JOURNAL_ENTRY',
          payload: {
            id: journalNo,
            date,
            memo,
            lines: activeLines
          }
        });
      } catch (e) {
        // Fallback
      }

      if (closeAfter) {
        onClose?.();
      }
    } catch (err) {
      console.warn('Journal entry save error:', err);
      alert('Error saving journal entry: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col font-sans select-none overflow-y-auto text-[#393a3d] antialiased">
      
      {/* ────────────────── TOP BAR ────────────────── */}
      <header className="h-[52px] flex-none bg-white border-b border-[#e3e5e8] flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            title="Recent transactions"
            className="text-[#393a3d] hover:text-[#2ca01c] p-1.5 rounded transition cursor-pointer"
          >
            <RotateCcw size={19} strokeWidth={2.2} />
          </button>
          <h1 className="text-[19px] font-semibold text-[#111] tracking-tight">
            Journal Entry #{journalNo || '1'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-1.5 text-xs text-[#393a3d] hover:text-[#111] px-2 py-1 rounded transition cursor-pointer"
            title="Feedback"
          >
            <MessageSquare size={16} />
            <span className="font-medium">Feedback</span>
          </button>

          <button title="Settings" className="p-1.5 text-[#393a3d] hover:text-[#111] transition cursor-pointer">
            <Settings size={18} />
          </button>

          <button title="Help" className="p-1.5 text-[#393a3d] hover:text-[#111] transition cursor-pointer">
            <HelpCircle size={18} />
          </button>

          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 text-[#393a3d] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer ml-1"
          >
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ────────────────── MAIN CONTENT ────────────────── */}
      <main className="flex-1 pb-24 px-6 pt-5 bg-white">
        
        {/* Row 1: Journal date & Journal no. */}
        <div className="flex items-start gap-8 mb-6">
          
          {/* Journal date input */}
          <div className="w-[210px] flex-none">
            <label className="block text-xs text-[#6b6c72] mb-1 font-normal">Journal date</label>
            <div className="relative">
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-[36px] px-3 pr-8 bg-white border-2 border-[#2ca01c] rounded-[3px] text-xs text-[#111] outline-none font-medium"
              />
              <Calendar size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6b6c72] pointer-events-none" />
            </div>
          </div>

          {/* Journal no. input spanning right half */}
          <div className="flex-1">
            <label className="block text-xs text-[#6b6c72] mb-1 font-normal">Journal no.</label>
            <input
              type="text"
              value={journalNo}
              onChange={(e) => setJournalNo(e.target.value)}
              className="w-full h-[36px] px-3 bg-white border border-[#c9cdd2] rounded-[3px] text-xs text-[#111] outline-none focus:border-[#2ca01c]"
            />
          </div>

        </div>

        {/* Action icons above table on far right */}
        <div className="flex justify-end items-center gap-3 mb-1.5 text-[#6b6c72]">
          <button title="Table settings / columns" className="hover:text-[#111] p-1 cursor-pointer">
            <Sliders size={16} />
          </button>
          <button title="Print or preview table" className="hover:text-[#111] p-1 cursor-pointer">
            <Table size={16} />
          </button>
        </div>

        {/* ────────────────── JOURNAL ENTRY TABLE ────────────────── */}
        <div className="border border-[#d4d7dc] rounded-[3px] overflow-hidden mb-3">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-white border-b border-[#d4d7dc] text-[#6b6c72] font-semibold text-[11px] uppercase tracking-wide">
                <th className="w-[36px] py-2.5 px-1 text-center font-normal"></th>
                <th className="w-[30px] py-2.5 px-1 text-center font-normal">#</th>
                <th className="w-[320px] py-2.5 px-3 text-left font-bold border-r border-[#e8ecef]">ACCOUNT</th>
                <th className="w-[140px] py-2.5 px-3 text-right font-bold border-r border-dotted border-[#c9cdd2]">DEBITS</th>
                <th className="w-[140px] py-2.5 px-3 text-right font-bold border-r border-[#e8ecef]">CREDITS</th>
                <th className="py-2.5 px-3 text-left font-bold border-r border-[#e8ecef]">DESCRIPTION</th>
                <th className="w-[280px] py-2.5 px-3 text-left font-bold">NAME</th>
                <th className="w-[70px] py-2.5 px-1 text-center font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const isRow1 = idx === 0;

                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[#e3e5e8] transition ${
                      isRow1 ? 'bg-[#f2f4f7]' : 'bg-white hover:bg-[#f9fbfd]'
                    }`}
                  >
                    {/* Col 0: Grip Dots */}
                    <td className="text-center py-2 px-1">
                      <GripDots />
                    </td>

                    {/* Col 1: Row # */}
                    <td className="text-center py-2 px-1 text-[#6b6c72] font-normal">
                      {idx + 1}
                    </td>

                    {/* Col 2: ACCOUNT */}
                    <td className="p-1 border-r border-[#e8ecef]">
                      <div className="relative">
                        <select
                          value={row.account}
                          onChange={(e) => updateRow(row.id, 'account', e.target.value)}
                          className="w-full h-[32px] px-2 pr-6 bg-transparent rounded-[2px] text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#2ca01c] appearance-none cursor-pointer"
                        >
                          <option value="">Select an account</option>
                          {SEED_ACCOUNTS.map(acct => (
                            <option key={acct} value={acct}>{acct}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8d9096] pointer-events-none" />
                      </div>
                    </td>

                    {/* Col 3: DEBITS */}
                    <td className="p-1 border-r border-dotted border-[#c9cdd2]">
                      <input
                        type="text"
                        value={row.debit}
                        onChange={(e) => updateRow(row.id, 'debit', e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder=""
                        className="w-full h-[32px] px-2 text-right bg-transparent rounded-[2px] text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#2ca01c]"
                      />
                    </td>

                    {/* Col 4: CREDITS */}
                    <td className="p-1 border-r border-[#e8ecef]">
                      <input
                        type="text"
                        value={row.credit}
                        onChange={(e) => updateRow(row.id, 'credit', e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder=""
                        className="w-full h-[32px] px-2 text-right bg-transparent rounded-[2px] text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#2ca01c]"
                      />
                    </td>

                    {/* Col 5: DESCRIPTION */}
                    <td className="p-1 border-r border-[#e8ecef]">
                      <input
                        type="text"
                        value={row.desc}
                        onChange={(e) => updateRow(row.id, 'desc', e.target.value)}
                        placeholder=""
                        className="w-full h-[32px] px-2 bg-transparent rounded-[2px] text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#2ca01c]"
                      />
                    </td>

                    {/* Col 6: NAME */}
                    <td className="p-1">
                      <div className="relative">
                        <select
                          value={row.name}
                          onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                          className="w-full h-[32px] px-2 pr-6 bg-transparent rounded-[2px] text-xs outline-none focus:bg-white focus:ring-1 focus:ring-[#2ca01c] appearance-none cursor-pointer"
                        >
                          <option value=""></option>
                          {SEED_NAMES.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        <ChevronDown size={13} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#8d9096] pointer-events-none" />
                      </div>
                    </td>

                    {/* Col 7: Actions (Copy & Trash) */}
                    <td className="p-1 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[#b9bdc2]">
                        <button
                          onClick={() => duplicateRow(row)}
                          title="Duplicate line"
                          className="p-1 hover:text-[#393a3d] transition cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => removeRow(row.id)}
                          title="Delete line"
                          className="p-1 hover:text-[#d32f2f] transition cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ──── FULL-WIDTH GRAY TOTAL ROW (#eaedf1) ──── */}
            <tfoot>
              <tr className="bg-[#eaedf1] border-t border-[#d4d7dc] text-xs font-bold text-[#111]">
                <td colSpan={3} className="py-2.5 px-4 text-right">
                  Total
                </td>
                <td className="py-2.5 px-3 text-right border-r border-dotted border-[#c9cdd2]">
                  {formatMoney(totalDebits)}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-[#d4d7dc]">
                  {formatMoney(totalCredits)}
                </td>
                <td colSpan={3} className="py-2.5 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Buttons below table: Add lines & Clear all lines */}
        <div className="flex items-center gap-2 mb-8">
          <button
            onClick={addLines}
            className="px-3.5 py-1.5 border border-[#8d9096] bg-white hover:bg-gray-50 rounded-[4px] text-xs font-semibold text-[#393a3d] transition cursor-pointer"
          >
            Add lines
          </button>
          <button
            onClick={clearAllLines}
            className="px-3.5 py-1.5 border border-[#8d9096] bg-white hover:bg-gray-50 rounded-[4px] text-xs font-semibold text-[#393a3d] transition cursor-pointer"
          >
            Clear all lines
          </button>
        </div>

        {/* ────────────────── MEMO & ATTACHMENTS SECTION ────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[1240px]">
          
          {/* Left: Memo */}
          <div>
            <label className="block text-xs text-[#6b6c72] mb-1 font-normal">Memo</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder=""
              className="w-full h-[130px] p-3 border border-[#c9cdd2] rounded-[4px] text-xs outline-none focus:border-[#2ca01c] resize-none bg-white"
            />
          </div>

          {/* Right: Attachments */}
          <div>
            <label className="block text-xs text-[#6b6c72] mb-1 font-normal">Attachments</label>
            
            {/* Attachment box */}
            <div
              onClick={() => {
                const name = prompt('Simulated attachment name:', 'Journal_Supporting_Doc.pdf');
                if (name) setAttachments(prev => [...prev, name]);
              }}
              className="w-full h-[130px] border border-[#c9cdd2] rounded-[4px] flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition cursor-pointer"
            >
              {attachments.length > 0 ? (
                <div className="space-y-1 text-center">
                  {attachments.map((att, i) => (
                    <div key={i} className="text-xs font-semibold text-[#0077c5]">{att}</div>
                  ))}
                  <div className="text-[11px] text-[#8d9096]">Click to add more files</div>
                </div>
              ) : (
                <>
                  <span className="text-xs font-semibold text-[#0077c5] hover:underline">
                    Add attachment
                  </span>
                  <span className="text-[11px] text-[#8d9096] mt-1">
                    Max file size: 20 MB
                  </span>
                </>
              )}
            </div>

            {/* Links below attachment */}
            <div className="flex items-center justify-center gap-6 mt-2 text-xs">
              <button
                onClick={() => alert('No existing attachments found.')}
                className="text-[#0077c5] hover:underline cursor-pointer"
              >
                Show existing
              </button>
              <button
                onClick={() => alert('Meso Privacy Statement: Your transaction attachments are securely encrypted.')}
                className="text-[#0077c5] hover:underline cursor-pointer"
              >
                Privacy
              </button>
            </div>

          </div>

        </div>

      </main>

      {/* ────────────────── FIXED BOTTOM BAR ────────────────── */}
      <footer className="fixed bottom-0 left-0 right-0 h-[64px] bg-white border-t border-[#e3e5e8] flex items-center justify-between px-6 z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        
        {/* Left: Cancel & Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] font-semibold text-sm rounded-[4px] hover:bg-green-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={clearAllLines}
            className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] font-semibold text-sm rounded-[4px] hover:bg-green-50 transition cursor-pointer"
          >
            Clear
          </button>
        </div>

        {/* Center: Make recurring / Reverse */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => alert('Reverse journal entry scheduled')}
            className="text-sm font-semibold text-[#2ca01c] hover:underline transition cursor-pointer"
          >
            Reverse
          </button>
          <button
            onClick={() => alert('Recurring journal entry template created')}
            className="text-sm font-semibold text-[#2ca01c] hover:underline transition cursor-pointer"
          >
            Make recurring
          </button>
        </div>

        {/* Right: Save & Save and close */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] font-semibold text-sm rounded-[4px] hover:bg-green-50 transition cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          {/* Split button */}
          <div className="flex rounded-[4px] overflow-hidden bg-[#2ca01c]">
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="px-4 py-1.5 text-white font-semibold text-sm hover:bg-[#25900f] transition cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save and close'}
            </button>
            <div className="w-px bg-[#1e7a14]" />
            <button
              onClick={() => handleSave(true)}
              className="px-2 text-white hover:bg-[#25900f] transition cursor-pointer"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>

      </footer>

    </div>
  );
}
