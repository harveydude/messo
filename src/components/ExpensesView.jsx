import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Printer, Share2, Settings, Download, Search, ChevronDown, ChevronUp, ChevronRight, 
  X, Check, Sliders, Menu, Bookmark, FileText, Calendar, Copy, 
  ArrowDown, ArrowUp, AlertCircle, Plus, Eye, EyeOff, CheckCircle2,
  Mail, ExternalLink
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/* ========================================================================= */
/* REFERENCE DATA CONVERTED TO INR (~₹83.50 / USD)                           */
/* ========================================================================= */

const DEFAULT_EXPENSE_ROWS = [
  { id: 1, date: '10/24/2025', type: 'Credit Card Expense', no: '', payee: '', cat: 'Automobile', total: 2839.00, act: 'View/Edit' },
  { id: 2, date: '10/13/2025', type: 'Credit Card Credit', no: '', payee: '', cat: 'Checking', total: -75150.00, act: 'View/Edit' },
  { id: 3, date: '10/11/2025', type: 'Credit Card Expense', no: '', payee: 'Squeaky Kleen Car Wash', cat: 'Automobile', total: 1669.17, act: 'View/Edit' },
  { id: 4, date: '10/05/2025', type: 'Credit Card Expense', no: '', payee: 'Hicks Hardware', cat: 'Job Expenses:Job Materials:', total: 3540.40, act: 'View/Edit' },
  { id: 5, date: '10/04/2025', type: 'Credit Card Expense', no: '', payee: 'Squeaky Kleen Car Wash', cat: 'Automobile', total: 1669.17, act: 'View/Edit' },
  { id: 6, date: '10/04/2025', type: 'Credit Card Expense', no: '', payee: "Bob's Burger Joint", cat: 'Meals and Entertainment', total: 1583.99, act: 'View/Edit' },
  { id: 7, date: '10/02/2025', type: 'Cash Expense', no: '', payee: "Tania's Nursery", cat: 'Job Expenses:Job Materials:', total: -1962.25, act: 'View/Edit' },
  { id: 8, date: '09/29/2025', type: 'Expense', no: '76', payee: 'Pam Seitz', cat: 'Legal & Professional Fees', total: 6262.50, act: 'View/Edit' },
  { id: 9, date: '09/29/2025', type: 'Bill', no: '', payee: 'Norton Lumber and Building Materials', cat: '--Split--', total: 17117.50, act: 'Schedule payment' },
  { id: 10, date: '09/29/2025', type: 'Purchase Order', no: '1004', payee: 'Norton Lumber and Building Materials', cat: '--Split--', total: 17117.50, act: 'Print' },
  { id: 11, date: '09/29/2025', type: 'Expense', no: '1', payee: "Chin's Gas and Oil", cat: 'Automobile:Fuel', total: 4388.76, act: 'View/Edit' },
];

const CATEGORY_OPTIONS = [
  'Automobile',
  'Automobile:Fuel',
  'Checking',
  'Meals and Entertainment',
  'Job Expenses:Job Materials',
  'Legal & Professional Fees'
];

const DEFAULT_BILL_ROWS = [
  { id: 0, vendor: 'Brock Stone (Video Specialist)', due: '07/30/2026', amount: 120000.00, open: 120000.00, status: 'Due in 30 days', ago: '' },
  { id: 1, vendor: 'PG&E', due: '09/14/2025', amount: 7217.74, open: 7217.74, status: 'Overdue', ago: '43 days ago' },
  { id: 2, vendor: 'Norton Lumber and Building Mat...', due: '09/29/2025', amount: 17117.50, open: 17117.50, status: 'Overdue', ago: '28 days ago' },
  { id: 3, vendor: 'Robertson & Associates', due: '09/29/2025', amount: 26302.50, open: 26302.50, status: 'Overdue', ago: '28 days ago' },
  { id: 4, vendor: 'Brosnahan Insurance Agency', due: '10/02/2025', amount: 20142.71, open: 20142.71, status: 'Overdue', ago: '25 days ago' },
  { id: 5, vendor: "Diego's Road Warrior Bodyshop", due: '10/27/2025', amount: 63042.50, open: 63042.50, status: 'Due today', ago: '' }
];

const DEFAULT_VENDOR_ROWS = [
  { id: 0, vendor: 'Brock Stone', company: 'Brock Stone Creative', phone: '+91 98200 12345', email: 'brock@stone.in', mail: true, t1099: true, bal: 120000.00, act: 'Pay balance' },
  { id: 1, vendor: "Bob's Burger Joint", company: '', phone: '', email: '', mail: false, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 2, vendor: 'Books by Bessie', company: 'Books by Bessie', phone: '(650) 555-7745', email: 'Books@meso.in', mail: true, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 3, vendor: 'Brosnahan Insurance Agency', company: 'Brosnahan Insurance Agency', phone: '(650) 555-9912', email: '', mail: false, t1099: true, bal: 20142.71, act: 'Pay balance' },
  { id: 4, vendor: 'Cal Telephone', company: 'Cal Telephone', phone: '(650) 555-1616', email: '', mail: false, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 5, vendor: "Chin's Gas and Oil", company: "Chin's Gas and Oil", phone: '', email: '', mail: false, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 6, vendor: 'Cigna Health Care', company: 'Cigna Health Care', phone: '(520) 555-9874', email: '', mail: false, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 7, vendor: 'Computers by Jenni', company: 'Computers by Jenni', phone: '(650) 555-8721', email: 'Msfixit@meso.in', mail: true, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 8, vendor: "Diego's Road Warrior Bodyshop", company: "Diego's Road Warrior Bodyshop", phone: '', email: '', mail: false, t1099: false, bal: 63042.50, act: 'Pay balance' },
  { id: 9, vendor: 'EDD', company: 'EDD', phone: '', email: '', mail: false, t1099: false, bal: 0.00, act: 'Create Expense' },
  { id: 10, vendor: 'Ellis Equipment Rental', company: 'Ellis Equipment Rental', phone: '(650) 555-3333', email: 'Rental@meso.in', mail: true, t1099: false, bal: 0.00, act: 'Create Expense' }
];

export default function ExpensesView({ 
  onOpenExpenseModal, 
  onOpenBillModal,
  onNavigate,
  initialTab = 'overview' // 'overview' | 'bills' | 'vendors'
}) {
  // Navigation / active section state (Interactive Tab View only)
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ────────────────── Expenses Tab State (Screenshot 1) ──────────────────
  const [expenseRows, setExpenseRows] = useState(DEFAULT_EXPENSE_ROWS);
  const [expenseFilter, setExpenseFilter] = useState('All transactions');
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [newExpenseMenuOpen, setNewExpenseMenuOpen] = useState(false);
  const [printChecksMenuOpen, setPrintChecksMenuOpen] = useState(false);
  const [activeCategoryRow, setActiveCategoryRow] = useState(null);
  const [activeExpenseActionRow, setActiveExpenseActionRow] = useState(null);

  const handleUpdateCategory = (id, newCat) => {
    setExpenseRows(prev => prev.map(r => r.id === id ? { ...r, cat: newCat } : r));
    setActiveCategoryRow(null);
  };

  const handleToggleExpenseSelect = (id) => {
    setSelectedExpenses(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllExpenses = (e) => {
    if (e.target.checked) setSelectedExpenses(expenseRows.map(r => r.id));
    else setSelectedExpenses([]);
  };

  // ────────────────── Bills Tab State (Screenshot 3) ──────────────────
  const [billTab, setBillTab] = useState('Unpaid'); // 'For review' | 'Unpaid' | 'Paid'
  const [billVendorFilter, setBillVendorFilter] = useState('All');
  const [billDateChipVisible, setBillDateChipVisible] = useState(true);
  const [billsAsc, setBillsAsc] = useState(true);
  const [activeBillActionRow, setActiveBillActionRow] = useState(null);
  const [copyEmailToast, setCopyEmailToast] = useState(false);

  const filteredBills = useMemo(() => {
    let list = DEFAULT_BILL_ROWS;
    if (billVendorFilter !== 'All') {
      list = list.filter(r => r.vendor === billVendorFilter);
    }
    return [...list].sort((a, b) => billsAsc ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due));
  }, [billVendorFilter, billsAsc]);

  const totalBillAmount = filteredBills.reduce((acc, r) => acc + r.amount, 0);
  const totalBillOpen = filteredBills.reduce((acc, r) => acc + r.open, 0);

  const handleCopyEmail = () => {
    try {
      navigator.clipboard.writeText('lawns__paws_5932+expenses@assist.meso.in');
      setCopyEmailToast(true);
      setTimeout(() => setCopyEmailToast(false), 2500);
    } catch (e) {}
  };

  // ────────────────── Vendors Tab State (Screenshot 2) ──────────────────
  const [vendorSearch, setVendorSearch] = useState('');
  const [statBannerOpen, setStatBannerOpen] = useState(true);
  const [vendorsAsc, setVendorsAsc] = useState(true);
  const [activeVendorActionRow, setActiveVendorActionRow] = useState(null);

  const filteredVendors = useMemo(() => {
    let list = DEFAULT_VENDOR_ROWS.filter(r => 
      !vendorSearch || (r.vendor + ' ' + r.company).toLowerCase().includes(vendorSearch.toLowerCase())
    );
    return [...list].sort((a, b) => vendorsAsc ? a.vendor.localeCompare(b.vendor) : b.vendor.localeCompare(a.vendor));
  }, [vendorSearch, vendorsAsc]);

  return (
    <div className="flex w-full min-h-screen bg-[#F6F7F8] text-[#393A3D] select-none font-sans">
      


      {/* ========================================================================= */}
      {/* 2. MAIN SCROLLABLE CONTENT (Interactive Tab View)                          */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto">
        {/* Interactive Tab Navigation Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 sm:px-8 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'overview'
                  ? 'bg-[#E8F5E9] text-[#008927] border border-[#A5D6A7]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>Expenses Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'bills'
                  ? 'bg-[#E8F5E9] text-[#008927] border border-[#A5D6A7]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>Bills</span>
            </button>
            <button
              onClick={() => setActiveTab('vendors')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'vendors'
                  ? 'bg-[#E8F5E9] text-[#008927] border border-[#A5D6A7]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>Vendors</span>
            </button>
          </div>
        </header>

        {/* Email Copied Toast */}
        {copyEmailToast && (
          <div className="mx-6 mt-3 bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-lg flex items-center space-x-2 text-xs font-semibold shadow-xs animate-in slide-in-from-top">
            <CheckCircle2 size={16} className="text-[#2ca01c]" />
            <span>Email copied to clipboard: lawns__paws_5932+expenses@assist.meso.in</span>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
          
          {/* ========================================================================= */}
          {/* 3. FRAME 1: EXPENSES PAGE                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <section className="space-y-4">
              {/* Header Band */}
              <div className="bg-[#fafbfb] border border-[#e3e5e8] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    <img src="/app-icons/expenses.png" alt="Expenses & Pay Bills" className="w-full h-full object-contain block" />
                  </div>
                  <div>
                    <h1 className="text-[26px] font-bold text-[#393A3D] tracking-tight">Expenses &amp; Pay Bills</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Track vendor bills, categorize receipts, and automate payouts</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => alert("Give feedback on Expenses & Bills")}
                    className="flex items-center space-x-2 text-sm text-[#393A3D] hover:opacity-80 transition cursor-pointer font-medium"
                  >
                    <span className="text-[#2ca01c]">✎</span>
                    <span>Give feedback</span>
                  </button>

                  {/* Print Checks Split Button */}
                  <div className="relative">
                    <div className="inline-flex h-10 border-2 border-[#2ca01c] rounded-md overflow-hidden bg-white shadow-xs">
                      <button 
                        onClick={() => alert("Printing checks...")}
                        className="px-4 text-sm font-semibold text-[#2ca01c] hover:bg-green-50 transition cursor-pointer"
                      >
                        Print Checks
                      </button>
                      <div className="w-px bg-gray-300" />
                      <button 
                        onClick={() => setPrintChecksMenuOpen(!printChecksMenuOpen)}
                        className="px-2.5 text-[#2ca01c] hover:bg-green-50 transition cursor-pointer"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {printChecksMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                        <button onClick={() => { setPrintChecksMenuOpen(false); alert("Print checks setup"); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100">Check setup</button>
                        <button onClick={() => { setPrintChecksMenuOpen(false); alert("Order checks"); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100">Order checks</button>
                      </div>
                    )}
                  </div>

                  {/* New Transaction Green Split Button */}
                  <div className="relative">
                    <div className="inline-flex h-10 rounded-md overflow-hidden bg-[#2ca01c] shadow-xs">
                      <button 
                        onClick={onOpenExpenseModal}
                        className="px-4 text-sm font-bold text-white hover:bg-[#258717] transition cursor-pointer"
                      >
                        New Transaction
                      </button>
                      <div className="w-px bg-[#1e7a14]" />
                      <button 
                        onClick={() => setNewExpenseMenuOpen(!newExpenseMenuOpen)}
                        className="px-2.5 text-white hover:bg-[#258717] transition cursor-pointer"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {newExpenseMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                        <button onClick={() => { setNewExpenseMenuOpen(false); onOpenExpenseModal(); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-semibold">Expense</button>
                        <button onClick={() => { setNewExpenseMenuOpen(false); alert("New check entry"); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100">Check</button>
                        <button onClick={() => { setNewExpenseMenuOpen(false); onOpenBillModal ? onOpenBillModal() : onOpenExpenseModal(); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-100">Bill</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Toolbar: Filter by type, Dates pill, right icons */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center space-x-4 flex-wrap gap-y-2">
                  <select 
                    value={expenseFilter}
                    onChange={(e) => setExpenseFilter(e.target.value)}
                    className="h-10 px-3 border border-gray-400 rounded-md text-sm font-semibold text-gray-800 bg-white hover:border-black focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                  >
                    <option>All transactions</option>
                    <option>Expenses</option>
                    <option>Bills</option>
                    <option>Purchase orders</option>
                    <option>Checks</option>
                  </select>

                  <button 
                    onClick={() => alert("Filter criteria: dates, amounts, payees")}
                    className="flex items-center space-x-1.5 text-sm font-semibold text-gray-800 hover:text-black cursor-pointer"
                  >
                    <Sliders size={16} />
                    <span>Filter</span>
                  </button>

                  <span className="h-8 px-4 rounded-full bg-[#E9ECEF] flex items-center text-xs font-medium text-gray-800 select-none">
                    Dates: Last 12 months
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-gray-500">
                  <button onClick={() => alert("Exported expenses to CSV")} className="p-1.5 hover:text-black cursor-pointer" title="Export"><Download size={17} /></button>
                  <button onClick={() => window.print()} className="p-1.5 hover:text-black cursor-pointer" title="Print"><Printer size={17} /></button>
                  <button onClick={() => alert("Table settings")} className="p-1.5 hover:text-black cursor-pointer" title="Settings"><Settings size={17} /></button>
                </div>
              </div>

              {/* Expenses Table matching Screenshot 1 */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-800">
                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3 w-8">
                          <input 
                            type="checkbox" 
                            checked={selectedExpenses.length === expenseRows.length}
                            onChange={handleSelectAllExpenses}
                            className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" 
                          />
                        </th>
                        <th className="p-3">DATE</th>
                        <th className="p-3">TYPE</th>
                        <th className="p-3">NO.</th>
                        <th className="p-3">PAYEE</th>
                        <th className="p-3 w-[290px]">CATEGORY</th>
                        <th className="p-3 text-right">TOTAL</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenseRows.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3">
                            <input 
                              type="checkbox" 
                              checked={selectedExpenses.includes(r.id)}
                              onChange={() => handleToggleExpenseSelect(r.id)}
                              className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" 
                            />
                          </td>
                          <td className="p-3 text-gray-600">{r.date}</td>
                          <td className="p-3 text-gray-600 font-medium">{r.type}</td>
                          <td className="p-3 text-gray-500">{r.no || ''}</td>
                          <td className="p-3 font-semibold text-gray-900">{r.payee || ''}</td>
                          
                          {/* Category Cell: editable dropdown matching Screenshot 1 */}
                          <td className="p-3">
                            {r.cat === '--Split--' ? (
                              <span className="text-gray-500 font-medium">--Split--</span>
                            ) : (
                              <div className="relative w-[280px]">
                                <button
                                  onClick={() => setActiveCategoryRow(activeCategoryRow === r.id ? null : r.id)}
                                  className="w-full h-9 px-3 border border-gray-300 rounded-md bg-white flex items-center justify-between text-xs text-gray-800 hover:border-black transition cursor-pointer"
                                >
                                  <span className="truncate">{r.cat}</span>
                                  <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
                                </button>

                                {activeCategoryRow === r.id && (
                                  <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                                    {CATEGORY_OPTIONS.map((cat) => (
                                      <button
                                        key={cat}
                                        onClick={() => handleUpdateCategory(r.id, cat)}
                                        className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 ${
                                          r.cat === cat ? 'font-bold text-[#2ca01c] bg-green-50/50' : ''
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Total Column in Rupee */}
                          <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">
                            {formatMoney(r.total)}
                          </td>

                          {/* Action Column */}
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button 
                                onClick={() => alert(`${r.act} for ${r.type} (#${r.no || r.id})`)}
                                className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                              >
                                {r.act}
                              </button>
                              <ChevronDown size={13} className="text-gray-400" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 4. FRAME 2: BILLS PAGE                                                     */}
          {/* ========================================================================= */}
          {activeTab === 'bills' && (
            <section className="space-y-4">
              {/* Header Band */}
              <div className="bg-[#fafbfb] border border-[#e3e5e8] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <h1 className="text-[26px] font-bold text-[#393A3D] tracking-tight">Bills</h1>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => alert("Give feedback on Bills")}
                    className="flex items-center space-x-2 text-sm text-[#393A3D] hover:opacity-80 transition cursor-pointer font-medium"
                  >
                    <span className="text-[#2ca01c]">✎</span>
                    <span>Give feedback</span>
                  </button>

                  <button 
                    onClick={() => alert("Manage bill settings")}
                    className="text-sm font-semibold text-gray-800 hover:underline cursor-pointer"
                  >
                    Manage settings
                  </button>

                  {/* Pay bills outline split button */}
                  <div className="inline-flex h-10 border-2 border-[#2ca01c] rounded-md overflow-hidden bg-white shadow-xs">
                    <button 
                      onClick={() => alert("Pay bills workflow")}
                      className="px-4 text-sm font-semibold text-[#2ca01c] hover:bg-green-50 transition cursor-pointer"
                    >
                      Pay bills
                    </button>
                    <div className="w-px bg-gray-300" />
                    <button className="px-2.5 text-[#2ca01c] hover:bg-green-50 transition cursor-pointer">
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Add bill green split button */}
                  <div className="inline-flex h-10 rounded-md overflow-hidden bg-[#2ca01c] shadow-xs">
                    <button 
                      onClick={() => { onOpenBillModal ? onOpenBillModal() : onOpenExpenseModal(); }}
                      className="px-4 text-sm font-bold text-white hover:bg-[#258717] transition cursor-pointer"
                    >
                      Add bill
                    </button>
                    <div className="w-px bg-[#1e7a14]" />
                    <button className="px-2.5 text-white hover:bg-[#258717] transition cursor-pointer">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Autofill Banner with Meso Indian domain email */}
              <div className="bg-white border border-gray-300 rounded-xl p-4 flex items-center justify-between gap-4 shadow-xs flex-wrap">
                <div className="flex items-center space-x-3">
                  <Mail size={20} className="text-[#0077c5] shrink-0" />
                  <p className="text-sm text-gray-800">
                    <strong className="font-bold text-black">Anyone can autofill multiple receipts</strong> or create bills and expenses by sending files to:{' '}
                    <span className="font-bold text-gray-900 underline">lawns__paws_5932+expenses@assist.meso.in</span>
                  </p>
                </div>

                <button 
                  onClick={handleCopyEmail}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-black transition cursor-pointer shrink-0"
                  title="Copy email address"
                >
                  <Copy size={17} />
                </button>
              </div>

              {/* Tabs: For review | Unpaid | Paid */}
              <div className="flex items-center justify-between pt-2">
                <div className="inline-flex border border-gray-400 rounded-md overflow-hidden text-sm">
                  {['For review', 'Unpaid', 'Paid'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setBillTab(tab)}
                      className={`px-5 py-2 transition font-medium cursor-pointer ${
                        billTab === tab ? 'bg-[#E9ECEF] font-bold text-black' : 'bg-white hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <a 
                  href="#how-to-manage-bills" 
                  onClick={(e) => { e.preventDefault(); alert("Guide: How to manage bills in Meso"); }}
                  className="text-xs text-[#0077c5] hover:underline font-semibold flex items-center space-x-1"
                >
                  <span>How to manage bills</span>
                  <ChevronRight size={13} />
                </a>
              </div>

              {/* Filters row: Vendor All, Bill Date This Year, Customize button */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center space-x-6 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-500 font-medium">Vendor</span>
                    <select 
                      value={billVendorFilter}
                      onChange={(e) => setBillVendorFilter(e.target.value)}
                      className="h-9 px-3 border border-gray-300 rounded-md font-semibold text-gray-800 bg-white hover:border-black focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                    >
                      <option>All</option>
                      {DEFAULT_BILL_ROWS.map(b => (
                        <option key={b.id}>{b.vendor}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-gray-500 font-medium">Bill Date</span>
                    <div className="h-9 px-3 border border-gray-300 rounded-md bg-white flex items-center space-x-2 text-gray-800 font-semibold">
                      <span>This Year</span>
                      <Calendar size={14} className="text-gray-500" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => alert("Customize Bills Columns")}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-gray-700 hover:text-black cursor-pointer"
                  >
                    <Sliders size={15} />
                    <span>Customize</span>
                  </button>

                  <div className="flex items-center space-x-2 text-gray-500">
                    <button onClick={() => window.print()} className="p-1 hover:text-black"><Printer size={16} /></button>
                    <button onClick={() => alert("Exported bills to CSV")} className="p-1 hover:text-black"><Download size={16} /></button>
                  </div>
                </div>
              </div>

              {/* Removable Chip */}
              {billDateChipVisible && (
                <div className="flex items-center">
                  <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-[#E9ECEF] text-xs font-medium text-gray-800">
                    <span>Bill Date: 01/01/2025-12/31/2025</span>
                    <button onClick={() => setBillDateChipVisible(false)} className="hover:text-black cursor-pointer">
                      <X size={13} />
                    </button>
                  </span>
                </div>
              )}

              {/* Bills Table matching Screenshot 3 */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-800">
                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                        <th className="p-3">VENDOR</th>
                        <th className="p-3 cursor-pointer hover:text-black" onClick={() => setBillsAsc(!billsAsc)}>
                          <span className="inline-flex items-center space-x-1">
                            <span>DUE DATE</span>
                            <span>{billsAsc ? '▲' : '▼'}</span>
                          </span>
                        </th>
                        <th className="p-3 text-right">BILL AMOUNT</th>
                        <th className="p-3 text-right">OPEN BALANCE</th>
                        <th className="p-3">STATUS</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {billTab !== 'Unpaid' ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-xs text-gray-400 italic">
                            {billTab === 'For review' ? 'No bills to review.' : 'No paid bills found in this period.'}
                          </td>
                        </tr>
                      ) : (
                        filteredBills.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50/80 transition">
                            <td className="p-3"><input type="checkbox" className="rounded text-[#2ca01c]" /></td>
                            <td className="p-3 font-semibold text-[#0077c5] hover:underline cursor-pointer">
                              {r.vendor}
                            </td>
                            <td className="p-3 text-gray-600">{r.due}</td>
                            <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">{formatMoney(r.amount)}</td>
                            <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">{formatMoney(r.open)}</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  !
                                </span>
                                <div>
                                  <span className="font-bold text-gray-900">{r.status}</span>
                                  {r.ago && <span className="text-[11px] text-gray-500 ml-1.5">{r.ago}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex items-center space-x-1.5">
                                <button 
                                  onClick={() => alert(`Scheduling payment for ${r.vendor}`)}
                                  className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                                >
                                  Schedule payment
                                </button>
                                <ChevronDown size={13} className="text-gray-400" />
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    
                    {/* Gray Total Row matching Screenshot 3 */}
                    {billTab === 'Unpaid' && (
                      <tfoot>
                        <tr className="bg-[#E9ECEF] font-bold text-xs text-gray-900 border-t border-gray-300">
                          <td colSpan={3} className="p-3 text-right">Total</td>
                          <td className="p-3 text-right tabular-nums">{formatMoney(totalBillAmount)}</td>
                          <td className="p-3 text-right tabular-nums">{formatMoney(totalBillOpen)}</td>
                          <td colSpan={2} className="p-3"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <span>1 - 5 of 5 items</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">‹</span>
                    <span>Page</span>
                    <span className="w-8 h-6 border border-gray-300 rounded flex items-center justify-center font-bold text-black">1</span>
                    <span>of 1</span>
                    <span className="text-gray-400">›</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ========================================================================= */}
          {/* 5. FRAME 3: VENDORS PAGE                                                   */}
          {/* ========================================================================= */}
          {activeTab === 'vendors' && (
            <section className="space-y-4">
              {/* Header Band */}
              <div className="bg-[#fafbfb] border border-[#e3e5e8] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <h1 className="text-[26px] font-bold text-[#393A3D] tracking-tight">Vendors</h1>

                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => alert("Give feedback on Vendors")}
                    className="flex items-center space-x-2 text-sm text-[#393A3D] hover:opacity-80 transition cursor-pointer font-medium"
                  >
                    <span className="text-[#2ca01c]">✎</span>
                    <span>Give feedback</span>
                  </button>

                  {/* Pay vendors outline split button */}
                  <div className="inline-flex h-10 border-2 border-[#2ca01c] rounded-md overflow-hidden bg-white shadow-xs">
                    <button 
                      onClick={() => alert("Pay vendors workflow")}
                      className="px-4 text-sm font-semibold text-[#2ca01c] hover:bg-green-50 transition cursor-pointer"
                    >
                      Pay vendors
                    </button>
                    <div className="w-px bg-gray-300" />
                    <button className="px-2.5 text-[#2ca01c] hover:bg-green-50 transition cursor-pointer">
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* New Vendor green split button */}
                  <div className="inline-flex h-10 rounded-md overflow-hidden bg-[#2ca01c] shadow-xs">
                    <button 
                      onClick={() => alert("Add new vendor")}
                      className="px-4 text-sm font-bold text-white hover:bg-[#258717] transition cursor-pointer"
                    >
                      New Vendor
                    </button>
                    <div className="w-px bg-[#1e7a14]" />
                    <button className="px-2.5 text-white hover:bg-[#258717] transition cursor-pointer">
                      <ChevronDown size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Block Stat Banner matching Screenshot 2 */}
              <div className="relative">
                {statBannerOpen && (
                  <div className="space-y-1 transition-all duration-300">
                    {/* Header labels above blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs font-semibold text-[#1a6fc4] px-1">
                      <div className="text-center">Unbilled Last 365 Days</div>
                      <div className="text-center">Unpaid Last 365 Days</div>
                      <div className="text-center"></div>
                      <div className="text-center">Paid</div>
                    </div>

                    {/* 4 Colored Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden shadow-xs">
                      {/* Block 1: Blue ($125.00 * 83.50 = ₹10,437.50) */}
                      <div className="bg-[#1a73c4] text-white p-5 flex flex-col justify-center">
                        <div className="text-2xl font-bold">₹10,437.50</div>
                        <div className="text-[11px] font-semibold tracking-wider uppercase mt-1 text-blue-100">
                          1 PURCHASE ORDER
                        </div>
                      </div>

                      {/* Block 2: Orange ($847.67 * 83.50 = ₹70,780.45) */}
                      <div className="bg-[#f47b16] text-white p-5 flex flex-col justify-center">
                        <div className="text-2xl font-bold">₹70,780.45</div>
                        <div className="text-[11px] font-semibold tracking-wider uppercase mt-1 text-orange-100">
                          4 OVERDUE
                        </div>
                      </div>

                      {/* Block 3: Gray ($1,602.67 * 83.50 = ₹1,33,822.95) */}
                      <div className="bg-[#9aa0a6] text-white p-5 flex flex-col justify-center">
                        <div className="text-2xl font-bold">₹1,33,822.95</div>
                        <div className="text-[11px] font-semibold tracking-wider uppercase mt-1 text-gray-100">
                          5 OPEN BILLS
                        </div>
                      </div>

                      {/* Block 4: Green ($3,887.64 * 83.50 = ₹3,24,617.94) */}
                      <div className="bg-[#5cb928] text-white p-5 flex flex-col justify-center">
                        <div className="text-2xl font-bold">₹3,24,617.94</div>
                        <div className="text-[11px] font-semibold tracking-wider uppercase mt-1 text-green-100">
                          20 PAID LAST 30 DAYS
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Collapsing Chevron Button */}
                <div className="flex justify-end mt-1">
                  <button 
                    onClick={() => setStatBannerOpen(!statBannerOpen)}
                    className="p-1.5 border border-gray-300 rounded bg-white text-gray-600 hover:text-black transition cursor-pointer"
                    title={statBannerOpen ? "Collapse summary banner" : "Expand summary banner"}
                  >
                    {statBannerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Vendors Search & Action Icons */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
                <div className="w-80 h-10 border border-gray-300 rounded-md flex items-center px-3 gap-2 focus-within:border-black transition">
                  <input 
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    placeholder="Search"
                    className="flex-1 min-w-0 text-sm text-gray-900 placeholder:italic placeholder:text-gray-400 outline-none bg-transparent"
                  />
                  <Search size={16} className="text-gray-500 shrink-0" />
                </div>

                <div className="flex items-center space-x-3 text-gray-500">
                  <button onClick={() => window.print()} className="p-1 hover:text-black"><Printer size={16} /></button>
                  <button onClick={() => alert("Exported vendors to CSV")} className="p-1 hover:text-black"><Download size={16} /></button>
                  <button onClick={() => alert("Table settings")} className="p-1 hover:text-black"><Settings size={16} /></button>
                </div>
              </div>

              {/* Vendors Table matching Screenshot 2 */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-800">
                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                        <th className="p-3 cursor-pointer hover:text-black" onClick={() => setVendorsAsc(!vendorsAsc)}>
                          <span className="inline-flex items-center space-x-1">
                            <span>VENDOR</span>
                            <span>{vendorsAsc ? '▲' : '▼'}</span>
                          </span>
                        </th>
                        <th className="p-3">COMPANY NAME ⇅</th>
                        <th className="p-3">PHONE</th>
                        <th className="p-3">EMAIL</th>
                        <th className="p-3 text-center">1099 TRACKING</th>
                        <th className="p-3 text-right">OPEN BALANCE ⇅</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredVendors.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3"><input type="checkbox" className="rounded text-[#2ca01c]" /></td>
                          <td className="p-3 font-semibold text-gray-900">{r.vendor}</td>
                          <td className="p-3 text-gray-600">{r.company || ''}</td>
                          <td className="p-3 text-gray-600">{r.phone || ''}</td>
                          <td className="p-3 text-gray-700">
                            {r.email && (
                              <div className="flex items-center space-x-1.5">
                                <span>{r.email}</span>
                                {r.mail && <Mail size={13} className="text-gray-500" />}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {r.t1099 && (
                              <Check size={16} className="text-[#393A3D] mx-auto stroke-[2.5]" />
                            )}
                          </td>
                          <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">
                            {formatMoney(r.bal)}
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center space-x-1.5">
                              <button 
                                onClick={() => alert(`${r.act} for ${r.vendor}`)}
                                className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                              >
                                {r.act}
                              </button>
                              <ChevronDown size={13} className="text-gray-400" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}