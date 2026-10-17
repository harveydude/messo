import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronUp,
  Diamond,
  SlidersHorizontal,
  Landmark,
  X,
  Lock,
} from 'lucide-react';

/* ── App category definitions with full sub-tabs matching Screenshots 1 & 2 ── */
const APP_CATEGORIES = [
  {
    key: 'accounting',
    label: 'Accounting',
    letter: 'A',
    color: '#107C41',
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
    label: 'Expenses & Bills',
    letter: 'E',
    color: '#008927',
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
    color: '#0077C5',
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
    key: 'customer_hub',
    label: 'Customer Hub',
    letter: 'C',
    color: '#673AB7',
    defaultView: 'customer_hub',
    items: [
      { id: 'hub_overview', label: 'Overview', view: 'customer_hub' },
      { id: 'customers_list', label: 'Customers', view: 'customers_list' },
      { id: 'hub_estimates', label: 'Estimates', view: 'estimates' },
      { id: 'reviews', label: 'Reviews', view: 'customer_hub' },
    ],
  },
  {
    key: 'taxes',
    label: 'Taxes',
    letter: '%',
    color: '#D81B60',
    defaultView: 'sales_tax',
    items: [
      { id: 'sales_tax', label: 'Sales Tax (GST)', view: 'sales_tax' },
      { id: 'business_tax', label: 'Business Tax (Direct / TDS)', view: 'business_tax' },
    ],
  },
  {
    key: 'time',
    label: 'Time',
    letter: '⏱',
    color: '#006064',
    defaultView: 'time_entries',
    items: [
      { id: 'time_entries', label: 'Time entries', view: 'time_entries' },
      { id: 'time_schedule', label: 'Schedule', view: 'time_entries' },
    ],
  },
  {
    key: 'team',
    label: 'Team',
    letter: 'T',
    color: '#1976D2',
    defaultView: 'team',
    items: [
      { id: 'employees', label: 'Employees', view: 'team' },
      { id: 'team_contractors', label: 'Contractors', view: 'team' },
      { id: 'workers_comp', label: "Workers' Compensation", view: 'team' },
    ],
  },
  {
    key: 'lending',
    label: 'Lending',
    letter: '₹',
    color: '#2E7D32',
    defaultView: 'lending',
    items: [
      { id: 'lending_overview', label: 'Overview', view: 'lending' },
      { id: 'term_loan', label: 'Term Loan', view: 'lending' },
      { id: 'credit_line', label: 'Credit Line', view: 'lending' },
    ],
  },
];

/* ── Premium features gated behind upgrade modal ── */
const PREMIUM_MODULES = [
  { key: 'payroll', label: 'Payroll', desc: 'Automated multi-state payroll, PF/ESI filing, and direct bank disbursement.' },
  { key: 'marketing', label: 'Marketing', desc: 'Automated email/SMS campaign automation, lead capture, and ROI analytics.' },
];

const DEFAULT_PINS = [
  { id: 'bank_transactions', label: 'Accounting', color: '#107C41', iconKey: 'activity' },
  { id: 'expense_transactions', label: 'Expenses', color: '#008927', iconKey: 'creditcard' },
  { id: 'sales_transactions', label: 'Sales', color: '#0077C5', iconKey: 'barchart' },
];

const PIN_ICONS = {
  activity: (sz) => <Activity size={sz} />,
  creditcard: (sz) => <CreditCard size={sz} />,
  barchart: (sz) => <BarChart2 size={sz} />,
  default: (sz) => <LayoutGrid size={sz} />,
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
  // Determine if the current view belongs to any category
  const activeCategoryKey = useMemo(() => {
    for (const cat of APP_CATEGORIES) {
      if (cat.items.some(it => it.view === currentView || it.id === currentView)) {
        return cat.key;
      }
    }
    // Direct matches
    if (['chart_of_accounts', 'bank_transactions', 'reconcile', 'rules', 'recurring_transactions'].includes(currentView)) return 'accounting';
    if (['expense_transactions', 'vendors', 'bills', 'mileage'].includes(currentView)) return 'expenses';
    if (['sales_transactions', 'invoices', 'estimates', 'orders', 'products_services'].includes(currentView)) return 'sales';
    if (['customer_hub', 'customers_list'].includes(currentView)) return 'customer_hub';
    if (['sales_tax', 'business_tax'].includes(currentView)) return 'taxes';
    if (['time_entries'].includes(currentView)) return 'time';
    if (['team'].includes(currentView)) return 'team';
    if (['lending'].includes(currentView)) return 'lending';
    return null;
  }, [currentView]);

  // Secondary sidebar drawer open state
  // Open by default if in any app section, or if user toggled it
  const [drawerOpen, setDrawerOpen] = useState(true);

  // Accordion expanded state for each category
  const [expandedCategories, setExpandedCategories] = useState({
    accounting: true,
    expenses: true,
    sales: true,
    customer_hub: false,
    taxes: false,
    time: false,
    team: false,
    lending: false,
  });

  // Premium modal state
  const [premiumModalModule, setPremiumModalModule] = useState(null);

  // Whenever user navigates to an app section, ensure that category is expanded and drawer is open
  useEffect(() => {
    if (activeCategoryKey) {
      setExpandedCategories(prev => ({
        ...prev,
        [activeCategoryKey]: true,
      }));
      setDrawerOpen(true);
    }
  }, [activeCategoryKey]);

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const pins = pinnedItems && pinnedItems.length > 0 ? pinnedItems : DEFAULT_PINS;

  const isRailActive = (id) => {
    if (id === 'dashboard') return currentView === 'dashboard';
    if (id === 'feed') return currentView === 'feed';
    if (id === 'reports') return currentView === 'reports' || currentView.startsWith('report_');
    if (id === 'bookmarks') return currentView === 'bookmarks';
    if (id === 'apps') return drawerOpen;
    return currentView === id;
  };

  const isSubActive = (sub) => {
    if (sub.view === currentView || sub.id === currentView) return true;
    if (sub.view === 'sales_transactions' && (currentView === 'sales' || currentView === 'sales_transactions')) return true;
    if (sub.view === 'expense_transactions' && (currentView === 'expenses' || currentView === 'expense_transactions')) return true;
    return false;
  };

  return (
    <div className="flex h-full shrink-0 select-none" style={{ fontFamily: FONT }}>
      {/* ── 1. PRIMARY LEFT RAIL (84px wide) ── */}
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
          onClick={() => {
            setCurrentView('bookmarks');
            setDrawerOpen(false);
          }}
          active={isRailActive('bookmarks')}
        >
          <Bookmark size={18} />
        </RailItem>

        <RailItem
          label="Dashboard"
          onClick={() => {
            setCurrentView('dashboard');
            setDrawerOpen(false);
          }}
          active={isRailActive('dashboard')}
          boxed
        >
          <LayoutGrid size={18} />
        </RailItem>

        <RailItem
          label="Feed"
          onClick={() => {
            setCurrentView('feed');
            setDrawerOpen(false);
          }}
          active={isRailActive('feed')}
        >
          <Activity size={18} />
        </RailItem>

        <RailItem
          label="Reports"
          onClick={() => {
            setCurrentView('reports');
            setDrawerOpen(false);
          }}
          active={isRailActive('reports')}
        >
          <TrendingUp size={18} />
        </RailItem>

        {/* My Apps Button (toggles secondary drawer) */}
        <RailItem
          label="My apps"
          onClick={() => setDrawerOpen(!drawerOpen)}
          active={drawerOpen}
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
            return (
              <RailItem
                key={pin.id}
                label={pin.label}
                onClick={() => {
                  setCurrentView(pin.id);
                  setDrawerOpen(true);
                }}
                active={currentView === pin.id || activeCategoryKey === pin.label.toLowerCase()}
              >
                <span
                  className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: pin.color }}
                >
                  {iconFn(12)}
                </span>
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

      {/* ── 2. DOCKED SECONDARY MY APPS SIDEBAR (Matches Screenshots 1 & 2 1:1) ── */}
      {drawerOpen && (
        <aside 
          className="w-[230px] bg-white border-r border-[#E3E5E8] flex flex-col shrink-0 select-none h-full z-10 animate-in fade-in slide-in-from-left-2 duration-150"
        >
          {/* Header (MY APPS title + Customize/Filter icon, NO SEARCH BAR) */}
          <div className="h-[48px] px-4 flex items-center justify-between border-b border-[#F0F2F5] shrink-0">
            <span className="text-[12px] font-bold text-[#6B778C] uppercase tracking-wider">
              MY APPS
            </span>
            <button
              type="button"
              onClick={onToggleCustomize}
              title="Customize menu sequence"
              className="p-1 rounded hover:bg-gray-100 text-[#6B778C] hover:text-[#172B4D] transition cursor-pointer"
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Accordion Categories List */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {APP_CATEGORIES.map((cat) => {
              const isExpanded = !!expandedCategories[cat.key];
              const isCurrentCatActive = activeCategoryKey === cat.key;

              return (
                <div key={cat.key} className="rounded-[6px]">
                  {/* Category Header Row */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.key)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-[#F4F5F8] transition cursor-pointer text-left ${
                      isCurrentCatActive ? 'bg-[#F9FAFB]' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span
                        className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        {cat.letter}
                      </span>
                      <span className="text-[13px] font-semibold text-[#172B4D] truncate">
                        {cat.label}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={13} className="text-[#6B778C] shrink-0 ml-1" />
                    ) : (
                      <ChevronDown size={13} className="text-[#6B778C] shrink-0 ml-1" />
                    )}
                  </button>

                  {/* Sub-items list under this category */}
                  {isExpanded && (
                    <div className="pl-6 pr-1 pt-0.5 pb-1 space-y-0.5">
                      {cat.items.map((sub) => {
                        const active = isSubActive(sub);
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
                            className={`w-full text-left px-3 py-1.5 text-[13px] rounded-[6px] transition cursor-pointer truncate ${
                              active
                                ? 'bg-[#E8ECEF] font-semibold text-[#172B4D]'
                                : 'text-[#393A3D] font-normal hover:bg-[#F4F5F8] hover:text-[#172B4D]'
                            }`}
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

            {/* Premium Divider & Section */}
            <div className="pt-3 pb-1 px-2.5 border-t border-[#F0F2F5] mt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                  PREMIUM MODULES
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#92400E]">
                  UPGRADE
                </span>
              </div>

              {PREMIUM_MODULES.map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => setPremiumModalModule(pm)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-gray-700 hover:bg-[#F4F5F8] transition cursor-pointer text-left group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                      <Lock size={10} />
                    </span>
                    <span className="text-[13px] font-medium text-gray-800 truncate">
                      {pm.label}
                    </span>
                  </div>
                  <Diamond size={13} className="text-amber-500 shrink-0" />
                </button>
              ))}
            </div>
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
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4 shadow-xs">
              <Diamond size={24} />
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
                onClick={() => setPremiumModalModule(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPremiumModalModule(null);
                  setCurrentView('pricing');
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#008927] hover:bg-[#00701F] rounded-lg shadow-xs transition"
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
