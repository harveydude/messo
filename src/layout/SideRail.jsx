import React, { useState, useRef, useEffect } from 'react';
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
  Diamond,
  X,
  Lock,
} from 'lucide-react';

/* ── App list for the small My Apps flyout ── */
const APPS = [
  { key: 'accounting', label: 'Accounting', letter: 'A', color: '#107C41', defaultView: 'chart_of_accounts' },
  { key: 'expenses', label: 'Expenses & Bills', letter: 'E', color: '#008927', defaultView: 'expense_transactions' },
  { key: 'sales', label: 'Sales & Get Paid', letter: 'S', color: '#0077C5', defaultView: 'sales_transactions' },
  { key: 'customer_hub', label: 'Customer Hub', letter: 'C', color: '#673AB7', defaultView: 'customer_hub' },
  { key: 'team', label: 'Team', letter: 'T', color: '#1976D2', defaultView: 'team' },
  { key: 'time', label: 'Time', letter: '⏱', color: '#006064', defaultView: 'time_entries' },
  { key: 'taxes', label: 'Sales Tax', letter: '%', color: '#D81B60', defaultView: 'sales_tax' },
  { key: 'business_tax', label: 'Business Tax', letter: 'B', color: '#4A148C', defaultView: 'business_tax' },
  { key: 'lending', label: 'Lending', letter: '₹', color: '#2E7D32', defaultView: 'lending' },
];

/* ── Premium features gated behind upgrade modal ── */
const PREMIUM_MODULES = [
  { key: 'payroll', label: 'Payroll', desc: 'Automated multi-state payroll, PF/ESI filing, and direct bank disbursement.' },
  { key: 'marketing', label: 'Marketing', desc: 'Automated email/SMS campaign automation, lead capture, and ROI analytics.' },
];

const DEFAULT_PINS = [
  { id: 'chart_of_accounts', label: 'Accounting', color: '#107C41', iconKey: 'activity' },
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
  const [myAppsOpen, setMyAppsOpen] = useState(false);
  const [premiumModalModule, setPremiumModalModule] = useState(null);

  const flyoutRef = useRef(null);
  const myAppsBtnRef = useRef(null);

  // Close flyout on click outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (
        flyoutRef.current && 
        !flyoutRef.current.contains(e.target) && 
        myAppsBtnRef.current && 
        !myAppsBtnRef.current.contains(e.target)
      ) {
        setMyAppsOpen(false);
      }
    };
    if (myAppsOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [myAppsOpen]);

  const pins = pinnedItems && pinnedItems.length > 0 ? pinnedItems : DEFAULT_PINS;

  const isRailActive = (id) => {
    if (id === 'dashboard') return currentView === 'dashboard';
    if (id === 'feed') return currentView === 'feed';
    if (id === 'reports') return currentView === 'reports' || currentView.startsWith('report_');
    if (id === 'bookmarks') return currentView === 'bookmarks';
    if (id === 'apps') return myAppsOpen;
    return currentView === id;
  };

  return (
    <div className="relative shrink-0 select-none" style={{ fontFamily: FONT }}>
      {/* ── PRIMARY LEFT RAIL (Only 84px wide, clean and minimal) ── */}
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
            setMyAppsOpen(false);
            setCurrentView('bookmarks');
          }}
          active={isRailActive('bookmarks')}
        >
          <Bookmark size={18} />
        </RailItem>

        <RailItem
          label="Dashboard"
          onClick={() => {
            setMyAppsOpen(false);
            setCurrentView('dashboard');
          }}
          active={isRailActive('dashboard')}
          boxed
        >
          <LayoutGrid size={18} />
        </RailItem>

        <RailItem
          label="Feed"
          onClick={() => {
            setMyAppsOpen(false);
            setCurrentView('feed');
          }}
          active={isRailActive('feed')}
        >
          <Activity size={18} />
        </RailItem>

        <RailItem
          label="Reports"
          onClick={() => {
            setMyAppsOpen(false);
            setCurrentView('reports');
          }}
          active={isRailActive('reports')}
        >
          <TrendingUp size={18} />
        </RailItem>

        {/* My Apps Button (Toggles small flyout menu) */}
        <div ref={myAppsBtnRef} className="w-full flex justify-center">
          <RailItem
            label="My apps"
            onClick={() => setMyAppsOpen(!myAppsOpen)}
            active={myAppsOpen}
            boxed
          >
            <Grid size={18} />
          </RailItem>
        </div>

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
            const isPinActive = currentView === pin.id || 
              (pin.label === 'Accounting' && ['chart_of_accounts', 'bank_transactions', 'rules', 'reconcile'].includes(currentView)) ||
              (pin.label === 'Expenses' && ['expense_transactions', 'vendors', 'bills', 'mileage'].includes(currentView)) ||
              (pin.label === 'Sales' && ['sales_transactions', 'invoices', 'estimates', 'orders', 'products_services'].includes(currentView));

            return (
              <RailItem
                key={pin.id}
                label={pin.label}
                onClick={() => {
                  setMyAppsOpen(false);
                  setCurrentView(pin.id);
                }}
                active={isPinActive}
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

      {/* ── SMALL MY APPS FLYOUT (Opens next to My Apps icon) ── */}
      {myAppsOpen && (
        <div
          ref={flyoutRef}
          className="fixed left-[84px] top-[180px] w-[210px] bg-white border border-[#E3E5E8] rounded-lg shadow-2xl py-2 px-1 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header */}
          <div className="px-3 pb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between border-b border-gray-100 mb-1">
            <span>MY APPS</span>
            <button
              type="button"
              onClick={() => setMyAppsOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer"
            >
              <X size={13} />
            </button>
          </div>

          {/* App list items */}
          <div className="space-y-0.5">
            {APPS.map((app) => (
              <button
                key={app.key}
                type="button"
                onClick={() => {
                  setMyAppsOpen(false);
                  setCurrentView(app.defaultView);
                }}
                className="w-full flex items-center px-2.5 py-1.5 rounded-md text-left text-xs font-medium text-gray-800 hover:bg-[#F4F5F8] transition cursor-pointer space-x-2.5 group"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: app.color }}
                >
                  {app.letter}
                </span>
                <span className="truncate group-hover:text-[#008927]">{app.label}</span>
              </button>
            ))}

            {/* Premium Modules */}
            <div className="pt-2 mt-1 border-t border-gray-100 px-2 pb-0.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  PREMIUM
                </span>
                <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                  PRO
                </span>
              </div>
              {PREMIUM_MODULES.map((pm) => (
                <button
                  key={pm.key}
                  type="button"
                  onClick={() => {
                    setMyAppsOpen(false);
                    setPremiumModalModule(pm);
                  }}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-xs text-gray-700 hover:bg-gray-50 rounded transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold">
                      <Lock size={9} />
                    </span>
                    <span>{pm.label}</span>
                  </div>
                  <Diamond size={11} className="text-amber-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PREMIUM FEATURE UPGRADE MODAL ── */}
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
