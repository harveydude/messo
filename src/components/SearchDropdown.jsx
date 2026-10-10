import React, { useState } from 'react';
import { History, Link2, Plus, Search } from 'lucide-react';
import dashboardData from '../data/dashboard.json';

export default function SearchDropdown({ 
  query = '', 
  onSelectResult, 
  onAdvancedSearch 
}) {
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllJump, setShowAllJump] = useState(false);
  const [showAllHelp, setShowAllHelp] = useState(false);

  const searchData = dashboardData.search || {};
  const recentList = searchData.recent || [];
  const jumpToList = searchData.suggest?.jumpTo || [];
  const helpTopicsList = searchData.suggest?.helpTopics || [];

  // Substring highlight helper
  const renderHighlighted = (text, hl) => {
    if (!hl) return text;
    const idx = text.toLowerCase().indexOf(hl.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="font-bold text-black">{text.slice(idx, idx + hl.length)}</strong>
        {text.slice(idx + hl.length)}
      </>
    );
  };

  const isQueryActive = query.trim().length > 0;

  return (
    <div 
      className="absolute top-[44px] left-1/2 -translate-x-1/2 w-[1334px] bg-white border border-[#E3E5E8] rounded-b-[8px] shadow-[0_8px_24px_rgba(0,0,0,0.15)] z-[59] overflow-hidden select-none animate-in fade-in duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-[24px] pt-[16px] pb-[12px] max-h-[640px] overflow-y-auto">
        {!isQueryActive ? (
          /* Empty State: Recent Transactions (Screenshot 1) */
          <div>
            <div className="text-[14px] font-semibold text-[#393A3D] mb-2 px-2">
              Recent transactions
            </div>

            <div className="space-y-0.5">
              {recentList.map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectResult && onSelectResult(t.name)}
                  className="flex items-center space-x-4 h-[44px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer transition text-[14px] text-[#393A3D]"
                >
                  <History size={16} className="text-[#6B6C72] shrink-0" />
                  <span className="font-medium text-[#393A3D] min-w-[130px]">
                    {t.name}
                  </span>
                  <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                  <span className="min-w-[130px] text-[#393A3D]">
                    {t.contact || "—"}
                  </span>
                  <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                  <span className="min-w-[90px] text-[#393A3D]">
                    {t.date}
                  </span>
                  <span className="w-[1px] h-[16px] bg-[#D4D7DC]" />
                  <span className="text-[#393A3D]">
                    {t.amount}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 pb-1 px-2">
              <button
                onClick={() => setShowAllRecent(!showAllRecent)}
                className="text-[15px] font-medium text-[#7A3CE8] hover:underline cursor-pointer"
              >
                Show 5 more
              </button>
            </div>
          </div>
        ) : (
          /* Query Typed State: Jump to + Help topics (Screenshot 2) */
          <div className="space-y-3">
            {/* 1. Jump to */}
            <div>
              <div className="text-[14px] font-semibold text-[#393A3D] mb-1 px-2">
                Jump to
              </div>

              <div className="space-y-0.5">
                {jumpToList.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectResult && onSelectResult(item.label)}
                    className="flex items-center space-x-3.5 h-[44px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer transition text-[15px] text-[#393A3D]"
                  >
                    {item.icon === 'plus' ? (
                      <Plus size={16} className="text-[#6B6C72] shrink-0" />
                    ) : (
                      <Link2 size={16} className="text-[#6B6C72] shrink-0" />
                    )}
                    <span>
                      {renderHighlighted(item.label, item.hl)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-1 pb-2 px-2">
                <button
                  onClick={() => setShowAllJump(!showAllJump)}
                  className="text-[15px] font-medium text-[#7A3CE8] hover:underline cursor-pointer"
                >
                  Show 9 more
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-[1px] bg-[#E3E5E8]" />

            {/* 2. Help topics */}
            <div>
              <div className="text-[14px] font-semibold text-[#393A3D] mb-1 px-2">
                Help topics
              </div>

              <div className="space-y-0.5">
                {helpTopicsList.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => onSelectResult && onSelectResult(item.label)}
                    className="flex items-center space-x-3.5 h-[44px] px-2 rounded hover:bg-[#F6F7F8] cursor-pointer transition text-[15px] text-[#393A3D]"
                  >
                    <Search size={16} className="text-[#6B6C72] shrink-0" />
                    <span>
                      {renderHighlighted(item.label, item.hl)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-1 pb-1 px-2">
                <button
                  onClick={() => setShowAllHelp(!showAllHelp)}
                  className="text-[15px] font-medium text-[#7A3CE8] hover:underline cursor-pointer"
                >
                  Show 5 more
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Strip */}
      <div className="h-[44px] bg-[#F4F5F7] border-t border-[#E3E5E8] px-[24px] flex items-center justify-start text-[14px]">
        <button
          onClick={onAdvancedSearch}
          className="text-[#0077C5] hover:underline font-medium cursor-pointer"
        >
          Advanced transactions search
        </button>
        <span className="text-[#393A3D] ml-1">
          for more results
        </span>
      </div>
    </div>
  );
}
