import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import DragAffordance from './DragAffordance';

export default function AccountsPayableCard({ 
  apData, 
  privacyEnabled = false,
  onNavigate,
  showDragAffordance = false,
  onRemove
}) {
  const [isRotating, setIsRotating] = useState(false);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  const handleRefresh = () => {
    setIsRotating(true);
    setTimeout(() => setIsRotating(false), 600);
  };

  // Refined Gauge SVG Math (§22)
  // Outer ~150px, Radius r = 50, Circumference C = 2 * PI * 50 ≈ 314.16
  // 300° sweep (0.83 * C ≈ 260.75) with gap near 11-12 o'clock
  const radius = 50;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const sweep = 0.83 * circumference;

  const segments = [
    { color: "#1C7FD6", pct: 45 }, // Dark Blue (Right side)
    { color: "#E5348B", pct: 15 }, // Magenta/Pink (Bottom)
    { color: "#7FB8E6", pct: 40 }, // Light Blue (Left/Bottom)
  ];

  let accumulatedSweep = 0;
  const gaugeSlices = segments.map((seg) => {
    const arcLen = (seg.pct / 100) * sweep;
    const strokeDasharray = `${arcLen} ${circumference}`;
    const strokeDashoffset = -accumulatedSweep;
    accumulatedSweep += arcLen;
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between h-full relative overflow-hidden">
      {/* Drag & Remove Affordance Overlay (Screenshot 2) */}
      {showDragAffordance && (
        <div className="absolute inset-0 bg-transparent flex items-center justify-center z-30 pointer-events-auto">
          <DragAffordance onRemove={onRemove} />
        </div>
      )}

      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1.5">
            <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
              ACCOUNTS PAYAB...
            </h3>
            <button 
              onClick={handleRefresh}
              className={`p-0.5 text-[#6B6C72] hover:text-[#393A3D] cursor-pointer transition-transform ${isRotating ? 'rotate-180' : ''}`}
              title="Refresh A/P data"
            >
              <RotateCw size={14} />
            </button>
          </div>
          <span className="text-[13px] text-[#6B6C72]">
            {apData?.asOf || "As of today"}
          </span>
        </div>

        {/* Updated timestamp - italicized per §21 */}
        <div className="text-[12px] text-[#6B6C72] italic mb-3">
          {apData?.updated || "Data updated 11 minutes ago"}
        </div>

        {/* Total A/P amount */}
        <div className="mb-4">
          <div className="text-[14px] text-[#393A3D]">Total A/P amount</div>
          <div className="text-[28px] font-semibold text-[#393A3D] tracking-tight mt-0.5">
            {formatAmount(apData?.total || "$1,602.67")}
          </div>
        </div>

        {/* Aging Buckets and Gauge Chart */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Aging List */}
          <div className="space-y-3 text-[13px]">
            {/* Current */}
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#2CA01C] flex-shrink-0" />
                <span className="font-semibold text-[#393A3D]">
                  {formatAmount("$0.00")}
                </span>
              </div>
              <div className="text-[12px] text-[#6B6C72] pl-4">Current</div>
            </div>

            {/* 1-7 days */}
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#4E9FD4] flex-shrink-0" />
                <span className="font-semibold text-[#393A3D]">
                  {formatAmount("$755.00")}
                </span>
              </div>
              <div className="text-[12px] text-[#6B6C72] pl-4">1-7 days</div>
            </div>

            {/* 8-14 days */}
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#E8A33D] flex-shrink-0" />
                <span className="font-semibold text-[#393A3D]">
                  {formatAmount("$0.00")}
                </span>
              </div>
              <div className="text-[12px] text-[#6B6C72] pl-4">8-14 days</div>
            </div>
          </div>

          {/* Refined Gauge Chart SVG (~150px) */}
          <div className="relative w-[140px] h-[140px] flex-shrink-0">
            <svg 
              className="w-full h-full transform"
              viewBox="0 0 130 130"
            >
              {/* Group rotated 105° so small gap sits near 11-12 o'clock */}
              <g transform="rotate(105 65 65)">
                {gaugeSlices.map((slice, i) => (
                  <circle
                    key={i}
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-300"
                  />
                ))}
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-2">
        <button 
          onClick={() => onNavigate && onNavigate('expense_transactions')}
          className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer"
        >
          {apData?.footerLink || "Go to report"}
        </button>
      </div>
    </div>
  );
}
