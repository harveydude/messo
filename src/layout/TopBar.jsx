import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  HelpCircle, 
  Settings, 
  Bell, 
  Users, 
  X 
} from 'lucide-react';
import SearchDropdown from '../components/SearchDropdown';
import MyIntegrationsPopover from '../components/MyIntegrationsPopover';
import NotificationsPanel from '../components/NotificationsPanel';

export default function TopBar({ 
  companyName = "Karan's Landscaping Services", 
  searchQuery = "", 
  setSearchQuery, 
  onSearch, 
  onOpenSettings,
  onOpenShortcuts,
  onOpenAssistant,
  onNavigateApps
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
    <header className="w-full bg-white relative z-30 shrink-0">
      {/*
        The promo banner sits above the toolbar, spanning the full width, and is
        part of the chrome in the reference. It was absent entirely -- which is
        the sort of thing that makes a reproduction "close" without being right.
      */}
      <div className="h-[34px] w-full bg-gradient-to-r from-[#2CA01C] via-[#0AA574] to-[#0077C5] flex items-center justify-center gap-3 text-[13px] text-white">
        <span className="font-medium">Buy now and save 90% for 3 months</span>
        <span className="w-px h-[14px] bg-white/40" aria-hidden="true" />
        <a href="#subscribe" className="font-semibold underline hover:no-underline">
          Subscribe now
        </a>
      </div>

      <div className="h-[56px] w-full bg-white border-b border-[#E3E5E8] flex items-center justify-between px-4 select-none relative shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left cluster: Logo (x:16, y:12) and Company Name */}
      <div className="flex items-center space-x-6 min-w-[260px] pl-0">
        <div className="flex items-center space-x-1.5 cursor-pointer shrink-0" onClick={() => onSearch('')}>
          <div className="w-7 h-7 rounded-full bg-[#2CA01C] flex items-center justify-center text-white font-bold text-xs tracking-tighter shadow-xs">
            m
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-[#393A3D] leading-none tracking-tight">meso</div>
          </div>
        </div>

        {/* Company Name (Truncated behind expanded search when focused) */}
        <div className="text-[16px] font-semibold text-[#393A3D] cursor-pointer hover:text-black truncate max-w-[140px]">
          <span>{isSearchFocused ? "Sample Comp..." : companyName}</span>
        </div>
      </div>

      {/* Center Search Bar & Dropdown Container */}
      <div 
        ref={searchContainerRef}
        className={isSearchFocused 
          ? "absolute left-1/2 -translate-x-1/2 top-[6px] z-[60] w-[1310px]" 
          : "flex-1 max-w-[640px] mx-auto px-4"
        }
      >
        <div className="relative flex items-center w-full">
          <Search 
            size={18} 
            className={`absolute left-3.5 text-[#6B6C72] pointer-events-none transition-colors ${
              isSearchFocused ? 'text-[#2CA01C]' : ''
            }`} 
          />
          <input
            type="text"
            data-search-input
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search for transactions, contacts, reports, help and more"
            className={`w-full text-[15px] text-[#393A3D] placeholder-[#6B6C72] bg-white rounded-full transition-all pl-[42px] pr-10 focus:outline-none ${
              isSearchFocused
                ? 'h-[44px] border-2 border-[#2CA01C] shadow-lg'
                : 'h-[36px] border border-[#9DA2A8] hover:border-[#6B6C72]'
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => {
                if (setSearchQuery) setSearchQuery('');
              }}
              className="absolute right-3.5 text-[#6B6C72] hover:text-[#393A3D] p-1 cursor-pointer transition"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
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

      {/* Right cluster: "Contact experts" + 20px icon buttons + 32px avatar */}
      <div className="flex items-center space-x-4 pr-1 text-[#393A3D]">
        {/* Contact experts + avatar */}
        <button className="hidden xl:flex items-center space-x-2 px-2 py-1 rounded hover:bg-gray-100 text-[15px] font-medium text-[#393A3D] cursor-pointer">
          <img 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=64&h=64&q=80" 
            alt="Expert" 
            className="w-[28px] h-[28px] rounded-full object-cover" 
          />
          <span>Contact experts</span>
        </button>

        {/* Action icons (~44px apart, 20px icons) */}
        <div className="flex items-center space-x-3 text-[#393A3D]">
          {/* Apps / My Integrations icon with pink notification dot */}
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
              <Users size={20} />
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

          {/* Bell icon */}
          <div ref={bellMenuRef} className="relative">
            <button 
              onClick={() => {
                setNotificationsOpen(prev => !prev);
                setMyIntegrationsOpen(false);
              }}
              className={`p-1.5 hover:bg-gray-100 rounded-full transition relative cursor-pointer ${
                notificationsOpen ? 'bg-gray-100' : ''
              }`}
              title="Notifications"
            >
              <Bell size={20} />
            </button>

            {notificationsOpen && (
              <NotificationsPanel 
                onClose={() => setNotificationsOpen(false)}
              />
            )}
          </div>

          {/* Settings / Gear icon */}
          <button 
            onClick={() => {
              setMyIntegrationsOpen(false);
              setNotificationsOpen(false);
              onOpenSettings();
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Settings"
          >
            <Settings size={20} />
          </button>

          {/* Help icon */}
          <button 
            onClick={() => {
              setMyIntegrationsOpen(false);
              setNotificationsOpen(false);
              if (onOpenAssistant) onOpenAssistant();
            }}
            className="p-1.5 hover:bg-gray-100 rounded-full transition cursor-pointer"
            title="Help / Meso Assistant"
          >
            <HelpCircle size={20} />
          </button>
        </div>

        {/* 32px blue circle avatar flush right */}
        <button 
          onClick={onOpenShortcuts}
          className="w-[32px] h-[32px] rounded-full bg-[#0077C5] hover:bg-[#005e9e] text-white flex items-center justify-center font-bold text-sm shadow-xs ml-2 cursor-pointer transition"
          title="Accountant view & Shortcuts"
        >
          T
        </button>
      </div>
      </div>
    </header>
  );
}
