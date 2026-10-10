import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Search, 
  Printer, 
  Settings, 
  Pencil, 
  MessageSquare, 
  Info, 
  ArrowLeftRight,
  Check,
  Sliders,
  Gem,
  LayoutGrid,
  FileText,
  CreditCard,
  DollarSign
} from 'lucide-react';

export const INITIAL_CHART_OF_ACCOUNTS = [
  { id: 1, name: 'Checking', type: 'Bank', badge: 'BAL', detail: 'Checking', bank: true, qb: 1201.00, bankBal: -3621.93, action: 'View register', indent: 0 },
  { id: 2, name: 'Savings', type: 'Bank', badge: 'BAL', detail: 'Savings', bank: true, qb: 800.00, bankBal: 200.00, action: 'View register', indent: 0 },
  { id: 3, name: 'Accounts Receivable (A/R)', type: 'Accounts receivable (A/R)', badge: 'BAL', detail: 'Accounts Receivable (A/R)', qb: 5281.52, bankBal: null, action: 'View register', indent: 0 },
  { id: 4, name: 'Inventory Asset', type: 'Other Current Assets', badge: 'BAL', detail: 'Inventory', qb: 596.25, bankBal: null, action: 'View register', indent: 0 },
  { id: 5, name: 'Prepaid Expenses', type: 'Other Current Assets', badge: 'BAL', detail: 'Prepaid Expenses', qb: 0.00, bankBal: null, action: 'View register', indent: 0 },
  { id: 6, name: 'Uncategorized Asset', type: 'Other Current Assets', badge: 'BAL', detail: 'Other Current Assets', qb: 0.00, bankBal: null, action: 'View register', indent: 0 },
  { id: 7, name: 'Undeposited Funds', type: 'Other Current Assets', badge: 'BAL', detail: 'Undeposited Funds', qb: 2062.52, bankBal: null, action: 'View register', indent: 0 },
  { id: 8, name: 'Truck', type: 'Fixed Assets', badge: 'BAL', detail: 'Vehicles', qb: 13495.00, bankBal: null, action: 'View register', indent: 0 },
  { id: 9, name: 'Depreciation', type: 'Fixed Assets', badge: 'BAL', detail: 'Accumulated Depreciation', qb: 0.00, bankBal: null, action: 'View register', indent: 1 },
  { id: 10, name: 'Original Cost', type: 'Fixed Assets', badge: 'BAL', detail: 'Vehicles', qb: 13495.00, bankBal: null, action: 'View register', indent: 1 },
  { id: 10.5, name: 'Accounts Payable (A/P)', type: 'Accounts payable (A/P)', badge: 'BAL', detail: 'Accounts Payable (A/P)', qb: 1602.67, bankBal: null, action: 'View register', indent: 0 },
  { id: 11, name: 'Retained Earnings', type: 'Equity', badge: 'BAL', detail: 'Retained Earnings', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 12, name: 'Billable Expense Income', type: 'Income', badge: 'P&L', detail: 'Service/Fee Income', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 13, name: 'Design income', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 14, name: 'Discounts given', type: 'Income', badge: 'P&L', detail: 'Discounts/Refunds Given', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 15, name: 'Fees Billed', type: 'Income', badge: 'P&L', detail: 'Service/Fee Income', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 16, name: 'Landscaping Services', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 0 },
  { id: 17, name: 'Job Materials', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 1 },
  { id: 18, name: 'Decks and Patios', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 19, name: 'Fountains and Garden Lighting', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 20, name: 'Plants and Soil', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 21, name: 'Sprinklers and Drip Systems', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 22, name: 'Labor', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 1 },
  { id: 23, name: 'Installation', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 24, name: 'Maintenance and Repair', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 2 },
  { id: 25, name: 'Other Income', type: 'Income', badge: 'P&L', detail: 'Other Primary Income', qb: null, bankBal: null, action: 'Run report', indent: 0 }
];

const ACCOUNT_TYPES = [
  'All',
  'Bank',
  'Accounts receivable (A/R)',
  'Other Current Assets',
  'Fixed Assets',
  'Equity',
  'Income'
];

function formatCurrency(n) {
  if (n == null) return '';
  const formatted = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (n < 0 ? '-$' : '$') + formatted;
}

export default function ChartOfAccountsView({ onNavigate }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [sort, setSort] = useState({ col: null, dir: 1 });
  const [selected, setSelected] = useState({});
  const [openRowId, setOpenRowId] = useState(null);
  const [accountingNavOpen, setAccountingNavOpen] = useState(true);

  // Close dropdowns on click outside
  const typeRef = useRef(null);
  const batchRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(e) {
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setTypeDropdownOpen(false);
      }
      if (batchRef.current && !batchRef.current.contains(e.target)) {
        setBatchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter accounts
  let list = INITIAL_CHART_OF_ACCOUNTS.filter((r) => {
    const matchesType = typeFilter === 'All' || r.type === typeFilter;
    const q = query.trim().toLowerCase();
    const matchesSearch = !q || (r.name + ' ' + r.type + ' ' + r.detail).toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Sort accounts
  if (sort.col) {
    list = [...list].sort((a, b) => {
      if (sort.col === 'qb' || sort.col === 'bank') {
        const valA = sort.col === 'qb' ? a.qb : a.bankBal;
        const valB = sort.col === 'qb' ? b.qb : b.bankBal;
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        return (valA - valB) * sort.dir;
      }
      const key = sort.col;
      const va = (a[key] || '').toString().toLowerCase();
      const vb = (b[key] || '').toString().toLowerCase();
      if (va < vb) return -sort.dir;
      if (va > vb) return sort.dir;
      return 0;
    });
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = list.length > 0 && list.every(r => selected[r.id]);
  const someSelected = list.some(r => selected[r.id]);

  const toggleAll = () => {
    const next = {};
    if (!allSelected) {
      list.forEach(r => { next[r.id] = true; });
    }
    setSelected(next);
  };

  const toggleOne = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSort = (col) => {
    setSort(prev => prev.col === col ? { col, dir: -prev.dir } : { col, dir: 1 });
  };

  // Nav Groups data
  const navGroups = [
    { label: 'Expenses & Bills', color: '#0AA574', view: 'expense_transactions' },
    { label: 'Sales & Get Paid', color: '#005E5D', view: 'sales_transactions' },
    { label: 'Customer Hub', color: '#2E9E5B', view: 'customers_list' },
    { label: 'Team', color: '#12A489' },
    { label: 'Time', color: '#00352C', view: 'time_entries' },
    { label: 'Sales Tax', color: '#E5346B' },
    { label: 'Business Tax', color: '#83243F' },
    { label: 'Lending', color: '#0AA574' }
  ];

  return (
    <div className="flex h-full w-full overflow-hidden bg-white select-none">
      {/* 1. SECONDARY NAVIGATION SIDEBAR (263px, #F4F5F8) */}
      <aside className="w-[263px] shrink-0 bg-[#F4F5F8] border-r border-[#E3E5E8] flex flex-col pt-[18px] overflow-y-auto">
        <div className="px-2 flex-1">
          {/* Header row: "MY APPS" */}
          <div className="h-[30px] flex items-center justify-between px-3">
            <span className="text-[12px] font-semibold tracking-[1.2px] text-[#6B6C72] uppercase">
              MY APPS
            </span>
            <button className="text-[#6B6C72] hover:text-[#393A3D] p-1 rounded transition cursor-pointer" title="Organize apps">
              <Sliders size={15} />
            </button>
          </div>

          {/* Group 1: Accounting (Expanded) */}
          <button 
            onClick={() => setAccountingNavOpen(o => !o)}
            className="w-full h-[44px] flex items-center px-3 rounded-full hover:bg-[#E9ECEF] transition cursor-pointer mt-1"
          >
            <span className="w-[20px] h-[20px] rounded-full bg-[#00352C] text-[#8FF0BD] text-[10px] font-bold flex items-center justify-center shrink-0">
              A
            </span>
            <span className="ml-[14px] text-[16px] font-medium text-[#393A3D]">Accounting</span>
            <ChevronDown 
              size={16} 
              className={`ml-auto text-[#393A3D] transition-transform duration-200 ${accountingNavOpen ? 'rotate-180' : ''}`} 
            />
          </button>

          {accountingNavOpen && (
            <div className="space-y-[1px] mt-0.5">
              <button 
                onClick={() => onNavigate && onNavigate('bank_transactions')}
                className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
              >
                Bank transactions
              </button>
              <button className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer">
                Integration transactions
              </button>
              <button className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer">
                Receipts
              </button>
              <button className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer">
                Reconcile
              </button>
              {/* Rules item (Screenshot 1, y≈352) */}
              <button 
                onClick={() => onNavigate && onNavigate('rules')}
                className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
              >
                Rules
              </button>

              {/* Chart of accounts — ACTIVE STATE (Pill bg #E0E3E8) */}
              <div className="h-[38px] my-1 flex items-center pl-[46px] pr-3 rounded-full bg-[#E0E3E8] text-[15px] font-semibold text-[#393A3D] cursor-pointer">
                Chart of accounts
              </div>

              <button 
                onClick={() => onNavigate && onNavigate('recurring_transactions')}
                className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
              >
                Recurring transactions
              </button>
              <button className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer">
                My accountant
              </button>
            </div>
          )}

          {/* Subsequent nav groups with colored circular badges */}
          <div className="mt-3 space-y-1">
            {navGroups.map((g) => (
              <button 
                key={g.label}
                onClick={() => g.view && onNavigate && onNavigate(g.view)}
                className="w-full h-[44px] flex items-center px-3 rounded-full hover:bg-[#E9ECEF] transition cursor-pointer"
              >
                <span 
                  className="w-[20px] h-[20px] rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                  style={{ backgroundColor: g.color }}
                >
                  {g.label[0]}
                </span>
                <span className="ml-[14px] text-[15px] text-[#393A3D] truncate">{g.label}</span>
                <ChevronDown size={16} className="ml-auto text-[#6B6C72] shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Pinned Payroll & Marketing rows at bottom */}
        <div className="mt-auto">
          <div className="border-t border-[#D9D9D9] mx-2" />
          <button className="w-full h-[52px] flex items-center px-4 hover:bg-[#E9ECEF] transition cursor-pointer">
            <span className="w-[20px] h-[20px] rounded-full bg-[#12141D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              P
            </span>
            <span className="ml-[14px] text-[15px] font-medium text-[#393A3D]">Payroll</span>
            <Gem size={16} className="ml-auto text-[#6B6C72]" />
          </button>
          <button className="w-full h-[52px] flex items-center px-4 hover:bg-[#E9ECEF] transition cursor-pointer">
            <span className="w-[20px] h-[20px] rounded-full bg-[#12A489] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              M
            </span>
            <span className="ml-[14px] text-[15px] font-medium text-[#393A3D]">Marketing</span>
            <Gem size={16} className="ml-auto text-[#6B6C72]" />
          </button>
        </div>
      </aside>

      {/* 2. MAIN CANVAS AREA (Scroll container with sticky table header) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white relative">
        {/* Click outside backdrop for open row menus */}
        {openRowId != null && (
          <div className="fixed inset-0 z-20" onClick={() => setOpenRowId(null)} />
        )}

        <div className="pl-[45px] pr-[40px] pb-12">
          {/* Header Row: Title & Action Buttons */}
          <div className="flex items-start justify-between pt-[34px]">
            <div>
              <h1 className="text-[28px] leading-[34px] font-bold text-[#393A3D]">
                Chart of accounts
              </h1>
              {/* Back link */}
              <button 
                onClick={() => onNavigate && onNavigate('all_lists')}
                className="mt-[16px] flex items-center gap-[6px] text-[#0077C5] text-[15px] hover:underline cursor-pointer"
              >
                <ChevronLeft size={16} /> All lists
              </button>
            </div>

            <div className="flex items-center gap-[32px] pt-1">
              <button className="flex items-center gap-[8px] text-[15px] text-[#393A3D] hover:opacity-75 active:scale-95 transition cursor-pointer">
                <MessageSquare size={18} />
                <span>Feedback</span>
              </button>

              <div className="flex items-center gap-[12px]">
                <button className="h-[38px] px-[18px] border-[1.5px] border-[#2CA01C] text-[#2CA01C] rounded-[4px] text-[15px] font-semibold hover:bg-[#F0FAF0] active:scale-[0.98] transition cursor-pointer">
                  Run report
                </button>

                {/* Split New Account button */}
                <div className="flex h-[38px] rounded-[4px] overflow-hidden shadow-xs">
                  <button className="bg-[#2CA01C] text-white px-[16px] text-[15px] font-semibold hover:bg-[#25900F] active:scale-[0.98] transition cursor-pointer">
                    New account
                  </button>
                  <div className="w-px bg-[#1E7A14]" />
                  <button className="bg-[#2CA01C] text-white w-[42px] flex items-center justify-center hover:bg-[#25900F] transition cursor-pointer">
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar: Batch actions, Search input, All dropdown, Tool icons */}
          <div className="mt-[24px] flex items-center">
            {/* Batch actions dropdown */}
            <div className="relative" ref={batchRef}>
              <button
                type="button"
                onClick={() => setBatchDropdownOpen(o => !o)}
                className={`h-[40px] px-[16px] border-[1.5px] rounded-[4px] flex items-center gap-[10px] text-[15px] font-semibold transition cursor-pointer select-none ${
                  batchDropdownOpen ? 'bg-[#F4F5F8] border-[#393A3D]' : 'bg-white border-[#393A3D] hover:bg-[#F4F5F8]'
                }`}
              >
                <span>Batch actions</span>
                <ChevronDown size={14} className={batchDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>

              {batchDropdownOpen && (
                <div className="absolute z-40 mt-[4px] left-0 w-[200px] bg-white border border-[#D9D9D9] rounded-[4px] shadow-[0_4px_14px_rgba(0,0,0,0.15)] py-[6px]">
                  <div 
                    onClick={() => { if (selectedCount > 0) setBatchDropdownOpen(false); }}
                    className={`px-[16px] py-[9px] text-[15px] ${selectedCount === 0 ? 'text-[#B9BDC2] cursor-not-allowed' : 'text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer'}`}
                  >
                    Edit
                  </div>
                  <div 
                    onClick={() => { if (selectedCount > 0) setBatchDropdownOpen(false); }}
                    className={`px-[16px] py-[9px] text-[15px] ${selectedCount === 0 ? 'text-[#B9BDC2] cursor-not-allowed' : 'text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer'}`}
                  >
                    Make inactive
                  </div>
                </div>
              )}
            </div>

            {/* Filter Search Input */}
            <div className="ml-[11px] w-[232px] h-[40px] border border-[#8D9096] rounded-[4px] flex items-center px-[12px] gap-[8px] focus-within:border-[#393A3D] transition bg-white">
              <Search size={16} className="text-[#6B6C72] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name or number"
                className="flex-1 min-w-0 text-[15px] text-[#393A3D] placeholder-[#6B6C72] outline-none bg-transparent"
              />
            </div>

            {/* "All" Dropdown (Type Filter) */}
            <div className="ml-[10px] relative" ref={typeRef}>
              <button
                type="button"
                onClick={() => setTypeDropdownOpen(o => !o)}
                className={`w-[234px] h-[40px] px-[14px] border rounded-[4px] flex items-center justify-between text-[15px] text-[#393A3D] transition cursor-pointer select-none bg-white ${
                  typeDropdownOpen ? 'bg-[#F4F5F8] border-[#393A3D]' : 'border-[#8D9096] hover:border-[#393A3D]'
                }`}
              >
                <span className="truncate">{typeFilter}</span>
                <ChevronDown size={14} className={typeDropdownOpen ? 'rotate-180 transition-transform text-[#6B6C72]' : 'transition-transform text-[#6B6C72]'} />
              </button>

              {typeDropdownOpen && (
                <div className="absolute z-40 mt-[4px] left-0 w-[260px] bg-white border border-[#D9D9D9] rounded-[4px] shadow-[0_4px_14px_rgba(0,0,0,0.15)] py-[6px] max-h-[300px] overflow-y-auto">
                  {ACCOUNT_TYPES.map((t) => (
                    <div
                      key={t}
                      onClick={() => {
                        setTypeFilter(t);
                        setTypeDropdownOpen(false);
                      }}
                      className={`px-[16px] py-[9px] text-[15px] cursor-pointer hover:bg-[#F4F5F8] flex items-center justify-between ${
                        t === typeFilter ? 'font-semibold text-[#393A3D]' : 'text-[#393A3D]'
                      }`}
                    >
                      <span>{t}</span>
                      {t === typeFilter && <Check size={16} className="text-[#2CA01C]" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Action Icons: Pencil, Printer, Gear */}
            <div className="ml-auto flex items-center gap-[18px]">
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#393A3D] hover:bg-[#ECEEF1] transition cursor-pointer" title="Edit columns">
                <Pencil size={18} />
              </button>
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#393A3D] hover:bg-[#ECEEF1] transition cursor-pointer" title="Print list">
                <Printer size={18} />
              </button>
              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#393A3D] hover:bg-[#ECEEF1] transition cursor-pointer" title="Table settings">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Pagination Row */}
          <div className="mt-[48px] flex items-center justify-end gap-[24px] pr-[10px] text-[15px]">
            <button className="flex items-center gap-[6px] text-[#A0A4A8] cursor-default select-none font-medium">
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="text-[#393A3D] select-none font-medium">1 - 75</span>
            <button className="flex items-center gap-[6px] text-[#393A3D] hover:opacity-75 active:scale-95 transition cursor-pointer select-none font-medium">
              Next <ChevronRight size={14} />
            </button>
          </div>

          {/* TABLE CONTAINER WITH STICKY HEADER (§60–§61) */}
          <div className="mt-[10px] border-t border-[#D9D9D9]">
            {/* 3. STICKY THEAD ROW (Sticks below topbar on scroll, matching Screenshot 2!) */}
            <div className="sticky top-0 z-10 bg-white">
              <div 
                className="grid items-center h-[50px] border-b border-[#D9D9D9] text-[13px] font-semibold tracking-[0.4px] text-[#393A3D] uppercase"
                style={{ gridTemplateColumns: '46px 311px 254px 287px 207px 153px minmax(200px, 1fr)' }}
              >
                {/* Header Checkbox */}
                <div className="pl-[11px] flex items-center">
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={`w-[20px] h-[20px] rounded-[3px] border-[1.5px] flex items-center justify-center transition cursor-pointer ${
                      allSelected || someSelected ? 'bg-[#393A3D] border-[#393A3D]' : 'bg-white border-[#8D9096] hover:border-[#393A3D]'
                    }`}
                  >
                    {allSelected && <Check size={14} className="text-white stroke-[3]" />}
                    {!allSelected && someSelected && <div className="w-[10px] h-[2px] bg-white rounded-full" />}
                  </button>
                </div>

                {/* NAME */}
                <div className="pl-[10px] border-r border-[#E3E5E8] h-full flex items-center">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>NAME</span>
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* ACCOUNT TYPE */}
                <div className="pl-2 pr-[18px] border-r border-[#E3E5E8] h-full flex items-center justify-between">
                  <button onClick={() => toggleSort('type')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>ACCOUNT TYPE</span>
                    <Info size={14} className="text-[#6B6C72]" />
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* DETAIL TYPE */}
                <div className="pl-2 border-r border-[#E3E5E8] h-full flex items-center">
                  <button onClick={() => toggleSort('detail')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>DETAIL TYPE</span>
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* QUICKBOOKS BALANCE */}
                <div className="pl-2 border-r border-[#E3E5E8] h-full flex items-center">
                  <button onClick={() => toggleSort('qb')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>QUICKBOOKS BALANCE</span>
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* BANK BALANCE */}
                <div className="pl-2 border-r border-[#E3E5E8] h-full flex items-center">
                  <button onClick={() => toggleSort('bank')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>BANK BALANCE</span>
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* ACTION */}
                <div className="pl-[32px] select-none">
                  ACTION
                </div>
              </div>
            </div>

            {/* 4. TABLE ROWS (59px height, exact screenshots values & badges) */}
            {list.map((r) => {
              const isSelected = !!selected[r.id];
              return (
                <div
                  key={r.id}
                  className={`relative grid items-center h-[59px] border-b border-[#E8EAEC] transition-colors duration-150 ${
                    isSelected ? 'bg-[#EEF2F5]' : 'hover:bg-[#F7F8FA]'
                  }`}
                  style={{ gridTemplateColumns: '46px 311px 254px 287px 207px 153px minmax(200px, 1fr)' }}
                >
                  {/* Row Checkbox */}
                  <div className="pl-[11px] flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleOne(r.id)}
                      className={`w-[20px] h-[20px] rounded-[3px] border-[1.5px] flex items-center justify-center transition cursor-pointer ${
                        isSelected ? 'bg-[#393A3D] border-[#393A3D]' : 'bg-white border-[#8D9096] hover:border-[#393A3D]'
                      }`}
                    >
                      {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                    </button>
                  </div>

                  {/* Name Column with Indents & Hierarchy Guide Line */}
                  <div className="relative h-full flex items-center border-r border-[#E3E5E8]">
                    {/* Vertical Tree Guide Line at x≈462 (left: 28px) */}
                    {r.indent > 0 && (
                      <span className="absolute top-0 bottom-0 left-[28px] w-[2px] bg-[#E0E2E6]" />
                    )}
                    <span 
                      className="text-[15px] text-[#393A3D] whitespace-nowrap truncate pr-2"
                      style={{ paddingLeft: [10, 46, 62][r.indent || 0] }}
                    >
                      {r.name}
                    </span>
                  </div>

                  {/* Account Type Column with ⇄ Icon and BAL/P&L Badge */}
                  <div className="h-full flex items-center pl-2 pr-[18px] border-r border-[#E3E5E8]">
                    <span className="flex-1 min-w-0 flex items-center gap-[8px] text-[15px] text-[#393A3D] whitespace-nowrap truncate">
                      {r.bank && <ArrowLeftRight size={14} className="text-[#393A3D] shrink-0" />}
                      <span className="truncate">{r.type}</span>
                    </span>
                    {/* Badge right-aligned in cell */}
                    {r.badge && (
                      <span
                        className="shrink-0 text-white text-[11px] font-bold leading-none px-[7px] py-[3px] rounded-[3px] ml-2"
                        style={{ backgroundColor: r.badge === 'BAL' ? '#2CA01C' : '#0077C5' }}
                      >
                        {r.badge}
                      </span>
                    )}
                  </div>

                  {/* Detail Type Column with ⇄ Icon */}
                  <div className="h-full flex items-center pl-2 gap-[8px] border-r border-[#E3E5E8] text-[15px] text-[#393A3D] whitespace-nowrap truncate pr-2">
                    {r.bank && <ArrowLeftRight size={14} className="text-[#393A3D] shrink-0" />}
                    <span className="truncate">{r.detail}</span>
                  </div>

                  {/* QuickBooks Balance (Right-aligned numbers) */}
                  <div className="h-full flex items-center justify-end pr-[10px] border-r border-[#E3E5E8] text-[15px] text-[#393A3D] font-medium">
                    {formatCurrency(r.qb)}
                  </div>

                  {/* Bank Balance (Right-aligned numbers) */}
                  <div className="h-full flex items-center justify-end pr-[10px] border-r border-[#E3E5E8] text-[15px] text-[#393A3D] font-medium">
                    {formatCurrency(r.bankBal)}
                  </div>

                  {/* Action Column with Link and Rotating Chevron Menu */}
                  <div className="h-full flex items-center pl-[32px] pr-[30px] justify-between relative">
                    <a
                      href={`#${r.action.toLowerCase().replace(' ', '-')}`}
                      onClick={(e) => e.preventDefault()}
                      className="text-[#0077C5] text-[15px] hover:underline cursor-pointer font-medium"
                    >
                      {r.action}
                    </a>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenRowId(openRowId === r.id ? null : r.id);
                      }}
                      className="w-[30px] h-[30px] rounded flex items-center justify-center text-[#393A3D] hover:bg-[#ECEEF1] transition cursor-pointer"
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${openRowId === r.id ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Context Action Menu */}
                    {openRowId === r.id && (
                      <div 
                        onClick={() => setOpenRowId(null)}
                        className="absolute right-[30px] top-[48px] z-30 w-[190px] bg-white border border-[#D9D9D9] rounded-[4px] shadow-[0_4px_14px_rgba(0,0,0,0.15)] py-[6px]"
                      >
                        <div className="px-[16px] py-[8px] text-[14px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer">
                          {r.action}
                        </div>
                        <div className="px-[16px] py-[8px] text-[14px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer">
                          Edit
                        </div>
                        <div className="px-[16px] py-[8px] text-[14px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer">
                          Make inactive
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
