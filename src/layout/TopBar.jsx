import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Bell, 
  X,
  Users, 
  ChevronDown,
  Building2,
  FileText,
  Briefcase,
  TrendingUp,
  RotateCcw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import SearchDropdown from '../components/SearchDropdown';
import MyIntegrationsPopover from '../components/MyIntegrationsPopover';
import NotificationsPanel from '../components/NotificationsPanel';
import { isAppFullscreen, toggleAppFullscreen, onFullscreenChange } from '../utils/fullscreen';

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
  const [isFullscreen, setIsFullscreen] = useState(() => isAppFullscreen());

  useEffect(() => {
    return onFullscreenChange((fs) => setIsFullscreen(fs));
  }, []);
  
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

  // Derive business information
  const activeBusinessName = businessProfile?.businessName || companyName || "MESSO Technologies";
  const activeGstin = businessProfile?.gstin || "27AAPFU0939F1ZV";
  const initialLetter = activeBusinessName ? activeBusinessName.charAt(0).toUpperCase() : 'M';

  return (
    <header className="w-full bg-white relative z-30 shrink-0 select-none">
      {/* Main TopBar Container (No promo banner at top) */}
      <div className="h-[52px] w-full bg-white border-b border-[#dfe1e6] flex items-center justify-between px-4 relative shadow-[0_1px_2px_rgba(9,30,66,0.04)]">
        
        {/* Left cluster: Official MESSO Logo, Company Name & GSTIN Badge */}
        <div className="flex items-center space-x-3 min-w-[260px]">
          <div 
            className="flex items-center space-x-2 cursor-pointer shrink-0 group" 
            onClick={() => onSearch('')}
            title="MESSO Home"
          >
            <div className="w-[24px] h-[24px] rounded bg-black flex items-center justify-center shadow-xs border border-cyan-500/30">
              <img src="/logo.png" alt="MESSO Logo" className="w-full h-full object-contain p-0.5" />
            </div>
            <div className="text-[15px] font-bold text-[#172b4d] tracking-tight leading-none uppercase">
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
              <span className="text-[13px] font-semibold text-[#172b4d] truncate max-w-[170px]">
                {activeBusinessName}
              </span>
              <ChevronDown size={12} className="text-[#5e6c84] shrink-0" />
            </div>
            {activeGstin && (
              <div className="text-[11px] text-[#5e6c84] font-normal tracking-tight truncate max-w-[170px] mt-0.5">
                GSTIN: {activeGstin}
              </div>
            )}
          </div>
        </div>

        {/* Center Smart Search Bar (Carefully bounded, NEVER extends behind sidebar) */}
        <div 
          ref={searchContainerRef}
          className="flex-1 max-w-[480px] mx-4 relative"
        >
          <div className="relative flex items-center w-full">
            <Search 
              size={15} 
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
              className={`w-full text-[13px] text-[#172b4d] placeholder-[#5e6c84] bg-[#f4f5f8] rounded-full transition-all pl-[36px] pr-[32px] focus:outline-none focus:bg-white ${
                isSearchFocused
                  ? 'h-[36px] border border-[#007755] shadow-xs'
                  : 'h-[34px] border border-transparent hover:border-[#dfe1e6]'
              }`}
            />

            {/* Clear and dismiss button */}
            {(searchQuery || isSearchFocused) && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (setSearchQuery) setSearchQuery('');
                  setIsSearchFocused(false);
                }}
                className="absolute right-2.5 text-[#5e6c84] hover:text-[#172b4d] p-1 cursor-pointer transition rounded-full hover:bg-gray-200"
                title="Clear and close search"
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

        {/* Right Action Rail (Authentic original layout: Integrations, Bell, Settings, Help, Avatar) */}
        <div className="flex items-center space-x-2 text-[#5e6c84]">
          {/* Action icon group */}
          <div className="flex items-center space-x-1.5 text-[#393A3D]">
            {/* Apps / My Integrations icon with pink notification dot (Exact previous UI icon) */}
            <div ref={appsMenuRef} className="relative">
              <button 
                onClick={() => {
                  setMyIntegrationsOpen(prev => !prev);
                  setNotificationsOpen(false);
                }}
                className={`p-1.5 hover:bg-gray-100 rounded-full transition relative cursor-pointer ${
                  myIntegrationsOpen ? 'bg-gray-100' : ''
                }`}
                title="My integrations"
              >
                <Users size={19} className="text-[#5e6c84] hover:text-[#172b4d]" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E31C5F]" />
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

            {/* Help & Documentation (Opens Help Assistant) */}
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

            {/* Settings Gear - Opens dedicated full Account & Settings tab */}
            <button 
              onClick={() => {
                setMyIntegrationsOpen(false);
                setNotificationsOpen(false);
                onOpenSettings();
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer text-[#5e6c84] hover:text-[#172b4d]"
              title="Account and Settings"
            >
              <Settings size={18} />
            </button>

            {/* Fullscreen Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setMyIntegrationsOpen(false);
                setNotificationsOpen(false);
                toggleAppFullscreen();
              }}
              className={`p-1.5 rounded-full transition cursor-pointer ${
                isFullscreen 
                  ? 'bg-emerald-50 text-[#007755] hover:bg-emerald-100 ring-1 ring-emerald-400/40' 
                  : 'hover:bg-gray-100 text-[#5e6c84] hover:text-[#172b4d]'
              }`}
              title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen (Fit to window)"}
              aria-label={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>

          {/* User & Company Profile Avatar Button */}
          <button 
            onClick={() => setProfileModalOpen(true)}
            className="w-[30px] h-[30px] rounded-full bg-black flex items-center justify-center shadow-xs ml-1 cursor-pointer transition border border-cyan-500/40 overflow-hidden"
            title="View Business Profile & Company Details"
          >
            <img src="/logo.png" alt="Profile" className="w-full h-full object-contain p-0.5" />
          </button>
        </div>
      </div>

      {/* BUSINESS PROFILE MODAL (Displays exact onboarding info) */}
      {profileModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-[500px] w-full p-6 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center p-1 border border-cyan-500/40 shadow-xs shrink-0">
                  <img src="/logo.png" alt="MESSO Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#1f2937]">
                    {activeBusinessName}
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">
                    GSTIN: {activeGstin}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setProfileModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Business Attributes Grid */}
            <div className="space-y-3 mb-5 text-[12.5px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <Building2 size={14} className="text-[#007755]" />
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
                  <Briefcase size={14} className="text-[#007755]" />
                  Industry Sector
                </span>
                <span className="font-semibold text-gray-800 text-right truncate max-w-[240px]">
                  {businessProfile?.industry || 'Information Technology & Software (IT/ITeS)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                <span className="text-gray-500 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#007755]" />
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
                  <Users size={14} className="text-[#007755]" />
                  Your Role &amp; Team Size
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {businessProfile?.role ? businessProfile.role : 'Managing Director'} · {businessProfile?.employeeCount ? businessProfile.employeeCount.replace('_', '-') : '1-5'} employees
                </span>
              </div>

              {businessProfile?.website && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-500 flex items-center gap-2">
                    <FileText size={14} className="text-[#007755]" />
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
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setProfileModalOpen(false);
                  if (onOpenOnboarding) onOpenOnboarding();
                }}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#007755] hover:bg-[#005f43] text-white rounded-[4px] font-semibold text-[12.5px] shadow-sm cursor-pointer transition"
              >
                <RotateCcw size={13} />
                <span>Rerun Setup Wizard</span>
              </button>

              <button
                type="button"
                onClick={() => setProfileModalOpen(false)}
                className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-[4px] font-medium text-[12.5px] cursor-pointer transition"
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
