import React, { useState } from 'react';
import { Star, MoreVertical, ChevronDown, ChevronRight, FileText } from 'lucide-react';

export default function ReportsView({ onOpenBalanceSheet }) {
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [businessOverviewOpen, setBusinessOverviewOpen] = useState(true);
  const [whoOwesYouOpen, setWhoOwesYouOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const businessReports = [
    "Audit Log", "Profit and Loss by Month",
    "Balance Sheet", "Profit and Loss by Tag Group",
    "Balance Sheet Comparison", "Profit and Loss Comparison",
    "Balance Sheet Detail", "Profit and Loss Detail",
    "Balance Sheet Summary", "Profit and Loss as % of total income",
    "Statement of Cash Flows", "Profit and Loss year-to-date comparison",
    "Business Snapshot", "Project Profitability Summary",
    "Profit and Loss", "Quarterly Profit and Loss Summary",
    "Profit and Loss by Customer"
  ];

  const whoOwesReports = [
    "Accounts receivable aging summary", "Invoices and Received Payments",
    "Accounts receivable aging detail", "Open Invoices",
    "Collections Report", "Statement List",
    "Customer Balance Summary", "Terms List",
    "Customer Balance Detail", "Unbilled charges",
    "Invoice List", "Unbilled time"
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="relative max-w-lg">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Type report name here"
          className="w-full text-xs pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:border-[#2ca01c] focus:outline-none bg-white"
        />
        <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400" />
      </div>

      {/* Favorites Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <button
          onClick={() => setFavoritesOpen(!favoritesOpen)}
          className="w-full p-4 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-gray-50/70 border-b border-gray-200"
        >
          {favoritesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Favorites</span>
        </button>

        {favoritesOpen && (
          <div className="p-4 space-y-3">
            {/* Accounts receivable aging summary */}
            <div className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition">
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-800">
                <FileText size={14} className="text-gray-400" />
                <span>Accounts receivable aging summary</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Star size={14} className="text-green-600 fill-green-600 cursor-pointer" />
                <MoreVertical size={14} className="cursor-pointer hover:text-gray-600" />
              </div>
            </div>

            {/* Balance Sheet */}
            <div
              onClick={() => onNavigate?.('report_view', { report: 'balance-sheet' })}
              className="flex items-center justify-between p-2 hover:bg-green-50/50 rounded-lg transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-semibold text-[#0077c5] hover:underline">
                <FileText size={14} className="text-[#0077c5]" />
                <span>Balance Sheet</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Star size={14} className="text-green-600 fill-green-600 cursor-pointer" />
                <MoreVertical size={14} className="cursor-pointer hover:text-gray-600" />
              </div>
            </div>

            {/* Profit and Loss */}
            <div
              onClick={() => onNavigate?.('report_view', { report: 'pnl' })}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-800">
                <FileText size={14} className="text-gray-400" />
                <span>Profit and Loss</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Star size={14} className="text-green-600 fill-green-600 cursor-pointer" />
                <MoreVertical size={14} className="cursor-pointer hover:text-gray-600" />
              </div>
            </div>

            {/* Cash Flow */}
            <div
              onClick={() => onNavigate?.('report_view', { report: 'cash-flow' })}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-medium text-gray-800">
                <FileText size={14} className="text-gray-400" />
                <span>Statement of Cash Flows</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <Star size={14} className="hover:text-green-600 cursor-pointer" />
                <MoreVertical size={14} className="cursor-pointer hover:text-gray-600" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business Overview Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <button
          onClick={() => setBusinessOverviewOpen(!businessOverviewOpen)}
          className="w-full p-4 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-gray-50/70 border-b border-gray-200"
        >
          {businessOverviewOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Business overview</span>
        </button>

        {businessOverviewOpen && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {businessReports.map((report, idx) => (
              <div 
                key={idx} 
                onClick={() => report.includes("Balance Sheet") ? onOpenBalanceSheet() : null}
                className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition cursor-pointer"
              >
                <span className={`text-xs ${report.includes("Balance Sheet") ? "text-[#0077c5] font-semibold hover:underline" : "text-gray-800"}`}>
                  {report}
                </span>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Star size={13} className="hover:text-green-600 cursor-pointer" />
                  <MoreVertical size={13} className="hover:text-gray-600 cursor-pointer" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Who owes you Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        <button
          onClick={() => setWhoOwesYouOpen(!whoOwesYouOpen)}
          className="w-full p-4 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-gray-50/70 border-b border-gray-200"
        >
          {whoOwesYouOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Who owes you</span>
        </button>

        {whoOwesYouOpen && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {whoOwesReports.map((report, idx) => (
              <div key={idx} className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition">
                <span className="text-xs text-gray-800">{report}</span>
                <div className="flex items-center space-x-2 text-gray-300">
                  <Star size={13} className="hover:text-green-600 cursor-pointer" />
                  <MoreVertical size={13} className="hover:text-gray-600 cursor-pointer" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
