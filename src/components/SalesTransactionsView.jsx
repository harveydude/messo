import React, { useState, useMemo, useRef } from 'react';
import { 
  ChevronDown, ChevronRight, ChevronUp, Printer, Share2, Settings, Sparkles, X, 
  Search, Sliders, Eye, EyeOff, Bookmark, MoreVertical, Plus, ArrowRight,
  ExternalLink, Layers, CheckCircle2, AlertCircle, FileText, Download,
  Maximize2, ArrowDown, Check, Menu, Clock
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';
import ReviewInvoiceReminderModal from './ReviewInvoiceReminderModal';

/**
 * Reference Invoices data matching Screenshot 2 (media_1791862575401_5904ed52.jpg)
 * All converted from USD to INR at ₹83.50 / USD
 */
const DEFAULT_SALES_INVOICES = [
  {
    id: 'inv-1001',
    date: '30/06/2026',
    type: 'Invoice',
    no: '1001',
    customer: 'Vermilion Bike Store Pvt Ltd',
    memo: 'Brand Strategy Package (SAC 998311)',
    amount: 240000.00,
    status: 'Current (Not Due)',
    statusTone: 'paid',
    daysOverdue: 0,
    partiallyPaid: null,
    dueDate: '30/07/2026'
  },
  {
    id: 'inv-1018',
    date: '9/20/25',
    type: 'Invoice',
    no: '1018',
    customer: 'Sushi by Katsuyuki',
    memo: '',
    amount: 6680.00, // $80.00 * 83.50
    status: 'Overdue 7 days',
    statusTone: 'overdue',
    daysOverdue: 7,
    partiallyPaid: null,
    dueDate: '10-20-2025'
  },
  {
    id: 'inv-1005',
    date: '9/20/25',
    type: 'Invoice',
    no: '1005',
    customer: 'Freeman Sporting Goods:55 Twin Lane',
    memo: '',
    amount: 4509.00, // $54.00 * 83.50
    status: 'Overdue 7 days',
    statusTone: 'overdue',
    daysOverdue: 7,
    partiallyPaid: 'Partially paid, ₹334.00 due',
    dueDate: '10-20-2025'
  },
  {
    id: 'inv-1012',
    date: '9/15/25',
    type: 'Invoice',
    no: '1012',
    customer: 'Shara Barnett:Barnett Design',
    memo: '',
    amount: 22920.75, // $274.50 * 83.50
    status: 'Overdue 12 days',
    statusTone: 'overdue',
    daysOverdue: 12,
    partiallyPaid: null,
    dueDate: '10-15-2025'
  },
  {
    id: 'inv-1022',
    date: '9/7/25',
    type: 'Invoice',
    no: '1022',
    customer: "Jeff's Jalopies",
    memo: '',
    amount: 6763.50, // $81.00 * 83.50
    status: 'Overdue 20 days',
    statusTone: 'overdue',
    daysOverdue: 20,
    partiallyPaid: null,
    dueDate: '10-07-2025'
  },
  {
    id: 'inv-1021',
    date: '9/7/25',
    type: 'Invoice',
    no: '1021',
    customer: "Amy's Bird Sanctuary",
    memo: '',
    amount: 38326.50, // $459.00 * 83.50
    status: 'Overdue 20 days',
    statusTone: 'overdue',
    daysOverdue: 20,
    partiallyPaid: 'Partially paid, ₹19,956.50 due',
    dueDate: '10-07-2025'
  },
  {
    id: 'inv-1007',
    date: '9/4/25',
    type: 'Invoice',
    no: '1007',
    customer: 'John Melton',
    memo: '',
    amount: 62625.00, // $750.00 * 83.50
    status: 'Overdue 23 days',
    statusTone: 'overdue',
    daysOverdue: 23,
    partiallyPaid: 'Partially paid, ₹37,575.00 due',
    dueDate: '10-04-2025'
  }
];

export default function SalesTransactionsView({ 
  onOpenInvoiceModal, 
  onNavigate,
  initialTab = 'overview' // 'overview' | 'transactions'
}) {
  const { state } = useStore();

  // Active sub-item in Sales & Get Paid sidebar
  const [activeSubItem, setActiveSubItem] = useState(initialTab === 'transactions' ? 'transactions' : 'overview');

  // View mode: 'continuous' (connected long scrollable page of all frames) or 'interactive' (standard tabbed view)
  const [viewMode, setViewMode] = useState('continuous');



  // Review Invoice Reminder Modal state (Frame 760 & 761)
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState(DEFAULT_SALES_INVOICES[0]);
  const [reminderToast, setReminderToast] = useState(null);

  // Overview Page States (Frame 749)
  const [overviewPrivacy, setOverviewPrivacy] = useState(false);
  const [feedMenuOpen, setFeedMenuOpen] = useState(false);
  const [funnelPeriod, setFunnelPeriod] = useState('Last 30 days');
  const [incomeDuration, setIncomeDuration] = useState('This month');
  const [comparePreviousYear, setComparePreviousYear] = useState(false);

  // Sales Transactions Table States (Frame 756)
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [selectedRows, setSelectedRows] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('Invoices');
  const [dateFilter, setDateFilter] = useState('Last 12 months');
  const [overdueSubFilter, setOverdueSubFilter] = useState('All');
  const [activeDropdownRow, setActiveDropdownRow] = useState(null);
  const [newTxnDropdownOpen, setNewTxnDropdownOpen] = useState(false);
  const [batchActionsOpen, setBatchActionsOpen] = useState(false);

  // Refs for smooth scrolling across connected frames
  const overviewFrameRef = useRef(null);
  const transactionsFrameRef = useRef(null);
  const reminderFrameRef = useRef(null);

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

  // Open reminder modal for a specific invoice
  const handleOpenReminder = (inv = DEFAULT_SALES_INVOICES[0]) => {
    setSelectedInvoiceForReminder(inv);
    setReminderModalOpen(true);
  };

  const handleReminderSent = ({ invNo, customerName, amount }) => {
    setReminderToast(`Invoice reminder for ${invNo} (${amount}) successfully sent to ${customerName}!`);
    setTimeout(() => {
      setReminderToast(null);
    }, 5000);
  };

  // Row selection toggles
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(DEFAULT_SALES_INVOICES.map(i => i.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return DEFAULT_SALES_INVOICES.filter(inv => {
      const matchesSearch = !customerSearch || inv.customer.toLowerCase().includes(customerSearch.toLowerCase());
      return matchesSearch;
    });
  }, [customerSearch]);

  return (
    <div className="flex w-full min-h-screen bg-[#F6F7F8] text-[#393A3D] select-none">


      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT AREA (Scrollable, Connected Long Page)                    */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-y-auto">
        {/* Experience Switcher Sticky Header */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              View Experience:
            </span>

            <div className="inline-flex rounded-full border border-gray-300 p-0.5 bg-gray-50 text-xs">
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'continuous' 
                    ? 'bg-[#393A3D] text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layers size={13} />
                <span>Connected Long Page (Overview &amp; Transactions Scrollable)</span>
              </button>
              <button
                onClick={() => setViewMode('interactive')}
                className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  viewMode === 'interactive' 
                    ? 'bg-[#393A3D] text-white shadow-xs' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Interactive Tab View</span>
              </button>
            </div>
          </div>

          {/* Quick Jump Links */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-gray-400">Jump to:</span>
            <button 
              onClick={() => scrollToFrame(overviewFrameRef)}
              className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
            >
              1. Overview
            </button>
            <button 
              onClick={() => scrollToFrame(transactionsFrameRef)}
              className="px-2.5 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition cursor-pointer"
            >
              2. Sales Transactions
            </button>
            <button 
              onClick={() => handleOpenReminder(DEFAULT_SALES_INVOICES[0])}
              className="px-2.5 py-1 rounded bg-green-50 hover:bg-green-100 text-[#2ca01c] font-semibold border border-green-200 transition cursor-pointer flex items-center space-x-1"
            >
              <Sparkles size={12} />
              <span>3. Review Reminder Modal</span>
            </button>
          </div>
        </div>

        {/* Toast Notification if reminder was sent */}
        {reminderToast && (
          <div className="mx-8 mt-4 bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between shadow-xs animate-in slide-in-from-top">
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <CheckCircle2 size={16} className="text-[#2ca01c]" />
              <span>{reminderToast}</span>
            </div>
            <button onClick={() => setReminderToast(null)} className="text-emerald-700 hover:text-emerald-950 p-1">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
          {/* ========================================================================= */}
          {/* 3. FRAME 749: SALES & GET PAID OVERVIEW (Screenshot 1)                    */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activeSubItem === 'overview') && (
            <section ref={overviewFrameRef} className="space-y-6">
              {/* Top Title & Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    <img src="/app-icons/sales.png" alt="Sales & Get Paid" className="w-full h-full object-contain block" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[#393A3D] tracking-tight">
                      Sales &amp; Get Paid overview
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">Track revenue, manage customer invoices, and automate payments</p>
                  </div>
                </div>
              </div>

              {/* Business Feed Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-[#393A3D]">
                    <Sparkles size={16} className="text-[#0077c5]" />
                    <span>Business Feed</span>
                  </div>
                  <button 
                    onClick={() => onNavigate?.('feed')}
                    className="text-xs text-[#0077c5] hover:underline font-semibold cursor-pointer"
                  >
                    View all
                  </button>
                </div>

                {/* Overdue Invoices Card */}
                <div className="bg-white border border-[#E3E5E8] rounded-xl p-5 shadow-xs max-w-md relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText size={16} className="text-gray-700" />
                      <h3 className="text-sm font-bold text-gray-900">Overdue invoices</h3>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setFeedMenuOpen(!feedMenuOpen)}
                        className="text-gray-400 hover:text-gray-700 p-1 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <MoreVertical size={15} />
                      </button>

                      {feedMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                          <button 
                            onClick={() => { setFeedMenuOpen(false); handleOpenReminder(DEFAULT_SALES_INVOICES[0]); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                          >
                            Review all
                          </button>
                          <button 
                            onClick={() => { setFeedMenuOpen(false); scrollToFrame(transactionsFrameRef); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                          >
                            View invoices
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">
                    Over ₹1,27,379.25 worth of invoice reminders are ready for you to review and send
                  </p>

                  <div className="mt-4">
                    <button 
                      onClick={() => handleOpenReminder(DEFAULT_SALES_INVOICES[0])}
                      className="text-xs text-[#0077c5] hover:underline font-bold cursor-pointer inline-flex items-center space-x-1"
                    >
                      <span>Review all</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Create Actions Row */}
              <div className="flex items-center space-x-3 overflow-x-auto py-2 text-xs select-none">
                <span className="font-semibold text-gray-700 mr-1 whitespace-nowrap">Create actions</span>
                
                <button 
                  onClick={() => alert("Get paid online: Set up UPI and Payment gateway")}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Get paid online
                </button>
                <button 
                  onClick={onOpenInvoiceModal}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Create invoice
                </button>
                <button 
                  onClick={() => alert("Payment link generated: https://pay.meso.in/karan/pay")}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Create payment link
                </button>
                <button 
                  onClick={() => onNavigate?.('recurring_transactions')}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Create recurring payment
                </button>
                <button 
                  onClick={() => alert("Sales receipt editor opening...")}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Create sales receipt
                </button>
                <button 
                  onClick={() => alert("Record payment dialog")}
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-gray-500 rounded-full text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
                >
                  Record payment
                </button>
                <button 
                  onClick={() => onNavigate?.('sales_transactions')}
                  className="text-[#0077c5] hover:underline font-semibold pl-1 whitespace-nowrap cursor-pointer"
                >
                  Show all
                </button>
              </div>

              {/* Sales & Get Paid at a Glance */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900">
                    Sales &amp; Get Paid at a glance
                  </h2>

                  <div className="flex items-center space-x-2 text-gray-600">
                    <button 
                      onClick={() => alert("Customize layout settings")}
                      className="p-1.5 hover:bg-white rounded transition cursor-pointer" 
                      title="Customize layout"
                    >
                      <Sliders size={16} />
                    </button>
                    <button 
                      onClick={() => setOverviewPrivacy(!overviewPrivacy)}
                      className="p-1.5 hover:bg-white rounded transition cursor-pointer" 
                      title={overviewPrivacy ? "Show financial numbers" : "Hide financial numbers"}
                    >
                      {overviewPrivacy ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* SALES & GET PAID FUNNEL CARD */}
                <div className="bg-white border border-[#E3E5E8] rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      SALES &amp; GET PAID FUNNEL
                    </span>

                    <div className="flex items-center space-x-1 text-xs text-gray-600 cursor-pointer">
                      <span>{funnelPeriod}</span>
                      <ChevronDown size={14} />
                    </div>
                  </div>

                  {/* 4 Connected Funnel Steps with Arrow Indicators */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
                    {/* Step 1: Create request */}
                    <div className="border border-gray-200 rounded-lg p-5 flex flex-col justify-between bg-white">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Create a new payment request</h4>
                        <p className="text-xs text-gray-500 mt-1">Send invoices, pay links, and more</p>
                      </div>

                      <div className="mt-6">
                        <button 
                          onClick={onOpenInvoiceModal}
                          className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-800 hover:bg-gray-50 flex items-center justify-between w-full cursor-pointer"
                        >
                          <span>Request payment</span>
                          <ChevronDown size={14} className="text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Step 2: Not Paid */}
                    <div className="border border-gray-200 border-t-4 border-t-[#2ca01c] rounded-lg p-5 flex flex-col justify-between bg-[#F8FAFC]">
                      <div>
                        <div className="flex items-center space-x-1 text-xs font-semibold text-gray-700">
                          <span>Not Paid</span>
                          <span className="text-gray-400 font-normal">ⓘ</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {overviewPrivacy ? '••••••' : '₹3,13,627.67'}
                        </div>
                      </div>

                      <div className="mt-6">
                        <button 
                          onClick={() => scrollToFrame(transactionsFrameRef)}
                          className="text-xs text-[#0077c5] hover:underline font-semibold cursor-pointer"
                        >
                          View details
                        </button>
                      </div>
                    </div>

                    {/* Step 3: Paid */}
                    <div className="border border-gray-200 border-t-4 border-t-[#2ca01c] rounded-lg p-5 flex flex-col justify-between bg-white">
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Paid</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {overviewPrivacy ? '••••••' : '₹2,50,819.00'}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-600 mt-2">
                          <Check size={13} className="text-[#2ca01c]" />
                          <span>9 paid</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 4: Deposited */}
                    <div className="border border-gray-200 border-t-4 border-t-[#2ca01c] rounded-lg p-5 flex flex-col justify-between bg-white">
                      <div>
                        <div className="text-xs font-semibold text-gray-700">Deposited</div>
                        <div className="text-2xl font-bold text-gray-900 mt-2">
                          {overviewPrivacy ? '••••••' : '₹1,24,824.15'}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-600 mt-2">
                          <Check size={13} className="text-[#2ca01c]" />
                          <span>3 deposited</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INCOME OVER TIME SECTION */}
                <div className="bg-white border border-[#E3E5E8] rounded-xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <span>INCOME OVER TIME</span>
                        <span className="text-gray-400 font-normal">ⓘ</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Data updated 4 minutes ago</div>
                    </div>

                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1.5 text-gray-600">
                        <span>Duration:</span>
                        <span className="font-semibold text-gray-900 cursor-pointer">{incomeDuration} ▾</span>
                      </div>

                      <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                        <span>Compare to previous year:</span>
                        <input 
                          type="checkbox" 
                          checked={comparePreviousYear} 
                          onChange={(e) => setComparePreviousYear(e.target.checked)}
                          className="rounded text-[#2ca01c]" 
                        />
                      </label>
                    </div>
                  </div>

                  {/* Income Visualization Bars */}
                  <div className="h-44 flex items-end justify-between gap-4 pt-6 pb-2 px-6 bg-gray-50/50 rounded-lg border border-gray-100">
                    {[
                      { month: 'Jun', curr: 180000, prev: 140000 },
                      { month: 'Jul', curr: 210000, prev: 175000 },
                      { month: 'Aug', curr: 195000, prev: 160000 },
                      { month: 'Sep', curr: 265000, prev: 190000 },
                      { month: 'Oct', curr: 313627, prev: 215000 }
                    ].map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                        <div className="text-[11px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                          {formatMoney(bar.curr)}
                        </div>
                        <div className="w-full max-w-[48px] flex items-end gap-1.5 h-32">
                          <div 
                            style={{ height: `${(bar.curr / 350000) * 100}%` }}
                            className="w-full bg-[#0077c5] hover:bg-[#005e9e] rounded-t transition"
                          />
                          {comparePreviousYear && (
                            <div 
                              style={{ height: `${(bar.prev / 350000) * 100}%` }}
                              className="w-full bg-gray-300 rounded-t transition"
                            />
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-medium mt-2">{bar.month}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Continuous Mode Transition Divider */}
          {viewMode === 'continuous' && (
            <div className="py-6 flex items-center justify-center space-x-4 text-xs text-gray-400">
              <div className="h-px bg-gray-200 flex-1" />
              <button 
                onClick={() => transactionsFrameRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-4 py-1.5 rounded-full bg-white border border-gray-300 hover:border-gray-500 text-gray-700 font-medium shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Frame 756: Sales Transactions Tab</span>
                <ArrowDown size={13} />
              </button>
              <div className="h-px bg-gray-200 flex-1" />
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. FRAME 756: SALES TRANSACTIONS TAB (Screenshot 2)                      */}
          {/* ========================================================================= */}
          {(viewMode === 'continuous' || activeSubItem === 'transactions') && (
            <section ref={transactionsFrameRef} className="space-y-6">
              {/* Money Funnel Top Bar */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3 text-left">
                  <div>
                    <div className="text-base font-extrabold text-gray-900">₹0.00</div>
                    <div className="text-[11px] text-gray-500 font-medium">0 estimates</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-gray-900">₹62,625.00</div>
                    <div className="text-[11px] text-gray-500 font-medium">Unbilled income</div>
                  </div>
                  <div className="bg-orange-50 -m-2 p-2 rounded-lg border border-orange-200">
                    <div className="text-base font-extrabold text-orange-950">₹1,27,379.25</div>
                    <div className="text-[11px] text-orange-800 font-bold">10 overdue invoices</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-gray-900">₹4,40,906.92</div>
                    <div className="text-[11px] text-gray-500 font-medium">20 open invoices and credits</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold text-gray-900">₹2,43,512.72</div>
                    <div className="text-[11px] text-gray-500 font-medium">10 recently paid</div>
                  </div>
                </div>

                {/* 5-Color Progress Segment Bar */}
                <div className="flex h-3 rounded-full overflow-hidden w-full bg-gray-100 shadow-inner">
                  <div style={{ width: '8%' }} className="bg-[#00a3e0]" title="Estimates" />
                  <div style={{ width: '18%' }} className="bg-[#8b5cf6]" title="Unbilled income" />
                  <div style={{ width: '24%' }} className="bg-[#f97316]" title="Overdue invoices" />
                  <div style={{ width: '32%' }} className="bg-[#cbd5e1]" title="Open invoices" />
                  <div style={{ width: '18%' }} className="bg-[#2ca01c]" title="Recently paid" />
                </div>
              </div>

              {/* AI Assistant Notification Banner (Matches Screenshot 2) */}
              {showAiBanner && (
                <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center text-[#2ca01c] shrink-0">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        I drafted 10 reminders for invoices worth ₹3,74,991.82
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        You can edit a reminder for Sushi by Katsuyuki and other customers.{' '}
                        <button 
                          onClick={() => handleOpenReminder(DEFAULT_SALES_INVOICES[0])}
                          className="text-[#0077c5] hover:underline font-bold cursor-pointer"
                        >
                          Review reminders
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => setShowAiBanner(false)} 
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-50 cursor-pointer" 
                    aria-label="Dismiss banner"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Invoices Table Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                {/* Filters and Action Bar */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                  {/* Left filters cluster */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {/* Batch Actions Button */}
                    <div className="relative">
                      <button
                        onClick={() => setBatchActionsOpen(!batchActionsOpen)}
                        disabled={selectedRows.length === 0}
                        className={`px-3 py-1.5 border rounded-md text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition ${
                          selectedRows.length > 0 
                            ? 'border-[#2ca01c] text-[#2ca01c] bg-green-50' 
                            : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <span>Batch actions</span>
                        <ChevronDown size={13} />
                      </button>

                      {batchActionsOpen && selectedRows.length > 0 && (
                        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                          <button 
                            onClick={() => { setBatchActionsOpen(false); handleOpenReminder(DEFAULT_SALES_INVOICES[0]); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <Sparkles size={13} className="text-cyan-600" />
                            <span>Send AI Reminders ({selectedRows.length})</span>
                          </button>
                          <button 
                            onClick={() => { setBatchActionsOpen(false); alert("Printing selected invoices..."); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                          >
                            Print ({selectedRows.length})
                          </button>
                          <button 
                            onClick={() => { setBatchActionsOpen(false); alert("Marking as paid..."); }}
                            className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                          >
                            Receive payments
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Type Filter */}
                    <div className="relative">
                      <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                      >
                        <option>Invoices</option>
                        <option>Estimates</option>
                        <option>All transactions</option>
                      </select>
                    </div>

                    {/* Date Filter */}
                    <div className="relative">
                      <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                      >
                        <option>Last 12 months</option>
                        <option>Last 30 days</option>
                        <option>This calendar year</option>
                        <option>All dates</option>
                      </select>
                    </div>

                    {/* Customer Search Input */}
                    <div className="relative w-48">
                      <input 
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#2ca01c] pr-7"
                      />
                      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Right Actions: New transaction button */}
                  <div className="relative">
                    <button
                      onClick={() => setNewTxnDropdownOpen(!newTxnDropdownOpen)}
                      className="px-4 py-2 bg-[#2ca01c] hover:bg-[#258717] text-white rounded-md text-xs font-bold transition flex items-center space-x-2 shadow-xs cursor-pointer"
                    >
                      <span>New transaction</span>
                      <ChevronDown size={14} />
                    </button>

                    {newTxnDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                        <button 
                          onClick={() => { setNewTxnDropdownOpen(false); onOpenInvoiceModal(); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-100 font-semibold"
                        >
                          Invoice
                        </button>
                        <button 
                          onClick={() => { setNewTxnDropdownOpen(false); alert("New payment dialog"); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                        >
                          Payment
                        </button>
                        <button 
                          onClick={() => { setNewTxnDropdownOpen(false); alert("New estimate dialog"); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                        >
                          Estimate
                        </button>
                        <button 
                          onClick={() => { setNewTxnDropdownOpen(false); alert("New sales receipt dialog"); }}
                          className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                        >
                          Sales receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sub-filter chips row */}
                <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-1 hover:text-black font-medium cursor-pointer">
                      <span>Overdue</span>
                      <ChevronDown size={12} />
                    </button>
                    <button className="flex items-center space-x-1 hover:text-black font-medium cursor-pointer">
                      <span>Delivery method</span>
                      <ChevronDown size={12} />
                    </button>
                    <button className="flex items-center space-x-1 hover:text-black font-medium cursor-pointer">
                      <span>Errors</span>
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  <div className="flex items-center space-x-3 text-gray-500">
                    <button 
                      onClick={() => window.print()}
                      className="p-1 hover:text-gray-800 cursor-pointer" 
                      title="Print table"
                    >
                      <Printer size={15} />
                    </button>
                    <button 
                      onClick={() => alert("Exported transactions as CSV")}
                      className="p-1 hover:text-gray-800 cursor-pointer" 
                      title="Export CSV"
                    >
                      <Download size={15} />
                    </button>
                    <button 
                      onClick={() => alert("Table display settings")}
                      className="p-1 hover:text-gray-800 cursor-pointer" 
                      title="Table settings"
                    >
                      <Settings size={15} />
                    </button>
                  </div>
                </div>

                {/* Invoices Table matching Screenshot 2 */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-800">
                    <thead className="bg-white text-gray-600 font-bold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                      <tr>
                        <th className="p-3 w-8">
                          <input 
                            type="checkbox" 
                            checked={selectedRows.length === DEFAULT_SALES_INVOICES.length}
                            onChange={handleSelectAll}
                            className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" 
                          />
                        </th>
                        <th className="p-3">DATE</th>
                        <th className="p-3">TYPE</th>
                        <th className="p-3">NO.</th>
                        <th className="p-3">CUSTOMER</th>
                        <th className="p-3">MEMO</th>
                        <th className="p-3 text-right">AMOUNT</th>
                        <th className="p-3">STATUS ▲</th>
                        <th className="p-3 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-normal">
                      {filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-gray-50/80 transition">
                          <td className="p-3">
                            <input 
                              type="checkbox" 
                              checked={selectedRows.includes(inv.id)}
                              onChange={() => handleToggleRow(inv.id)}
                              className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" 
                            />
                          </td>
                          <td className="p-3 text-gray-600">{inv.date}</td>
                          <td className="p-3 text-gray-600">{inv.type}</td>
                          <td className="p-3 font-semibold text-gray-900">{inv.no}</td>
                          <td className="p-3 font-medium text-gray-900">{inv.customer}</td>
                          <td className="p-3 text-gray-400">{inv.memo || '—'}</td>
                          <td className="p-3 text-right font-semibold text-gray-900 tabular-nums">
                            {formatMoney(inv.amount)}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1.5">
                              <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0 font-bold text-[10px]">
                                !
                              </span>
                              <div>
                                <span className="font-semibold text-orange-900">{inv.status}</span>
                                {inv.partiallyPaid && (
                                  <div className="text-[10px] text-gray-500">{inv.partiallyPaid}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center space-x-2">
                              <button
                                onClick={() => handleOpenReminder(inv)}
                                className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                              >
                                View/Edit
                              </button>

                              <span className="text-gray-300">|</span>

                              <div className="relative">
                                <button
                                  onClick={() => setActiveDropdownRow(activeDropdownRow === inv.id ? null : inv.id)}
                                  className="text-[#0077c5] hover:underline font-semibold inline-flex items-center space-x-0.5 cursor-pointer"
                                >
                                  <span>Receive payment</span>
                                  <ChevronDown size={12} />
                                </button>

                                {activeDropdownRow === inv.id && (
                                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs text-left">
                                    <button
                                      onClick={() => { setActiveDropdownRow(null); alert(`Receive payment for #${inv.no}`); }}
                                      className="w-full px-3 py-1.5 hover:bg-gray-100 font-medium"
                                    >
                                      Receive payment
                                    </button>
                                    <button
                                      onClick={() => { setActiveDropdownRow(null); handleOpenReminder(inv); }}
                                      className="w-full px-3 py-1.5 hover:bg-gray-100 text-[#2ca01c] font-semibold flex items-center space-x-1"
                                    >
                                      <Sparkles size={12} />
                                      <span>Send reminder</span>
                                    </button>
                                    <button
                                      onClick={() => { setActiveDropdownRow(null); alert(`Duplicating #${inv.no}`); }}
                                      className="w-full px-3 py-1.5 hover:bg-gray-100"
                                    >
                                      Duplicate
                                    </button>
                                    <button
                                      onClick={() => { setActiveDropdownRow(null); alert(`Deleting #${inv.no}`); }}
                                      className="w-full px-3 py-1.5 hover:bg-gray-100 text-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
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

      {/* ========================================================================= */}
      {/* 5. REVIEW INVOICE REMINDER MODAL (Frames 760 & 761)                       */}
      {/* ========================================================================= */}
      <ReviewInvoiceReminderModal
        isOpen={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        invoice={selectedInvoiceForReminder}
        onReminderSent={handleReminderSent}
      />
    </div>
  );
}
