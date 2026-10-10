import React, { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, Settings, BookOpen, Info, X, AlertTriangle, Check, Sliders, Gem, MoreHorizontal } from 'lucide-react';

export const INITIAL_RULES = [
  {
    id: 1,
    priority: 1,
    name: 'Office Supplies Automation',
    appliedTo: 'Money out in All bank accounts',
    conditions: 'Description Contains "STAPLES"',
    settings: 'Expense • Office Supplies & Software',
    autoAdd: false,
    status: 'Active'
  },
  {
    id: 2,
    priority: 2,
    name: 'Fuel & Gas Expense Rule',
    appliedTo: 'Money out in Checking',
    conditions: 'Description Contains "CHEVRON"',
    settings: 'Expense • Auto & Travel: Gas',
    autoAdd: true,
    status: 'Active'
  }
];

export default function RulesView({ onNavigate }) {
  const [rules, setRules] = useState(INITIAL_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRules, setSelectedRules] = useState({});
  const [accountingNavOpen, setAccountingNavOpen] = useState(true);
  const [salesNavOpen, setSalesNavOpen] = useState(true);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [txDirection, setTxDirection] = useState('Money out');
  const [bankAccount, setBankAccount] = useState('All bank accounts');
  const [matchScope, setMatchScope] = useState('All');
  
  // Conditions list
  const [conditions, setConditions] = useState([
    { field: 'Description', operator: 'Contains', value: '' }
  ]);

  // Assignment section state
  const [assignOpen, setAssignOpen] = useState(true);
  const [txType, setTxType] = useState('Expense');
  const [category, setCategory] = useState('');
  const [productService, setProductService] = useState('');
  const [payee, setPayee] = useState('(Recommended)');
  const [autoAdd, setAutoAdd] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Nav Groups for secondary sidebar
  const navGroups = [
    { label: 'Expenses & Bills', color: '#0AA574', view: 'expense_transactions' },
    { label: 'Sales & Get Paid', color: '#005E5D', view: 'sales_transactions', hasSub: true },
    { label: 'Customer Hub', color: '#2E9E5B', view: 'customers_list' },
    { label: 'Team', color: '#12A489' },
    { label: 'Time', color: '#00352C', view: 'time_entries' },
    { label: 'Sales Tax', color: '#E5346B' },
    { label: 'Business Tax', color: '#83243F' },
    { label: 'Lending', color: '#0AA574' }
  ];

  const salesSubItems = [
    'Overview',
    'Sales transactions',
    'Invoices',
    'Sales orders',
    'Sales channels',
    'QuickBooks payouts',
    'Channel payouts',
    'Products & services'
  ];

  // Validation
  const hasNameError = nameTouched && !ruleName.trim();

  const handleOpenDrawer = () => {
    setRuleName('');
    setNameTouched(true); // Matches Screenshot 1 where error "Rule name is required." is triggered!
    setTxDirection('Money out');
    setBankAccount('All bank accounts');
    setMatchScope('All');
    setConditions([{ field: 'Description', operator: 'Contains', value: '' }]);
    setTestResult(null);
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (rule) => {
    setRuleName(rule.name);
    setNameTouched(false);
    setTxDirection(rule.appliedTo?.includes('Money in') ? 'Money in' : 'Money out');
    setBankAccount('All bank accounts');
    setMatchScope('All');
    setConditions([{ field: 'Description', operator: 'Contains', value: rule.name }]);
    setTestResult(null);
    setDrawerOpen(true);
  };

  const handleAddCondition = () => {
    setConditions(prev => [...prev, { field: 'Description', operator: 'Contains', value: '' }]);
  };

  const handleConditionChange = (idx, field, val) => {
    setConditions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleRemoveCondition = (idx) => {
    if (conditions.length <= 1) return;
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleTestRule = () => {
    setTestResult('Rule conditions tested: 3 unreviewed transactions matched.');
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      setNameTouched(true);
      return;
    }
    const newRule = {
      id: Date.now(),
      priority: rules.length + 1,
      name: ruleName.trim(),
      appliedTo: `${txDirection} in ${bankAccount}`,
      conditions: conditions.map(c => `${c.field} ${c.operator} "${c.value || '...'}"`).join(` and `),
      settings: `${txType} • ${category || 'Uncategorized'}`,
      autoAdd: autoAdd,
      status: 'Active'
    };
    setRules(prev => [...prev, newRule]);
    setDrawerOpen(false);
  };

  const filteredRules = rules.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return r.name.toLowerCase().includes(q) || r.conditions.toLowerCase().includes(q);
  });

  const allSelected = filteredRules.length > 0 && filteredRules.every(r => selectedRules[r.id]);
  const someSelected = filteredRules.some(r => selectedRules[r.id]);

  const toggleAll = () => {
    const next = {};
    if (!allSelected) {
      filteredRules.forEach(r => { next[r.id] = true; });
    }
    setSelectedRules(next);
  };

  const toggleOne = (id) => {
    setSelectedRules(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white select-none relative">
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

          {/* Group 1: Accounting */}
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

              {/* RULES — ACTIVE STATE (Pill bg #E0E3E8) */}
              <div className="h-[38px] my-1 flex items-center pl-[46px] pr-3 rounded-full bg-[#E0E3E8] text-[15px] font-semibold text-[#393A3D] cursor-pointer">
                Rules
              </div>

              <button 
                onClick={() => onNavigate && onNavigate('chart_of_accounts')}
                className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
              >
                Chart of accounts
              </button>
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

          {/* Group: Expenses & Bills */}
          <div className="mt-3 space-y-1">
            <button className="w-full h-[44px] flex items-center px-3 rounded-full hover:bg-[#E9ECEF] transition cursor-pointer">
              <span className="w-[20px] h-[20px] rounded-full bg-[#0AA574] text-white text-[10px] font-bold flex items-center justify-center shrink-0">E</span>
              <span className="ml-[14px] text-[15px] text-[#393A3D] truncate">Expenses & Bills</span>
              <ChevronDown size={16} className="ml-auto text-[#6B6C72] shrink-0" />
            </button>

            {/* Group: Sales & Get Paid (Expanded in Screenshot 1!) */}
            <button 
              onClick={() => setSalesNavOpen(o => !o)}
              className="w-full h-[44px] flex items-center px-3 rounded-full hover:bg-[#E9ECEF] transition cursor-pointer"
            >
              <span className="w-[20px] h-[20px] rounded-full bg-[#005E5D] text-white text-[10px] font-bold flex items-center justify-center shrink-0">S</span>
              <span className="ml-[14px] text-[15px] text-[#393A3D] truncate">Sales & Get Paid</span>
              <ChevronDown size={16} className={`ml-auto text-[#6B6C72] shrink-0 transition-transform ${salesNavOpen ? 'rotate-180' : ''}`} />
            </button>

            {salesNavOpen && (
              <div className="space-y-[1px] mt-0.5 pl-2">
                {salesSubItems.map((item) => (
                  <button 
                    key={item}
                    onClick={() => {
                      if (item === 'Sales transactions' || item === 'Invoices') {
                        onNavigate?.('sales_transactions');
                      } else if (item === 'Products & services') {
                        onNavigate?.('products_services');
                      } else {
                        // No screen for this one yet. Previously the click did
                        // nothing at all, which reads as a broken menu.
                        onNavigate?.('not_built');
                      }
                    }}
                    className="w-full h-[38px] flex items-center pl-[44px] pr-3 text-[14px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}

            {/* Other Groups */}
            {navGroups.slice(2).map((g) => (
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

      {/* 2. MAIN CANVAS AREA (Rules List View) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white">
        <div className="pl-[45px] pr-[40px] pb-12">
          {/* Header Row: Title & Top Action Cluster */}
          <div className="flex items-start justify-between pt-[34px]">
            <div>
              <h1 className="text-[28px] leading-[34px] font-bold text-[#393A3D]">
                Rules
              </h1>
              <button 
                onClick={() => onNavigate && onNavigate('all_lists')}
                className="mt-[4px] flex items-center gap-[4px] text-[#0077C5] text-[14px] hover:underline cursor-pointer font-medium"
              >
                <ChevronLeft size={16} /> All lists
              </button>
            </div>

            <div className="flex items-center gap-[24px]">
              {/* "Learn about bank rules" link */}
              <a 
                href="#learn-bank-rules" 
                onClick={(e) => e.preventDefault()}
                className="flex items-center gap-[6px] text-[#0077C5] text-[15px] hover:underline cursor-pointer font-medium"
              >
                <BookOpen size={17} className="text-[#0077C5]" />
                <span>Learn about bank rules</span>
              </a>

              {/* "New rule" Split Button */}
              <div className="flex h-[38px] rounded-[4px] overflow-hidden shadow-xs">
                <button 
                  onClick={handleOpenDrawer}
                  className="bg-[#2CA01C] text-white px-[18px] text-[15px] font-semibold hover:bg-[#25900F] active:scale-[0.98] transition cursor-pointer"
                >
                  New rule
                </button>
                <div className="w-px bg-[#1E7A14]" />
                <button 
                  onClick={handleOpenDrawer}
                  className="bg-[#2CA01C] text-white w-[42px] flex items-center justify-center hover:bg-[#25900F] transition cursor-pointer"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar & Table Settings */}
          <div className="mt-[28px] flex items-center justify-between gap-[14px]">
            <button 
              onClick={() => setRules(rules.length > 0 ? [] : INITIAL_RULES)}
              className="text-[13px] text-[#0077C5] hover:underline font-medium cursor-pointer"
            >
              {rules.length > 0 ? "Switch to empty state (0-0 of 0 items)" : "Show sample rules"}
            </button>

            <div className="flex items-center gap-[14px]">
              <div className="w-[320px] h-[38px] border border-[#8D9096] rounded-[4px] flex items-center px-3 bg-white focus-within:border-[#393A3D] transition">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or conditions"
                  className="flex-1 min-w-0 text-[14px] text-[#393A3D] placeholder-[#6B6C72] outline-none bg-transparent"
                />
                <Search size={16} className="text-[#6B6C72] shrink-0 ml-1" />
              </div>

              <button className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B6C72] hover:bg-[#ECEEF1] hover:text-[#393A3D] transition cursor-pointer" title="Settings">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="mt-[20px] border-t border-[#D9D9D9]">
            {/* Table Header Row (Exact columns from Screenshot 2) */}
            <div 
              className="grid items-center h-[48px] border-b border-[#D9D9D9] text-[13px] font-semibold tracking-[0.4px] text-[#393A3D] uppercase bg-white"
              style={{ gridTemplateColumns: '46px 140px 180px 180px 320px 280px 110px 90px minmax(130px, 1fr)' }}
            >
              {/* Checkbox */}
              <div className="pl-[11px] flex items-center border-r border-[#E3E5E8] h-full">
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

              {/* PRIORITY (Active sort with upward black triangle and ? icon) */}
              <div className="pl-3 pr-2 border-r border-[#E3E5E8] h-full flex items-center">
                <button className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                  <span>PRIORITY</span>
                  <Info size={14} className="text-[#6B6C72]" />
                  <span className="text-[12px] text-[#393A3D]">▲</span>
                </button>
              </div>

              {/* RULE NAME */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>RULE NAME</span>
              </div>

              {/* APPLIED TO */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>APPLIED TO</span>
              </div>

              {/* CONDITIONS */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>CONDITIONS</span>
              </div>

              {/* SETTINGS */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>SETTINGS</span>
              </div>

              {/* AUTO-ADD */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>AUTO-ADD</span>
              </div>

              {/* STATUS */}
              <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                <span>STATUS</span>
              </div>

              {/* ACTIONS */}
              <div className="pl-3 flex items-center h-full">
                <span>ACTIONS</span>
              </div>
            </div>

            {/* Table Rows (Rendered if rules exist, else empty state) */}
            {filteredRules.length > 0 ? (
              filteredRules.map((rule) => {
                const isSelected = !!selectedRules[rule.id];
                return (
                  <div
                    key={rule.id}
                    className={`grid items-center h-[56px] border-b border-[#E8EAEC] text-[14px] text-[#393A3D] transition ${
                      isSelected ? 'bg-[#EEF2F5]' : 'hover:bg-[#F7F8FA]'
                    }`}
                    style={{ gridTemplateColumns: '46px 140px 180px 180px 320px 280px 110px 90px minmax(130px, 1fr)' }}
                  >
                    <div className="pl-[11px] flex items-center border-r border-[#E3E5E8] h-full">
                      <button
                        type="button"
                        onClick={() => toggleOne(rule.id)}
                        className={`w-[20px] h-[20px] rounded-[3px] border-[1.5px] flex items-center justify-center transition cursor-pointer ${
                          isSelected ? 'bg-[#393A3D] border-[#393A3D]' : 'bg-white border-[#8D9096]'
                        }`}
                      >
                        {isSelected && <Check size={14} className="text-white stroke-[3]" />}
                      </button>
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center font-medium">
                      {rule.priority}
                    </div>
                    <div 
                      onClick={() => handleOpenEditDrawer(rule)}
                      className="pl-3 border-r border-[#E3E5E8] h-full flex items-center font-semibold text-[#0077C5] hover:underline cursor-pointer truncate pr-2"
                    >
                      {rule.name}
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center truncate pr-2">
                      {rule.appliedTo}
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center truncate pr-2">
                      {rule.conditions}
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center truncate pr-2">
                      {rule.settings}
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                      <span className={`px-2 py-0.5 rounded text-[12px] font-semibold ${rule.autoAdd ? 'bg-[#E5F5E0] text-[#2CA01C]' : 'bg-gray-100 text-gray-600'}`}>
                        {rule.autoAdd ? 'On' : 'Off'}
                      </span>
                    </div>
                    <div className="pl-3 border-r border-[#E3E5E8] h-full flex items-center">
                      <span className="text-[#2CA01C] font-semibold text-[13px]">{rule.status}</span>
                    </div>
                    <div className="pl-3 flex items-center gap-3">
                      <button 
                        onClick={() => handleOpenEditDrawer(rule)}
                        className="text-[#0077C5] hover:underline font-medium cursor-pointer"
                      >
                        Edit
                      </button>
                      <button className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Empty Table Area */
              <div className="h-[260px] flex flex-col items-center justify-center text-[#6B6C72]">
                <p className="text-[15px]">No rules created yet.</p>
                <button
                  onClick={handleOpenDrawer}
                  className="mt-3 text-[14px] text-[#0077C5] font-semibold hover:underline cursor-pointer"
                >
                  + Create your first rule
                </button>
              </div>
            )}
          </div>

          {/* Pagination Row (Screenshot 2: 0-0 of 0 items < [1] >) */}
          <div className="mt-[20px] flex items-center justify-end gap-[18px] text-[14px] text-[#6B6C72]">
            <span>
              {filteredRules.length === 0 ? '0-0 of 0 items' : `1-${filteredRules.length} of ${filteredRules.length} items`}
            </span>
            <div className="flex items-center gap-1">
              <button disabled className="p-1 rounded text-[#C1C5CA] cursor-default">
                <ChevronLeft size={16} />
              </button>
              <div className="w-[28px] h-[28px] rounded bg-[#E0E3E8] text-[#393A3D] font-semibold flex items-center justify-center text-[13px]">
                1
              </div>
              <button disabled className="p-1 rounded text-[#C1C5CA] cursor-default">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          3. "CREATE RULE" SLIDE-OVER DRAWER (Exact Anatomy from Screenshot 1!)
      ========================================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Dimmed backdrop */}
          <div 
            className="fixed inset-0 bg-black/25 transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Slide-over panel (w: 670px, white) */}
          <div className="relative w-[670px] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="h-[64px] px-8 flex items-center justify-between border-b border-[#E3E5E8] shrink-0">
              <h2 className="text-[24px] font-semibold text-[#393A3D]">Create rule</h2>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#6B6C72] hover:bg-[#F4F5F8] hover:text-[#393A3D] transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
              {/* Informational Subtitle */}
              <p className="text-[14px] text-[#6B6C72]">
                Rules only apply to unreviewed transactions.
              </p>

              {/* 1. Rule Name Field */}
              <div>
                <label className="block text-[14px] font-medium text-[#393A3D] mb-1.5">
                  What do you want to call this rule? *
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => {
                    setRuleName(e.target.value);
                    setNameTouched(true);
                  }}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Name this rule"
                  className={`w-full h-[40px] px-3 rounded-[4px] text-[15px] text-[#393A3D] outline-none transition ${
                    hasNameError 
                      ? 'bg-[#FDEDED] border border-[#D32F2F] text-[#393A3D]' 
                      : 'border border-[#8D9096] focus:border-[#393A3D] bg-white'
                  }`}
                />
                {/* Red Validation Error (Screenshot 1) */}
                {hasNameError && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[#D32F2F] text-[13px] font-medium">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>Rule name is required.</span>
                  </div>
                )}
              </div>

              {/* 2. Direction & Account Selectors */}
              <div>
                <label className="block text-[14px] font-medium text-[#393A3D] mb-2">
                  Apply this to transactions that are
                </label>
                <div className="flex items-center gap-3">
                  {/* Money out / Money in dropdown */}
                  <div className="relative flex-1">
                    <select
                      value={txDirection}
                      onChange={(e) => setTxDirection(e.target.value)}
                      className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                    >
                      <option value="Money out">Money out</option>
                      <option value="Money in">Money in</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                  </div>

                  <span className="text-[14px] text-[#6B6C72] font-medium">in</span>

                  {/* Bank Account dropdown */}
                  <div className="relative flex-1">
                    <select
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                    >
                      <option value="All bank accounts">All bank accounts</option>
                      <option value="Checking">Checking</option>
                      <option value="Savings">Savings</option>
                      <option value="Mastercard">Mastercard</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* 3. Conditions Section */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-medium text-[#393A3D]">
                    and include the following:
                  </label>
                  {/* All / Any selector */}
                  <div className="relative w-[130px]">
                    <select
                      value={matchScope}
                      onChange={(e) => setMatchScope(e.target.value)}
                      className="w-full h-[36px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                    >
                      <option value="All">All</option>
                      <option value="Any">Any</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-[#6B6C72] pointer-events-none" />
                  </div>
                </div>

                {/* Condition rows */}
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {/* Field select */}
                    <div className="relative w-[160px]">
                      <select
                        value={cond.field}
                        onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                        className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                      >
                        <option value="Description">Description</option>
                        <option value="Bank text">Bank text</option>
                        <option value="Amount">Amount</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-3 text-[#6B6C72] pointer-events-none" />
                    </div>

                    {/* Operator select */}
                    <div className="relative w-[150px]">
                      <select
                        value={cond.operator}
                        onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                        className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                      >
                        <option value="Contains">Contains</option>
                        <option value="Doesn't contain">Doesn't contain</option>
                        <option value="Is exactly">Is exactly</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2.5 top-3 text-[#6B6C72] pointer-events-none" />
                    </div>

                    {/* Value input */}
                    <input
                      type="text"
                      value={cond.value}
                      onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                      placeholder="Enter text (required)"
                      className="flex-1 h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] placeholder-[#6B6C72] outline-none focus:border-[#393A3D]"
                    />

                    {conditions.length > 1 && (
                      <button 
                        onClick={() => handleRemoveCondition(idx)}
                        className="p-2 text-[#6B6C72] hover:text-[#D32F2F] cursor-pointer"
                        title="Delete condition"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}

                {/* + Add a condition */}
                <button
                  type="button"
                  onClick={handleAddCondition}
                  className="inline-block text-[14px] text-[#0077C5] font-semibold hover:underline cursor-pointer pt-1"
                >
                  + Add a condition
                </button>
              </div>

              {/* 4. Test rule button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestRule}
                  className="h-[38px] px-5 border-[1.5px] border-[#2CA01C] text-[#2CA01C] font-semibold text-[14px] rounded-[4px] hover:bg-[#F0FAF0] transition cursor-pointer"
                >
                  Test rule
                </button>
                {testResult && (
                  <p className="mt-2 text-[13px] text-[#2CA01C] font-medium flex items-center gap-1.5">
                    <Check size={14} />
                    <span>{testResult}</span>
                  </p>
                )}
              </div>

              {/* 5. Assignment Section ("Then Assign ⌄") */}
              <div className="pt-4 border-t border-[#E3E5E8]">
                <button
                  type="button"
                  onClick={() => setAssignOpen(o => !o)}
                  className="flex items-center gap-1.5 text-[16px] text-[#393A3D] font-medium hover:opacity-80 cursor-pointer mb-4"
                >
                  <span>Then</span>
                  <span className="font-semibold text-[#0077C5]">Assign</span>
                  <ChevronDown size={18} className={`text-[#0077C5] transition-transform ${assignOpen ? 'rotate-180' : ''}`} />
                </button>

                {assignOpen && (
                  <div className="space-y-4 pl-1">
                    {/* Transaction type */}
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-[#393A3D] font-medium w-[180px]">Transaction type</span>
                      <div className="relative w-[340px]">
                        <select
                          value={txType}
                          onChange={(e) => setTxType(e.target.value)}
                          className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                        >
                          <option value="Expense">Expense</option>
                          <option value="Transfer">Transfer</option>
                          <option value="Check">Check</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-[#393A3D] font-medium w-[180px]">Category</span>
                      <div className="relative w-[340px]">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                        >
                          <option value="">Select a category</option>
                          <option value="Advertising">Advertising</option>
                          <option value="Bank Charges">Bank Charges</option>
                          <option value="Dues and Subscriptions">Dues and Subscriptions</option>
                          <option value="Office Expenses">Office Expenses</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                      </div>
                    </div>

                    {/* Product/service */}
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-[#393A3D] font-medium w-[180px]">Product/service</span>
                      <div className="relative w-[340px]">
                        <select
                          value={productService}
                          onChange={(e) => setProductService(e.target.value)}
                          className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                        >
                          <option value="">Select product/service</option>
                          <option value="Design">Design</option>
                          <option value="Hours">Hours</option>
                          <option value="Landscaping">Landscaping</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                      </div>
                    </div>

                    {/* + Add a split link */}
                    <div className="pl-[180px]">
                      <button type="button" className="text-[14px] text-[#0077C5] font-semibold hover:underline cursor-pointer">
                        + Add a split
                      </button>
                    </div>

                    {/* Payee */}
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] text-[#393A3D] font-medium w-[180px]">Payee</span>
                      <div className="relative w-[340px]">
                        <select
                          value={payee}
                          onChange={(e) => setPayee(e.target.value)}
                          className="w-full h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] bg-white outline-none cursor-pointer appearance-none"
                        >
                          <option value="(Recommended)">(Recommended)</option>
                          <option value="Travis Waldron">Travis Waldron</option>
                          <option value="Hicks Hardware">Hicks Hardware</option>
                          <option value="Pye's Cakes">Pye's Cakes</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-3 text-[#6B6C72] pointer-events-none" />
                      </div>
                    </div>

                    {/* Auto-add toggle */}
                    <div className="pt-2 flex items-center justify-between">
                      <div>
                        <span className="text-[14px] font-medium text-[#393A3D] block">Automatically confirm transactions this rule applies to</span>
                        <span className="text-[12px] text-[#6B6C72]">Auto-add to your books without review</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoAdd(a => !a)}
                        className={`w-[44px] h-[24px] rounded-full p-0.5 transition-colors cursor-pointer ${
                          autoAdd ? 'bg-[#2CA01C]' : 'bg-[#CDCFD3]'
                        }`}
                      >
                        <div className={`w-[20px] h-[20px] rounded-full bg-white shadow-md transform transition-transform ${
                          autoAdd ? 'translate-x-[20px]' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer (Sticky Actions) */}
            <div className="h-[72px] px-8 border-t border-[#E3E5E8] flex items-center justify-between bg-white shrink-0">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-[15px] font-semibold text-[#0077C5] hover:underline cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRule}
                className="h-[40px] px-6 rounded-[6px] bg-[#2CA01C] hover:bg-[#248817] text-white font-semibold text-[15px] shadow-xs cursor-pointer transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
