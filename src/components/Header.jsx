import React, { useState } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Bell, 
  Bookmark, 
  Sparkles, 
  CheckSquare, 
  ChevronDown, 
  X,
  ExternalLink
} from 'lucide-react';

export default function Header({ 
  companyName, 
  setCompanyName, 
  searchQuery, 
  setSearchQuery, 
  onSearch, 
  onOpenSettings,
  onOpenHelp,
  onOpenShortcuts,
  onOpenSetup
}) {
  const [showPromo, setShowPromo] = useState(true);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const companies = [
    "Sample Company",
    "Sample Company- 7-8-25",
    "Lawns & Paws",
    "Craig's Design and Landscaping Services"
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 select-none">
      {/* Top Promotional Banner */}
      {showPromo && (
        <div className="qb-banner-gradient text-white text-xs py-1.5 px-4 flex items-center justify-center font-medium relative">
          <div className="flex items-center space-x-2">
            <span>Buy now and save 90% for 3 months</span>
            <span className="opacity-70">|</span>
            <button className="underline font-semibold hover:opacity-90 cursor-pointer">
              Subscribe now
            </button>
          </div>
          <button 
            onClick={() => setShowPromo(false)} 
            className="absolute right-3 top-1.5 text-white/80 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="h-14 px-4 flex items-center justify-between">
        {/* Left: QB Logo and Company selector */}
        <div className="flex items-center space-x-4 min-w-[280px]">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => onSearch('')}>
            {/* Intuit QB Logo */}
            <div className="flex items-center space-x-1.5">
              <div className="w-7 h-7 rounded-full bg-[#2ca01c] flex items-center justify-center text-white font-bold text-sm tracking-tighter">
                qb
              </div>
              <div className="leading-tight">
                <div className="text-[10px] tracking-wider font-semibold text-gray-500 uppercase leading-none">INTUIT</div>
                <div className="text-sm font-bold text-gray-900 leading-none">quickbooks</div>
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-gray-300" />

          {/* Company Selector */}
          <div className="relative">
            <button 
              onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
              className="flex items-center space-x-1 text-sm font-medium text-gray-800 hover:text-gray-950 px-2 py-1 rounded hover:bg-gray-100 transition"
            >
              <span className="truncate max-w-[180px]">{companyName}</span>
              <ChevronDown size={14} className="text-gray-500" />
            </button>

            {companyDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Switch Company</div>
                {companies.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setCompanyName(c);
                      setCompanyDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${companyName === c ? 'font-semibold text-[#2ca01c] bg-green-50/50' : 'text-gray-700'}`}
                  >
                    <span>{c}</span>
                    {companyName === c && <div className="w-1.5 h-1.5 rounded-full bg-[#2ca01c]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="flex-1 max-w-2xl px-4">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Navigate or search for transactions, contacts, reports, and more"
              className="w-full h-9 pl-9 pr-14 text-xs bg-gray-50 border border-gray-300 rounded-full focus:bg-white focus:outline-none focus:border-[#2ca01c] focus:ring-1 focus:ring-[#2ca01c] transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1 sm:space-x-2 text-gray-600">
          {/* Contact experts */}
          <button className="hidden xl:flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-100 text-xs font-medium text-gray-700">
            <img 
              src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=64&h=64&q=80" 
              alt="Expert" 
              className="w-6 h-6 rounded-full object-cover" 
            />
            <span>Contact experts</span>
          </button>

          {/* Setup / Tasks */}
          <button 
            onClick={onOpenSetup}
            title="Setup tasks"
            className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition relative"
          >
            <CheckSquare size={18} />
          </button>

          {/* Intuit Assist AI */}
          <button 
            title="Intuit Assist AI"
            className="p-1.5 rounded-full hover:bg-green-50 text-gray-600 hover:text-[#2ca01c] transition relative"
          >
            <Sparkles size={18} />
          </button>

          {/* Notifications */}
          <button 
            title="Notifications"
            className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition relative"
          >
            <Bell size={18} />
          </button>

          {/* Settings / Gear */}
          <button 
            onClick={onOpenSettings}
            title="Settings & Tools"
            className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <Settings size={18} />
          </button>

          {/* Help */}
          <button 
            onClick={onOpenHelp}
            title="Help & Support"
            className="p-1.5 rounded-full hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <HelpCircle size={18} />
          </button>

          {/* User Profile Avatar */}
          <button 
            onClick={onOpenShortcuts}
            title="Profile & Shortcuts"
            className="w-7 h-7 rounded-full bg-[#0077c5] hover:bg-[#005e9e] text-white flex items-center justify-center font-bold text-xs ml-1 shadow-sm transition"
          >
            T
          </button>
        </div>
      </div>
    </header>
  );
}
