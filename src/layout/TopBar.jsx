import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Bell, 
  Users, 
  X,
  Sparkles,
  CheckSquare,
  Grid,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import SearchDropdown from '../components/SearchDropdown';
import MyIntegrationsPopover from '../components/MyIntegrationsPopover';
import NotificationsPanel from '../components/NotificationsPanel';

export default function TopBar({ 
  companyName = "MESO Creative Labs Pvt Ltd", 
  searchQuery = "", 
  setSearchQuery, 
  onSearch, 
  onOpenSettings,
  onOpenShortcuts,
  onOpenAssistant,
  onNavigateApps,
  onOpenOnboarding
}) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [myIntegrationsOpen, setMyIntegrationsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const searchContainerRef = useRef(null);
  const appsMenuRef = useRef(null);
  const bellMenuRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
      if (appsMenuRef.current && !appsMenuRef.current.contains(event.target)) {
        setMyIntegrationsOpen(false);
      }
      if (bellMenuRef.current && !bellMenuRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setIsSearchFocused(false);
      onSearch(searchQuery || "Show me open invoices for the last 30 days");
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
    }
  };

  const handleSelectResult = (text) => {
    if (setSearchQuery) setSearchQuery(text);
    setIsSearchFocused(false);
    onSearch(text);
  };

  const handleAdvancedSearch = () => {
    setIsSearchFocused(false);
    onSearch(searchQuery || "Show me open invoices for the last 30 days");
  };

  return (
    <header className="w-full bg-white relative z-30 shrink-0 select-none">
      {/* Promo banner */}
      <div className="h-[34px] w-full bg-gradient-to-r from-[#2CA01C] via-[#0AA574] to-[#0077C5] flex items-center justify-center gap-3 text-[13px] text-white">
        <span className="font-medium">Buy now and save 90% for 3 months</span>
        <span className="w-px h-[14px] bg-white/40" aria-hidden="true" />
        <a href="#subscribe" className="font-semibold underline hover:no-underline">
          Subscribe now
        </a>
      </div>

      {/* Main TopBar Container (Coordinate: H:56px, Border: #dfe1e6) */}
      <div className="h-[56px] w-full bg-white border-b border-[#dfe1e6] flex items-center justify-between px-4 relative shadow-[0_1px_2px_rgba(9,30,66,0.04)]">
        {/* Left cluster: Brand Logo (x:16, y:10), Company Name & GSTIN Badge */}
        <div className="flex items-center space-x-3 min-w-[280px]">
          <div 
            className="flex items-center space-x-2 cursor-pointer shrink-0 group" 
            onClick={() => onSearch('')}
            title="Meso Financial Cloud"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-xs border border-emerald-500/30 group-hover:border-emerald-400 transition">
              <img src="/logo.png" alt="Meso Logo" className="w-full h-full object-cover" />
            </div>
            <div className="text-[17px] font-bold text-[#172b4d] tracking-tight leading-none">
              meso
            </div>
          </div>

          <div className="border-l border-gray-200 pl-3">
            <div className="flex items-center gap-1 cursor-pointer hover:text-black">
              <span className="text-[13.5px] font-semibold text-[#172b4d] truncate max-w-[150px]">
                {isSearchFocused ? "MESO Labs..." : (companyName || "MESO Creative Labs")}
              </span>
              <ChevronDown size={13} className="text-[#5e6c84] shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#e6f4ea] text-[#005f43] tracking-wider font-mono">
                GSTIN: 27AABCP1234A1Z5
              </span>
            </div>
          </div>
        </div>

        {/* Center Smart Search Bar & NLP Prompt (Coordinate: X:480, W:640, H:38) */}
        <div 
          ref={searchContainerRef}
          className={isSearchFocused 
            ? "absolute left-1/2 -translate-x-1/2 top-[6px] z-[60] w-[1310px]" 
            : "flex-1 max-w-[640px] mx-auto px-4"
          }
        >
          <div className="relative flex items-center w-full">
            <Search 
              size={17} 
              className={`absolute left-3.5 text-[#5e6c84] pointer-events-none transition-colors ${
                isSearchFocused ? 'text-[#007755]' : ''
              }`} 
            />
            <input
              type="text"
              data-search-input
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search transactions, customers, reports or ask 'Why did my expenses go up?'"
              className={`w-full text-[13px] text-[#172b4d] placeholder-[#5e6c84] bg-[#f4f5f8] rounded-full transition-all pl-[38px] pr-[96px] focus:outline-none focus:bg-white ${
                isSearchFocused
                  ? 'h-[42px] border-2 border-[#007755] shadow-lg'
                  : 'h-[38px] border border-transparent hover:border-[#dfe1e6]'
              }`}
            />

            {/* Clear Button */}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery && setSearchQuery('')}
                className="absolute right-22 text-[#5e6c84] hover:text-[#172b4d] p-1 cursor-pointer transition"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}

            {/* Ask AI Pill inside Search Bar */}
            <div
              onClick={onOpenAssistant}
              className="absolute right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold cursor-pointer shadow-xs select-none hover:opacity-95 transition"
              style={{ background: 'var(--ai-gradient)' }}
              title="Ask MESO Assist AI"
            >
              <Sparkles size={11} />
              <span>Ask AI</span>
            </div>
          </div>

          {/* Search Dropdown attached directly below */}
          {isSearchFocused && (
            <SearchDropdown
              query={searchQuery}
              onSelectResult={handleSelectResult}
              onAdvancedSearch={handleAdvancedSearch}
            />
          )}
        </div>

        {/* Right Action Rail (Coordinate: X:1320, W:584, H:36) */}
        <div className="flex items-center space-x-2.5 pr-1 text-[#5e6c84]">
          {/* Setup Wizard Button */}
          <button 
            onClick={onOpenOnboarding}
            className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#e6f4ea] border border-[#007755] hover:bg-[#d2edd8] text-[12px] font-semibold text-[#007755] cursor-pointer transition shadow-2xs"
            title="Open 13-Screen Setup Wizard"
          >
            <Sparkles size={13} className="text-[#007755]" />
            <span>Setup Wizard</span>
          </button>

          {/* Contact Chartered Accountant */}
          <button 
            onClick={() => alert("Connecting with your designated Chartered Accountant (CA Anand Varma, FCA)...")}
            className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#f8f9fa] border border-[#dfe1e6] hover:bg-gray-100 text-[12px] font-medium text-[#172b4d] cursor-pointer transition shadow-2xs"
            title="Contact Chartered Accountant"
          >
            <UserCheck size={14} className="text-[#007755]" />
            <span>Contact CA</span>
          </button>

          {/* Action icon group */}
          <div className="flex items-center space-x-1.5 text-[#5e6c84]">
            {/* Tasks */}
            <button 
              onClick={() => alert("Tasks & Bookkeeping Checklist")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]" 
              title="Tasks & Checklists"
            >
              <CheckSquare size={18} />
            </button>

            {/* Apps & Integrations */}
            <div ref={appsMenuRef} className="relative">
              <button 
                onClick={() => {
                  setMyIntegrationsOpen(prev => !prev);
                  setNotificationsOpen(false);
                }}
                className={`p-1.5 hover:bg-gray-100 rounded-full transition relative cursor-pointer text-[#5e6c84] hover:text-[#172b4d] ${
                  myIntegrationsOpen ? 'bg-gray-100 text-[#172b4d]' : ''
                }`}
                title="Apps & Integrations"
              >
                <Grid size={18} />
              </button>

              {myIntegrationsOpen && (
                <MyIntegrationsPopover 
                  onClose={() => setMyIntegrationsOpen(false)}
                  onNavigateFind={() => {
                    setMyIntegrationsOpen(false);
                    if (onNavigateApps) onNavigateApps();
                  }}
                />
              )}
            </div>

            {/* Notifications Bell */}
            <div ref={bellMenuRef} className="relative">
              <button 
                onClick={() => {
                  setNotificationsOpen(prev => !prev);
                  setMyIntegrationsOpen(false);
                }}
                className={`p-1.5 hover:bg-gray-100 rounded-full transition relative cursor-pointer text-[#5e6c84] hover:text-[#172b4d] ${
                  notificationsOpen ? 'bg-gray-100 text-[#172b4d]' : ''
                }`}
                title="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#de350b]" />
              </button>

              {notificationsOpen && (
                <NotificationsPanel 
                  onClose={() => setNotificationsOpen(false)}
                />
              )}
            </div>

            {/* Help / Documentation */}
            <button 
              onClick={() => {
                setMyIntegrationsOpen(false);
                setNotificationsOpen(false);
                if (onOpenAssistant) onOpenAssistant();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]"
              title="Help & Documentation"
            >
              <HelpCircle size={18} />
            </button>

            {/* Settings Gear */}
            <button 
              onClick={() => {
                setMyIntegrationsOpen(false);
                setNotificationsOpen(false);
                onOpenSettings();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]"
              title="Account & Settings"
            >
              <Settings size={18} />
            </button>
          </div>

          {/* User Avatar */}
          <button 
            onClick={onOpenShortcuts}
            className="w-[32px] h-[32px] rounded-full bg-[#0052cc] hover:bg-[#0047b3] text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1 cursor-pointer transition"
            title="Accountant view & Keyboard Shortcuts"
          >
            J
          </button>

          {/* Dedicated MESO Assist AI Trigger Button */}
          <button 
            onClick={onOpenAssistant}
            title="MESO Assist AI Intelligence"
            className="w-[34px] h-[34px] rounded-lg border border-[#7c3aed] flex items-center justify-center text-white shadow-sm hover:scale-105 active:scale-95 transition cursor-pointer ml-1"
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #00b894 100%)' }}
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
