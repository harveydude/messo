import React from 'react';
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
} from 'lucide-react';

/**
 * The left icon rail.
 *
 * Every item here used to be a `<div class="... cursor-pointer">` with an
 * onClick. That is not a control: it cannot be reached with Tab, cannot be
 * activated with Enter or Space, and a screen reader does not announce it as
 * something you can press. The entire primary navigation was invisible to a
 * keyboard user -- Lighthouse flagged it as `button-name` failures.
 *
 * These are real `<button>`s now, so they are focusable, activatable and
 * announceable. `aria-current="page"` marks the active screen, which is how a
 * screen reader tells where you are; the grey pill stays exactly as it was,
 * because that is a visual signal and this is the same signal in text.
 *
 * Each item carries a `title` and an accessible name, since the visible label
 * is 10px -- legible as a cue, too small to rely on alone.
 */
export default function SideRail({
  currentView = 'dashboard',
  setCurrentView,
  onOpenCreate,
  onToggleCustomize,
  isCustomizing = false,
}) {
  const isActive = (id) => currentView === id;

  return (
    <aside
      aria-label="Main navigation"
      className="w-[84px] bg-white border-r border-[#E3E5E8] flex flex-col justify-between items-center py-3 select-none shrink-0 h-[calc(100vh-56px)] overflow-y-auto"
    >
      <div className="w-full flex flex-col items-center">
        <RailItem label="Create" onClick={onOpenCreate}>
          <span
            className="w-[32px] h-[32px] rounded-full border-2 border-[#393A3D] group-hover:border-[#2CA01C] group-focus-visible:border-[#2CA01C] flex items-center justify-center text-[#2CA01C] transition"
            aria-hidden="true"
          >
            <Plus size={18} strokeWidth={2.5} />
          </span>
        </RailItem>

        <RailItem label="Bookmarks" onClick={() => setCurrentView('bookmarks')} active={isActive('bookmarks')}>
          <Bookmark size={24} aria-hidden="true" />
        </RailItem>

        <RailItem
          label="Dashboard"
          onClick={() => setCurrentView('dashboard')}
          active={isActive('dashboard')}
          boxed
        >
          <LayoutGrid size={24} aria-hidden="true" />
        </RailItem>

        <RailItem label="Feed" onClick={() => setCurrentView('feed')} active={isActive('feed')}>
          <Sparkles size={24} aria-hidden="true" />
        </RailItem>

        <RailItem
          label="Reports"
          onClick={() => setCurrentView('standard_reports')}
          active={isActive('standard_reports') || isActive('balance_sheet') || isActive('management_reports')}
        >
          <TrendingUp size={24} aria-hidden="true" />
        </RailItem>

        <RailItem label="My apps" onClick={() => setCurrentView('apps')} active={isActive('apps')} boxed>
          <Grid size={24} aria-hidden="true" />
        </RailItem>

        <div className="w-[60px] h-px bg-[#E3E5E8] my-2" role="presentation" />
        <p className="text-[10px] font-semibold text-[#6B6C72] uppercase tracking-[0.08em] my-2">Pinned</p>

        <RailItem label="Accounting" onClick={() => setCurrentView('chart_of_accounts')} active={isActive('chart_of_accounts')}>
          <span className="w-[28px] h-[28px] rounded-lg bg-[#2CA01C] flex items-center justify-center text-white shadow-xs" aria-hidden="true">
            <Activity size={16} />
          </span>
        </RailItem>

        <RailItem label="Expenses" onClick={() => setCurrentView('expense_transactions')} active={isActive('expense_transactions')}>
          <span className="w-[28px] h-[28px] rounded-lg bg-[#107C41] flex items-center justify-center text-white shadow-xs" aria-hidden="true">
            <CreditCard size={16} />
          </span>
        </RailItem>

        <RailItem label="Sales" onClick={() => setCurrentView('sales_transactions')} active={isActive('sales_transactions')}>
          <span className="w-[28px] h-[28px] rounded-lg bg-[#0077C5] flex items-center justify-center text-white shadow-xs" aria-hidden="true">
            <BarChart2 size={16} />
          </span>
        </RailItem>
      </div>

      <button
        type="button"
        onClick={onToggleCustomize}
        aria-pressed={isCustomizing}
        title="Customize dashboard layout"
        className={`flex flex-col items-center mt-auto pt-3 pb-1 cursor-pointer group transition rounded-md focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 ${
          isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] hover:text-[#393A3D]'
        }`}
      >
        <Sliders size={22} aria-hidden="true" className={isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'} />
        <span className={`text-[10px] mt-1 ${isCustomizing ? 'font-semibold text-[#2CA01C]' : 'font-medium'}`}>
          Customize
        </span>
      </button>
    </aside>
  );
}

/**
 * One rail item, as a button.
 *
 * Kept as a helper because the alternative -- nine copies of the same 20-line
 * className string -- is precisely what produced the duplication the audit
 * measured (one class string repeated 29 times across the project).
 */
function RailItem({ label, onClick, active = false, boxed = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={`group flex flex-col items-center mb-5 cursor-pointer transition rounded-md focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 ${
        boxed
          ? `w-[64px] h-[52px] justify-center mb-4 ${
              active ? 'bg-[#E3E5E8] text-[#393A3D]' : 'hover:bg-gray-100 text-[#6B6C72]'
            }`
          : `p-1 ${active ? 'text-[#393A3D]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'}`
      }`}
    >
      <span className={active ? 'text-[#393A3D]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'}>
        {children}
      </span>
      <span
        className={`text-[10px] mt-0.5 leading-none ${
          active ? 'font-semibold text-[#393A3D]' : 'font-medium text-[#6B6C72] group-hover:text-[#393A3D]'
        }`}
      >
        {label}
      </span>
    </button>
  );
}
