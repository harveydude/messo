import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Sparkles, 
  FileText, 
  User, 
  TrendingUp, 
  ArrowRight, 
  LayoutGrid, 
  Receipt, 
  Landmark, 
  Calendar, 
  X, 
  Building, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Layers, 
  BookOpen, 
  Clock, 
  CreditCard 
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';
import api from '../api/client';

export const ALL_MODULES = [
  { id: 'bank_transactions', label: 'Bank Transactions', subtitle: 'Banking, bank feeds and account registers', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
  { id: 'chart_of_accounts', label: 'Chart of Accounts', subtitle: 'General ledger, account codes and balances', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
  { id: 'invoices', label: 'Invoices', subtitle: 'Customer billing, invoice editor and status', iconUrl: '/app-icons/sales.png', category: 'Sales' },
  { id: 'sales_transactions', label: 'Sales Transactions', subtitle: 'Sales invoices, orders and customer ledger', iconUrl: '/app-icons/sales.png', category: 'Sales' },
  { id: 'expense_transactions', label: 'Expense Transactions', subtitle: 'Purchases, vendor expenses and spend ledger', iconUrl: '/app-icons/expenses.png', category: 'Expenses' },
  { id: 'bills', label: 'Bills & MSME Pays', subtitle: 'Accounts payable, vendor bills and MSME payments', iconUrl: '/app-icons/bills.png', category: 'Expenses' },
  { id: 'vendors', label: 'Vendors Directory', subtitle: 'Suppliers, payables and vendor contacts', iconUrl: '/app-icons/bills.png', category: 'Expenses' },
  { id: 'customers_list', label: 'Customers', subtitle: 'Customer directory, contact info and balances', iconUrl: '/app-icons/customers.png', category: 'Customers' },
  { id: 'customer_hub', label: 'Customer Hub', subtitle: 'Client CRM, quotes and customer overview', iconUrl: '/app-icons/customer_hub.png', category: 'Customers' },
  { id: 'sales_tax', label: 'GST Returns (GSTR-1 & 3B)', subtitle: 'GST returns, tax liability and HSN compliance', iconUrl: '/app-icons/gst.png', category: 'Tax' },
  { id: 'business_tax', label: 'TDS & Direct Tax', subtitle: 'TDS challans, Form 26Q and withholding tax', iconUrl: '/app-icons/tds.png', category: 'Tax' },
  { id: 'standard_reports', label: 'Reports & Analytics', subtitle: 'Financial statements, P&L and Balance Sheet', iconUrl: '/app-icons/reports.png', category: 'Reports' },
  { id: 'team', label: 'Team', subtitle: 'Employees, hourly rates and permission access', iconUrl: '/app-icons/team.png', category: 'Team' },
  { id: 'time_entries', label: 'Time Tracking', subtitle: 'Billable hours, timesheets and hourly rates', iconUrl: '/app-icons/time.png', category: 'Time' },
  { id: 'payroll', label: 'Payroll', subtitle: 'Salary runs, gross to net calculations and pay', iconUrl: '/app-icons/payroll.png', category: 'Payroll' },
  { id: 'lending', label: 'Lending & Credit', subtitle: 'Business loans, EMI amortisation and repayment', iconUrl: '/app-icons/tag_marketing.png', category: 'Lending' },
  { id: 'marketing', label: 'Marketing Campaigns', subtitle: 'Campaign budgets, spend and attribution ROI', iconUrl: '/app-icons/tag_marketing.png', category: 'Marketing' },
  { id: 'reconcile', label: 'Reconcile', subtitle: 'Bank statement matching and ledger reconciliation', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
  { id: 'rules', label: 'Bank Rules', subtitle: 'Automated bank categorization rules', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
  { id: 'audit_log', label: 'Audit Log', subtitle: 'System events, user changes and activity tracking', iconUrl: '/app-icons/accounting.png', category: 'Tools' },
];

export const ALL_REPORTS = [
  { id: 'report_profit_loss', title: 'Profit and Loss', subtitle: 'Income statement, operating revenues and net profit', category: 'Financial Statement' },
  { id: 'balance_sheet', title: 'Balance Sheet', subtitle: 'Assets, liabilities and shareholder equity statement', category: 'Financial Statement' },
  { id: 'report_cash_flow', title: 'Statement of Cash Flows', subtitle: 'Cash receipts and disbursements breakdown', category: 'Financial Statement' },
  { id: 'standard_reports', title: 'Accounts Receivable Aging Summary', subtitle: 'Open customer invoices grouped by overdue aging days', category: 'Aging Report' },
  { id: 'standard_reports', title: 'Accounts Payable Aging Summary', subtitle: 'Unpaid vendor bills grouped by payment due dates', category: 'Aging Report' },
  { id: 'standard_reports', title: 'Standard Reports Hub', subtitle: 'Comprehensive statutory reporting hub', category: 'Hub' },
];

export default function SearchDropdown({ 
  query = '', 
  onSelectResult, 
  onAdvancedSearch,
  onNavigate,
  onClose
}) {
  let state = {};
  try {
    const store = useStore();
    state = store?.state || {};
  } catch {}

  const [activeTab, setActiveTab] = useState('all'); // all, modules, transactions, contacts, reports, accounts
  const [smartData, setSmartData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debounced smart search from backend
  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setSmartData(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      api.smartSearch(query)
        .then(res => {
          if (res?.success) setSmartData(res);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const rawQ = query.trim().toLowerCase();
  const isQueryActive = rawQ.length > 0;

  // Filter modules
  const matchingModules = useMemo(() => {
    if (!isQueryActive) return ALL_MODULES.slice(0, 8);
    return ALL_MODULES.filter(m => 
      m.label.toLowerCase().includes(rawQ) || 
      m.subtitle.toLowerCase().includes(rawQ) ||
      m.category.toLowerCase().includes(rawQ) ||
      m.id.toLowerCase().includes(rawQ)
    );
  }, [rawQ, isQueryActive]);

  // Filter reports
  const matchingReports = useMemo(() => {
    if (!isQueryActive) return ALL_REPORTS.slice(0, 4);
    return ALL_REPORTS.filter(r => 
      r.title.toLowerCase().includes(rawQ) || 
      r.subtitle.toLowerCase().includes(rawQ) ||
      r.category.toLowerCase().includes(rawQ)
    );
  }, [rawQ, isQueryActive]);

  // Filter local store transactions
  const matchingTransactions = useMemo(() => {
    const invoices = state.invoices || [];
    const bills = state.bills || [];
    const expenses = state.expenses || [];
    const bankTxns = state.bankTxns || [];

    if (!isQueryActive) {
      // Return recent mix
      const recentInv = invoices.slice(0, 4).map(i => {
        const amt = i.total || (i.lines || []).reduce((s, l) => s + (l.qty * l.rate), 0);
        return {
          id: i.id,
          type: 'Invoice',
          refNo: i.no ? `#${i.no}` : `#${i.id}`,
          title: `Invoice #${i.no || i.id}`,
          contact: i.customerId || 'Customer',
          date: i.date || 'Recent',
          amount: amt,
          status: i.status || 'Active',
          viewId: 'invoices'
        };
      });
      const recentExp = expenses.slice(0, 2).map(e => ({
        id: e.id,
        type: 'Expense',
        refNo: e.refNo ? `#${e.refNo}` : 'Expense',
        title: `Expense - ${e.payee || 'Vendor'}`,
        contact: e.payee || 'Expense',
        date: e.date || 'Recent',
        amount: (e.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0),
        status: 'Recorded',
        viewId: 'expense_transactions'
      }));
      return [...recentInv, ...recentExp];
    }

    const res = [];

    // Search invoices
    for (const inv of invoices) {
      const invNo = String(inv.no || inv.id || '');
      const cust = String(inv.customerId || '');
      const status = String(inv.status || '');
      const linesDesc = (inv.lines || []).map(l => l.desc || '').join(' ');
      const amt = inv.total || (inv.lines || []).reduce((s, l) => s + (l.qty * l.rate), 0);

      if (
        invNo.toLowerCase().includes(rawQ) ||
        cust.toLowerCase().includes(rawQ) ||
        status.toLowerCase().includes(rawQ) ||
        linesDesc.toLowerCase().includes(rawQ) ||
        String(amt).includes(rawQ) ||
        rawQ.includes('invoice')
      ) {
        res.push({
          id: inv.id,
          type: 'Invoice',
          refNo: `#${invNo}`,
          title: `Invoice #${invNo}`,
          contact: cust || 'Customer',
          date: inv.date || '',
          amount: amt,
          status,
          viewId: 'invoices'
        });
      }
    }

    // Search bills
    for (const bill of bills) {
      const billNo = String(bill.no || bill.id || '');
      const vendor = String(bill.vendorId || '');
      const status = String(bill.status || '');
      const amt = (bill.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);

      if (
        billNo.toLowerCase().includes(rawQ) ||
        vendor.toLowerCase().includes(rawQ) ||
        status.toLowerCase().includes(rawQ) ||
        String(amt).includes(rawQ) ||
        rawQ.includes('bill')
      ) {
        res.push({
          id: bill.id,
          type: 'Bill',
          refNo: `#${billNo}`,
          title: `Vendor Bill #${billNo}`,
          contact: vendor || 'Vendor',
          date: bill.date || '',
          amount: amt,
          status,
          viewId: 'bills'
        });
      }
    }

    // Search expenses
    for (const exp of expenses) {
      const payee = String(exp.payee || '');
      const ref = String(exp.refNo || '');
      const amt = (exp.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);

      if (
        payee.toLowerCase().includes(rawQ) ||
        ref.toLowerCase().includes(rawQ) ||
        String(amt).includes(rawQ) ||
        rawQ.includes('expense')
      ) {
        res.push({
          id: exp.id,
          type: 'Expense',
          refNo: ref ? `#${ref}` : 'Expense',
          title: `Expense - ${payee || 'Paid'}`,
          contact: payee || 'Payee',
          date: exp.date || '',
          amount: amt,
          status: 'Recorded',
          viewId: 'expense_transactions'
        });
      }
    }

    // Search bank transactions
    for (const b of bankTxns) {
      const desc = String(b.desc || '');
      const payee = String(b.payee || '');
      const amt = Number(b.amount) || 0;

      if (
        desc.toLowerCase().includes(rawQ) ||
        payee.toLowerCase().includes(rawQ) ||
        String(amt).includes(rawQ) ||
        rawQ.includes('bank')
      ) {
        res.push({
          id: b.id,
          type: 'Bank Feed',
          refNo: `Bank #${b.id}`,
          title: desc || payee || 'Bank Entry',
          contact: payee || desc,
          date: b.date || '',
          amount: amt,
          status: b.status || 'To Review',
          viewId: 'bank_transactions'
        });
      }
    }

    // Merge server transactions if present
    if (smartData?.transactions?.length > 0) {
      for (const st of smartData.transactions) {
        if (!res.some(r => r.refNo === `#${st.doc_number || st.invoice_number}`)) {
          res.push({
            id: st.id,
            type: st.type || 'Invoice',
            refNo: `#${st.doc_number || st.invoice_number || st.id}`,
            title: st.title || `Transaction #${st.id}`,
            contact: st.contact_name || st.customer_name || 'Customer',
            date: st.date || '',
            amount: Number(st.total_inr) || 0,
            status: st.status || 'Active',
            viewId: 'invoices'
          });
        }
      }
    }

    return res;
  }, [state.invoices, state.bills, state.expenses, state.bankTxns, smartData, rawQ, isQueryActive]);

  // Filter contacts (customers & vendors)
  const matchingContacts = useMemo(() => {
    const customers = state.customers || [];
    const vendors = state.vendors || [];

    if (!isQueryActive) {
      const topCust = customers.slice(0, 3).map(c => ({
        id: c.id,
        name: c.displayName,
        company: c.company,
        email: c.email,
        type: 'Customer',
        viewId: 'customers_list'
      }));
      const topVend = vendors.slice(0, 2).map(v => ({
        id: v.id,
        name: v.displayName,
        company: v.company,
        email: v.email,
        type: 'Vendor',
        viewId: 'vendors'
      }));
      return [...topCust, ...topVend];
    }

    const list = [];
    for (const c of customers) {
      if (
        (c.displayName || '').toLowerCase().includes(rawQ) ||
        (c.company || '').toLowerCase().includes(rawQ) ||
        (c.email || '').toLowerCase().includes(rawQ) ||
        (c.phone || '').includes(rawQ) ||
        rawQ.includes('customer')
      ) {
        list.push({
          id: c.id,
          name: c.displayName,
          company: c.company,
          email: c.email,
          type: 'Customer',
          viewId: 'customers_list'
        });
      }
    }

    for (const v of vendors) {
      if (
        (v.displayName || '').toLowerCase().includes(rawQ) ||
        (v.company || '').toLowerCase().includes(rawQ) ||
        (v.email || '').toLowerCase().includes(rawQ) ||
        (v.phone || '').includes(rawQ) ||
        rawQ.includes('vendor')
      ) {
        list.push({
          id: v.id,
          name: v.displayName,
          company: v.company,
          email: v.email,
          type: 'Vendor',
          viewId: 'vendors'
        });
      }
    }

    // Merge server contacts if present
    if (smartData?.contacts?.length > 0) {
      for (const sc of smartData.contacts) {
        if (!list.some(l => l.name === sc.title)) {
          list.push({
            id: sc.id,
            name: sc.title,
            company: sc.subtitle,
            email: '',
            type: sc.type === 'VENDOR' ? 'Vendor' : 'Customer',
            viewId: sc.type === 'VENDOR' ? 'vendors' : 'customers_list'
          });
        }
      }
    }

    return list;
  }, [state.customers, state.vendors, smartData, rawQ, isQueryActive]);

  // Filter accounts
  const matchingAccounts = useMemo(() => {
    const accs = state.accounts || [];
    if (!isQueryActive) return accs.slice(0, 4);
    return accs.filter(a => 
      (a.name || '').toLowerCase().includes(rawQ) ||
      (a.code || '').toLowerCase().includes(rawQ) ||
      (a.type || '').toLowerCase().includes(rawQ) ||
      rawQ.includes('account')
    );
  }, [state.accounts, rawQ, isQueryActive]);

  const handleNavigate = (viewId, param = null) => {
    if (onClose) onClose();
    if (onNavigate) {
      onNavigate(viewId, param);
    } else if (onSelectResult) {
      onSelectResult(viewId);
    }
  };

  const handleExecuteAdvancedSearch = () => {
    if (onClose) onClose();
    if (onAdvancedSearch) {
      onAdvancedSearch(query || 'Show me open invoices for the last 30 days');
    } else if (onNavigate) {
      onNavigate('search_results', { q: query || '' });
    }
  };

  const totalResultsCount = 
    matchingModules.length + 
    matchingTransactions.length + 
    matchingContacts.length + 
    matchingReports.length + 
    matchingAccounts.length;

  return (
    <div 
      className="w-full bg-white border border-[#D5D8DC] rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.18)] overflow-hidden select-none animate-in fade-in duration-150 flex flex-col text-left"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── 1. Top Filter Tabs ── */}
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-[#E3E5E8] bg-[#F9FAFB] overflow-x-auto no-scrollbar">
        {[
          { id: 'all', label: 'All Results', count: totalResultsCount },
          { id: 'modules', label: 'Pages & Apps', count: matchingModules.length },
          { id: 'transactions', label: 'Transactions', count: matchingTransactions.length },
          { id: 'contacts', label: 'Contacts', count: matchingContacts.length },
          { id: 'reports', label: 'Reports', count: matchingReports.length },
          { id: 'accounts', label: 'Accounts', count: matchingAccounts.length },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-[#0077C5] text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── 2. Scrollable Body ── */}
      <div className="max-h-[480px] overflow-y-auto px-4 py-3 divide-y divide-gray-100 space-y-3">
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#0077C5] py-1 px-1 animate-pulse">
            <Sparkles size={14} className="text-[#0077C5]" />
            <span>Searching continuous accounting ledger...</span>
          </div>
        )}

        {/* AI Answer Card if question */}
        {smartData?.type === 'QNA' && smartData?.answer && (
          <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 shadow-2xs mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide mb-1">
              <Sparkles size={14} className="text-emerald-600" />
              <span>MESSO Intelligence Insights</span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-gray-800">
              {smartData.answer}
            </p>
          </div>
        )}

        {/* ── Section A: Pages & Apps ── */}
        {(activeTab === 'all' || activeTab === 'modules') && matchingModules.length > 0 && (
          <div className="pt-2 first:pt-0">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>Pages & Modules ({matchingModules.length})</span>
              <span className="text-[10px] lowercase text-gray-400 font-normal">click to open directly</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingModules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleNavigate(mod.id)}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:border-[#0077C5] hover:bg-blue-50/40 transition group cursor-pointer text-left w-full"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    <img src={mod.iconUrl} alt={mod.label} className="w-full h-full object-contain block group-hover:scale-105 transition" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-[#0077C5]">
                      {mod.label}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {mod.subtitle}
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-[#0077C5] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Section B: Transactions ── */}
        {(activeTab === 'all' || activeTab === 'transactions') && matchingTransactions.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>Transactions & Vouchers ({matchingTransactions.length})</span>
              <span className="text-[10px] lowercase text-gray-400 font-normal">live store entries</span>
            </div>
            <div className="space-y-1">
              {matchingTransactions.slice(0, activeTab === 'all' ? 5 : 20).map((t, idx) => (
                <div
                  key={`${t.type}-${t.id}-${idx}`}
                  onClick={() => handleNavigate(t.viewId)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 ${
                      t.type === 'Invoice' ? 'bg-blue-100 text-blue-700' :
                      t.type === 'Bill' ? 'bg-emerald-100 text-emerald-700' :
                      t.type === 'Expense' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {t.type === 'Invoice' ? 'INV' : t.type === 'Bill' ? 'BIL' : t.type === 'Expense' ? 'EXP' : 'BNK'}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900 group-hover:text-[#0077C5] truncate">
                        {t.title}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-2">
                        <span>{t.contact}</span>
                        {t.date && <span>• {t.date}</span>}
                        {t.status && <span className="px-1.5 py-0.2 bg-gray-100 rounded text-[10px] font-medium text-gray-600">{t.status}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-2">
                    <div className="text-[13px] font-bold text-gray-900 tabular-nums">
                      {formatMoney(t.amount)}
                    </div>
                    <div className="text-[10px] text-[#0077C5] group-hover:underline">
                      View details →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section C: Contacts (Customers & Vendors) ── */}
        {(activeTab === 'all' || activeTab === 'contacts') && matchingContacts.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>Contacts & Customers ({matchingContacts.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingContacts.slice(0, activeTab === 'all' ? 4 : 20).map((c, idx) => (
                <div
                  key={`${c.id}-${idx}`}
                  onClick={() => handleNavigate(c.viewId)}
                  className="flex items-center gap-2.5 p-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-gray-900 truncate group-hover:text-[#0077C5]">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {c.type} {c.company ? `• ${c.company}` : ''}
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-700">Open</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section D: Reports & Analytics ── */}
        {(activeTab === 'all' || activeTab === 'reports') && matchingReports.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>Financial Reports ({matchingReports.length})</span>
            </div>
            <div className="space-y-1">
              {matchingReports.map((r) => (
                <div
                  key={r.title}
                  onClick={() => handleNavigate(r.id)}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50/40 border border-transparent hover:border-blue-200 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <TrendingUp size={15} className="text-[#0077C5] shrink-0" />
                    <span className="text-[13px] font-semibold text-gray-900 group-hover:text-[#0077C5] truncate">{r.title}</span>
                    <span className="text-[11px] text-gray-400 hidden sm:inline truncate">— {r.subtitle}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#0077C5] bg-blue-50 px-2 py-0.5 rounded shrink-0">
                    View
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Section E: Chart of Accounts Ledgers ── */}
        {(activeTab === 'all' || activeTab === 'accounts') && matchingAccounts.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>Accounts & Ledgers ({matchingAccounts.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matchingAccounts.slice(0, activeTab === 'all' ? 4 : 20).map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleNavigate('chart_of_accounts')}
                  className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition cursor-pointer"
                >
                  <Landmark size={14} className="text-gray-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-gray-900 truncate">
                      {a.code ? `${a.code} - ` : ''}{a.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate uppercase font-semibold">
                      {a.type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when query produces zero matches */}
        {totalResultsCount === 0 && (
          <div className="py-8 text-center space-y-2">
            <Search size={28} className="mx-auto text-gray-300" />
            <div className="text-[14px] font-semibold text-gray-800">
              No results found for "{query}"
            </div>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              You can search for any invoice, customer, bill, expense, report, or jump straight to our modules below.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleExecuteAdvancedSearch}
                className="px-4 py-1.5 rounded-lg bg-[#0077C5] hover:bg-[#005FA3] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                Open Full Search Results Hub
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── 3. Footer Bar with Shortcuts & Advanced Search ── */}
      <div className="bg-[#F4F5F8] border-t border-[#E3E5E8] px-4 py-2.5 flex items-center justify-between text-xs text-[#6B6C72]">
        <div className="flex items-center gap-2">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-mono text-[11px] text-gray-800 font-bold">Enter</kbd> to search all books</span>
          <span className="text-gray-300">•</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-mono text-[11px] text-gray-800 font-bold">Esc</kbd> to close</span>
        </div>
        <button 
          type="button"
          onClick={handleExecuteAdvancedSearch}
          className="text-[#0077C5] font-semibold hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>Advanced search</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
