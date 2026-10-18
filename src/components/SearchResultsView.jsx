import React, { useState, useEffect, useMemo } from 'react';
import { 
  Printer, 
  Share2, 
  Sliders, 
  X, 
  Filter, 
  Calendar, 
  ChevronDown, 
  HelpCircle, 
  ArrowDown, 
  Sparkles,
  Search,
  User,
  FileText,
  TrendingUp,
  Landmark,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';
import api from '../api/client';
import { ALL_MODULES, ALL_REPORTS } from './SearchDropdown';

export default function SearchResultsView({ 
  query = "Show me open invoices for the last 30 days",
  onNavigate
}) {
  let state = {};
  try {
    const store = useStore();
    state = store?.state || {};
  } catch {}

  const [activeTab, setActiveTab] = useState("all");
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [liveResults, setLiveResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic filter state
  const [typeFilter, setTypeFilter] = useState('All');
  const [contactFilter, setContactFilter] = useState('');
  const [refQuery, setRefQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');

  const [chips, setChips] = useState([
    "Filter: All active records",
    `Query: "${query}"`
  ]);

  useEffect(() => {
    if (!query || !query.trim()) return;
    setIsLoading(true);
    api.smartSearch(query.trim()).then(res => {
      if (res?.success) {
        setLiveResults(res);
      }
    }).catch(err => {
      console.warn('Smart search API call failed:', err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [query]);

  const rawQ = (query || '').trim().toLowerCase();

  // 1. Gather all transactions from live store + server
  const allStoreTransactions = useMemo(() => {
    const invoices = state.invoices || [];
    const bills = state.bills || [];
    const expenses = state.expenses || [];
    const bankTxns = state.bankTxns || [];

    const list = [];

    // Invoices
    for (const inv of invoices) {
      const amt = inv.total || (inv.lines || []).reduce((s, l) => s + (l.qty * l.rate), 0);
      list.push({
        id: inv.id,
        date: inv.date || '2025-10-24',
        type: 'Invoice',
        refNo: inv.no ? `#${inv.no}` : `#${inv.id}`,
        rawRef: String(inv.no || inv.id),
        contact: inv.customerId || 'Customer',
        dueDate: inv.dueDate || '2025-11-24',
        balance: inv.status === 'Paid' ? 0 : amt,
        amount: amt,
        memo: (inv.lines || []).map(l => l.desc).filter(Boolean).join(', ') || 'Standard invoice',
        lastModified: 'Live Store',
        viewId: 'invoices'
      });
    }

    // Bills
    for (const bill of bills) {
      const amt = (bill.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
      list.push({
        id: bill.id,
        date: bill.date || '2025-10-20',
        type: 'Bill',
        refNo: bill.no ? `#${bill.no}` : `#${bill.id}`,
        rawRef: String(bill.no || bill.id),
        contact: bill.vendorId || 'Vendor',
        dueDate: bill.dueDate || '2025-11-20',
        balance: bill.status === 'Paid' ? 0 : amt,
        amount: amt,
        memo: (bill.lines || []).map(l => l.desc).filter(Boolean).join(', ') || 'Vendor bill',
        lastModified: 'Live Store',
        viewId: 'bills'
      });
    }

    // Expenses
    for (const exp of expenses) {
      const amt = (exp.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
      list.push({
        id: exp.id,
        date: exp.date || '2025-10-18',
        type: 'Expense',
        refNo: exp.refNo ? `#${exp.refNo}` : `EXP-${exp.id}`,
        rawRef: String(exp.refNo || exp.id),
        contact: exp.payee || 'Expense',
        dueDate: 'Due on receipt',
        balance: 0,
        amount: amt,
        memo: exp.memo || (exp.lines || []).map(l => l.desc).filter(Boolean).join(', ') || 'Recorded Expense',
        lastModified: 'Live Store',
        viewId: 'expense_transactions'
      });
    }

    // Bank Txns
    for (const b of bankTxns) {
      const amt = Math.abs(Number(b.amount) || 0);
      list.push({
        id: b.id,
        date: b.date || '2025-10-22',
        type: 'Bank Feed',
        refNo: `BT-${b.id}`,
        rawRef: String(b.id),
        contact: b.payee || b.desc || 'Bank Feed',
        dueDate: 'N/A',
        balance: 0,
        amount: amt,
        memo: b.desc || '',
        lastModified: 'Banking Feed',
        viewId: 'bank_transactions'
      });
    }

    // Server fallback / records
    if (liveResults?.records && liveResults.records.length > 0) {
      for (const r of liveResults.records) {
        if (!list.some(x => x.rawRef === String(r.doc_number || r.invoice_number))) {
          const amt = Number(r.total_inr || r.total_amount || 0);
          list.push({
            id: r.id || r.doc_number,
            date: r.date || '2025-10-24',
            type: r.type || 'Invoice',
            refNo: r.doc_number ? `#${r.doc_number}` : (r.ref_no || '#1001'),
            rawRef: String(r.doc_number || r.invoice_number || ''),
            contact: r.contact_name || r.customer_name || 'Customer',
            dueDate: r.due_date || '2025-11-24',
            balance: Number(r.balance_inr || amt),
            amount: amt,
            memo: r.subtitle || r.memo || 'Database record',
            lastModified: 'Live PostgreSQL',
            viewId: 'invoices'
          });
        }
      }
    }

    return list;
  }, [state.invoices, state.bills, state.expenses, state.bankTxns, liveResults]);

  // Filter transactions by query & filter inputs
  const filteredTransactions = useMemo(() => {
    return allStoreTransactions.filter((tx) => {
      // Query filter
      if (rawQ) {
        const matchesQuery = 
          tx.refNo.toLowerCase().includes(rawQ) ||
          tx.contact.toLowerCase().includes(rawQ) ||
          tx.type.toLowerCase().includes(rawQ) ||
          tx.memo.toLowerCase().includes(rawQ) ||
          String(tx.amount).includes(rawQ) ||
          rawQ.includes('invoice') && tx.type === 'Invoice' ||
          rawQ.includes('bill') && tx.type === 'Bill' ||
          rawQ.includes('expense') && tx.type === 'Expense';
        if (!matchesQuery) return false;
      }

      // Type filter
      if (typeFilter !== 'All' && tx.type !== typeFilter) return false;

      // Contact filter
      if (contactFilter.trim() && !tx.contact.toLowerCase().includes(contactFilter.trim().toLowerCase())) {
        return false;
      }

      // Ref number filter
      if (refQuery.trim() && !tx.rawRef.toLowerCase().includes(refQuery.trim().toLowerCase())) {
        return false;
      }

      // Min amount filter
      if (minAmount && tx.amount < Number(minAmount)) return false;

      return true;
    });
  }, [allStoreTransactions, rawQ, typeFilter, contactFilter, refQuery, minAmount]);

  // 2. Filter contacts from live store + server
  const filteredContacts = useMemo(() => {
    const customers = (state.customers || []).map(c => ({
      id: c.id,
      title: c.displayName,
      subtitle: `${c.company || 'Direct Client'} • ${c.email || ''}`,
      type: 'Customer',
      viewId: 'customers_list'
    }));
    const vendors = (state.vendors || []).map(v => ({
      id: v.id,
      title: v.displayName,
      subtitle: `${v.company || 'Supplier'} • ${v.email || ''}`,
      type: 'Vendor',
      viewId: 'vendors'
    }));

    const combined = [...customers, ...vendors];

    if (!rawQ) return combined;

    return combined.filter(c => 
      c.title.toLowerCase().includes(rawQ) ||
      c.subtitle.toLowerCase().includes(rawQ) ||
      c.type.toLowerCase().includes(rawQ)
    );
  }, [state.customers, state.vendors, rawQ]);

  // 3. Filter reports
  const filteredReports = useMemo(() => {
    if (!rawQ) return ALL_REPORTS;
    return ALL_REPORTS.filter(r => 
      r.title.toLowerCase().includes(rawQ) ||
      r.subtitle.toLowerCase().includes(rawQ) ||
      r.category.toLowerCase().includes(rawQ)
    );
  }, [rawQ]);

  // 4. Filter accounts
  const filteredAccounts = useMemo(() => {
    const accs = state.accounts || [];
    if (!rawQ) return accs;
    return accs.filter(a => 
      (a.name || '').toLowerCase().includes(rawQ) ||
      (a.code || '').toLowerCase().includes(rawQ) ||
      (a.type || '').toLowerCase().includes(rawQ)
    );
  }, [state.accounts, rawQ]);

  // 5. Filter modules & pages
  const filteredModules = useMemo(() => {
    if (!rawQ) return ALL_MODULES;
    return ALL_MODULES.filter(m => 
      m.label.toLowerCase().includes(rawQ) ||
      m.subtitle.toLowerCase().includes(rawQ) ||
      m.category.toLowerCase().includes(rawQ)
    );
  }, [rawQ]);

  const handleExportCSV = () => {
    const headers = ['Date', 'Type', 'Ref No', 'Contact', 'Due Date', 'Amount', 'Memo'];
    const rows = filteredTransactions.map(t => [
      `"${t.date}"`,
      `"${t.type}"`,
      `"${t.refNo}"`,
      `"${t.contact}"`,
      `"${t.dueDate}"`,
      `"${t.amount}"`,
      `"${t.memo.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `messo_search_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full bg-white min-h-[calc(100vh-56px)] px-6 sm:px-10 py-6 overflow-y-auto select-none">
      {/* 1. Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[26px] font-bold text-[#393A3D]">
            Search results
          </h1>
          <div className="text-[14px] text-[#6B6C72] mt-1 flex items-center gap-2">
            <span>Showing live records for:</span>
            <span className="text-[#0077C5] font-semibold bg-blue-50 px-2 py-0.5 rounded">
              "{query || 'All Books'}"
            </span>
            <span className="text-gray-400">({filteredTransactions.length} transactions, {filteredContacts.length} contacts, {filteredReports.length} reports)</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[14px]">
          <button 
            type="button"
            onClick={() => onNavigate ? onNavigate('sales_transactions') : (window.location.hash = '#/sales')}
            className="text-[#0077C5] hover:underline cursor-pointer font-medium"
          >
            Go to Sales Transactions
          </button>
          <span className="text-[#6B6C72]">·</span>
          <button 
            type="button"
            onClick={() => onNavigate ? onNavigate('expense_transactions') : (window.location.hash = '#/expenses')}
            className="text-[#0077C5] hover:underline cursor-pointer font-medium"
          >
            Go to Expenses
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex items-center space-x-8 border-b border-[#D4D7DC] mb-6 text-[15px] font-medium overflow-x-auto">
        {[
          { id: 'all', label: `All (${filteredTransactions.length + filteredContacts.length + filteredReports.length})` },
          { id: 'transactions', label: `Transactions (${filteredTransactions.length})` },
          { id: 'contacts', label: `Contacts (${filteredContacts.length})` },
          { id: 'reports', label: `Reports (${filteredReports.length})` },
          { id: 'modules', label: `Pages & Apps (${filteredModules.length})` },
          { id: 'accounts', label: `Accounts (${filteredAccounts.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 transition cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-[#393A3D] font-bold border-b-[3px] border-[#2CA01C] -mb-[2px]'
                : 'text-[#6B6C72] hover:text-[#393A3D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live AI Summary Banner if query returned insight */}
      {liveResults?.ai_summary && (
        <div className="w-full bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-[8px] p-4 flex items-start justify-between mb-6 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#008927] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#393A3D] flex items-center space-x-2">
                <span>MESSO Ledger Intelligence</span>
                <span className="text-[10px] uppercase tracking-wider bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">Live AI</span>
              </div>
              <div className="text-[14px] text-[#4A4B4E] mt-1 leading-relaxed">
                {liveResults.ai_summary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Filter Bar */}
      <div className="mb-6 space-y-4 bg-gray-50/60 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3.5">
            {/* 1. Transaction type */}
            <div>
              <label className="block text-[12px] font-bold text-[#6B6C72] uppercase tracking-wide mb-1">
                Transaction type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-[38px] px-3 border border-[#8D9096] rounded-[4px] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5] cursor-pointer"
              >
                <option value="All">All Types</option>
                <option value="Invoice">Invoices</option>
                <option value="Bill">Vendor Bills</option>
                <option value="Expense">Expenses</option>
                <option value="Bank Feed">Bank Feeds</option>
              </select>
            </div>

            {/* 2. Contact filter */}
            <div>
              <label className="block text-[12px] font-bold text-[#6B6C72] uppercase tracking-wide mb-1">
                Customer / Vendor
              </label>
              <input
                type="text"
                value={contactFilter}
                onChange={(e) => setContactFilter(e.target.value)}
                placeholder="Filter by contact..."
                className="h-[38px] px-3 w-[180px] border border-[#8D9096] rounded-[4px] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5]"
              />
            </div>

            {/* 3. Reference number */}
            <div>
              <label className="block text-[12px] font-bold text-[#6B6C72] uppercase tracking-wide mb-1">
                Ref / Doc Number
              </label>
              <input
                type="text"
                value={refQuery}
                onChange={(e) => setRefQuery(e.target.value)}
                placeholder="e.g. 1037"
                className="h-[38px] px-3 w-[140px] border border-[#8D9096] rounded-[4px] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5]"
              />
            </div>

            {/* 4. Min Amount */}
            <div>
              <label className="block text-[12px] font-bold text-[#6B6C72] uppercase tracking-wide mb-1">
                Min Amount (₹)
              </label>
              <input
                type="number"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="0"
                className="h-[38px] px-3 w-[120px] border border-[#8D9096] rounded-[4px] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5]"
              />
            </div>

            {(typeFilter !== 'All' || contactFilter || refQuery || minAmount) && (
              <button
                type="button"
                onClick={() => {
                  setTypeFilter('All');
                  setContactFilter('');
                  setRefQuery('');
                  setMinAmount('');
                }}
                className="h-[38px] px-3 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Right Action Stack: Print / Export */}
          <div className="flex items-center space-x-3 text-[#393A3D]">
            <button 
              type="button"
              onClick={handlePrint}
              className="p-2 border border-gray-300 rounded hover:bg-white cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold" 
              title="Print results"
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
            <button 
              type="button"
              onClick={handleExportCSV}
              className="p-2 border border-gray-300 rounded hover:bg-white cursor-pointer transition flex items-center gap-1.5 text-xs font-semibold" 
              title="Export results"
            >
              <Share2 size={16} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Tab: Pages & Apps ── */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Matching Navigation Modules ({filteredModules.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredModules.map((m) => (
              <div
                key={m.id}
                onClick={() => onNavigate ? onNavigate(m.id) : (window.location.hash = `#/${m.id}`)}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-[#0077C5] hover:bg-blue-50/30 transition cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                  <img src={m.iconUrl} alt={m.label} className="w-full h-full object-contain block group-hover:scale-105 transition" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0077C5] truncate">{m.label}</h3>
                  <p className="text-xs text-gray-500 truncate">{m.subtitle}</p>
                </div>
                <ArrowRight size={15} className="text-gray-300 group-hover:text-[#0077C5] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Reports View ── */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Reports ({filteredReports.length})</h2>
          {filteredReports.map((r, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate ? onNavigate(r.id) : (window.location.hash = '#' + r.id)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#0077C5] hover:bg-blue-50/30 transition cursor-pointer"
            >
              <div>
                <h3 className="text-base font-bold text-gray-900">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.subtitle} • {r.category}</p>
              </div>
              <span className="text-xs font-semibold text-[#0077C5] bg-blue-50 px-3 py-1 rounded-full">
                Open Report →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Tab: Contacts View ── */}
      {activeTab === 'contacts' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Contacts & Customers ({filteredContacts.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredContacts.map((c, idx) => (
              <div
                key={idx}
                onClick={() => onNavigate ? onNavigate(c.viewId) : (window.location.hash = '#' + c.viewId)}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-[#0077C5] hover:bg-blue-50/30 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{c.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{c.subtitle}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#0077C5] bg-blue-50 px-3 py-1 rounded-full">
                  View {c.type} →
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Accounts View ── */}
      {activeTab === 'accounts' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Chart of Accounts ({filteredAccounts.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredAccounts.map((a) => (
              <div
                key={a.id}
                onClick={() => onNavigate ? onNavigate('chart_of_accounts') : (window.location.hash = '#/chart-of-accounts')}
                className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-[#0077C5] hover:bg-blue-50/30 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                  <Landmark size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-gray-900 truncate">{a.code ? `${a.code} - ` : ''}{a.name}</h3>
                  <p className="text-xs text-gray-500 uppercase">{a.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Table: Transactions or All ── */}
      {(activeTab === 'transactions' || activeTab === 'all') && (
        <div className="w-full space-y-4">
          <div className="w-full overflow-x-auto border border-[#E3E5E8] rounded-xl shadow-xs">
            <div className="min-w-[1100px]">
              {/* Table Header Row */}
              <div className="grid grid-cols-[130px_130px_140px_320px_140px_130px_140px_1fr] items-center text-[12px] font-bold text-[#393A3D] uppercase tracking-wider px-4 py-3 bg-[#F9FAFB] border-b border-[#E3E5E8]">
                <div>DATE</div>
                <div>TYPE</div>
                <div>REF NO.</div>
                <div>CONTACT / PAYEE</div>
                <div>DUE DATE</div>
                <div className="text-right">BALANCE</div>
                <div className="text-right">AMOUNT</div>
                <div className="pl-4">MEMO / DESCRIPTION</div>
              </div>

              {/* Table Data Rows */}
              <div className="divide-y divide-[#E3E5E8] bg-white">
                {filteredTransactions.map((row, idx) => (
                  <div
                    key={`${row.type}-${row.id}-${idx}`}
                    className="grid grid-cols-[130px_130px_140px_320px_140px_130px_140px_1fr] items-center h-[52px] px-4 text-[14px] text-[#393A3D] hover:bg-blue-50/30 transition"
                  >
                    <div className="text-xs text-gray-600">{row.date}</div>
                    <div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        row.type === 'Invoice' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        row.type === 'Bill' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        row.type === 'Expense' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {row.type}
                      </span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => onNavigate ? onNavigate(row.viewId) : (window.location.hash = `#/${row.viewId}`)}
                        className="text-[#0077C5] hover:underline font-bold cursor-pointer"
                      >
                        {row.refNo}
                      </button>
                    </div>
                    <div className="truncate pr-2 font-medium text-gray-800">
                      {row.contact}
                    </div>
                    <div className="text-xs text-gray-500">{row.dueDate}</div>
                    <div className="text-right tabular-nums text-xs font-semibold text-gray-600">
                      {row.balance > 0 ? formatMoney(row.balance) : '—'}
                    </div>
                    <div className="text-right tabular-nums font-bold text-gray-900">
                      {formatMoney(row.amount)}
                    </div>
                    <div className="pl-4 text-xs text-gray-500 truncate">
                      {row.memo || "—"}
                    </div>
                  </div>
                ))}

                {filteredTransactions.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    <Search size={28} className="mx-auto text-gray-300 mb-2" />
                    <div className="text-sm font-semibold">No transactions match your current search and filters.</div>
                    <p className="text-xs text-gray-400 mt-1">Try clearing filters or changing your search term.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
