import React from 'react';
import { X } from 'lucide-react';

export default function NotificationsPanel({ onClose }) {
  return (
    <div 
      className="absolute top-[52px] right-[40px] w-[420px] h-[597px] bg-white border border-[#E3E5E8] rounded-[8px] shadow-[0_8px_28px_rgba(0,0,0,0.18)] z-[70] flex flex-col select-none animate-in fade-in duration-150"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E5E8]">
        <h2 className="text-[20px] font-semibold text-[#393A3D]">
          Notifications
        </h2>
        <button 
          onClick={onClose}
          className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer transition p-1"
          title="Close notifications"
        >
          <X size={20} />
        </button>
      </div>

      {/* Empty State Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pb-12">
        {/* Beach Umbrella & Lounge Chair SVG Illustration */}
        <div className="w-[170px] h-[170px] mb-6 relative flex items-center justify-center">
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Waves / Water Lines */}
            <path 
              d="M20 128 C26 124 32 124 38 128 C44 132 50 132 56 128 C62 124 68 124 74 128 C80 132 86 132 92 128" 
              stroke="#B9BDC1" 
              strokeWidth="2" 
              strokeLinecap="round" 
            />
            <path 
              d="M26 138 C32 134 38 134 44 138 C50 142 56 142 62 138 C68 134 74 134 80 138" 
              stroke="#B9BDC1" 
              strokeWidth="2" 
              strokeLinecap="round" 
            />

            {/* Umbrella Pole */}
            <line x1="72" y1="52" x2="72" y2="132" stroke="#9DA2A8" strokeWidth="2.5" strokeLinecap="round" />

            {/* Umbrella Canopy */}
            {/* Outer arch */}
            <path 
              d="M26 62 C34 26 110 26 118 62 Z" 
              fill="#FFFFFF" 
              stroke="#2CA01C" 
              strokeWidth="2" 
            />
            {/* Green segments */}
            <path 
              d="M45 62 C50 34 62 27 72 27 C72 27 60 45 55 62 Z" 
              fill="#2CA01C" 
            />
            <path 
              d="M89 62 C84 34 72 27 72 27 C72 27 84 45 99 62 Z" 
              fill="#2CA01C" 
            />
            <path 
              d="M68 27 C70 35 72 62 72 62 C72 62 74 35 76 27 Z" 
              fill="#FFFFFF" 
            />

            {/* Small umbrella tip */}
            <line x1="72" y1="23" x2="72" y2="27" stroke="#2CA01C" strokeWidth="2.5" strokeLinecap="round" />

            {/* Beach Lounge Chair */}
            {/* Backrest */}
            <line x1="120" y1="70" x2="84" y2="114" stroke="#9DA2A8" strokeWidth="2" strokeLinecap="round" />
            {/* Seat */}
            <line x1="84" y1="114" x2="132" y2="114" stroke="#9DA2A8" strokeWidth="2" strokeLinecap="round" />
            {/* Front leg */}
            <line x1="128" y1="114" x2="132" y2="134" stroke="#9DA2A8" strokeWidth="2" strokeLinecap="round" />
            {/* Rear support leg */}
            <line x1="100" y1="94" x2="114" y2="134" stroke="#9DA2A8" strokeWidth="2" strokeLinecap="round" />
            {/* Back leg cross */}
            <line x1="84" y1="114" x2="90" y2="134" stroke="#9DA2A8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Empty state title */}
        <h3 className="text-[20px] font-normal text-[#393A3D] text-center">
          Nothing to see here!
        </h3>
      </div>
    </div>
  );
}
