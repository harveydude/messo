import React, { useState, useRef } from 'react';
import { Sparkles, Sliders, Eye, ChevronRight, ThumbsUp, ThumbsDown } from 'lucide-react';
import PillNav from './PillNav';
import FeedCard from './FeedCard';
import CreateActions from './CreateActions';
import FunnelCard from './FunnelCard';
import BankCard from './BankCard';
import ProfitLossCard from './ProfitLossCard';
import ExpensesDonutCard from './ExpensesDonutCard';
import CashFlowCard from './CashFlowCard';
import AccountsPayableCard from './AccountsPayableCard';
import AddWidgetsPlaceholderCard from './AddWidgetsPlaceholderCard';
import AddWidgetsDrawer from './AddWidgetsDrawer';
import WidgetEditWrapper from './WidgetEditWrapper';
import PrivacyMask from './PrivacyMask';
import dashboardData from '../data/dashboard.json';

export default function DashboardView({ 
  onNavigate, 
  onOpenCreateModal,
  customizeMode: externalCustomizeMode,
  setCustomizeMode: externalSetCustomizeMode
}) {
  // Persisted privacy state from localStorage
  const [privacyEnabled, setPrivacyEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('qb_dashboard_privacy');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [eyeTooltipVisible, setEyeTooltipVisible] = useState(false);
  const eyeTimerRef = useRef(null);
  const [internalCustomizeMode, setInternalCustomizeMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Tooltip state for sliders icon
  const [slidersTooltipVisible, setSlidersTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef(null);

  // Drag interaction state for Edit Mode (Screenshot 2)
  const [activeDragWidget, setActiveDragWidget] = useState('ap'); // Sample drag active on AP widget
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  // Persisted customized layout flag (true = shows custom layout in normal mode)
  const [hasSavedLayout, setHasSavedLayout] = useState(true);

  const isEditing = externalCustomizeMode !== undefined 
    ? externalCustomizeMode 
    : internalCustomizeMode;

  const setIsEditing = (val) => {
    if (externalSetCustomizeMode) {
      externalSetCustomizeMode(val);
    } else {
      setInternalCustomizeMode(val);
    }
    if (!val) {
      setHasSavedLayout(true);
    }
  };

  // Active widgets state for drawer and grid
  const [activeWidgets, setActiveWidgets] = useState({
    pnl: true,
    expenses: true,
    bank: true,
    cashflow: true,
    ap: true,
    smart: true,
    sales: false,
    ar: false,
    deposits: false,
    invoices: false,
    mileage: false,
    integrations: false,
    referrals: false,
    funnel: false
  });

  const handleToggleWidget = (id) => {
    setActiveWidgets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleRemoveWidget = (id) => {
    setActiveWidgets(prev => ({ ...prev, [id]: false }));
    setActiveDragWidget(null);
    setToastMessage({
      text: "Widget removed",
      widgetId: id
    });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleUndoRemove = () => {
    if (toastMessage?.widgetId) {
      setActiveWidgets(prev => ({ ...prev, [toastMessage.widgetId]: true }));
    }
    setToastMessage(null);
  };

  // Sliders hover tooltip handlers (400ms delay)
  const handleSlidersMouseEnter = () => {
    tooltipTimerRef.current = setTimeout(() => {
      setSlidersTooltipVisible(true);
    }, 400);
  };

  const handleSlidersMouseLeave = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setSlidersTooltipVisible(false);
  };

  // Toggle privacy mode and persist in localStorage
  const handleTogglePrivacy = () => {
    setPrivacyEnabled(prev => {
      const nextVal = !prev;
      try {
        localStorage.setItem('qb_dashboard_privacy', JSON.stringify(nextVal));
      } catch {}
      return nextVal;
    });
  };

  // Eye hover tooltip handlers (400ms delay)
  const handleEyeMouseEnter = () => {
    eyeTimerRef.current = setTimeout(() => {
      setEyeTooltipVisible(true);
    }, 400);
  };

  const handleEyeMouseLeave = () => {
    if (eyeTimerRef.current) clearTimeout(eyeTimerRef.current);
    setEyeTooltipVisible(false);
  };

  return (
    <div className="w-full bg-[#F6F7F8] min-h-[calc(100vh-56px)] px-[44px] py-[28px] overflow-y-auto relative">
      {/* 1. Greeting: centered on canvas center */}
      <div className="w-full flex justify-center mb-6">
        <h1 className="text-[32px] font-normal text-[#393A3D] tracking-tight">
          {dashboardData.greeting || "Good morning!"}
        </h1>
      </div>

      {/* 2. PillNav (Category pills row) */}
      <div className="mb-7">
        <PillNav onNavigate={onNavigate} />
      </div>

      {/* 3. Business Feed & Create Actions (Shown in Default Initial Mode only if not using saved custom layout) */}
      {!isEditing && !hasSavedLayout && (
        <>
          <section className="mb-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2 text-[#393A3D]">
                <Sparkles size={20} className="text-[#393A3D]" />
                <h2 className="text-[19px] font-semibold text-[#393A3D]">
                  Business Feed
                </h2>
              </div>
              <button 
                onClick={() => onNavigate && onNavigate('feed')}
                className="text-[15px] text-[#0077C5] hover:underline font-medium cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px]">
              {dashboardData.feed.map((card, idx) => (
                <FeedCard
                  key={idx}
                  {...card}
                  onAction={() => {
                    if (card.link === 'Review all') onNavigate('sales_transactions');
                    else if (card.link === 'View net profit') onNavigate('balance_sheet');
                    else onNavigate('feed');
                  }}
                />
              ))}
            </div>
          </section>

          <CreateActions 
            onActionClick={(action) => {
              if (action === 'Show all') {
                onOpenCreateModal('All');
              } else {
                onOpenCreateModal(action);
              }
            }} 
          />
        </>
      )}

      {/* 4. Business at a glance Section */}
      <section className="mt-7">
        {/* Header row at y≈545-573 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[19px] font-semibold text-[#393A3D]">
            Business at a glance
          </h2>

          {isEditing ? (
            /* Edit Mode Chrome: Link + Add/remove widgets button + Save button */
            <div className="flex items-center space-x-3.5">
              <a
                href="#learn-customization"
                onClick={(e) => e.preventDefault()}
                className="text-[15px] text-[#0077C5] hover:underline font-medium cursor-pointer"
              >
                Learn how to customize your layout
              </a>

              <button
                onClick={() => setDrawerOpen(true)}
                className="h-[38px] px-[20px] bg-white border-2 border-[#2CA01C] text-[#2CA01C] rounded-[6px] text-[15px] font-semibold hover:bg-[#F2FAF0] transition cursor-pointer"
              >
                Add or remove widgets
              </button>

              <button
                onClick={() => setIsEditing(false)}
                className="h-[38px] px-[24px] bg-[#2CA01C] hover:bg-[#258717] text-white rounded-[6px] text-[15px] font-semibold transition cursor-pointer shadow-xs"
              >
                Save
              </button>
            </div>
          ) : (
            /* Normal Mode Chrome: Sliders + Eye buttons with dark hover tooltip */
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setIsEditing(true)}
                  onMouseEnter={handleSlidersMouseEnter}
                  onMouseLeave={handleSlidersMouseLeave}
                  className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] hover:bg-[#E3E5E8] text-[#393A3D] transition cursor-pointer"
                  title=""
                  aria-describedby="customize-tooltip"
                >
                  <Sliders size={20} />
                </button>

                {slidersTooltipVisible && (
                  <div 
                    id="customize-tooltip"
                    className="absolute bottom-[calc(100%+10px)] right-0 bg-[#2E2F31] text-white text-[14px] px-[14px] py-[10px] rounded-[6px] shadow-lg whitespace-nowrap z-50 pointer-events-none animate-in fade-in duration-150"
                  >
                    Customize your dashboard.
                  </div>
                )}
              </div>

              {/* Eye Button with dark 2-line tooltip, caret, and optional chevron */}
              <div className="relative">
                <button
                  onClick={handleTogglePrivacy}
                  onMouseEnter={handleEyeMouseEnter}
                  onMouseLeave={handleEyeMouseLeave}
                  className="w-[36px] h-[36px] flex items-center justify-center rounded-[8px] hover:bg-[#E3E5E8] text-[#393A3D] transition cursor-pointer"
                  title=""
                  aria-describedby="privacy-tooltip"
                >
                  <Eye size={20} />
                </button>

                {eyeTooltipVisible && (
                  <div 
                    id="privacy-tooltip"
                    className="absolute bottom-[calc(100%+14px)] right-0 w-[286px] bg-[#2E2F31] text-white text-[14px] leading-[1.45] px-[14px] py-[12px] rounded-[6px] shadow-lg z-50 pointer-events-none animate-in fade-in duration-150 flex items-center justify-between"
                  >
                    <div className="pr-1 text-left">
                      {privacyEnabled 
                        ? "Show the financial info on your dashboard." 
                        : "Hide the financial info on your dashboard."}
                    </div>

                    {/* Chevron on hide variant (Screenshot 1) */}
                    {!privacyEnabled && (
                      <div className="text-white shrink-0 pl-1">
                        <ChevronRight size={16} strokeWidth={2.5} />
                      </div>
                    )}

                    {/* Downward Caret pointing to icon */}
                    <div className="absolute -bottom-[5px] right-3.5 w-[10px] h-[10px] bg-[#2E2F31] rotate-45" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Feedback Banner (Edit Mode only) */}
        {isEditing && (
          <div className="w-full bg-[#EFEFF1] rounded-[8px] h-[68px] flex items-center justify-center px-6 mb-6 transition">
            {feedbackSubmitted ? (
              <div className="text-[15px] font-medium text-[#393A3D]">
                Thanks for your feedback!
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-[15px] font-medium text-[#393A3D]">
                  Are these customization options useful?
                </span>
                <button
                  onClick={() => setFeedbackSubmitted(true)}
                  className="w-[38px] h-[38px] rounded-full border border-[#393A3D] flex items-center justify-center text-[#393A3D] hover:bg-white transition cursor-pointer"
                  title="Yes, useful"
                >
                  <ThumbsUp size={18} />
                </button>
                <button
                  onClick={() => setFeedbackSubmitted(true)}
                  className="w-[38px] h-[38px] rounded-full border border-[#393A3D] flex items-center justify-center text-[#393A3D] hover:bg-white transition cursor-pointer"
                  title="No, not useful"
                >
                  <ThumbsDown size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Section Content: If Privacy is ON, render PrivacyMask (Screenshot 2) */}
        {privacyEnabled ? (
          <PrivacyMask onTurnOffPrivacy={handleTogglePrivacy} />
        ) : isEditing ? (
          /* EDIT MODE GRID (4 Columns): Matches media_1791589105782_2559e7ec.jpg and media_1791589105790_134f59c6.jpg */
          <div className="space-y-[24px]">
            {/* Row 1: P&L (1) | Expenses (1) | Bank Accounts (1) | Add Widgets Placeholder (1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px] items-stretch min-h-[355px]">
              {/* Profit & Loss */}
              <WidgetEditWrapper isEditing={true}>
                <ProfitLossCard
                  pnlData={dashboardData.pnl}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              </WidgetEditWrapper>

              {/* Expenses */}
              <WidgetEditWrapper isEditing={true}>
                <ExpensesDonutCard
                  expensesData={dashboardData.expenses}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              </WidgetEditWrapper>

              {/* Bank Accounts */}
              <WidgetEditWrapper isEditing={true}>
                <BankCard
                  bankData={dashboardData.bank}
                  privacyEnabled={privacyEnabled}
                  onOpenRegisters={() => onNavigate('bank_transactions')}
                />
              </WidgetEditWrapper>

              {/* Add Widgets Placeholder Card (Solid green border in Edit mode) */}
              <AddWidgetsPlaceholderCard
                onOpenDrawer={() => setDrawerOpen(true)}
                onAddSuggestion={handleToggleWidget}
                isEditing={true}
              />
            </div>

            {/* Row 2: Cash Flow Trend (span 2) | Accounts Payable (1) | Empty Slot (1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px] items-stretch min-h-[355px]">
              {/* Cash Flow Trend (Span 2) */}
              <WidgetEditWrapper isEditing={true} className="xl:col-span-2">
                <CashFlowCard
                  cashflowData={dashboardData.cashflow}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              </WidgetEditWrapper>

              {/* Accounts Payable (1 col) with Drag Overlay support (Screenshot 2) */}
              <WidgetEditWrapper isEditing={true}>
                <AccountsPayableCard
                  apData={dashboardData.accountsPayable}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                  showDragAffordance={activeDragWidget === 'ap'}
                  onRemove={() => handleRemoveWidget('ap')}
                />
              </WidgetEditWrapper>

              {/* Empty slot 4 */}
              <div className="hidden xl:block" />
            </div>
          </div>
        ) : hasSavedLayout ? (
          /* SAVED CUSTOMIZED LAYOUT IN NORMAL MODE (Screenshot 1: media_1791589105782_2559e7ec.jpg / normal mode) */
          <div className="space-y-[24px]">
            {/* Row 1: P&L (1) | Expenses (1) | Accounts Payable (1) | Add Widgets Placeholder (Dashed gray border) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px] items-stretch min-h-[355px]">
              {/* 1. Profit & Loss */}
              {activeWidgets.pnl && (
                <ProfitLossCard
                  pnlData={dashboardData.pnl}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              )}

              {/* 2. Expenses */}
              {activeWidgets.expenses && (
                <ExpensesDonutCard
                  expensesData={dashboardData.expenses}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              )}

              {/* 3. Accounts Payable (Now in Row 1 Col 3) */}
              {activeWidgets.ap && (
                <AccountsPayableCard
                  apData={dashboardData.accountsPayable}
                  privacyEnabled={privacyEnabled}
                  onNavigate={onNavigate}
                />
              )}

              {/* 4. Add Widgets Placeholder Card (Dashed border in Normal mode!) */}
              <AddWidgetsPlaceholderCard
                onOpenDrawer={() => setDrawerOpen(true)}
                onAddSuggestion={handleToggleWidget}
                isEditing={false}
              />
            </div>

            {/* Row 2: Cash Flow Trend (span 2) | Bank Accounts (1) | Empty Slot */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px] items-stretch min-h-[355px]">
              {/* 1. Cash Flow Trend (Span 2) */}
              {activeWidgets.cashflow && (
                <div className="xl:col-span-2">
                  <CashFlowCard
                    cashflowData={dashboardData.cashflow}
                    privacyEnabled={privacyEnabled}
                    onNavigate={onNavigate}
                  />
                </div>
              )}

              {/* 2. Bank Accounts Card */}
              {activeWidgets.bank && (
                <BankCard
                  bankData={dashboardData.bank}
                  privacyEnabled={privacyEnabled}
                  onOpenRegisters={() => onNavigate('bank_transactions')}
                />
              )}

              {/* 3. Empty slot */}
              <div className="hidden xl:block" />
            </div>
          </div>
        ) : (
          /* DEFAULT INITIAL LAYOUT: Row 1 (Funnel + Bank) | Row 2 (P&L + Expenses + Cash Flow) */
          <>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_414px] gap-[24px] items-stretch min-h-[460px]">
              <FunnelCard
                funnelData={dashboardData.funnel}
                privacyEnabled={privacyEnabled}
                onRequestPayment={() => onOpenCreateModal('Invoice')}
              />

              <BankCard
                bankData={dashboardData.bank}
                privacyEnabled={privacyEnabled}
                onOpenRegisters={() => onNavigate('bank_transactions')}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[413px_413px_1fr] gap-[24px] items-stretch mt-[24px]">
              <ProfitLossCard
                pnlData={dashboardData.pnl}
                privacyEnabled={privacyEnabled}
                onNavigate={onNavigate}
              />

              <ExpensesDonutCard
                expensesData={dashboardData.expenses}
                privacyEnabled={privacyEnabled}
                onNavigate={onNavigate}
              />

              <CashFlowCard
                cashflowData={dashboardData.cashflow}
                privacyEnabled={privacyEnabled}
                onNavigate={onNavigate}
              />
            </div>
          </>
        )}
      </section>

      {/* 5. Toast Notification (Bottom Center) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#2E2F31] text-white text-[14px] px-5 py-3 rounded-[6px] shadow-2xl flex items-center space-x-5 z-50 animate-in slide-in-from-bottom duration-200">
          <span>{toastMessage.text}</span>
          <button
            onClick={handleUndoRemove}
            className="text-[#0077C5] hover:text-blue-400 font-semibold cursor-pointer"
          >
            Undo
          </button>
        </div>
      )}

      {/* 6. Add Widgets Slide-out Drawer */}
      <AddWidgetsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeWidgets={activeWidgets}
        onToggleWidget={handleToggleWidget}
      />
    </div>
  );
}
