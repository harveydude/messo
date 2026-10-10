import React, { useState } from 'react';
import { Printer, Share2, Sliders, X, Filter, Calendar, ChevronDown, HelpCircle, ArrowDown } from 'lucide-react';
import dashboardData from '../data/dashboard.json';

export default function SearchResultsView({ 
  query = "Show me open invoices for the last 30 days" 
}) {
  const [activeTab, setActiveTab] = useState("transactions");
  const [showInfoBanner, setShowInfoBanner] = useState(true);
  const [chips, setChips] = useState([
    "Date range: 09/24/2025-10/24/2…",
    "Transaction type: Invoice"
  ]);

  const searchData = dashboardData.search?.results || {};
  const transactions = searchData.transactions || [
    { date: "09/27/2025", type: "Invoice", refNo: "1037", contact: "Sonnenschein Family Store", dueDate: "10/27/2025", balance: "$362.07", amount: "$362.07", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/27/2025", type: "Invoice", refNo: "1035", contact: "Mark Cho", dueDate: "10/27/2025", balance: "$314.28", amount: "$314.28", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/27/2025", type: "Invoice", refNo: "1036", contact: "Freeman Sporting Goods:0969 Ocean View Road", dueDate: "10/27/2025", balance: "$477.50", amount: "$477.50", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/26/2025", type: "Invoice", refNo: "1033", contact: "Geeta Kalapatapu", dueDate: "10/26/2025", balance: "$629.10", amount: "$629.10", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/26/2025", type: "Invoice", refNo: "1034", contact: "Rondonuwu Fruit and Vegi", dueDate: "10/26/2025", balance: "$78.60", amount: "$78.60", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" },
    { date: "09/25/2025", type: "Invoice", refNo: "1023", contact: "Red Rock Diner", dueDate: "10/25/2025", balance: "$70.00", amount: "$70.00", memo: "", lastModified: "Oct 24, 2025, 11:58 AM" }
  ];

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
          <button className="text-[#0077C5] hover:underline cursor-pointer font-medium">
            Go to all transactions
          </button>
          <span className="text-[#6B6C72]">or</span>
          <button className="text-[#0077C5] hover:underline cursor-pointer font-medium">
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
          onClick={() => setActiveTab("help")}
          className={`pb-3 font-medium transition cursor-pointer ${
            activeTab === 'help'
              ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[2px]'
              : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          Help
        </button>
      </div>

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

      {/* 6. Results Table */}
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
                <div>{row.refNo}</div>
                <div>
                  <button className="text-[#0077C5] hover:underline font-medium text-left cursor-pointer truncate max-w-[390px]">
                    {row.contact}
                  </button>
                </div>
                <div>{row.dueDate}</div>
                <div>{row.balance}</div>
                <div>{row.amount}</div>
                <div className="text-[#6B6C72]">{row.memo || "—"}</div>
                <div className="text-[#6B6C72] text-[14px]">{row.lastModified}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
