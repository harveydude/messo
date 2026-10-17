import React, { useState, useEffect } from 'react';
import { History, Link2, Plus, Search, Sparkles, FileText, User } from 'lucide-react';
import api from '../api/client';
import dashboardData from '../data/dashboard.json';

export default function SearchDropdown({ 
  query = '', 
  onSelectResult, 
  onAdvancedSearch 
}) {
  const [smartData, setSmartData] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load recent real transactions on mount
  useEffect(() => {
    api.getInvoices().then(res => {
      if (res?.success && res.invoices) {
        setRecentTxns(res.invoices.slice(0, 5).map(inv => ({
          name: `Invoice #${inv.invoice_number}`,
          contact: inv.customer_name || 'Customer',
          date: inv.issue_date?.split('T')[0] || 'Recently',
          amount: `₹${inv.total_inr || '0.00'}`
        })));
      }
    }).catch(() => {});
  }, []);

  // Debounced Smart Search & Q&A
  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setSmartData(null);
      return;
    }

    const timer = setTimeout(() => {
      setIsLoading(true);
      api.smartSearch(query)
        .then(res => {
          if (res?.success) setSmartData(res);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const isQueryActive = query.trim().length > 0;
  const recentList = recentTxns.length > 0 ? recentTxns : (dashboardData.search?.recent || []);

  return (
    <div 
      className="absolute top-[44px] left-1/2 -translate-x-1/2 w-[1334px] bg-white border border-[#E3E5E8] rounded-b-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] z-[59] overflow-hidden select-none animate-in fade-in duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-[24px] pt-[16px] pb-[12px] max-h-[640px] overflow-y-auto">
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#6B6C72] py-1 px-2 animate-pulse">
            <Sparkles size={14} className="text-[#2CA01C]" />
            <span>Searching continuous accounting ledger...</span>
          </div>
        )}

        {/* 1. AI Q&A Answer Card */}
        {smartData?.type === 'QNA' && (
          <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#F0FDF4] to-[#F8FAFC] border border-[#BBF7D0] shadow-xs">
            <div className="flex items-center gap-2 text-[#166534] font-semibold text-[14px] mb-1.5">
              <Sparkles size={17} className="text-[#2CA01C]" />
              <span>MESSO Assist Financial Answer</span>
            </div>
            <p className="text-[15px] text-[#1E293B] font-medium leading-relaxed">
              {smartData.answer}
            </p>
            {smartData.records?.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[#DCFCE7] flex flex-wrap gap-2">
                {smartData.records.map((r, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md bg-white border border-[#BBF7D0] text-xs font-semibold text-[#166534]">
                    {r.title} ({r.subtitle})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Dynamic Entity Search Results */}
        {smartData?.type === 'SEARCH' && (
          <div className="space-y-4">
            {/* Contacts */}
            {smartData.contacts?.length > 0 && (
              <div>
                <div className="text-[13px] font-semibold text-[#6B6C72] mb-1 px-2 uppercase tracking-wider">
                  Contacts & Customers
                </div>
                {smartData.contacts.map((c, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectResult && onSelectResult(c.title)}
                    className="flex items-center gap-3 h-[42px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer text-[14px] text-[#393A3D]"
                  >
                    <User size={16} className="text-[#0077C5]" />
                    <span className="font-semibold">{c.title}</span>
                    <span className="text-xs text-[#6B6C72]">{c.subtitle}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Transactions */}
            {smartData.transactions?.length > 0 && (
              <div>
                <div className="text-[13px] font-semibold text-[#6B6C72] mb-1 px-2 uppercase tracking-wider">
                  Invoices & Transactions
                </div>
                {smartData.transactions.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectResult && onSelectResult(t.title)}
                    className="flex items-center gap-3 h-[42px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer text-[14px] text-[#393A3D]"
                  >
                    <FileText size={16} className="text-[#2CA01C]" />
                    <span className="font-semibold">{t.title}</span>
                    <span className="text-xs text-[#6B6C72]">{t.subtitle}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Empty State: Recent Transactions */}
        {!isQueryActive && (
          <div>
            <div className="flex items-center justify-between mb-2 px-2">
              <span className="text-[14px] font-semibold text-[#393A3D]">
                Recent transactions
              </span>
              {recentList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecentTxns([])}
                  className="text-[12px] text-[#0077C5] hover:underline font-medium cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>

            {recentList.length === 0 ? (
              <div className="text-xs text-gray-400 px-2 py-4 text-center">
                No recent transactions
              </div>
            ) : (
              <div className="space-y-0.5">
                {recentList.map((t, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectResult && onSelectResult(t.name)}
                    className="group flex items-center space-x-4 h-[44px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer transition text-[14px] text-[#393A3D]"
                  >
                    <History size={16} className="text-[#6B6C72] shrink-0" />
                    <span className="font-medium text-[#393A3D] min-w-[130px] truncate">
                      {t.name}
                    </span>
                    <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                    <span className="min-w-[150px] text-[#393A3D] truncate">
                      {t.contact || "—"}
                    </span>
                    <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                    <span className="min-w-[90px] text-[#393A3D]">
                      {t.date}
                    </span>
                    <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                    <span className="font-semibold text-[#2CA01C]">
                      {t.amount}
                    </span>
                    <button
                      type="button"
                      title="Remove from recent searches"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentTxns(prev => prev.filter((_, i) => i !== idx));
                      }}
                      className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Footer bar */}
      <div className="bg-[#F4F5F8] border-t border-[#E3E5E8] px-6 py-2.5 flex items-center justify-between text-xs text-[#6B6C72]">
        <span>Press <strong className="text-[#393A3D]">Enter</strong> to search all books</span>
        <button 
          onClick={onAdvancedSearch}
          className="text-[#0077C5] font-semibold hover:underline cursor-pointer"
        >
          Advanced search
        </button>
      </div>
    </div>
  );
}
