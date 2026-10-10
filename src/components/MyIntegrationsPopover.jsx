import React from 'react';
import { HelpCircle, X, LayoutGrid, PlusCircle, Check } from 'lucide-react';
import dashboardData from '../data/dashboard.json';

export default function MyIntegrationsPopover({ onClose, onNavigateFind }) {
  const integrations = dashboardData.integrations?.myIntegrations || [];

  return (
    <div 
      className="absolute top-[52px] right-[70px] w-[434px] bg-white border border-[#E3E5E8] rounded-[8px] shadow-[0_8px_28px_rgba(0,0,0,0.18)] z-[70] overflow-hidden select-none animate-in fade-in duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-[20px] font-semibold text-[#393A3D]">
            My integrations
          </h2>
          <button 
            className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer transition p-0.5"
            title="Learn more about integrations"
          >
            <HelpCircle size={16} />
          </button>
        </div>

        <button 
          onClick={onClose}
          className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer transition p-1"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* 3 App Tiles Row */}
      <div className="grid grid-cols-3 gap-2 px-6 pt-3 pb-5">
        {integrations.map((app, idx) => (
          <div key={idx} className="flex flex-col items-center text-center group cursor-pointer">
            {/* Logo container with badge */}
            <div className="relative mb-2">
              {app.logoType === 'shopify' ? (
                <div className="w-[52px] h-[52px] rounded-full bg-[#95BF47] flex items-center justify-center text-white shadow-xs">
                  <span className="font-bold text-[22px]">S</span>
                </div>
              ) : app.logoType === 'dext' ? (
                <div className="w-[52px] h-[52px] rounded-full bg-white border border-[#E3E5E8] flex items-center justify-center shadow-xs">
                  <span className="font-bold text-[14px] text-[#ED6A26] tracking-tighter">Dext</span>
                </div>
              ) : (
                <div className="w-[52px] h-[52px] rounded-full bg-white border border-[#E3E5E8] flex items-center justify-center text-[#00A699] shadow-xs">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
              )}

              {/* Status Badge */}
              {app.badge?.type === 'count' ? (
                <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#E8710A] text-white text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                  {app.badge.value}
                </div>
              ) : (
                <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#2CA01C] text-white flex items-center justify-center border-2 border-white shadow-xs">
                  <Check size={11} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* App Name */}
            <span className="text-[14px] text-[#393A3D] leading-tight line-clamp-2 max-w-[95px] group-hover:text-black">
              {app.name}
            </span>
          </div>
        ))}
      </div>

      {/* Integrations Overview Link */}
      <div className="flex items-center justify-center space-x-2 py-3 border-t border-[#F0F1F3]">
        <LayoutGrid size={16} className="text-[#0E9F9F]" />
        <button 
          onClick={onNavigateFind}
          className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer"
        >
          Integrations overview
        </button>
      </div>

      {/* Footer Strip */}
      <div className="h-[62px] bg-[#F4F5F7] border-t border-[#E3E5E8] px-6 flex items-center justify-center">
        <button
          onClick={onNavigateFind}
          className="w-[220px] h-[40px] rounded-[8px] bg-[#EAF6E3] border-[1.5px] border-[#2CA01C] text-[#2CA01C] font-semibold text-[15px] flex items-center justify-center space-x-2 hover:bg-[#d9edd2] transition cursor-pointer shadow-2xs"
        >
          <PlusCircle size={18} className="stroke-[2.2]" />
          <span>Find integrations</span>
        </button>
      </div>
    </div>
  );
}
