import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Bell, 
  X,
  CheckSquare, 
  Grid, 
  ChevronDown,
  Maximize2,
  Minimize2,
  Building2,
  FileText,
  Briefcase,
  Users,
  ShieldCheck,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import SearchDropdown from '../components/SearchDropdown';
import MyIntegrationsPopover from '../components/MyIntegrationsPopover';
import NotificationsPanel from '../components/NotificationsPanel';

export default function TopBar({ 
  companyName = "MESSO Technologies", 
  businessProfile = null,
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
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
      }
    } catch (e) {}
  };

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

  // Derive business information
  const activeBusinessName = businessProfile?.businessName || companyName || "MESSO Technologies";
  const activeGstin = businessProfile?.gstin || "27AAPFU0939F1ZV";
  const initialLetter = activeBusinessName ? activeBusinessName.charAt(0).toUpperCase() : 'M';

  return (
    <header className="w-full bg-white relative z-30 shrink-0 select-none">
      {/* Promo banner */}
      <div className="h-[32px] w-full bg-gradient-to-r from-[#007755] via-[#0AA574] to-[#0077C5] flex items-center justify-center gap-3 text-[12px] text-white">
        <span className="font-medium">Special Launch: Get 90% discount on MESSO Cloud for 3 months</span>
        <span className="w-px h-[12px] bg-white/40" aria-hidden="true" />
        <a href="#pricing" className="font-semibold underline hover:no-underline">
          Subscribe now
        </a>
      </div>

      {/* Main TopBar Container */}
      <div className="h-[56px] w-full bg-white border-b border-[#dfe1e6] flex items-center justify-between px-4 relative shadow-[0_1px_2px_rgba(9,30,66,0.04)]">
        {/* Left cluster: Official MESSO Logo, Company Name & GSTIN Badge */}
        <div className="flex items-center space-x-3 min-w-[260px]">
          <div 
            className="flex items-center space-x-2.5 cursor-pointer shrink-0 group" 
            onClick={() => onSearch('')}
            title="MESSO Home"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black flex items-center justify-center shadow-xs border border-cyan-500/30 group-hover:border-cyan-400 transition">
              <img src="/logo.png" alt="MESSO Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-[19px] font-black text-[#172b4d] tracking-tight leading-none uppercase">
              MESSO
            </div>
          </div>

          {/* Company Name & GSTIN Dropdown trigger */}
          <div 
            className="border-l border-gray-200 pl-3 cursor-pointer hover:bg-gray-50 rounded p-1 transition"
            onClick={() => setProfileModalOpen(true)}
            title="Click to view full Business Profile"
          >
            <div className="flex items-center gap-1">
              <span className="text-[13.5px] font-semibold text-[#172b4d] truncate max-w-[170px]">
                {activeBusinessName}
              </span>
              <ChevronDown size={13} className="text-[#5e6c84] shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-[#e6f4ea] text-[#005f43] tracking-wider font-mono">
                GSTIN: {activeGstin}
              </span>
            </div>
          </div>
        </div>

        {/* Center Smart Search Bar (Carefully bounded, NEVER extends behind sidebar) */}
        <div 
          ref={searchContainerRef}
          className="flex-1 max-w-[500px] mx-4 relative"
        >
          <div className="relative flex items-center w-full">
            <Search 
              size={16} 
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
              placeholder="Search invoices, customers, vouchers, ledger accounts..."
              className={`w-full text-[13px] text-[#172b4d] placeholder-[#5e6c84] bg-[#f4f5f8] rounded-full transition-all pl-[38px] pr-[36px] focus:outline-none focus:bg-white ${
                isSearchFocused
                  ? 'h-[40px] border-2 border-[#007755] shadow-md'
                  : 'h-[36px] border border-transparent hover:border-[#dfe1e6]'
              }`}
            />

            {/* Clear Button */}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery && setSearchQuery('')}
                className="absolute right-3 text-[#5e6c84] hover:text-[#172b4d] p-1 cursor-pointer transition"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Search Dropdown attached directly below input */}
          {isSearchFocused && (
            <div className="absolute left-0 top-full mt-1.5 w-full z-50">
              <SearchDropdown
                query={searchQuery}
                onSelectResult={handleSelectResult}
                onAdvancedSearch={handleAdvancedSearch}
              />
            </div>
          )}
        </div>

        {/* Right Action Rail */}
        <div className="flex items-center space-x-2 text-[#5e6c84]">
          {/* Full Screen Mode Toggle Button (F11) */}
          <button 
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-full bg-gray-50 border border-gray-200 hover:bg-gray-100 text-[11.5px] font-medium text-gray-700 cursor-pointer transition shadow-2xs"
            title="Toggle Fullscreen Mode (F11)"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit F11' : 'Full Screen (F11)'}</span>
          </button>

          {/* Setup Wizard Button */}
          <button 
            onClick={onOpenOnboarding}
            className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#e6f4ea] border border-[#007755] hover:bg-[#d2edd8] text-[12px] font-semibold text-[#007755] cursor-pointer transition shadow-2xs"
            title="Open 13-Screen Setup Wizard"
          >
            <RotateCcw size={13} className="text-[#007755]" />
            <span>Setup Wizard</span>
          </button>

          {/* Action icon group */}
          <div className="flex items-center space-x-1 text-[#5e6c84]">
            {/* Tasks & Checklists */}
            <button 
              onClick={() => alert("Bookkeeping Tasks & Audit Trail Checklist")}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]" 
              title="Tasks & Checklists"
            >
              <CheckSquare size={17} />
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
                <Grid size={17} />
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
                <Bell size={17} />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#de350b]" />
              </button>

              {notificationsOpen && (
                <NotificationsPanel 
                  onClose={() => setNotificationsOpen(false)}
                />
              )}
            </div>

            {/* Help & Documentation (Opens Help Assistant) */}
            <button 
              onClick={() => {
                setMyIntegrationsOpen(false);
                setNotificationsOpen(false);
                if (onOpenAssistant) onOpenAssistant();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]"
              title="Help, AI Assistant & Documentation"
            >
              <HelpCircle size={17} />
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
              <Settings size={17} />
            </button>
          </div>

          {/* User & Company Profile Avatar Button */}
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="w-[32px] h-[32px] rounded-full bg-[#007755] hover:bg-[#005f43] text-white flex items-center justify-center font-bold text-xs shadow-xs ml-1 cursor-pointer transition border border-emerald-400"
            title="View Business Profile & Company Details"
          >
            {initialLetter}
          </button>
        </div>
      </div>

      {/* BUSINESS PROFILE MODAL (Displays exact onboarding info) */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-[520px] w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#007755] text-white flex items-center justify-center font-black text-sm">
                  {initialLetter}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#1f2937]">
                    {activeBusinessName}
                  </h3>
                  <span className="text-[11.5px] text-gray-500 font-mono">
                    GSTIN: {activeGstin}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Business Attributes Grid */}
            <div className="space-y-3.5 mb-6 text-[13px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <Building2 size={15} className="text-[#007755]" />
                  Legal Entity Type
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {businessProfile?.taxType 
                    ? businessProfile.taxType.replace('_', ' ') 
                    : 'Private Limited (Pvt Ltd)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <Briefcase size={15} className="text-[#007755]" />
                  Industry Sector
                </span>
                <span className="font-semibold text-gray-800 text-right truncate max-w-[260px]">
                  {businessProfile?.industry || 'Information Technology & Software (IT/ITeS)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <TrendingUp size={15} className="text-[#007755]" />
                  Annual Turnover
                </span>
                <span className="font-semibold text-gray-800">
                  {businessProfile?.annualRevenue 
                    ? businessProfile.annualRevenue.replace('revenue_', '').replace('_', ' to ') 
                    : '₹1.5 Crores - ₹5 Crores'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <Users size={15} className="text-[#007755]" />
                  Your Role &amp; Team Size
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {businessProfile?.role ? businessProfile.role : 'Managing Director'} · {businessProfile?.employeeCount ? businessProfile.employeeCount.replace('_', '-') : '1-5'} employees
                </span>
              </div>

              {businessProfile?.website && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2">
                    <FileText size={15} className="text-[#007755]" />
                    Company Website
                  </span>
                  <a 
                    href={businessProfile.website.startsWith('http') ? businessProfile.website : `https://${businessProfile.website}`}
                    target="_blank" 
                    rel="noreferrer" 
                    className="font-medium text-[#007755] hover:underline"
                  >
                    {businessProfile.website}
                  </a>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  if (onOpenOnboarding) onOpenOnboarding();
                }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#007755] hover:bg-[#005f43] text-white rounded-[6px] font-semibold text-[13px] shadow-sm cursor-pointer transition"
              >
                <RotateCcw size={14} />
                <span>Rerun Setup Wizard</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-[6px] font-medium text-[13px] cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}
