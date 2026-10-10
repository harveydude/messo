import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

export default function FunnelCard({ 
  funnelData, 
  privacyEnabled = false,
  onRequestPayment 
}) {
  const [period, setPeriod] = useState(funnelData?.period || "Last 30 days");

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
          SALES & GET PAID FUNNEL
        </h3>
        <div className="flex items-center space-x-1 text-[14px] text-[#393A3D] font-medium cursor-pointer hover:text-black">
          <span>{period}</span>
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Columns Region (grid: 1fr 24px 1fr 24px 1fr 24px 1fr) */}
      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr_24px_1fr] items-center min-h-[231px]">
        {/* Col 1: CTA */}
        <div className="h-full bg-white border border-[#C7CBCE] rounded-[8px] p-[20px] flex flex-col justify-between relative overflow-hidden">
          <div>
            <h4 className="text-[16px] font-semibold text-[#393A3D] leading-snug">
              Create a new payment request
            </h4>
            <p className="text-[14px] text-[#6B6C72] mt-2 leading-relaxed">
              Send invoices, pay links, and more
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={onRequestPayment}
              className="h-[32px] px-[12px] border border-[#68696C] hover:border-black rounded-[4px] text-[13px] font-medium text-[#393A3D] flex items-center justify-between space-x-2 bg-white cursor-pointer transition shadow-2xs"
            >
              <span>Request payment</span>
              <ChevronDown size={13} />
            </button>
          </div>
        </div>

        {/* Separator 1 */}
        <div className="flex justify-center text-[#6B6C72]">
          <ChevronRight size={16} />
        </div>

        {/* Col 2: Not Paid */}
        <div className="h-full bg-white border border-[#C7CBCE] rounded-[8px] p-[20px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#2CA01C]" />
          <div>
            <div className="text-[15px] font-medium text-[#393A3D]">Not Paid</div>
            <div className="text-[26px] font-semibold text-[#393A3D] mt-3 tracking-tight">
              {formatAmount("$1,861.55")}
            </div>
          </div>
          <div className="h-[24px]" />
        </div>

        {/* Separator 2 */}
        <div className="flex justify-center text-[#6B6C72]">
          <ChevronRight size={16} />
        </div>

        {/* Col 3: Paid */}
        <div className="h-full bg-white border border-[#C7CBCE] rounded-[8px] p-[20px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#2CA01C]" />
          <div>
            <div className="text-[15px] font-medium text-[#393A3D]">Paid</div>
            <div className="text-[26px] font-semibold text-[#393A3D] mt-3 tracking-tight">
              {formatAmount("$2,363.52")}
            </div>
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[#108000] text-[13px] font-medium">
              <span className="w-4 h-4 rounded-full border border-[#108000] flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span>4 paid</span>
            </div>
          </div>
        </div>

        {/* Separator 3 */}
        <div className="flex justify-center text-[#6B6C72]">
          <ChevronRight size={16} />
        </div>

        {/* Col 4: Deposited */}
        <div className="h-full bg-white border border-[#C7CBCE] rounded-[8px] p-[20px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[4px] bg-[#2CA01C]" />
          <div>
            <div className="text-[15px] font-medium text-[#393A3D]">Deposited</div>
            <div className="text-[26px] font-semibold text-[#393A3D] mt-3 tracking-tight">
              {formatAmount("$1,276.15")}
            </div>
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 text-[#108000] text-[13px] font-medium">
              <span className="w-4 h-4 rounded-full border border-[#108000] flex items-center justify-center text-[10px] font-bold">
                ✓
              </span>
              <span>2 deposited</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
