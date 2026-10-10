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
  Sliders
} from 'lucide-react';

export default function SideRail({ 
  currentView = 'dashboard', 
  setCurrentView, 
  onOpenCreate,
  onToggleCustomize,
  isCustomizing = false
}) {
  return (
    <aside className="w-[84px] bg-white border-r border-[#E3E5E8] flex flex-col justify-between items-center py-3 select-none shrink-0 h-[calc(100vh-56px)] overflow-y-auto">
      <div className="w-full flex flex-col items-center">
      {/* Create (+) at y≈86: 32px circle with +, label "Create" 10px */}
      <div className="flex flex-col items-center mb-5 cursor-pointer group" onClick={onOpenCreate}>
        <div className="w-[32px] h-[32px] rounded-full border-2 border-[#393A3D] group-hover:border-[#2CA01C] flex items-center justify-center text-[#2CA01C] transition">
          <Plus size={18} strokeWidth={2.5} />
        </div>
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Create
        </span>
      </div>

      {/* Bookmarks at y≈165 */}
      <div 
        onClick={() => setCurrentView('bookmarks')}
        className="flex flex-col items-center mb-5 cursor-pointer group"
      >
        <Bookmark size={24} className="text-[#6B6C72] group-hover:text-[#393A3D]" />
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Bookmarks
        </span>
      </div>

      {/* Dashboard (Active) at y≈243: 64×52 rounded-8 bg #E3E5E8 */}
      <div 
        onClick={() => setCurrentView('dashboard')}
        className={`w-[64px] h-[52px] rounded-lg flex flex-col items-center justify-center mb-5 cursor-pointer transition ${
          currentView === 'dashboard' 
            ? 'bg-[#E3E5E8] text-[#393A3D]' 
            : 'hover:bg-gray-100 text-[#6B6C72]'
        }`}
      >
        <LayoutGrid size={24} className={currentView === 'dashboard' ? 'text-[#393A3D]' : 'text-[#6B6C72]'} />
        <span className={`text-[10px] mt-0.5 leading-none ${currentView === 'dashboard' ? 'font-semibold text-[#393A3D]' : 'font-medium text-[#6B6C72]'}`}>
          Dashboard
        </span>
      </div>

      {/* Feed at y≈318 */}
      <div 
        onClick={() => setCurrentView('feed')}
        className="flex flex-col items-center mb-5 cursor-pointer group"
      >
        <Sparkles size={24} className="text-[#6B6C72] group-hover:text-[#393A3D]" />
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Feed
        </span>
      </div>

      {/* Reports at y≈393 */}
      <div 
        onClick={() => setCurrentView('standard_reports')}
        className="flex flex-col items-center mb-5 cursor-pointer group"
      >
        <TrendingUp size={24} className="text-[#6B6C72] group-hover:text-[#393A3D]" />
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Reports
        </span>
      </div>

      {/* My apps at y≈467 */}
      <div 
        onClick={() => setCurrentView('apps')}
        className={`w-[64px] h-[52px] rounded-lg flex flex-col items-center justify-center mb-4 cursor-pointer transition ${
          currentView === 'apps'
            ? 'bg-[#E3E5E8] text-[#393A3D]'
            : 'hover:bg-gray-100 text-[#6B6C72]'
        }`}
      >
        <Grid size={24} className={currentView === 'apps' ? 'text-[#393A3D]' : 'text-[#6B6C72]'} />
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          My apps
        </span>
      </div>

      {/* Divider line at y≈515 (1px, x: 12-72) */}
      <div className="w-[60px] h-px bg-[#E3E5E8] my-2" />

      {/* PINNED header at y≈545 (10px / 600 / letter-spacing .08em) */}
      <div className="text-[10px] font-semibold text-[#6B6C72] uppercase tracking-[0.08em] my-2">
        PINNED
      </div>

      {/* Accounting tile at y≈580 (28px green tile #2CA01C, radius 8) */}
      <div 
        onClick={() => setCurrentView('chart_of_accounts')}
        className="flex flex-col items-center mb-4 cursor-pointer group"
      >
        <div className="w-[28px] h-[28px] rounded-lg bg-[#2CA01C] flex items-center justify-center text-white shadow-xs">
          <Activity size={16} />
        </div>
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Accounting
        </span>
      </div>

      {/* Expenses tile at y≈655 (28px dark green tile #107C41, radius 8) */}
      <div 
        onClick={() => setCurrentView('expense_transactions')}
        className="flex flex-col items-center mb-4 cursor-pointer group"
      >
        <div className="w-[28px] h-[28px] rounded-lg bg-[#107C41] flex items-center justify-center text-white shadow-xs">
          <CreditCard size={16} />
        </div>
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Expenses
        </span>
      </div>

      {/* Sales tile at y≈730 (28px blue tile #0077C5, radius 8) */}
      <div 
        onClick={() => setCurrentView('sales_transactions')}
        className="flex flex-col items-center mb-4 cursor-pointer group"
      >
        <div className="w-[28px] h-[28px] rounded-lg bg-[#0077C5] flex items-center justify-center text-white shadow-xs">
          <BarChart2 size={16} />
        </div>
        <span className="text-[10px] font-medium text-[#6B6C72] group-hover:text-[#393A3D] mt-1">
          Sales
        </span>
      </div>
      </div>

      {/* Customize pinned at bottom y≈930 */}
      <div 
        onClick={onToggleCustomize}
        className={`flex flex-col items-center mt-auto pt-3 pb-1 cursor-pointer group transition ${
          isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] hover:text-[#393A3D]'
        }`}
        title="Customize dashboard layout"
      >
        <Sliders size={22} className={isCustomizing ? 'text-[#2CA01C]' : 'text-[#6B6C72] group-hover:text-[#393A3D]'} />
        <span className={`text-[10px] mt-1 ${isCustomizing ? 'font-semibold text-[#2CA01C]' : 'font-medium'}`}>
          Customize
        </span>
      </div>
    </aside>
  );
}
