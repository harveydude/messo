import React from 'react';
import { Lock } from 'lucide-react';

export default function PrivacyMask({ onTurnOffPrivacy }) {
  return (
    <div className="relative w-full min-h-[500px] select-none pt-4 pb-12">
      {/* 4-Column Skeleton Grid (Matches media_1791590481480_427e5692.jpg) */}
      <div className="space-y-[120px]">
        {/* Row 1: 4 columns of skeleton pairs */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px]">
          {/* Column 1 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>

          {/* Column 2 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>

          {/* Column 3 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>

          {/* Column 4 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>
        </div>

        {/* Row 2: Columns 1 and 3 only */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[24px]">
          {/* Column 1 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>

          {/* Column 2: Empty */}
          <div />

          {/* Column 3 */}
          <div className="space-y-[24px] pl-2">
            <div className="w-[178px] h-[19px] rounded-[4px] bg-[#E7E9EC]" />
            <div className="w-[267px] h-[18px] rounded-[4px] bg-[#E7E9EC]" />
          </div>

          {/* Column 4: Empty */}
          <div />
        </div>
      </div>

      {/* Centered Privacy Notice Card (480x94px) */}
      <div 
        onClick={onTurnOffPrivacy}
        role="status"
        aria-live="polite"
        className="absolute left-1/2 -translate-x-1/2 top-[240px] w-[480px] h-[94px] bg-white border border-[#D4D7DC] rounded-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-md flex items-center px-[28px] space-x-[18px] cursor-pointer transition z-20"
      >
        {/* Green Lock Ring */}
        <div className="w-[44px] h-[44px] rounded-full border-2 border-[#2CA01C] bg-white flex items-center justify-center text-[#2CA01C] shrink-0">
          <Lock size={20} strokeWidth={2.2} />
        </div>

        {/* Notice text */}
        <p className="text-[17px] font-normal text-[#393A3D] leading-tight m-0 select-none">
          See your financial info by turning privacy off.
        </p>
      </div>
    </div>
  );
}
