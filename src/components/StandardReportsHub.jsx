import React, { useState } from 'react';
import { 
  Bookmark, ChevronDown, ChevronRight, FileText, Star, MoreVertical, 
  HelpCircle, Search, Sliders, ChevronUp, Menu
} from 'lucide-react';

export default function StandardReportsHub({ 
  onSelectReport, 
  onNavigateSub,
  activeSubmenu = 'standard_reports'
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(['Accounts receivable aging summary', 'Balance Sheet', 'Profit and Loss']);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [financialPlanningOpen, setFinancialPlanningOpen] = useState(true);

  // Sections collapse
  const [sectionsOpen, setSectionsOpen] = useState({
    favorites: true,
    businessOverview: true,
    whoOwesYou: true,
    whatYouOwe: true,
    expensesVendors: true,
    salesCustomers: true,
    accountant: true
  });

  const toggleSection = (key) => {
    setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFavorite = (name, e) => {
    e.stopPropagation();
    setFavorites(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const isFavorite = (name) => favorites.includes(name);

  // Renders a single report line item exactly as seen in Screenshot 2
  const renderReportItem = (name, hasHelp = false) => {
    const isFav = isFavorite(name);
    const matchesSearch = !searchTerm || name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return null;

    return (
      <div 
        key={name}
        onClick={() => onSelectReport(name)}
        className="group flex items-center justify-between px-3 py-2 rounded-md hover:bg-[#eceef1] cursor-pointer transition relative"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-gray-800 text-xs font-medium group-hover:text-black truncate">
            {name}
          </span>
          <FileText size={13} className="text-gray-400 group-hover:text-gray-600 shrink-0" />
          {hasHelp && (
            <HelpCircle size={13} className="text-gray-400 group-hover:text-gray-700 shrink-0" />
          )}
        </div>

        <div className="flex items-center space-x-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => toggleFavorite(name, e)}
            className="p-1 cursor-pointer"
            title={isFav ? "Remove favorite" : "Add to favorites"}
          >
            <Star 
              size={14} 
              className={isFav ? "fill-[#2ca01c] text-[#2ca01c]" : "text-gray-300 hover:text-gray-500"} 
            />
          </button>
          
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(activeDropdown === name ? null : name);
              }}
              className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer"
            >
              <MoreVertical size={14} />
            </button>
            {activeDropdown === name && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded shadow-lg py-1 z-30 text-xs">
                <button 
                  onClick={() => { setActiveDropdown(null); onSelectReport(name); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Run report
                </button>
                <button 
                  onClick={() => { setActiveDropdown(null); alert(`Customizing ${name}`); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Customize
                </button>
                <button 
                  onClick={() => { setActiveDropdown(null); alert(`Emailing ${name}`); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Schedule email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex w-full min-h-screen bg-[#f4f5f8] text-gray-900">
      {/* Secondary Sidebar (REPORTS & ANALYTICS) */}
      <div className="w-[230px] bg-white border-r border-gray-200 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-2">
            <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              REPORTS & ANALYTICS
            </span>
            <button className="text-gray-400 hover:text-gray-700 p-1">
              <Menu size={14} />
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => onNavigateSub?.('standard_reports')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold cursor-pointer ${
                activeSubmenu === 'standard_reports' ? 'bg-[#eceef1] text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>Standard reports</span>
              <Bookmark size={13} className="fill-gray-900 text-gray-900" />
            </button>

            <button
              onClick={() => onNavigateSub?.('custom_reports')}
              className={`w-full flex items-center px-3 py-2 rounded-md text-xs font-medium cursor-pointer ${
                activeSubmenu === 'custom_reports' ? 'bg-[#eceef1] text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Custom reports
            </button>

            <button
              onClick={() => onNavigateSub?.('management_reports')}
              className={`w-full flex items-center px-3 py-2 rounded-md text-xs font-medium cursor-pointer ${
                activeSubmenu === 'management_reports' ? 'bg-[#eceef1] text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Management reports
            </button>

            {/* Financial planning collapsible group */}
            <div className="pt-2">
              <button
                onClick={() => setFinancialPlanningOpen(!financialPlanningOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded cursor-pointer"
              >
                <span>Financial planning</span>
                {financialPlanningOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {financialPlanningOpen && (
                <div className="pl-4 mt-1 space-y-1">
                  <button
                    onClick={() => onNavigateSub?.('financial_planning')}
                    className="w-full text-left px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                  >
                    Cash flow planner
                  </button>
                  <button
                    onClick={() => onNavigateSub?.('budgets')}
                    className="w-full text-left px-3 py-1.5 rounded text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 cursor-pointer"
                  >
                    Budgets
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Reports Hub Content */}
      <div className="flex-1 p-6 max-w-6xl overflow-y-auto space-y-4">
        {/* Search Input Bar matching Screenshot 2 */}
        <div className="w-full max-w-sm mb-4">
          <div className="relative">
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Type report name here"
              className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-green-600 pr-8"
            />
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* 1. Favorites Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('favorites')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.favorites ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>Favorites</span>
          </button>

          {sectionsOpen.favorites && (
            <div className="p-3 divide-y divide-gray-50">
              {favorites.map(favName => renderReportItem(favName, favName === 'Profit and Loss'))}
            </div>
          )}
        </div>

        {/* 2. Business overview Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('businessOverview')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.businessOverview ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>Business overview</span>
          </button>

          {sectionsOpen.businessOverview && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div>
                {renderReportItem('Audit Log')}
                {renderReportItem('Balance Sheet')}
                {renderReportItem('Balance Sheet Comparison')}
                {renderReportItem('Balance Sheet Detail')}
                {renderReportItem('Balance Sheet Summary')}
                {renderReportItem('Statement of Cash Flows')}
                {renderReportItem('Business Snapshot')}
                {renderReportItem('Profit and Loss')}
                {renderReportItem('Profit and Loss by Customer')}
              </div>
              <div>
                {renderReportItem('Profit and Loss by Month')}
                {renderReportItem('Profit and Loss by Tag Group')}
                {renderReportItem('Profit and Loss Comparison')}
                {renderReportItem('Profit and Loss Detail')}
                {renderReportItem('Profit and Loss as % of total income')}
                {renderReportItem('Profit and Loss year-to-date comparison')}
                {renderReportItem('Quarterly Profit and Loss Summary')}
                {renderReportItem('Realized Exchange Gains & Losses')}
                {renderReportItem('Unrealized Exchange Gains & Losses')}
              </div>
            </div>
          )}
        </div>

        {/* 3. Who owes you Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('whoOwesYou')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.whoOwesYou ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>Who owes you</span>
          </button>

          {sectionsOpen.whoOwesYou && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div>
                {renderReportItem('Accounts receivable aging summary')}
                {renderReportItem('Accounts receivable aging detail')}
                {renderReportItem('Customer Balance Detail')}
                {renderReportItem('Customer Balance Summary')}
              </div>
              <div>
                {renderReportItem('Invoices and Received Payments')}
                {renderReportItem('Open Invoices')}
                {renderReportItem('Statement of Account')}
                {renderReportItem('Collections Report')}
              </div>
            </div>
          )}
        </div>

        {/* 4. What you owe Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('whatYouOwe')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.whatYouOwe ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>What you owe</span>
          </button>

          {sectionsOpen.whatYouOwe && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div>
                {renderReportItem('1099 Transaction Detail Report')}
                {renderReportItem('Accounts payable aging detail')}
                {renderReportItem('Accounts payable aging summary')}
              </div>
              <div>
                {renderReportItem('Bill Payment List')}
                {renderReportItem('Unpaid Bills')}
                {renderReportItem('Vendor Balance Detail')}
              </div>
            </div>
          )}
        </div>

        {/* 5. Expenses and vendors Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('expensesVendors')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.expensesVendors ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>Expenses and vendors</span>
          </button>

          {sectionsOpen.expensesVendors && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div>
                {renderReportItem('Check Detail')}
                {renderReportItem('Expenses by Vendor Summary')}
                {renderReportItem('Open Purchase Order Detail')}
                {renderReportItem('Purchases by Product/Service Detail')}
              </div>
              <div>
                {renderReportItem('Purchases by Vendor Detail')}
                {renderReportItem('Transaction List by Vendor')}
                {renderReportItem('Vendor Balance Summary')}
              </div>
            </div>
          )}
        </div>

        {/* 6. For my accountant Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
          <button
            onClick={() => toggleSection('accountant')}
            className="w-full px-4 py-3 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-white border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {sectionsOpen.accountant ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>For my accountant</span>
          </button>

          {sectionsOpen.accountant && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
              <div>
                {renderReportItem('Account List')}
                {renderReportItem('General Ledger')}
                {renderReportItem('Journal')}
                {renderReportItem('Trial Balance')}
              </div>
              <div>
                {renderReportItem('Transaction Detail by Account')}
                {renderReportItem('Transaction List by Date')}
                {renderReportItem('Transaction List with Splits')}
                {renderReportItem('Recent Transactions')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
