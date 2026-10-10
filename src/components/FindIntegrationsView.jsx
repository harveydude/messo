import React, { useState } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, Star, User } from 'lucide-react';
import dashboardData from '../data/dashboard.json';

// Teal Star Rating Component
function StarRating({ value = 5, count = 0 }) {
  return (
    <div className="flex items-center space-x-1.5">
      <div className="flex items-center space-x-0.5">
        {[1, 2, 3, 4, 5].map((i) => {
          const fillRatio = Math.max(0, Math.min(1, value - i + 1));
          return (
            <span key={i} className="relative inline-block w-[18px] h-[18px]">
              {/* Empty Star Outline */}
              <Star size={18} color="#0E9F9F" strokeWidth={1.8} className="absolute inset-0" />
              {/* Filled Star with clip */}
              {fillRatio > 0 && (
                <span 
                  className="absolute inset-0 overflow-hidden" 
                  style={{ width: `${fillRatio * 100}%` }}
                >
                  <Star size={18} color="#0E9F9F" fill="#0E9F9F" strokeWidth={1.8} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-[14px] text-[#6B6C72]">
        ({count})
      </span>
    </div>
  );
}

// Reusable App Card with 6px green top bar
function AppCard({ app, hasGreenTopBar = true }) {
  return (
    <div className="w-[290px] h-[335px] bg-white border border-[#C7CBCE] rounded-[8px] shadow-xs relative flex flex-col justify-between overflow-hidden p-6 hover:shadow-md transition">
      {/* 6px Solid Green Top Bar */}
      {hasGreenTopBar && (
        <div className="absolute top-0 left-0 right-0 h-[6px] bg-[#2CA01C]" />
      )}

      {/* Top Section: Logo & Titles */}
      <div>
        {/* App Logo */}
        <div className="w-[56px] h-[56px] rounded-[8px] flex items-center justify-center mb-4">
          {app.id === 'biller-genie' ? (
            <div className="w-[52px] h-[52px] rounded-lg bg-[#EBF7FC] flex items-center justify-center">
              <span className="text-[#008CD8] font-bold text-[26px] tracking-tight">bg</span>
            </div>
          ) : app.id === 'buildertrend' ? (
            <div className="w-[52px] h-[52px] rounded-full bg-[#EAF2F8] flex items-center justify-center">
              <span className="text-[#003A6C] font-black text-[28px]">b</span>
            </div>
          ) : app.id === 'housecall-pro' ? (
            <div className="w-[52px] h-[52px] rounded-lg bg-[#F0F8FF] flex items-center justify-center text-[#0077C5]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-8 14H7v-4h4v4zm0-6H7V7h4v4zm6 6h-4v-4h4v4zm0-6h-4V7h4v4z"/>
              </svg>
            </div>
          ) : app.id === 'keeper' ? (
            <div className="w-[52px] h-[52px] rounded-lg bg-[#F5F1FD] flex items-center justify-center">
              <span className="text-[#5D3FD3] font-bold text-[14px]">Keeper</span>
            </div>
          ) : (
            <div className="w-[52px] h-[52px] rounded-lg bg-gray-100 flex items-center justify-center font-bold text-[#393A3D]">
              {app.initials || app.name.slice(0, 2)}
            </div>
          )}
        </div>

        {/* App Name */}
        <h3 className="text-[18px] font-semibold text-[#393A3D] mb-2 leading-tight">
          {app.name}
        </h3>

        {/* Stars Row */}
        {app.rating && (
          <div className="mb-3">
            <StarRating value={app.rating} count={app.count} />
          </div>
        )}

        {/* Description */}
        <p className="text-[15px] text-[#6B6C72] leading-snug line-clamp-2">
          {app.desc || "Easily connect and sync transactions with QuickBooks Online."}
        </p>
      </div>

      {/* Bottom Badges */}
      <div className="flex items-center space-x-2 pt-2">
        {app.badges?.includes('fave') && (
          <div 
            className="w-[24px] h-[24px] rounded-full bg-[#0B6E4F] flex items-center justify-center text-white shadow-2xs"
            title="Editor's Choice"
          >
            <Star size={13} fill="currentColor" />
          </div>
        )}

        {app.badges?.includes('pro') && (
          <div 
            className="w-[24px] h-[24px] rounded-full bg-[#2A3B8F] flex items-center justify-center text-white shadow-2xs"
            title="Certified Pro"
          >
            <User size={13} fill="currentColor" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function FindIntegrationsView() {
  const [activeTab, setActiveTab] = useState('find');
  const [carouselIndex, setCarouselIndex] = useState(0);

  const integrationsData = dashboardData.integrations || {};
  const featured = integrationsData.featured || [];
  const popular = integrationsData.popular || [];
  const popularSearches = integrationsData.popularSearches || [];

  return (
    <div className="w-full bg-white min-h-[calc(100vh-56px)] select-none overflow-y-auto">
      {/* 1. Tabs Header Bar */}
      <div className="border-b border-[#D4D7DC] px-[44px]">
        <div className="flex items-center space-x-8 text-[16px]">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 pt-4 font-medium transition cursor-pointer ${
              activeTab === 'overview'
                ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[1px]'
                : 'text-[#6B6C72] hover:text-[#393A3D]'
            }`}
          >
            Integrations overview
          </button>

          <button
            onClick={() => setActiveTab('find')}
            className={`pb-3 pt-4 font-medium transition cursor-pointer ${
              activeTab === 'find'
                ? 'text-[#393A3D] font-semibold border-b-[3px] border-[#2CA01C] -mb-[1px]'
                : 'text-[#6B6C72] hover:text-[#393A3D]'
            }`}
          >
            Find integrations
          </button>
        </div>
      </div>

      <div className="px-[44px] py-[32px] max-w-[1400px]">
        {/* 2. Hero Section: Headline + Give Feedback button */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <h1 className="text-[32px] font-normal text-[#393A3D] leading-tight max-w-[780px]">
            Save time and streamline your business with integrations
          </h1>

          <button className="h-[44px] px-5 rounded-[8px] bg-white border-2 border-[#2CA01C] text-[#2CA01C] font-semibold text-[15px] flex items-center space-x-2 hover:bg-[#F4FBEF] transition cursor-pointer shrink-0">
            <MessageSquare size={18} className="stroke-[2.2]" />
            <span>Give Feedback</span>
          </button>
        </div>

        {/* 3. Search Bar & Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-3.5 mb-4">
          {/* Search Input */}
          <div className="relative w-[520px] h-[48px]">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6C72]" />
            <input
              type="text"
              placeholder="Search by integration, tool or business need"
              className="w-full h-full pl-[46px] pr-4 border border-[#8D9096] rounded-[4px] text-[15px] text-[#393A3D] placeholder-[#6B6C72] focus:outline-none focus:border-[#2CA01C] bg-white"
            />
          </div>

          {/* Vertical Divider */}
          <div className="h-[48px] w-[1px] bg-[#D4D7DC] mx-1 hidden sm:block" />

          {/* Browse Categories Dropdown */}
          <button className="h-[48px] px-5 rounded-[4px] bg-white border-2 border-[#2CA01C] text-[#2CA01C] font-semibold text-[15px] flex items-center space-x-3 hover:bg-[#F4FBEF] transition cursor-pointer">
            <span>Browse categories</span>
            <ChevronDown size={18} className="stroke-[2.2]" />
          </button>

          {/* Browse Industries Dropdown */}
          <button className="h-[48px] px-5 rounded-[4px] bg-white border-2 border-[#2CA01C] text-[#2CA01C] font-semibold text-[15px] flex items-center space-x-3 hover:bg-[#F4FBEF] transition cursor-pointer">
            <span>Browse industries</span>
            <ChevronDown size={18} className="stroke-[2.2]" />
          </button>
        </div>

        {/* 4. Popular Searches */}
        <div className="flex flex-wrap items-center space-x-2 text-[15px] mb-10">
          <span className="text-[#393A3D] font-normal">
            Popular searches:
          </span>
          <div className="flex items-center space-x-3">
            {popularSearches.map((term, idx) => (
              <button 
                key={idx}
                className="text-[#0077C5] underline hover:text-[#005e9e] cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Featured Integrations Carousel */}
        <div className="mb-12 relative">
          <h2 className="text-[20px] font-semibold text-[#393A3D] mb-5">
            Featured integrations
          </h2>

          <div className="relative flex items-center">
            {/* Left Chevron */}
            <button 
              disabled={carouselIndex === 0}
              onClick={() => setCarouselIndex(Math.max(0, carouselIndex - 1))}
              className={`absolute -left-5 z-10 w-[36px] h-[36px] rounded-full bg-white border border-[#D4D7DC] shadow-sm flex items-center justify-center transition cursor-pointer ${
                carouselIndex === 0 ? 'opacity-30 cursor-not-allowed text-gray-400' : 'text-[#393A3D] hover:bg-gray-50'
              }`}
            >
              <ChevronLeft size={20} />
            </button>

            {/* 4 Carousel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[22px] w-full">
              {featured.map((app, idx) => (
                <AppCard key={idx} app={app} hasGreenTopBar={true} />
              ))}
            </div>

            {/* Right Chevron */}
            <button 
              onClick={() => setCarouselIndex(carouselIndex + 1)}
              className="absolute -right-5 z-10 w-[36px] h-[36px] rounded-full bg-white border border-[#D4D7DC] shadow-sm flex items-center justify-center text-[#393A3D] hover:bg-gray-50 transition cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* 6. Most Popular Integrations */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[20px] font-semibold text-[#393A3D]">
              Most popular integrations
            </h2>
            <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[22px] w-full">
            {popular.map((app, idx) => (
              <div 
                key={idx}
                className="w-[290px] h-[220px] bg-white border border-[#C7CBCE] rounded-[8px] p-6 flex flex-col justify-between hover:shadow-md transition cursor-pointer"
              >
                <div>
                  <div className="w-[56px] h-[56px] rounded-[8px] flex items-center justify-center mb-4">
                    {app.id === 'fundbox' ? (
                      <div className="w-[52px] h-[52px] rounded-md bg-black text-white flex items-center justify-center text-[11px] font-bold tracking-tight">
                        Fundbox
                      </div>
                    ) : app.id === 'dext' ? (
                      <div className="w-[52px] h-[52px] rounded-md bg-white border border-[#E3E5E8] text-[#ED6A26] flex items-center justify-center text-[14px] font-bold">
                        Dext
                      </div>
                    ) : app.id === 'run' ? (
                      <div className="w-[52px] h-[52px] rounded-md bg-white border border-[#E3E5E8] flex items-center justify-center">
                        <span className="text-[#0077C5] font-bold text-[16px]">run</span>
                      </div>
                    ) : (
                      <div className="w-[52px] h-[52px] rounded-md bg-white border border-[#E3E5E8] text-[#00A699] flex items-center justify-center text-[12px] font-bold">
                        Fathom
                      </div>
                    )}
                  </div>
                  <h3 className="text-[18px] font-semibold text-[#393A3D]">
                    {app.name}
                  </h3>
                </div>

                <div className="text-[14px] text-[#0077C5] font-medium hover:underline">
                  Learn more →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
