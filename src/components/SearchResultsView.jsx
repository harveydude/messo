import React, { useState, useEffect } from 'react';
import { Printer, Share2, Sliders, X, Filter, Calendar, ChevronDown, HelpCircle, ArrowDown, Sparkles } from 'lucide-react';
import api from '../api/client';

export default function SearchResultsView({ 
  query = "Show me open invoices for the last 30 days",
  onNavigate
}) {
  const [activeTab, setActiveTab] = useState("all");
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [liveResults, setLiveResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState([
    "Date range: 09/24/2025-10/24/2…",
    "Transaction type: Invoice"
  ]);

  useEffect(() => {
    if (!query || !query.trim()) return;
    setIsLoading(true);
    api.smartSearch(query.trim()).then(res => {
      if (res?.success) {
        setLiveResults(res);
      }
    }).catch(err => {
      console.warn('Smart search API call failed:', err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [query]);

  const defaultTransactions = [
    { date: "09/27/2025", type: "Invoice", refNo: "1037", contact: "Sonnenschein Family Store", dueDate: "10/27/2025", balance: "₹362.07", amount: "₹362.07", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/27/2025", type: "Invoice", refNo: "1035", contact: "Mark Cho", dueDate: "10/27/2025", balance: "₹314.28", amount: "₹314.28", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/27/2025", type: "Invoice", refNo: "1036", contact: "Freeman Sporting Goods:0969 Ocean View Road", dueDate: "10/27/2025", balance: "₹477.50", amount: "₹477.50", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/26/2025", type: "Invoice", refNo: "1033", contact: "Geeta Kalapatapu", dueDate: "10/26/2025", balance: "₹629.10", amount: "₹629.10", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/26/2025", type: "Invoice", refNo: "1034", contact: "Rondonuwu Fruit and Vegi", dueDate: "10/26/2025", balance: "₹78.60", amount: "₹78.60", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/25/2025", type: "Invoice", refNo: "1023", contact: "Red Rock Diner", dueDate: "10/25/2025", balance: "₹70.00", amount: "₹70.00", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" }
  ];

  const transactions = (liveResults?.records && liveResults.records.length > 0)
    ? liveResults.records.map(r => ({
        date: r.date || r.issue_date || '10/20/2025',
        type: r.type || r.doc_type || 'Invoice',
        refNo: r.doc_number || r.invoice_number || '1001',
        contact: r.contact_name || r.customer_name || 'Customer',
        dueDate: r.due_date || '11/19/2025',
        balance: r.balance_inr ? `₹${r.balance_inr}` : (r.balance_due_inr ? `₹${r.balance_due_inr}` : '₹0.00'),
        amount: r.total_inr ? `₹${r.total_inr}` : '₹0.00',
        memo: r.memo || r.notes || '',
        lastModified: 'Live PostgreSQL'
      }))
    : defaultTransactions;

  const handleRemoveChip = (chipToRemove) => {
    setChips(prev => prev.filter(c => c !== chipToRemove));
  };

  return (
    <div className="w-full bg-white min-h-[calc(100vh-56px)] px-[44px] py-[28px] overflow-y-auto select-none">
      {/* 1. Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#393A3D]">
            Search results
          </h1>
          <div className="text-[14px] text-[#6B6C72] mt-1">
            <span>Search exact words instead: </span>
            <button className="text-[#7A3CE8] font-medium hover:underline cursor-pointer">
              "{query}"
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[14px]">
          <button 
            onClick={() => onNavigate ? onNavigate('sales_transactions') : (window.location.hash = '#/sales')}
            className="text-[#0077C5] hover:underline cursor-pointer font-medium"
          >
            Go to all transactions
          </button>
          <span className="text-[#6B6C72]">or</span>
          <button 
            onClick={() => onNavigate ? onNavigate('feedback') : (window.location.hash = '#/feedback')}
            className="text-[#0077C5] hover:underline cursor-pointer font-medium"
          >
            Send us feedback
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div className="flex items-center space-x-8 border-b border-[#D4D7DC] mb-6 text-[16px]">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 font-medium transition cursor-pointer ${
            activeTab === 'all'
              ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[2px]'
              : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          All
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`pb-3 font-medium transition cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[2px]'
              : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          Transactions
        </button>

        <button
          onClick={() => setActiveTab("contacts")}
          className={`pb-3 font-medium transition cursor-pointer ${
            activeTab === 'contacts'
              ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[2px]'
              : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          Contacts
        </button>

        <button
          onClick={() => setActiveTab("reports")}
          className={`pb-3 font-medium transition cursor-pointer ${
            activeTab === 'reports'
              ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[2px]'
              : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          Reports
        </button>
      </div>

      {/* Live AI Summary Banner */}
      {liveResults?.ai_summary && (
        <div className="w-full bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-[8px] p-4 flex items-start justify-between mb-6 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start space-x-3">
            <div className="w-7 h-7 rounded-full bg-[#7A3CE8] text-white flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={15} />
            </div>
            <div>
              <div className="text-[15px] font-bold text-[#393A3D] flex items-center space-x-2">
                <span>Intuit Assist Insights</span>
                <span className="text-[10px] uppercase tracking-wider bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-bold">NLP Live</span>
              </div>
              <div className="text-[14px] text-[#4A4B4E] mt-1 leading-relaxed">
                {liveResults.ai_summary}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Info Banner (Customize Search) */}
      {showInfoBanner && (
        <div className="w-full bg-white border-[1.5px] border-[#0077C5] rounded-[8px] p-4 flex items-start justify-between mb-6 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-[#0077C5] text-white flex items-center justify-center shrink-0 mt-0.5 text-[12px] font-bold">
              i
            </div>
            <div>
              <div className="text-[15px] font-semibold text-[#393A3D]">
                Customize Search
              </div>
              <div className="text-[14px] text-[#6B6C72] mt-0.5 leading-relaxed">
                Select the filters and columns you want to see and customize the look and feel of the rows. Click the Customize button to personalize your view.
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowInfoBanner(false)}
            className="text-[#6B6C72] hover:text-[#393A3D] p-1 cursor-pointer transition shrink-0 ml-4"
            title="Dismiss banner"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 4. Filter Bar */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* 5 Input Fields */}
          <div className="flex flex-wrap items-end gap-3.5">
            {/* 1. Date range */}
            <div>
              <label className="block text-[14px] text-[#6B6C72] mb-1.5 font-normal">
                Date range
              </label>
              <div className="w-[232px] h-[40px] px-3 border border-[#8D9096] rounded-[4px] flex items-center justify-between bg-white cursor-pointer hover:border-[#393A3D]">
                <span className="text-[15px] text-[#393A3D]">Custom</span>
                <Calendar size={18} className="text-[#6B6C72]" />
              </div>
            </div>

            {/* 2. Transaction type */}
            <div>
              <label className="block text-[14px] text-[#6B6C72] mb-1.5 font-normal">
                Transaction type
              </label>
              <div className="w-[232px] h-[40px] border border-[#8D9096] rounded-[4px] flex items-center bg-white cursor-pointer hover:border-[#393A3D]">
                <span className="flex-1 px-3 text-[15px] text-[#393A3D] truncate">Select...</span>
                <div className="w-[36px] h-full border-l border-[#D4D7DC] flex items-center justify-center text-[#6B6C72]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 3. Reference number */}
            <div>
              <label className="block text-[14px] text-[#6B6C72] mb-1.5 font-normal">
                Reference number
              </label>
              <input
                type="text"
                placeholder="Type..."
                className="w-[200px] h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[15px] text-[#393A3D] placeholder-[#6B6C72] bg-white focus:outline-none focus:border-[#2CA01C]"
              />
            </div>

            {/* 4. Contact */}
            <div>
              <label className="block text-[14px] text-[#6B6C72] mb-1.5 font-normal">
                Contact
              </label>
              <div className="w-[232px] h-[40px] border border-[#8D9096] rounded-[4px] flex items-center bg-white cursor-pointer hover:border-[#393A3D]">
                <span className="flex-1 px-3 text-[15px] text-[#393A3D] truncate">Select...</span>
                <div className="w-[36px] h-full border-l border-[#D4D7DC] flex items-center justify-center text-[#6B6C72]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* 5. Amount */}
            <div>
              <label className="block text-[14px] text-[#6B6C72] mb-1.5 font-normal">
                Amount
              </label>
              <div className="w-[232px] h-[40px] border border-[#8D9096] rounded-[4px] flex items-center bg-white cursor-pointer hover:border-[#393A3D]">
                <span className="flex-1 px-3 text-[15px] text-[#393A3D] truncate">Select...</span>
                <div className="w-[36px] h-full border-l border-[#D4D7DC] flex items-center justify-center text-[#6B6C72]">
                  <ChevronDown size={16} />
                </div>
              </div>
            </div>

            {/* Filters Button */}
            <button className="flex items-center space-x-1.5 h-[40px] px-2 text-[15px] font-medium text-[#393A3D] hover:text-black cursor-pointer">
              <Filter size={16} />
              <span>Filters</span>
            </button>
          </div>

          {/* Right Action Stack: Print / Export / Customize */}
          <div className="flex flex-col items-end space-y-2">
            <div className="flex items-center space-x-4 text-[#393A3D]">
              <button className="hover:text-black p-1 cursor-pointer" title="Print results">
                <Printer size={18} />
              </button>
              <button className="hover:text-black p-1 cursor-pointer" title="Export results">
                <Share2 size={18} />
              </button>
            </div>

            <button className="flex items-center space-x-1.5 text-[14px] font-medium text-[#393A3D] hover:text-black cursor-pointer pt-1">
              <Sliders size={16} />
              <span>Customize</span>
            </button>
          </div>
        </div>

        {/* 5. Filter Chips Row */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {chips.map((chip, idx) => (
              <div
                key={idx}
                className="h-[36px] px-3 rounded-full bg-[#E9EBED] text-[#393A3D] text-[14px] flex items-center space-x-2 transition"
              >
                <span>{chip}</span>
                <button
                  onClick={() => handleRemoveChip(chip)}
                  className="hover:text-black cursor-pointer p-0.5"
                  title="Remove filter"
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Reports View */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Reports</h2>
          {(liveResults?.reports?.length > 0 ? liveResults.reports : [
            { title: 'Profit and Loss', subtitle: 'Standard statement of revenue and expenses', route: 'report_profit_loss' },
            { title: 'Balance Sheet', subtitle: 'Statement of assets, liabilities and equity', route: 'balance_sheet' },
            { title: 'Statement of Cash Flows', subtitle: 'Cash receipts and disbursements breakdown', route: 'cash_flow' },
            { title: 'Standard Reports Hub', subtitle: 'Comprehensive statutory reporting hub', route: 'standard_reports' }
          ]).map((r, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate ? onNavigate(r.route) : (window.location.hash = '#' + r.route)}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition cursor-pointer"
            >
              <div>
                <h3 className="text-base font-bold text-gray-900">{r.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.subtitle}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                Open Report →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 7. Contacts View */}
      {activeTab === 'contacts' && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Matching Contacts & Customers</h2>
          {(liveResults?.contacts?.length > 0 ? liveResults.contacts : [
            { title: 'Sonnenschein Family Store', subtitle: 'Customer • Retail & Wholesale', type: 'CUSTOMER' },
            { title: 'Geeta Kalapatapu', subtitle: 'Customer • Direct Accounts', type: 'CUSTOMER' },
            { title: 'Mark Cho', subtitle: 'Customer • Regular Client', type: 'CUSTOMER' }
          ]).map((c, idx) => (
            <div
              key={idx}
              onClick={() => onNavigate ? onNavigate('customers_list') : (window.location.hash = '#/customers')}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition cursor-pointer"
            >
              <div>
                <h3 className="text-base font-bold text-gray-900">{c.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{c.subtitle}</p>
              </div>
              <span className="text-xs font-semibold text-[#0077C5] bg-blue-50 px-3 py-1 rounded-full">
                View Customer →
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 8. Results Table (Transactions or All) */}
      {(activeTab === 'transactions' || activeTab === 'all') && (
        <div className="w-full overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Table Header Row */}
            <div className="grid grid-cols-[144px_144px_144px_415px_170px_148px_115px_294px_1fr] items-center text-[12.5px] font-semibold text-[#393A3D] uppercase tracking-[0.04em] pb-3 border-b border-[#D4D7DC]">
              <div className="flex items-center space-x-1 cursor-pointer hover:text-black">
                <span>DATE</span>
                <ArrowDown size={14} className="stroke-[2.5]" />
              </div>
              <div>TYPE</div>
              <div className="flex items-center space-x-1">
                <span>REF NO.</span>
                <HelpCircle size={14} className="text-[#0077C5]" />
              </div>
              <div className="flex items-center space-x-1">
                <span>CONTACT</span>
                <HelpCircle size={14} className="text-[#0077C5]" />
              </div>
              <div>DUE DATE</div>
              <div>BALANCE</div>
              <div>AMOUNT</div>
              <div>MEMO/DESCRIPTION</div>
              <div>LAST MODIFIED DATE</div>
            </div>

            {/* Table Data Rows */}
            <div className="divide-y divide-[#E3E5E8]">
              {transactions.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[144px_144px_144px_415px_170px_148px_115px_294px_1fr] items-center h-[56px] text-[15px] text-[#393A3D] hover:bg-[#F6F7F8] transition"
                >
                  <div>{row.date}</div>
                  <div>{row.type}</div>
                  <div>
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('invoices') : (window.location.hash = '#/invoices')}
                      className="text-[#0077C5] hover:underline font-semibold cursor-pointer"
                    >
                      {row.refNo}
                    </button>
                  </div>
                  <div>
                    <button 
                      type="button"
                      onClick={() => onNavigate ? onNavigate('customers_list') : (window.location.hash = '#/customers')}
                      className="text-[#0077C5] hover:underline font-medium text-left cursor-pointer truncate max-w-[390px]"
                    >
                      {row.contact}
                    </button>
                  </div>
                  <div>{row.dueDate}</div>
                  <div>{row.balance}</div>
                  <div className="font-semibold text-gray-900">{row.amount}</div>
                  <div className="text-[#6B6C72]">{row.memo || "—"}</div>
                  <div className="text-[#6B6C72] text-[14px]">{row.lastModified}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
