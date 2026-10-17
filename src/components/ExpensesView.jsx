import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Printer, Share2, Settings, Download, Search, ChevronDown, ChevronUp, ChevronRight, 
  X, Check, Sparkles, Sliders, Menu, Bookmark, FileText, Calendar, Copy, 
  Layers, ArrowDown, ArrowUp, AlertCircle, Plus, Eye, EyeOff, CheckCircle2,
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
  { id: 1, vendor: 'PG&E', due: '09/14/2025', amount: 7217.74, open: 7217.74, status: 'Overdue', ago: '43 days ago' },
  { id: 2, vendor: 'Norton Lumber and Building Mat...', due: '09/29/2025', amount: 17117.50, open: 17117.50, status: 'Overdue', ago: '28 days ago' },
  { id: 3, vendor: 'Robertson & Associates', due: '09/29/2025', amount: 26302.50, open: 26302.50, status: 'Overdue', ago: '28 days ago' },
  { id: 4, vendor: 'Brosnahan Insurance Agency', due: '10/02/2025', amount: 20142.71, open: 20142.71, status: 'Overdue', ago: '25 days ago' },
  { id: 5, vendor: "Diego's Road Warrior Bodyshop", due: '10/27/2025', amount: 63042.50, open: 63042.50, status: 'Due today', ago: '' }
];

const DEFAULT_VENDOR_ROWS = [
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
  // Navigation / active section state
  const [activeTab, setActiveTab] = useState(initialTab);
  const [viewMode, setViewMode] = useState('continuous'); // 'continuous' | 'interactive'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [flyoutLevel1, setFlyoutLevel1] = useState(null);
  const [flyoutLevel2, setFlyoutLevel2] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTab !== 'overview') {
      setViewMode('interactive');
    }
  }, [initialTab]);

  // Frame scrolling refs
  const expensesFrameRef = useRef(null);
  const billsFrameRef = useRef(null);
  const vendorsFrameRef = useRef(null);

  const scrollToFrame = (ref) => {
    if (viewMode !== 'continuous') {
      setViewMode('continuous');
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
      {/* 1. SECONDARY SIDEBAR & COLLAPSIBLE FLYOUT NAV (Screenshots 1, 3, and 4)   */}
      {/* ========================================================================= */}
      {sidebarCollapsed ? (
        /* Collapsed Sidebar Rail (Width 80px, icons only) matching Screenshot 4 */
        <aside className="w-[80px] bg-[#F4F5F8] border-r border-[#E3E5E8] flex flex-col items-center pt-3 shrink-0 relative z-40">
          <button 
            onClick={() => setSidebarCollapsed(false)}
            title="Expand navigation"
            className="w-9 h-9 rounded flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-200 transition cursor-pointer"
          >
            <Menu size={18} />
          </button>

          <div className="mt-3 flex flex-col gap-2 w-full items-center">
            {/* Accounting circle */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('accounting'); setFlyoutLevel2(false); }}
              onClick={() => onNavigate?.('bank_transactions')}
              className="w-12 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#00352c] text-[#8ff0bd] font-bold text-xs flex items-center justify-center">A</span>
            </button>

            {/* Sales & Get Paid circle */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('sales'); setFlyoutLevel2(false); }}
              onClick={() => onNavigate?.('sales_transactions')}
              className="w-12 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#005e5d] text-white font-bold text-xs flex items-center justify-center">S</span>
            </button>

            {/* Expenses & Bills circle (Active) */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('expenses'); setFlyoutLevel2(true); }}
              className="w-12 h-10 rounded-lg bg-gray-200 flex items-center justify-center transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#0aa574] text-white font-bold text-xs flex items-center justify-center">E</span>
            </button>

            {/* Customer Hub */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('customer_hub'); setFlyoutLevel2(false); }}
              onClick={() => onNavigate?.('customer_hub')}
              className="w-12 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#2e9e5b] text-white font-bold text-xs flex items-center justify-center">C</span>
            </button>

            {/* Team */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('team'); setFlyoutLevel2(false); }}
              onClick={() => onNavigate?.('team')}
              className="w-12 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#12a489] text-white font-bold text-xs flex items-center justify-center">T</span>
            </button>

            {/* Time */}
            <button 
              onMouseEnter={() => { setFlyoutLevel1('time'); setFlyoutLevel2(false); }}
              onClick={() => onNavigate?.('time_entries')}
              className="w-12 h-10 rounded-lg flex items-center justify-center hover:bg-gray-200 transition cursor-pointer"
            >
              <span className="w-7 h-7 rounded-full bg-[#00352c] text-white font-bold text-xs flex items-center justify-center">T</span>
            </button>
          </div>

          {/* PINNED Section */}
          <div className="mt-4 self-start pl-3 text-[10px] font-bold tracking-wider text-gray-400">PINNED</div>
          <div className="mt-1 flex flex-col gap-1 w-full items-center">
            <button className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-200">
              <span className="w-6 h-6 rounded-full bg-[#00352c] text-[#8ff0bd] font-bold text-[10px] flex items-center justify-center">A</span>
              <span className="text-[10px] text-gray-700">Accounting</span>
            </button>
            <button className="w-12 h-12 rounded-lg bg-[#E0E3E8] flex flex-col items-center justify-center gap-1">
              <span className="w-6 h-6 rounded-full bg-[#0aa574] text-white font-bold text-[10px] flex items-center justify-center">E</span>
              <span className="text-[10px] text-gray-700 font-semibold">Expenses</span>
            </button>
            <button className="w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-gray-200">
              <span className="w-6 h-6 rounded-full bg-[#005e5d] text-white font-bold text-[10px] flex items-center justify-center">S</span>
              <span className="text-[10px] text-gray-700">Sales</span>
            </button>
          </div>

          {/* Flyout Layer 1 & Layer 2 (Matches Screenshot 4) */}
          {flyoutLevel1 && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => { setFlyoutLevel1(null); setFlyoutLevel2(false); }} 
              />
              <div 
                className="fixed left-[80px] top-[56px] z-40 flex items-start animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => { setFlyoutLevel1(null); setFlyoutLevel2(false); }}
              >
                {/* Level 1: Group list */}
                <div className="w-[240px] bg-white border border-gray-200 rounded-lg shadow-xl py-2 px-1 text-xs">
                  <div className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    MY APPS
                  </div>
                  {[
                    { id: 'accounting', name: 'Accounting', iconBg: '#00352c', letter: 'A' },
                    { id: 'sales', name: 'Sales & Get Paid', iconBg: '#005e5d', letter: 'S' },
                    { id: 'expenses', name: 'Expenses & Bills', iconBg: '#0aa574', letter: 'E', active: true },
                    { id: 'customer_hub', name: 'Customer Hub', iconBg: '#2e9e5b', letter: 'C' },
                    { id: 'team', name: 'Team', iconBg: '#12a489', letter: 'T' },
                    { id: 'time', name: 'Time', iconBg: '#00352c', letter: 'T' },
                    { id: 'sales_tax', name: 'Sales Tax', iconBg: '#e5346b', letter: 'S' },
                    { id: 'business_tax', name: 'Business Tax', iconBg: '#83243f', letter: 'B' },
                    { id: 'lending', name: 'Lending', iconBg: '#0aa574', letter: 'L' }
                  ].map(g => (
                    <button
                      key={g.id}
                      onMouseEnter={() => { setFlyoutLevel1(g.id); setFlyoutLevel2(g.id === 'expenses'); }}
                      className={`w-full h-10 flex items-center px-3 rounded-md justify-between cursor-pointer transition ${
                        g.id === flyoutLevel1 ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span 
                          style={{ backgroundColor: g.iconBg }} 
                          className="w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0"
                        >
                          {g.letter}
                        </span>
                        <span className="text-gray-900">{g.name}</span>
                      </div>
                      <ChevronRight size={13} className="text-gray-400" />
                    </button>
                  ))}
                </div>

                {/* Level 2: Expenses & Bills Submenu */}
                {flyoutLevel2 && (
                  <div className="w-[240px] bg-white border border-gray-200 rounded-lg shadow-xl py-2 px-1 text-xs -ml-1">
                    {[
                      { name: 'Expense transactions', tab: 'overview' },
                      { name: 'Vendors', tab: 'vendors', active: activeTab === 'vendors' },
                      { name: 'Bills', tab: 'bills', active: activeTab === 'bills' },
                      { name: 'Bill payments', alert: 'Bill payments view' },
                      { name: 'Mileage', bookmark: true, alert: 'Mileage tracker' },
                      { name: 'Contractors', alert: 'Contractors management' },
                      { name: '1099s', alert: '1099s Tax tracking' }
                    ].map(sub => (
                      <button
                        key={sub.name}
                        onClick={() => {
                          if (sub.tab) {
                            setActiveTab(sub.tab);
                            if (sub.tab === 'overview') scrollToFrame(expensesFrameRef);
                            else if (sub.tab === 'bills') scrollToFrame(billsFrameRef);
                            else if (sub.tab === 'vendors') scrollToFrame(vendorsFrameRef);
                          } else if (sub.alert) {
                            alert(sub.alert);
                          }
                          setFlyoutLevel1(null);
                          setFlyoutLevel2(false);
                        }}
                        className={`w-full h-9 flex items-center justify-between px-3 rounded-md text-left cursor-pointer transition ${
                          sub.active ? 'bg-[#E0E3E8] font-bold text-gray-900' : 'hover:bg-gray-100 text-gray-800'
                        }`}
                      >
                        <span>{sub.name}</span>
                        {sub.bookmark && <Bookmark size={13} className="text-gray-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      ) : (
        /* Expanded Sidebar matching Screenshot 1 */
        <aside className="w-[230px] bg-white border-r border-[#E3E5E8] p-4 shrink-0 flex flex-col justify-between overflow-y-auto z-20">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                MY APPS
              </span>
              <button 
                onClick={() => setSidebarCollapsed(true)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer" 
                title="Collapse to icon rail"
              >
                <Menu size={14} />
              </button>
            </div>

            {/* Accounting */}
            <div className="mb-2">
              <button
                onClick={() => onNavigate?.('bank_transactions')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold text-gray-800 hover:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#107c41] flex items-center justify-center text-white text-[10px] font-bold">A</span>
                  <span>Accounting</span>
                </div>
                <ChevronDown size={13} className="text-gray-400" />
              </button>
            </div>

            {/* Sales & Get Paid */}
            <div className="mb-2">
              <button
                onClick={() => onNavigate?.('sales_transactions')}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold text-gray-800 hover:bg-gray-100 transition cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#0077c5] flex items-center justify-center text-white text-[10px] font-bold">S</span>
                  <span>Sales &amp; Get Paid</span>
                </div>
                <ChevronUp size={13} className="text-gray-400" />
              </button>

              <div className="pl-7 mt-1 space-y-0.5 text-xs text-gray-700">
                <button 
                  onClick={() => { setActiveTab('overview'); scrollToFrame(expensesFrameRef); }}
                  className="w-full text-left py-1.5 px-2 rounded bg-[#ECEEF1] font-bold text-gray-900 cursor-pointer"
                >
                  Overview
                </button>
                <button 
                  onClick={() => onNavigate?.('sales_transactions')}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                >
                  Sales transactions
                </button>
                <button 
                  onClick={() => onNavigate?.('invoices')}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 text-gray-700 cursor-pointer"
                >
                  Invoices
                </button>
              </div>
            </div>

            {/* Expenses & Bills Submenu */}
            <div className="mt-3 pt-2 border-t border-gray-100">
              <div className="px-2 py-1.5 text-xs font-bold text-gray-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-[#0aa574] flex items-center justify-center text-white text-[10px] font-bold">E</span>
                  <span>Expenses &amp; Bills</span>
                </div>
                <ChevronUp size={13} className="text-gray-400" />
              </div>

              <div className="pl-7 mt-1 space-y-0.5 text-xs text-gray-700">
                <button 
                  onClick={() => { setActiveTab('overview'); scrollToFrame(expensesFrameRef); }}
                  className={`w-full text-left py-1.5 px-2 rounded cursor-pointer transition ${
                    activeTab === 'overview' ? 'bg-[#ECEEF1] font-bold text-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  Expense transactions
                </button>
                <button 
                  onClick={() => { setActiveTab('vendors'); scrollToFrame(vendorsFrameRef); }}
                  className={`w-full text-left py-1.5 px-2 rounded cursor-pointer transition ${
                    activeTab === 'vendors' ? 'bg-[#ECEEF1] font-bold text-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  Vendors
                </button>
                <button 
                  onClick={() => { setActiveTab('bills'); scrollToFrame(billsFrameRef); }}
                  className={`w-full text-left py-1.5 px-2 rounded cursor-pointer transition ${
                    activeTab === 'bills' ? 'bg-[#ECEEF1] font-bold text-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  Bills
                </button>
                <button 
                  onClick={() => alert("Bill payments view")}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  Bill payments
                </button>
                <button 
                  onClick={() => onNavigate?.('mileage')}
                  className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  <span>Mileage</span>
                  <Bookmark size={12} className="text-gray-400" />
                </button>
                <button 
                  onClick={() => alert("Contractors list")}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  Contractors
                </button>
                <button 
                  onClick={() => alert("1099s tracking")}
                  className="w-full text-left py-1.5 px-2 rounded hover:bg-gray-100 text-gray-600 cursor-pointer"
                >
                  1099s
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400">
            Meso Expenses Hub
          </div>
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN SCROLLABLE CONTENT (Connected Long Page: Expenses + Bills + Vendors) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto">
        {/* Sticky Experience Mode Switcher */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              View Experience:
            </span>

            <div className="inline-flex rounded-full border border-gray-300 p-0.5 bg-gray-50 text-xs">
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'continuous' ? 'bg-[#393A3D] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers size={13} />
                <span>Connected Long Page (All 3 Frames Scrollable)</span>
              </button>
              <button
                onClick={() => setViewMode('interactive')}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'interactive' ? 'bg-[#393A3D] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Interactive Tab View</span>
              </button>
            </div>
          </div>

          {/* Quick Frame Jump Links */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-400">Jump to:</span>
            <button 
              onClick={() => scrollToFrame(expensesFrameRef)}
              className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
            >
              1. Expenses Overview
            </button>
            <button 
              onClick={() => scrollToFrame(billsFrameRef)}
              className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
            >
              2. Bills
            </button>
            <button 
              onClick={() => scrollToFrame(vendorsFrameRef)}
              className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
            >
              3. Vendors
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
          {/* 3. FRAME 1: EXPENSES PAGE (Screenshot 1)                                  */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activeTab === 'overview') && (
            <section ref={expensesFrameRef} className="space-y-4">
              {/* Header Band */}
              <div className="bg-[#fafbfb] border border-[#e3e5e8] rounded-xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                <h1 className="text-[26px] font-bold text-[#393A3D] tracking-tight">Expenses</h1>

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

          {/* Continuous Transition to Frame 2 */}
          {viewMode === 'continuous' && (
            <div className="py-4 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="h-px bg-gray-200 flex-1" />
              <button 
                onClick={() => scrollToFrame(billsFrameRef)}
                className="px-4 py-1.5 rounded-full bg-white border border-gray-300 hover:border-gray-500 text-gray-700 font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Frame 2: Bills Tab</span>
                <ArrowDown size={13} />
              </button>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. FRAME 2: BILLS PAGE (Screenshot 3)                                     */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activeTab === 'bills') && (
            <section ref={billsFrameRef} className="space-y-4">
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
                  <Sparkles size={20} className="text-[#0077c5] shrink-0" />
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

          {/* Continuous Transition to Frame 3 */}
          {viewMode === 'continuous' && (
            <div className="py-4 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="h-px bg-gray-200 flex-1" />
              <button 
                onClick={() => scrollToFrame(vendorsFrameRef)}
                className="px-4 py-1.5 rounded-full bg-white border border-gray-300 hover:border-gray-500 text-gray-700 font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Frame 3: Vendors Tab</span>
                <ArrowDown size={13} />
              </button>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. FRAME 3: VENDORS PAGE (Screenshot 2)                                   */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activeTab === 'vendors') && (
            <section ref={vendorsFrameRef} className="space-y-4">
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