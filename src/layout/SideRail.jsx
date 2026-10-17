import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  Bookmark,
  LayoutGrid,
  Sparkles,
  TrendingUp,
  Grid,
  Activity,
  CreditCard,
  BarChart2,
  Sliders,
  ChevronRight,
  Clock,
  Diamond,
  Search,
  Users,
  Percent,
  Briefcase,
  IndianRupee,
} from 'lucide-react';

/* ── Sub-menu definitions for each app ─────────────────────────────────── */
const APP_SUBMENUS = {
  accounting: {
    title: 'Accounting',
    items: [
      { label: 'Bank transactions', view: 'bank_transactions' },
      { label: 'Chart of accounts', view: 'chart_of_accounts' },
      { label: 'Reconcile', view: 'reconcile' },
      { label: 'Rules', view: 'rules' },
    ],
  },
  expenses: {
    title: 'Expenses & Bills',
    items: [
      { label: 'Expense Transaction', view: 'expense_transactions' },
      { label: 'Vendors', view: 'vendors' },
      { label: 'Bills', view: 'bills' },
      { label: 'Bill Payments & MSME', view: 'bills' },
      { label: 'Mileage', view: 'mileage' },
      { label: 'Contractors', view: 'team' },
      { label: 'TDS & Withholding', view: 'business_tax' },
    ],
  },
  sales: {
    title: 'Sales & Get Paid',
    items: [
      { label: 'Overview', view: 'sales_transactions' },
      { label: 'Sales Transaction', view: 'sales_transactions' },
      { label: 'Invoices', view: 'invoices' },
      { label: 'Recurring payments', view: 'recurring_transactions' },
      { label: 'Sales Order', view: 'orders' },
      { label: 'Sales Channels & Apps', view: 'apps' },
      { label: 'MESSO Payouts', view: 'bank_transactions' },
      { label: 'Product and Services', view: 'products_services' },
    ],
  },
  customer_hub: {
    title: 'Customer Hub',
    items: [
      { label: 'Overview', view: 'customer_hub' },
      { label: 'Customers', view: 'customers_list' },
      { label: 'Estimates', view: 'estimates' },
    ],
  },
  team: {
    title: 'Teams',
    items: [
      { label: 'Employees', view: 'team' },
      { label: 'Contractors', view: 'team' },
      { label: "Workers' Compensation", view: 'workers_comp' },
    ],
  },
  time: {
    title: 'Time',
    items: [
      { label: 'Time Entries', view: 'time_entries' },
      { label: 'Schedule', view: 'time_entries' },
    ],
  },
  sales_tax: {
    title: 'GST Compliance',
    items: [
      { label: 'GSTR-1 & GSTR-3B Overview', view: 'sales_tax' },
    ],
  },
  business_tax: {
    title: 'Business & Direct Tax',
    items: [
      { label: 'TDS Overview & Register', view: 'business_tax' },
      { label: 'Section 194C / 194J', view: 'business_tax' },
      { label: 'Presumptive Tax (44AD)', view: 'business_tax' },
    ],
  },
  lending: {
    title: 'Lending',
    items: [
      { label: 'Overview', view: 'lending' },
      { label: 'Term Loan Center', view: 'lending' },
    ],
  },
};

const APPS = [
  { key: 'accounting', label: 'Accounting', color: '#107c41', letter: 'A', defaultView: 'bank_transactions' },
  { key: 'expenses', label: 'Expenses & Bills', color: '#00897b', letter: 'E', defaultView: 'expense_transactions' },
  { key: 'sales', label: 'Sales & Get Paid', color: '#0077c5', letter: 'S', defaultView: 'sales_transactions' },
  { key: 'customer_hub', label: 'Customer Hub', color: '#009688', letter: 'C', defaultView: 'customer_hub' },
  { key: 'team', label: 'Teams', color: '#1976d2', letter: 'T', defaultView: 'team' },
  { key: 'time', label: 'Time', color: '#006064', letter: '⏱', defaultView: 'time_entries', useIcon: true },
  { key: 'sales_tax', label: 'Sales Tax', color: '#d81b60', letter: '%', defaultView: 'sales_tax' },
  { key: 'business_tax', label: 'Business Tax', color: '#4a148c', letter: 'B', defaultView: 'business_tax' },
  { key: 'lending', label: 'Lending', color: '#2e7d32', letter: '₹', defaultView: 'lending' },
];

const PREMIUM_APPS = [
  { key: 'payroll', label: 'Payroll', color: '#0d47a1', letter: 'P', defaultView: 'payroll' },
  { key: 'marketing', label: 'Marketing', color: '#f57f17', letter: 'M', defaultView: 'marketing' },
];

const DEFAULT_PINS = [
  { id: 'bank_transactions', label: 'Accounting', color: '#107c41', iconKey: 'activity' },
  { id: 'expense_transactions', label: 'Expenses', color: '#00897b', iconKey: 'creditcard' },
  { id: 'sales_transactions', label: 'Sales', color: '#0077c5', iconKey: 'barchart' },
];

const PIN_TO_APP = {
  bank_transactions: 'accounting',
  accounting: 'accounting',
  expense_transactions: 'expenses',
  expenses: 'expenses',
  bills: 'expenses',
  vendors: 'expenses',
  sales_transactions: 'sales',
  sales: 'sales',
  invoices: 'sales',
  customer_hub: 'customer_hub',
  customers_list: 'customer_hub',
  team: 'team',
  time_entries: 'time',
  sales_tax: 'sales_tax',
  business_tax: 'business_tax',
  lending: 'lending',
};

const PIN_ICONS = {
  activity: (sz) => <Activity size={sz} />,
  creditcard: (sz) => <CreditCard size={sz} />,
  barchart: (sz) => <BarChart2 size={sz} />,
  default: (sz) => <LayoutGrid size={sz} />,
};

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export default function SideRail({
  currentView = 'dashboard',
  setCurrentView,
  onOpenCreate,
  onToggleCustomize,
  isCustomizing = false,
  pinnedItems,
  onPinnedChange,
}) {
  const [myAppsOpen, setMyAppsOpen] = useState(false);
  const [hoveredApp, setHoveredApp] = useState(null);
  const [hoveredAppTop, setHoveredAppTop] = useState(180);
  const [appSearch, setAppSearch] = useState('');

  // Rail item hover flyout for pinned items
  const [railFlyoutApp, setRailFlyoutApp] = useState(null);
  const [railFlyoutTop, setRailFlyoutTop] = useState(0);
  const railFlyoutTimer = useRef(null);

  const flyoutRef = useRef(null);
  const subMenuRef = useRef(null);
  const myAppsIconRef = useRef(null);
  const [flyoutTop, setFlyoutTop] = useState(180);

  const pins = (pinnedItems && pinnedItems.length > 0) ? pinnedItems : DEFAULT_PINS;
  const isActive = (id) => currentView === id;

  // Position My Apps flyout aligned with My Apps icon
  useEffect(() => {
    if (myAppsOpen && myAppsIconRef.current) {
      const rect = myAppsIconRef.current.getBoundingClientRect();
      setFlyoutTop(Math.max(10, Math.min(rect.top, window.innerHeight - 450)));
    }
  }, [myAppsOpen]);

  // Close flyouts when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const inFlyout = flyoutRef.current && flyoutRef.current.contains(e.target);
      const inSubMenu = subMenuRef.current && subMenuRef.current.contains(e.target);
      const inMyAppsBtn = myAppsIconRef.current && myAppsIconRef.current.contains(e.target);

      if (!inFlyout && !inSubMenu && !inMyAppsBtn) {
        setMyAppsOpen(false);
        setHoveredApp(null);
      }
    };
    if (myAppsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [myAppsOpen]);

  const handleNavigateApp = useCallback((viewId) => {
    setCurrentView(viewId);
    setMyAppsOpen(false);
    setHoveredApp(null);
    setRailFlyoutApp(null);
  }, [setCurrentView]);

  const handleSubAction = useCallback((item) => {
    if (item.view) {
      handleNavigateApp(item.view);
    } else if (item.action) {
      alert(item.action);
      setMyAppsOpen(false);
      setHoveredApp(null);
      setRailFlyoutApp(null);
    }
  }, [handleNavigateApp]);

  // Handle rail pinned item hover with debounce
  const handleRailItemMouseEnter = (e, pin) => {
    if (railFlyoutTimer.current) clearTimeout(railFlyoutTimer.current);
    const appKey = PIN_TO_APP[pin.id] || (pin.label ? PIN_TO_APP[pin.label.toLowerCase()] : null);
    if (appKey && APP_SUBMENUS[appKey]) {
      const rect = e.currentTarget.getBoundingClientRect();
      setRailFlyoutTop(Math.max(10, Math.min(rect.top, window.innerHeight - 380)));
      setRailFlyoutApp(appKey);
    } else {
      setRailFlyoutApp(null);
    }
  };

  const handleRailItemMouseLeave = () => {
    railFlyoutTimer.current = setTimeout(() => {
      setRailFlyoutApp(null);
    }, 200);
  };

  // Filter apps by search
  const filteredApps = APPS.filter(app => {
    if (!appSearch.trim()) return true;
    const q = appSearch.toLowerCase();
    if (app.label.toLowerCase().includes(q)) return true;
    const sub = APP_SUBMENUS[app.key];
    if (sub && sub.items.some(it => it.label.toLowerCase().includes(q))) return true;
    return false;
  });

  const filteredPremium = PREMIUM_APPS.filter(app => {
    if (!appSearch.trim()) return true;
    return app.label.toLowerCase().includes(appSearch.toLowerCase());
  });

  return (
    <aside
      aria-label="Main navigation"
      className="w-[84px] bg-white border-r border-[#E3E5E8] flex flex-col justify-between items-center py-2 select-none shrink-0 h-[calc(100vh-56px)] overflow-y-auto relative z-30"
      style={{ fontFamily: FONT }}
    >
      <div className="w-full flex flex-col items-center">
        {/* Create Transaction Trigger Button (Section B Spec: 60x46, #007755) */}
        <button
          type="button"
          onClick={onOpenCreate}
          className="w-[60px] h-[46px] rounded-[23px] bg-[#007755] hover:bg-[#005f43] border border-white/20 flex flex-col items-center justify-center text-white mb-3 shadow-[0_2px_8px_rgba(0,119,85,0.35)] transition cursor-pointer select-none"
          title="Create transaction"
        >
          <Plus size={18} strokeWidth={2.6} />
          <span className="text-[9.5px] font-bold mt-0.5 leading-none">Create</span>
        </button>

        {/* Bookmarks */}
        <RailItem label="Bookmarks" onClick={() => setCurrentView('bookmarks')} active={isActive('bookmarks')}>
          <Bookmark size={16} aria-hidden="true" />
        </RailItem>

        {/* Dashboard */}
        <RailItem
          label="Dashboard"
          onClick={() => setCurrentView('dashboard')}
          active={isActive('dashboard')}
          boxed
        >
          <LayoutGrid size={16} aria-hidden="true" />
        </RailItem>

        {/* Feed */}
        <RailItem label="Feed" onClick={() => setCurrentView('feed')} active={isActive('feed')}>
          <Sparkles size={16} aria-hidden="true" />
        </RailItem>

        {/* Reports */}
        <RailItem
          label="Reports"
          onClick={() => setCurrentView('standard_reports')}
          active={isActive('standard_reports') || isActive('balance_sheet') || isActive('management_reports')}
        >
          <TrendingUp size={16} aria-hidden="true" />
        </RailItem>

        {/* ── My Apps with dynamic flyout ── */}
        <div className="relative w-full flex justify-center" ref={myAppsIconRef}>
          <RailItem
            label="My apps"
            onClick={() => {
              setMyAppsOpen(!myAppsOpen);
              setHoveredApp(null);
              setRailFlyoutApp(null);
            }}
            active={isActive('apps') || myAppsOpen}
            boxed
          >
            <Grid size={16} aria-hidden="true" />
          </RailItem>

          {/* Primary My Apps Panel */}
          {myAppsOpen && (
            <div
              ref={flyoutRef}
              className="fixed left-[84px] w-[216px] bg-white border border-gray-200 rounded-lg shadow-2xl py-2 px-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: flyoutTop,
                fontFamily: FONT,
                maxHeight: 'calc(100vh - 60px)',
                overflowY: 'auto',
                overflowX: 'visible',
              }}
            >
              {/* Header with Title and Search */}
              <div className="px-2 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>MY APPS</span>
                <span className="text-[9px] text-gray-400 font-normal">MESSO Hub</span>
              </div>

              {/* Search input in My Apps */}
              <div className="px-1.5 pb-2">
                <div className="flex items-center px-2 py-1 bg-gray-50 rounded border border-gray-200 focus-within:border-[#2CA01C] focus-within:bg-white transition">
                  <Search size={11} className="text-gray-400 mr-1.5 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search apps..."
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                    autoFocus
                    className="w-full bg-transparent text-[11px] outline-none text-gray-800 placeholder-gray-400 leading-tight"
                  />
                  {appSearch && (
                    <button onClick={() => setAppSearch('')} className="text-gray-400 hover:text-gray-600 text-[10px] ml-1">✕</button>
                  )}
                </div>
              </div>

              <div className="space-y-0.5">
                {filteredApps.map((app) => (
                  <div
                    key={app.key}
                    className="relative"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredAppTop(rect.top);
                      setHoveredApp(app.key);
                    }}
                  >
                    <button
                      onClick={() => {
                        if (APP_SUBMENUS[app.key]) {
                          setHoveredApp(hoveredApp === app.key ? null : app.key);
                        } else {
                          handleNavigateApp(app.defaultView);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2 py-[5px] rounded text-gray-800 hover:bg-gray-100 transition cursor-pointer text-left ${
                        hoveredApp === app.key ? 'bg-gray-100 font-semibold' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span
                          className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: app.color }}
                        >
                          {app.useIcon ? <Clock size={10} /> : app.letter}
                        </span>
                        <span className="text-[11px] font-medium truncate">{app.label}</span>
                      </div>
                      {APP_SUBMENUS[app.key] && (
                        <ChevronRight size={11} className="text-gray-400 shrink-0 ml-1" />
                      )}
                    </button>
                  </div>
                ))}

                {/* Divider */}
                {filteredPremium.length > 0 && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <div className="px-2 py-0.5 text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                      Premium
                    </div>
                  </>
                )}

                {/* Premium apps */}
                {filteredPremium.map((app) => (
                  <button
                    key={app.key}
                    onClick={() => handleNavigateApp(app.defaultView)}
                    className="w-full flex items-center justify-between px-2 py-[5px] rounded text-gray-800 hover:bg-gray-100 transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                        style={{ backgroundColor: app.color }}
                      >
                        {app.letter}
                      </span>
                      <span className="text-[11px] font-medium">{app.label}</span>
                    </div>
                    <Diamond size={11} className="text-amber-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Sub-menu rendered FIXED side-by-side to prevent ANY clipping ── */}
          {myAppsOpen && hoveredApp && APP_SUBMENUS[hoveredApp] && (
            <div
              ref={subMenuRef}
              className="fixed w-[205px] bg-white border border-gray-200 rounded-lg shadow-2xl py-1.5 px-1.5 z-[70] animate-in fade-in duration-75 before:content-[''] before:absolute before:-left-3 before:top-0 before:w-3 before:h-full"
              style={{
                left: 300,
                top: Math.max(10, Math.min(hoveredAppTop - 10, window.innerHeight - 380)),
                fontFamily: FONT,
              }}
              onMouseEnter={() => setHoveredApp(hoveredApp)}
              onMouseLeave={() => setHoveredApp(null)}
            >
              <div className="px-2 py-1 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
                <span>{APP_SUBMENUS[hoveredApp].title}</span>
                <span className="text-[8px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">Options</span>
              </div>
              <div className="space-y-0.5">
                {APP_SUBMENUS[hoveredApp].items.map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubAction(sub)}
                    className="w-full text-left px-2.5 py-[5px] rounded hover:bg-[#F0F1F3] hover:text-[#0077C5] text-[11px] font-medium text-gray-800 cursor-pointer transition flex items-center justify-between group"
                  >
                    <span>{sub.label}</span>
                    <ChevronRight size={10} className="text-transparent group-hover:text-gray-400 transition" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pinned Section with direct Hover Sub-Tabs ── */}
        <div className="w-[50px] h-px bg-[#E3E5E8] my-1.5" role="presentation" />
        <div className="w-full flex items-center justify-between px-2.5 mb-1">
          <p className="text-[9px] font-semibold text-[#6B6C72] uppercase tracking-[0.08em]">Pinned</p>
          <button
            onClick={() => setCurrentView('bookmarks')}
            title="Edit pinned shortcuts"
            className="text-[9px] text-[#2CA01C] hover:underline font-semibold cursor-pointer"
          >
            Edit
          </button>
        </div>

        {pins.map((pin) => (
          <div
            key={pin.id}
            className="w-full flex justify-center"
            onMouseEnter={(e) => handleRailItemMouseEnter(e, pin)}
            onMouseLeave={handleRailItemMouseLeave}
          >
            <RailItem
              label={pin.label}
              onClick={() => {
                const appKey = PIN_TO_APP[pin.id] || (pin.label ? PIN_TO_APP[pin.label.toLowerCase()] : null);
                if (appKey && APP_SUBMENUS[appKey]) {
                  // Toggle rail flyout or navigate
                  if (railFlyoutApp === appKey) {
                    setRailFlyoutApp(null);
                  } else {
                    setRailFlyoutApp(appKey);
                  }
                }
                setCurrentView(pin.id);
              }}
              active={isActive(pin.id)}
            >
              <span
                className="w-[20px] h-[20px] rounded-md flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: pin.color }}
                aria-hidden="true"
              >
                {(PIN_ICONS[pin.iconKey] || PIN_ICONS.default)(11)}
              </span>
            </RailItem>
          </div>
        ))}

        {/* ── Submenu flyout for rail pinned items on hover ── */}
        {railFlyoutApp && APP_SUBMENUS[railFlyoutApp] && (
          <div
            className="fixed left-[84px] w-[210px] bg-white border border-gray-200 rounded-lg shadow-2xl py-2 px-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 before:content-[''] before:absolute before:-left-3 before:top-0 before:w-3 before:h-full"
            style={{
              top: railFlyoutTop,
              fontFamily: FONT,
            }}
            onMouseEnter={() => {
              if (railFlyoutTimer.current) clearTimeout(railFlyoutTimer.current);
            }}
            onMouseLeave={() => setRailFlyoutApp(null)}
          >
            <div className="px-2 py-1 mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 flex items-center justify-between">
              <span>{APP_SUBMENUS[railFlyoutApp].title}</span>
              <span className="text-[8px] px-1 py-0.5 bg-gray-100 text-gray-600 rounded">Sub-tabs</span>
            </div>
            <div className="space-y-0.5">
              {APP_SUBMENUS[railFlyoutApp].items.map((sub, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubAction(sub)}
                  className="w-full text-left px-2.5 py-[5px] rounded hover:bg-[#F0F1F3] hover:text-[#0077C5] text-[11px] font-medium text-gray-800 cursor-pointer transition flex items-center justify-between group"
                >
                  <span>{sub.label}</span>
                  <ChevronRight size={10} className="text-transparent group-hover:text-gray-400 transition" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customize at bottom */}
      <div className="w-full flex flex-col items-center mt-auto pt-2">
        <button
          type="button"
          onClick={onToggleCustomize}
          aria-pressed={isCustomizing}
          title="Customize dashboard layout"
          className={`flex flex-col items-center pt-2 pb-1 cursor-pointer group transition rounded-md focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 ${
            isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          <Sliders size={16} aria-hidden="true" className={isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'} />
          <span className={`text-[9px] mt-0.5 ${isCustomizing ? 'font-semibold text-[#2CA01C]' : 'font-medium'}`}>
            Customize
          </span>
        </button>
      </div>
    </aside>
  );
}

function RailItem({ label, onClick, active = false, boxed = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`group flex flex-col items-center mb-2 cursor-pointer transition rounded-md focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 ${
        boxed
          ? `w-[52px] h-[40px] justify-center mb-2 ${
              active ? 'bg-[#E3E5E8] text-[#393A3D]' : 'hover:bg-gray-100 text-[#6B6C72]'
            }`
          : `p-1 ${active ? 'text-[#393A3D]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'}`
      }`}
    >
      <span className={active ? 'text-[#393A3D]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'}>
        {children}
      </span>
      <span
        className={`text-[9px] mt-0.5 leading-none ${
          active ? 'font-semibold text-[#393A3D]' : 'font-medium text-[#6B6C72] group-hover:text-[#393A3D]'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
