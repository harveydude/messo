import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Search, Printer, Settings, Pencil, MessageSquare, Info, ArrowLeftRight, Check, Sliders, Gem, X } from 'lucide-react';
import { useLedger } from '../store';
import { formatMoney } from '../money';
import { CHART_OF_ACCOUNTS, ACCOUNT_TYPE_FILTERS } from '../data/chartOfAccounts';
import api from '../api/client';

/**
 * Chart of Accounts.
 *
 * This screen used to carry its own list of accounts, each with a balance typed
 * in beside it: A/R 5,281.52, Truck 13,495.00, Undeposited 2,062.52. It was a
 * second, parallel set of books that no transaction could ever touch -- record
 * an expense and this screen carried on showing the number it was built with.
 *
 * The list now comes from `data/chartOfAccounts.js`, shared with the Balance
 * Sheet, the Profit & Loss and the ledger, and the balance in every row is
 * derived from the transaction history by `useLedger()`. Editing anything moves
 * it here.
 *
 * The filter menu offers the type labels Meso uses ("Accounts receivable
 * (A/R)") while the reports bucket on canonical types, so the two never have to
 * be spelled the same way.
 *
 * `bankBal` is deliberately not derived. It is what the *institution* says, and
 * this app does not connect to a bank, so it is left blank rather than filled
 * with an invention that would look authoritative.
 */

export default function ChartOfAccountsView({ onNavigate }) {
  const ledger = useLedger();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [sort, setSort] = useState({ col: null, dir: 1 });
  const [selected, setSelected] = useState({});
  const [openRowId, setOpenRowId] = useState(null);
  const [backendAccounts, setBackendAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewAccountModal, setShowNewAccountModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newAccount, setNewAccount] = useState({
    code: '',
    name: '',
    accountType: 'BANK',
    subType: 'Checking',
    initialBalanceInr: 0,
    statementGroup: 'BALANCE_SHEET',
  });

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.getChartOfAccounts();
      if (res && res.success && Array.isArray(res.accounts)) {
        setBackendAccounts(res.accounts);
      }
    } catch (err) {
      console.warn('Failed to fetch chart of accounts from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    const handleMutation = () => {
      loadAccounts();
    };
    window.addEventListener('qbo:data-mutated', handleMutation);
    return () => window.removeEventListener('qbo:data-mutated', handleMutation);
  }, []);

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!newAccount.name || !newAccount.code) {
      alert('Please fill in Account Name and Account Code/Number');
      return;
    }
    try {
      setSaving(true);
      await api.createAccount({
        code: newAccount.code,
        name: newAccount.name,
        statementGroup: newAccount.statementGroup || (['INCOME', 'COGS', 'EXPENSE'].includes(newAccount.accountType) ? 'PROFIT_AND_LOSS' : 'BALANCE_SHEET'),
        accountType: newAccount.accountType,
        subType: newAccount.subType,
        initialBalanceInr: Number(newAccount.initialBalanceInr) || 0,
      });
      setShowNewAccountModal(false);
      setNewAccount({
        code: '',
        name: '',
        accountType: 'BANK',
        subType: 'Checking',
        initialBalanceInr: 0,
        statementGroup: 'BALANCE_SHEET',
      });
      await loadAccounts();
    } catch (err) {
      alert('Error creating account: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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

  const TYPE_LABEL_MAP = {
    'BANK': 'Bank',
    'ASSET': 'Other Current Assets',
    'OTHER_CURRENT_ASSET': 'Other Current Assets',
    'ACCOUNTS_RECEIVABLE': 'Accounts receivable (A/R)',
    'FIXED_ASSET': 'Fixed Assets',
    'ACCOUNTS_PAYABLE': 'Accounts payable (A/P)',
    'CREDIT_CARD': 'Credit Card',
    'LIABILITY': 'Other Current Liabilities',
    'OTHER_CURRENT_LIABILITY': 'Other Current Liabilities',
    'TAX_PAYABLE': 'Other Current Liabilities',
    'EQUITY': 'Equity',
    'INCOME': 'Income',
    'COGS': 'Cost of Goods Sold',
    'EXPENSE': 'Expense',
  };

  // The one account list, with balances attached from PostgreSQL database when available
  const accounts = useMemo(() => {
    if (backendAccounts && backendAccounts.length > 0) {
      return backendAccounts.map(a => {
        const typeLabel = TYPE_LABEL_MAP[a.account_type] || a.account_type;
        const balance = a.balance_inr !== undefined ? Number(a.balance_inr) : (Number(a.cached_balance_paise || 0) / 100);
        const isBank = a.account_type === 'BANK' || a.account_type === 'CREDIT_CARD';
        const isRegister = isBank || a.account_type === 'ACCOUNTS_RECEIVABLE' || a.account_type === 'ACCOUNTS_PAYABLE';
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.account_type,
          typeLabel,
          detail: a.sub_type || a.name,
          badge: a.statement_group === 'PROFIT_AND_LOSS' ? 'P&L' : 'BAL',
          bank: isBank,
          balance,
          action: isRegister ? 'View register' : 'Run report'
        };
      });
    }
    return CHART_OF_ACCOUNTS.map((a) => ({ ...a, balance: ledger.balanceOf(a.id) }));
  }, [backendAccounts, ledger]);

  // Filter accounts
  let list = accounts.filter((r) => {
    const matchesType = typeFilter === 'All' || r.typeLabel === typeFilter;
    const q = query.trim().toLowerCase();
    const matchesSearch = !q || (r.name + ' ' + r.typeLabel + ' ' + r.detail).toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  // Sort accounts
  if (sort.col) {
    list = [...list].sort((a, b) => {
      if (sort.col === 'balance') {
        return (a.balance - b.balance) * sort.dir;
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



  return (
    <div className="flex h-full w-full overflow-hidden bg-white select-none">


      {/* 2. MAIN CANVAS AREA (Scroll container with sticky table header) */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-white relative">
        {/* Click outside backdrop for open row menus */}
        {openRowId != null && (
          <div className="fixed inset-0 z-20" onClick={() => setOpenRowId(null)} />
        )}

        <div className="pl-[45px] pr-[40px] pb-12">
          {/* Header Row: Title & Action Buttons */}
          <div className="flex items-start justify-between pt-[34px]">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                <img src="/app-icons/accounting.png" alt="Accounting" className="w-full h-full object-contain block" />
              </div>
              <div>
                <h1 className="text-[28px] leading-[34px] font-bold text-[#393A3D]">
                  Chart of accounts
                </h1>
                {/* Back link */}
                <button 
                  onClick={() => onNavigate && onNavigate('all_lists')}
                  className="mt-[6px] flex items-center gap-[6px] text-[#0077C5] text-[13.5px] hover:underline cursor-pointer"
                >
                  <ChevronLeft size={15} /> All lists
                </button>
              </div>
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
                  <button 
                    onClick={() => setShowNewAccountModal(true)}
                    className="bg-[#2CA01C] text-white px-[16px] text-[15px] font-semibold hover:bg-[#25900F] active:scale-[0.98] transition cursor-pointer"
                  >
                    New account
                  </button>
                  <div className="w-px bg-[#1E7A14]" />
                  <button 
                    onClick={() => setShowNewAccountModal(true)}
                    className="bg-[#2CA01C] text-white w-[42px] flex items-center justify-center hover:bg-[#25900F] transition cursor-pointer"
                  >
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
                  {ACCOUNT_TYPE_FILTERS.map((t) => (
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

                {/* BOOK BALANCE -- derived from the transaction history. */}
                <div className="pl-2 border-r border-[#E3E5E8] h-full flex items-center">
                  <button onClick={() => toggleSort('balance')} className="flex items-center gap-1.5 uppercase hover:opacity-75 cursor-pointer">
                    <span>BOOK BALANCE</span>
                    <span className="text-[12px] text-[#6B6C72]">⇅</span>
                  </button>
                </div>

                {/* BANK BALANCE -- what the institution says, not something this
                    app can know. Left as a placeholder rather than filled in. */}
                <div className="pl-2 border-r border-[#E3E5E8] h-full flex items-center">
                  <span className="flex items-center gap-1.5 uppercase cursor-default text-[#6B6C72]">
                    <span>BANK BALANCE</span>
                  </span>
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
                      <span className="truncate">{r.typeLabel}</span>
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

                  {/* Book balance, derived. */}
                  <div className="h-full flex items-center justify-end pr-[10px] border-r border-[#E3E5E8] text-[15px] text-[#393A3D] font-medium">
                    {formatMoney(r.balance)}
                  </div>

                  {/* Bank balance. This app does not connect to a bank, so it
                      has no figure to show. An em dash says "not known" --
                      an invented number here would look authoritative. */}
                  <div className="h-full flex items-center justify-end pr-[10px] border-r border-[#E3E5E8] text-[15px] text-[#A0A2A8] font-medium">
                    —
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
        {/* New Account Modal */}
        {showNewAccountModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-[#D5D8DC] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E5E8] bg-[#F4F5F8]">
                <h2 className="text-[18px] font-bold text-[#393A3D]">New Account</h2>
                <button
                  type="button"
                  onClick={() => setShowNewAccountModal(false)}
                  className="text-[#6B6C72] hover:text-[#393A3D] p-1 rounded-md hover:bg-[#E3E5E8] transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveAccount} className="p-6 space-y-4">
                <div>
                  <label className="block text-[13px] font-semibold text-[#393A3D] mb-1">
                    Account Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newAccount.accountType}
                    onChange={(e) => {
                      const val = e.target.value;
                      const isPL = ['INCOME', 'COGS', 'EXPENSE'].includes(val);
                      setNewAccount(prev => ({
                        ...prev,
                        accountType: val,
                        statementGroup: isPL ? 'PROFIT_AND_LOSS' : 'BALANCE_SHEET',
                      }));
                    }}
                    className="w-full h-[38px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                  >
                    <option value="BANK">Bank (Checking, Savings, Cash)</option>
                    <option value="ACCOUNTS_RECEIVABLE">Accounts Receivable (A/R)</option>
                    <option value="OTHER_CURRENT_ASSET">Other Current Asset / Inventory</option>
                    <option value="FIXED_ASSET">Fixed Asset (Machinery, Equipment)</option>
                    <option value="ACCOUNTS_PAYABLE">Accounts Payable (A/P)</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="LIABILITY">Other Current Liability / Taxes</option>
                    <option value="EQUITY">Equity (Owner Equity, Retained Earnings)</option>
                    <option value="INCOME">Income (Revenue, Sales)</option>
                    <option value="COGS">Cost of Goods Sold (Job Materials)</option>
                    <option value="EXPENSE">Expense (Operating, Rent, Utilities)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#393A3D] mb-1">
                      Account Number / Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1025"
                      value={newAccount.code}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, code: e.target.value }))}
                      className="w-full h-[38px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#393A3D] mb-1">
                      Detail / Sub-Type
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Checking, Software"
                      value={newAccount.subType}
                      onChange={(e) => setNewAccount(prev => ({ ...prev, subType: e.target.value }))}
                      className="w-full h-[38px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#393A3D] mb-1">
                    Account Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Axis Bank Operating Account"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-[38px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#393A3D] mb-1">
                    Initial / Starting Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAccount.initialBalanceInr}
                    onChange={(e) => setNewAccount(prev => ({ ...prev, initialBalanceInr: e.target.value }))}
                    className="w-full h-[38px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                  />
                  <p className="text-[12px] text-[#6B6C72] mt-1">Starting ledger balance credited to opening equity.</p>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#E3E5E8]">
                  <button
                    type="button"
                    onClick={() => setShowNewAccountModal(false)}
                    className="h-[38px] px-4 rounded-[4px] border border-[#8D9096] text-[#393A3D] text-[14px] font-semibold hover:bg-[#F4F5F8] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-[38px] px-6 rounded-[4px] bg-[#2CA01C] text-white text-[14px] font-semibold hover:bg-[#25900F] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save and Close'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
