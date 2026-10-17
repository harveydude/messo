import React, { useState, useEffect } from 'react';
import {
  Plus,
  Bookmark,
  LayoutGrid,
  TrendingUp,
  Grid,
  Activity,
  CreditCard,
  BarChart2,
  Sliders,
  ChevronDown,
  Gem,
  PanelLeftClose,
  X,
  Lock,
} from 'lucide-react';

/* ── Master App Categories & Subtabs (Allotted HD Circular Tokens from Master Specification) ── */
const APP_GROUPS = [
  {
    key: 'accounting',
    label: 'Accounting',
    letter: 'A',
    iconUrl: '/app-icons/accounting.png',
    badgeBg: '#00352C',
    badgeText: '#8FF0BD',
    defaultView: 'bank_transactions',
    items: [
      { id: 'bank_transactions', label: 'Bank transactions', view: 'bank_transactions' },
      { id: 'integration_transactions', label: 'Integration transactions', view: 'find_integrations' },
      { id: 'receipts', label: 'Receipts', view: 'expense_transactions' },
      { id: 'reconcile', label: 'Reconcile', view: 'reconcile' },
      { id: 'rules', label: 'Rules', view: 'rules' },
      { id: 'chart_of_accounts', label: 'Chart of accounts', view: 'chart_of_accounts' },
      { id: 'recurring_transactions', label: 'Recurring transactions', view: 'recurring_transactions' },
      { id: 'my_accountant', label: 'My accountant', view: 'accountant' },
    ],
  },
  {
    key: 'expenses',
    label: 'Expenses & Pay Bills',
    letter: 'E',
    iconUrl: '/app-icons/expenses.png',
    badgeBg: '#0AA574',
    badgeText: '#FFFFFF',
    defaultView: 'expense_transactions',
    items: [
      { id: 'expense_transactions', label: 'Expense transactions', view: 'expense_transactions' },
      { id: 'vendors', label: 'Vendors', view: 'vendors' },
      { id: 'bills', label: 'Bills', view: 'bills' },
      { id: 'bill_payments', label: 'Bill payments', view: 'bills' },
      { id: 'mileage', label: 'Mileage', view: 'mileage' },
      { id: 'contractors', label: 'Contractors', view: 'team' },
      { id: '1099s', label: '1099s', view: 'business_tax' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales & Get Paid',
    letter: 'S',
    iconUrl: '/app-icons/sales.png',
    badgeBg: '#005E5D',
    badgeText: '#FFFFFF',
    defaultView: 'sales_transactions',
    items: [
      { id: 'overview', label: 'Overview', view: 'sales_transactions' },
      { id: 'sales_transactions', label: 'Sales transactions', view: 'sales_transactions' },
      { id: 'invoices', label: 'Invoices', view: 'invoices' },
      { id: 'estimates', label: 'Estimates', view: 'estimates' },
      { id: 'recurring_payments', label: 'Recurring payments', view: 'recurring_transactions' },
      { id: 'orders', label: 'Sales orders', view: 'orders' },
      { id: 'sales_channels', label: 'Sales channels', view: 'find_integrations' },
      { id: 'messo_payouts', label: 'MESSO payouts', view: 'sales_transactions' },
      { id: 'channel_payouts', label: 'Channel payouts', view: 'sales_transactions' },
      { id: 'products_services', label: 'Products & services', view: 'products_services' },
    ],
  },
  {
    key: 'sales_tax',
    label: 'GST Returns',
    letter: 'G',
    iconUrl: '/app-icons/gst.jpg',
    badgeBg: '#E5346B',
    badgeText: '#FFFFFF',
    defaultView: 'sales_tax',
    items: [
      { id: 'sales_tax_overview', label: 'GST Returns (GSTR-1 & 3B)', view: 'sales_tax' },
    ],
  },
  {
    key: 'business_tax',
    label: 'TDS & Direct Tax',
    letter: 'T',
    iconUrl: '/app-icons/gst.jpg',
    badgeBg: '#83243F',
    badgeText: '#FFFFFF',
    defaultView: 'business_tax',
    items: [
      { id: 'business_tax_overview', label: 'TDS Withholding & 26Q', view: 'business_tax' },
    ],
  },
  {
    key: 'bills_app',
    label: 'Bills & MSME Pays',
    letter: 'B',
    iconUrl: '/app-icons/bills.png',
    badgeBg: '#107C41',
    badgeText: '#FFFFFF',
    defaultView: 'bills',
    items: [
      { id: 'bills_overview', label: 'Unpaid bills', view: 'bills' },
      { id: 'msme_tracker', label: 'MSME 45-day tracker', view: 'bills' },
      { id: 'vendor_credits', label: 'Vendor credits', view: 'bills' },
    ],
  },
  {
    key: 'customers_app',
    label: 'Customers',
    letter: 'C',
    iconUrl: '/app-icons/customers.png',
    badgeBg: '#00828A',
    badgeText: '#FFFFFF',
    defaultView: 'customers_list',
    items: [
      { id: 'customers_list_sub', label: 'Customer directory', view: 'customers_list' },
      { id: 'customer_types_sub', label: 'Customer types', view: 'customers_list' },
    ],
  },
  {
    key: 'reports_app',
    label: 'Reports',
    letter: 'R',
    iconUrl: '/app-icons/reports.jpg',
    badgeBg: '#0077C5',
    badgeText: '#FFFFFF',
    defaultView: 'standard_reports',
    items: [
      { id: 'standard_rep', label: 'Standard reports', view: 'standard_reports' },
      { id: 'balance_sheet_rep', label: 'Balance sheet', view: 'balance_sheet' },
      { id: 'pnl_rep', label: 'Profit & Loss', view: 'report_profit_loss' },
      { id: 'cash_flow_rep', label: 'Cash flow statement', view: 'report_cash_flow' },
      { id: 'mgmt_rep', label: 'Management reports', view: 'management_reports' },
    ],
  },
  {
    key: 'customer_hub',
    label: 'Customer Hub',
    letter: 'H',
    iconUrl: '/app-icons/customer_hub.jpg',
    badgeBg: '#2E9E5B',
    badgeText: '#FFFFFF',
    defaultView: 'customer_hub',
    items: [
      { id: 'hub_overview', label: 'Overview', view: 'customer_hub' },
      { id: 'customers_list', label: 'Customers', view: 'customers_list' },
      { id: 'hub_estimates', label: 'Estimates', view: 'estimates' },
      { id: 'reviews', label: 'Reviews', view: 'customer_hub' },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    letter: 'T',
    iconUrl: '/app-icons/team.jpg',
    badgeBg: '#12A489',
    badgeText: '#FFFFFF',
    defaultView: 'team',
    items: [
      { id: 'employees', label: 'Employees', view: 'team' },
      { id: 'team_contractors', label: 'Contractors', view: 'team' },
      { id: 'workers_comp', label: "Workers' Compensation", view: 'team' },
    ],
  },
  {
    key: 'time',
    label: 'Time Tracking',
    letter: '⏱',
    iconUrl: '/app-icons/time.jpg',
    badgeBg: '#00352C',
    badgeText: '#FFFFFF',
    defaultView: 'time_entries',
    items: [
      { id: 'time_entries', label: 'Time entries', view: 'time_entries' },
      { id: 'time_schedule', label: 'Schedule', view: 'time_entries' },
    ],
  },
  {
    key: 'lending',
    label: 'Lending',
    letter: '₹',
    iconUrl: '/app-icons/tag_marketing.jpg',
    badgeBg: '#0AA574',
    badgeText: '#FFFFFF',
    defaultView: 'lending',
    items: [
      { id: 'lending_overview', label: 'Overview', view: 'lending' },
      { id: 'term_loan', label: 'Term Loan', view: 'lending' },
      { id: 'credit_line', label: 'Credit Line', view: 'lending' },
    ],
  },
];

const DEFAULT_PINS = [
  { id: 'bank_transactions', label: 'Accounting', color: '#107C41', iconKey: 'activity', iconUrl: '/app-icons/accounting.png' },
  { id: 'expense_transactions', label: 'Expenses', color: '#008927', iconKey: 'creditcard', iconUrl: '/app-icons/expenses.png' },
  { id: 'sales_transactions', label: 'Sales', color: '#0077C5', iconKey: 'barchart', iconUrl: '/app-icons/sales.png' },
];

const PIN_ICONS = {
  activity: (sz) => <Activity size={sz} />,
  creditcard: (sz) => <CreditCard size={sz} />,
  barchart: (sz) => <BarChart2 size={sz} />,
  default: (sz) => <LayoutGrid size={sz} />,
};

const PIN_IMAGE_MAP = {
  bank_transactions: '/app-icons/accounting.png',
  expense_transactions: '/app-icons/expenses.png',
  sales_transactions: '/app-icons/sales.png',
  invoices: '/app-icons/sales.png',
  vendors: '/app-icons/expenses.png',
  bills: '/app-icons/bills.png',
  bills_view: '/app-icons/bills.png',
  customers_list: '/app-icons/customers.png',
  standard_reports: '/app-icons/reports.jpg',
  reports: '/app-icons/reports.jpg',
  sales_tax: '/app-icons/gst.jpg',
  business_tax: '/app-icons/gst.jpg',
  team: '/app-icons/team.jpg',
  time_entries: '/app-icons/time.jpg',
  customer_hub: '/app-icons/customer_hub.jpg',
  payroll: '/app-icons/payroll.jpg',
  marketing: '/app-icons/tag_marketing.jpg',
  lending: '/app-icons/tag_marketing.jpg',
};

const FONT = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export default function SideRail({
  currentView = 'dashboard',
  setCurrentView,
  onOpenCreate,
  onToggleCustomize,
  isCustomizing = false,
  pinnedItems,
  onPinnedChange,
}) {
  // Determine if user is currently inside an active app view (Accounting, Expenses, Sales, etc.)
  const isAppTabActive = Boolean(
    currentView && 
    currentView !== 'dashboard' && 
    currentView !== 'onboarding' && 
    currentView !== 'bookmarks' && 
    currentView !== 'feed'
  );

  // Manual toggle state: null = follow isAppTabActive automatically
  const [manualSidebarState, setManualSidebarState] = useState(null);

  // When returning to dashboard, reset manual state so sidebar stays collapsed on dashboard
  useEffect(() => {
    if (currentView === 'dashboard') {
      setManualSidebarState(false);
    } else if (isAppTabActive && manualSidebarState === null) {
      setManualSidebarState(true);
    }
  }, [currentView, isAppTabActive]);

  const isSidebarOpen = manualSidebarState !== null ? manualSidebarState : isAppTabActive;

  // Track accordion state for each group (Accounting, Expenses, Sales expanded by default)
  const [openGroups, setOpenGroups] = useState({
    accounting: true,
    expenses: false,
    sales: false,
    sales_tax: false,
    business_tax: false,
    bills_app: false,
    customers_app: false,
    reports_app: false,
    customer_hub: false,
    team: false,
    time: false,
    lending: false,
  });

  // Premium modal state
  const [premiumModalModule, setPremiumModalModule] = useState(null);

  // Automatically expand the group that matches the currentView
  useEffect(() => {
    for (const grp of APP_GROUPS) {
      if (grp.items.some(it => it.view === currentView || it.id === currentView)) {
        setOpenGroups(prev => ({ ...prev, [grp.key]: true }));
        break;
      }
    }
  }, [currentView]);

  const toggleGroup = (key) => {
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const pins = pinnedItems && pinnedItems.length > 0 ? pinnedItems : DEFAULT_PINS;

  const isRailActive = (id) => {
    if (id === 'dashboard') return currentView === 'dashboard';
    if (id === 'feed') return currentView === 'feed';
    if (id === 'standard_reports' || id === 'reports') {
      return currentView === 'standard_reports' || currentView === 'reports' || currentView.startsWith('report_');
    }
    if (id === 'bookmarks') return currentView === 'bookmarks';
    if (id === 'apps') return isSidebarOpen;
    return currentView === id;
  };

  const isItemActive = (it) => {
    if (it.id === currentView) return true;
    if (it.view === currentView && !APP_GROUPS.some(g => g.items.some(x => x !== it && x.id === currentView))) return true;
    if (currentView === 'sales' && it.id === 'sales_transactions') return true;
    if (currentView === 'expenses' && it.id === 'expense_transactions') return true;
    return false;
  };

  return (
    <div className="flex h-full shrink-0 select-none" style={{ fontFamily: FONT }}>
      {/* ── 1. PRIMARY LEFT RAIL (84px wide, always persistent) ── */}
      <aside 
        className="w-[84px] bg-white border-r border-[#E3E5E8] flex flex-col items-center py-3 px-1 shrink-0 z-20 h-full overflow-y-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Create Button */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="group flex flex-col items-center mb-3 cursor-pointer"
          title="Create new transaction or entry"
        >
          <div className="w-[30px] h-[30px] rounded-full bg-[#008927] hover:bg-[#00701F] text-white flex items-center justify-center shadow-xs transition group-hover:scale-105 active:scale-95">
            <Plus size={16} strokeWidth={2.8} />
          </div>
          <span className="text-[10px] font-semibold text-[#008927] mt-1 group-hover:underline">
            Create
          </span>
        </button>

        {/* Navigation Rail Items */}
        <RailItem
          label="Bookmarks"
          onClick={() => setCurrentView('bookmarks')}
          active={isRailActive('bookmarks')}
        >
          <Bookmark size={18} />
        </RailItem>

        <RailItem
          label="Dashboard"
          onClick={() => setCurrentView('dashboard')}
          active={isRailActive('dashboard')}
          boxed
        >
          <LayoutGrid size={18} />
        </RailItem>

        <RailItem
          label="Feed"
          onClick={() => setCurrentView('feed')}
          active={isRailActive('feed')}
        >
          <Activity size={18} />
        </RailItem>

        <RailItem
          label="Reports"
          onClick={() => setCurrentView('standard_reports')}
          active={isRailActive('standard_reports') || isRailActive('reports')}
        >
          <TrendingUp size={18} />
        </RailItem>

        {/* My Apps Button (toggles the unified sidebar open/closed) */}
        <RailItem
          label="My apps"
          onClick={() => setManualSidebarState(!isSidebarOpen)}
          active={isSidebarOpen}
          boxed
        >
          <Grid size={18} />
        </RailItem>

        {/* PINNED Section */}
        <div className="w-full pt-3 mt-1 border-t border-[#E3E5E8] flex flex-col items-center">
          <div className="w-full flex items-center justify-between px-2 mb-2">
            <span className="text-[9px] font-bold text-[#6B778C] uppercase tracking-wider">PINNED</span>
            <button
              onClick={onToggleCustomize}
              className="text-[9px] font-semibold text-[#008927] hover:underline cursor-pointer"
            >
              Edit
            </button>
          </div>

          {pins.map((pin) => {
            const iconFn = PIN_ICONS[pin.iconKey] || PIN_ICONS.default;
            const imgUrl = pin.iconUrl || PIN_IMAGE_MAP[pin.id];
            return (
              <RailItem
                key={pin.id}
                label={pin.label}
                onClick={() => {
                  setManualSidebarState(true);
                  if (pin.label === 'Accounting') {
                    setCurrentView('bank_transactions');
                    setOpenGroups(prev => ({ ...prev, accounting: true }));
                  } else if (pin.label === 'Expenses') {
                    setCurrentView('expense_transactions');
                    setOpenGroups(prev => ({ ...prev, expenses: true }));
                  } else if (pin.label === 'Sales') {
                    setCurrentView('sales_transactions');
                    setOpenGroups(prev => ({ ...prev, sales: true }));
                  } else {
                    setCurrentView(pin.id);
                  }
                }}
                active={currentView === pin.id}
              >
                {imgUrl ? (
                  <span className="w-[28px] h-[28px] rounded-full overflow-hidden flex items-center justify-center shadow-xs border border-black/10 bg-gray-950">
                    <img src={imgUrl} alt={pin.label} className="w-full h-full object-cover" />
                  </span>
                ) : (
                  <span
                    className="w-[24px] h-[24px] rounded-md flex items-center justify-center text-white shadow-xs"
                    style={{ backgroundColor: pin.color || '#6B6C72' }}
                  >
                    {iconFn(14)}
                  </span>
                )}
              </RailItem>
            );
          })}
        </div>

        {/* Customize button at bottom */}
        <div className="mt-auto pt-2 w-full flex justify-center">
          <RailItem
            label="Customize"
            onClick={onToggleCustomize}
            active={isCustomizing}
          >
            <Sliders size={18} />
          </RailItem>
        </div>
      </aside>

      {/* ── 2. UNIFIED GLOBAL SECONDARY SIDEBAR (263px, #F4F5F8, exact Chart of Accounts styling) ── */}
      {isSidebarOpen && (
        <aside 
          className="w-[263px] shrink-0 bg-[#F4F5F8] border-r border-[#E3E5E8] flex flex-col pt-[18px] overflow-y-auto z-10 transition-all duration-150"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="px-2 flex-1">
            {/* Header row: "MY APPS" + Sliders + Collapse Button */}
            <div className="h-[30px] flex items-center justify-between px-3 mb-1">
              <span className="text-[12px] font-semibold tracking-[1.2px] text-[#6B6C72] uppercase">
                MY APPS
              </span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={onToggleCustomize}
                  className="text-[#6B6C72] hover:text-[#393A3D] p-1 rounded transition cursor-pointer"
                  title="Organize apps"
                >
                  <Sliders size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setManualSidebarState(false)}
                  className="text-[#6B6C72] hover:text-[#393A3D] p-1 rounded transition cursor-pointer"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={15} />
                </button>
              </div>
            </div>

            {/* App Groups list */}
            <div className="space-y-1">
              {APP_GROUPS.map((grp) => {
                const isOpen = !!openGroups[grp.key];

                return (
                  <div key={grp.key} className="w-full">
                    {/* Category Header Row with Down Arrow to split into sub-tabs */}
                    <div className="w-full h-[44px] flex items-center px-3 rounded-full hover:bg-[#E9ECEF] transition group">
                      <button 
                        type="button"
                        onClick={() => {
                          const firstSubTab = (grp.items && grp.items.length > 0)
                            ? (grp.items[0].view || grp.items[0].id)
                            : grp.defaultView;
                          if (firstSubTab) {
                            setCurrentView(firstSubTab);
                          }
                          setOpenGroups(prev => ({ ...prev, [grp.key]: true }));
                        }}
                        className="flex-1 h-full flex items-center text-left cursor-pointer min-w-0"
                      >
                        {grp.iconUrl ? (
                          <span className="w-[26px] h-[26px] rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-black/10 bg-gray-950">
                            <img src={grp.iconUrl} alt={grp.label} className="w-full h-full object-cover" />
                          </span>
                        ) : (
                          <span 
                            className="w-[22px] h-[22px] rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                            style={{ backgroundColor: grp.badgeBg, color: grp.badgeText }}
                          >
                            {grp.letter}
                          </span>
                        )}
                        <span className="ml-[14px] text-[15px] font-medium text-[#393A3D] truncate">
                          {grp.label}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleGroup(grp.key);
                        }}
                        title={isOpen ? "Collapse" : "Expand"}
                        className="w-[28px] h-[28px] flex items-center justify-center text-[#6B6C72] hover:text-[#393A3D] hover:bg-black/5 rounded-full transition cursor-pointer shrink-0 ml-1"
                      >
                        <ChevronDown 
                          size={16} 
                          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                        />
                      </button>
                    </div>

                    {/* Sub tabs (Split up when arrow is clicked) */}
                    {isOpen && (
                      <div className="space-y-[1px] mt-0.5">
                        {grp.items.map((sub) => {
                          const active = isItemActive(sub);

                          if (active) {
                            return (
                              <div 
                                key={sub.id} 
                                className="h-[38px] my-1 flex items-center pl-[46px] pr-3 rounded-full bg-[#E0E3E8] text-[15px] font-semibold text-[#393A3D] cursor-pointer"
                              >
                                {sub.label}
                              </div>
                            );
                          }

                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => {
                                if (sub.view === 'accountant') {
                                  alert("Accountant View: Switched to trial balance and chart verification tools.");
                                } else {
                                  setCurrentView(sub.view);
                                }
                              }}
                              className="w-full h-[40px] flex items-center pl-[46px] pr-3 text-[15px] text-[#393A3D] rounded-full hover:bg-[#E9ECEF] transition text-left cursor-pointer"
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pinned Payroll & Marketing rows at bottom with Gem icon */}
          <div className="mt-auto pt-2">
            <div className="border-t border-[#D9D9D9] mx-2" />
            <button 
              type="button"
              onClick={() => setPremiumModalModule({
                label: 'Payroll',
                desc: 'Automated multi-state payroll, PF/ESI statutory compliance, and direct employee bank disbursement.'
              })}
              className="w-full h-[52px] flex items-center px-4 hover:bg-[#E9ECEF] transition cursor-pointer text-left"
            >
              <span className="w-[22px] h-[22px] rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-black/10 bg-gray-900">
                <img src="/app-icons/payroll.jpg" alt="Payroll" className="w-full h-full object-cover" />
              </span>
              <span className="ml-[14px] text-[15px] font-medium text-[#393A3D]">Payroll</span>
              <Gem size={16} className="ml-auto text-[#6B6C72]" />
            </button>

            <button 
              type="button"
              onClick={() => setPremiumModalModule({
                label: 'Marketing',
                desc: 'Automated email/SMS campaign automation, lead capture, and customer engagement pipelines.'
              })}
              className="w-full h-[52px] flex items-center px-4 hover:bg-[#E9ECEF] transition cursor-pointer text-left"
            >
              <span className="w-[22px] h-[22px] rounded-full overflow-hidden flex items-center justify-center shrink-0 shadow-xs border border-black/10 bg-gray-900">
                <img src="/app-icons/tag_marketing.jpg" alt="Marketing" className="w-full h-full object-cover" />
              </span>
              <span className="ml-[14px] text-[15px] font-medium text-[#393A3D]">Marketing</span>
              <Gem size={16} className="ml-auto text-[#6B6C72]" />
            </button>
          </div>
        </aside>
      )}

      {/* ── 3. PREMIUM FEATURE UPGRADE MODAL ── */}
      {premiumModalModule && (
        <div 
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setPremiumModalModule(null)}
        >
          <div 
            className="w-full max-w-[460px] bg-white rounded-xl shadow-2xl border border-gray-200 p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPremiumModalModule(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
              <Gem size={24} />
            </div>

            <h3 className="text-[18px] font-bold text-gray-900 mb-1">
              MESSO {premiumModalModule.label} (Enterprise Edition)
            </h3>
            <p className="text-[14px] text-gray-600 mb-4 leading-relaxed">
              {premiumModalModule.desc}
            </p>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-6 text-xs text-gray-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-gray-800">
                <span>Included in MESSO Plus & Advanced plans:</span>
              </div>
              <div>• Automated statutory tax withholding & filing</div>
              <div>• Multi-user role approvals & audit logging</div>
              <div>• Priority 24/7 dedicated charter support</div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPremiumModalModule(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setPremiumModalModule(null);
                  setCurrentView('pricing');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#008927] hover:bg-[#00701F] rounded-lg shadow-xs transition cursor-pointer"
              >
                View Plans & Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Internal Rail Item ── */
function RailItem({ label, onClick, active = false, boxed = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`group flex flex-col items-center mb-3 cursor-pointer transition rounded-md focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 ${
        boxed
          ? `w-[54px] h-[44px] justify-center mb-3 ${
              active ? 'bg-[#E3E5E8] text-[#172B4D]' : 'hover:bg-gray-100 text-[#5E6C84]'
            }`
          : `p-1 ${active ? 'text-[#172B4D]' : 'text-[#5E6C84] group-hover:text-[#172B4D]'}`
      }`}
    >
      <span className={active ? 'text-[#172B4D]' : 'text-[#5E6C84] group-hover:text-[#172B4D]'}>
        {children}
      </span>
      <span
        className={`text-[9px] mt-0.5 leading-none ${
          active ? 'font-semibold text-[#172B4D]' : 'font-medium text-[#5E6C84] group-hover:text-[#172B4D]'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
