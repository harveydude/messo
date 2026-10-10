import React, { useState } from 'react';
import { 
  Building, 
  CreditCard, 
  Info, 
  ChevronDown, 
  Settings, 
  MoreVertical 
} from 'lucide-react';

export default function BankCard({ 
  bankData, 
  privacyEnabled = false,
  onOpenRegisters 
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_8px_24px_-4px_rgba(0,0,0,0.14),0_4px_12px_-2px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
            BANK ACCOUNTS
          </h3>
          <span className="text-[13px] text-[#6B6C72]">
            {bankData?.asOf || "As of today"}
          </span>
        </div>

        {/* Today's bank balance */}
        <div className="mb-6">
          <div className="text-[15px] text-[#393A3D]">Today's bank balance</div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[28px] font-semibold text-[#393A3D] tracking-tight">
              {formatAmount(bankData?.todaysBalance || "-$3,422")}
            </span>
            <div className="relative">
              <button 
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-[16px] h-[16px] rounded-full bg-[#0077C5] text-white flex items-center justify-center text-[11px] font-serif font-bold italic cursor-pointer hover:bg-blue-700"
              >
                i
              </button>
              {showTooltip && (
                <div className="absolute left-6 -top-2 w-56 bg-[#393A3D] text-white text-[11px] p-2 rounded shadow-lg z-20">
                  Balance may exclude pending transactions.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Rows */}
        <div className="space-y-4">
          {/* Checking */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-[32px] h-[32px] rounded-full bg-[#0077C5] flex items-center justify-center text-white shadow-2xs">
                  <CreditCard size={16} />
                </div>
                <span className="text-[15px] font-semibold text-[#393A3D]">Checking</span>
              </div>
            </div>

            <div className="pl-[42px] space-y-0.5 text-[14px]">
              <div className="flex justify-between text-[#393A3D]">
                <span>Bank balance</span>
                <span className="font-medium">{formatAmount("-$3,621.93")}</span>
              </div>
              <div className="flex justify-between text-[#393A3D]">
                <span>In QuickBooks</span>
                <span className="font-medium">{formatAmount("$1,201.00")}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-[13px] text-[#6B6C72]">Updated moments ago</span>
                <button 
                  onClick={onOpenRegisters}
                  className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer"
                >
                  25 to review
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-[#E3E5E8] my-3" />

          {/* Mastercard */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-[32px] h-[32px] rounded-full bg-[#0077C5] flex items-center justify-center text-white shadow-2xs">
                  <CreditCard size={16} />
                </div>
                <span className="text-[15px] font-semibold text-[#393A3D]">Mastercard</span>
              </div>
            </div>

            <div className="pl-[42px] space-y-0.5 text-[14px]">
              <div className="flex justify-between text-[#393A3D]">
                <span>Bank balance</span>
                <span className="font-medium">{formatAmount("$304.96")}</span>
              </div>
              <div className="flex justify-between text-[#393A3D]">
                <span>In QuickBooks</span>
                <span className="font-medium">{formatAmount("$157.72")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 mt-4 flex items-center justify-between">
        <button 
          onClick={onOpenRegisters}
          className="text-[15px] text-[#0077C5] hover:underline font-medium flex items-center space-x-1 cursor-pointer"
        >
          <span>Go to registers</span>
          <ChevronDown size={14} />
        </button>

        <div className="flex items-center space-x-3 text-[#393A3D]">
          <button className="hover:text-black p-1 cursor-pointer">
            <Settings size={20} />
          </button>
          <button className="hover:text-black p-1 cursor-pointer">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
