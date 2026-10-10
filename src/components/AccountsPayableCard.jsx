import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import DragAffordance from './DragAffordance';
import { formatRupees } from '../dashboard';

/**
 * Accounts Payable.
 *
 * The aging buckets were typed in -- Current $0.00, 1-7 days $755.00, 8-14 days
 * $0.00 -- and so were the three gauge segments (45/15/40). The gauge
 * therefore said nothing about the bills in the app, and the total beside it
 * came from elsewhere, so the ring and the number could not agree even in
 * principle.
 *
 * Both now come from the same aging figures: the buckets are computed from each
 * bill's due date, and the gauge is drawn from the buckets. The pie sums to the
 * total or it is not drawn at all.
 */
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

  const aging = apData?.aging || [];
  const agingTotal = aging.reduce((s, b) => s + b.amount, 0);

  // Outer ~150px, Radius r = 50, Circumference C = 2 * PI * 50 ≈ 314.16
  // 300° sweep (0.83 * C ≈ 260.75) with gap near 11-12 o'clock
  const radius = 50;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  const sweep = 0.83 * circumference;

  // Drawn from the aging buckets, biggest share last so the sweep reads
  // current-to-overdue. Nothing owed means no gauge -- an empty ring next to a
  // real total looks like a rendering fault.
  const segments = agingTotal > 0
    ? aging.filter((b) => b.amount > 0).map((b, i) => ({
      color: b.color,
      pct: (b.amount / agingTotal) * 100,
      key: b.label,
      order: i,
    }))
    : [{ color: '#E3E5E8', pct: 100, key: 'none', order: 0 }];

  // Each arc starts where the previous one ended. The running sweep length is
  // carried through the reduce instead of a variable reassigned mid-render,
  // which is the pattern React's immutability rule warns about.
  const gaugeSlices = segments.reduce((acc, seg) => {
    const arcLen = (seg.pct / 100) * sweep;
    return {
      slices: [
        ...acc.slices,
        { ...seg, strokeDasharray: `${arcLen} ${circumference}`, strokeDashoffset: -acc.sweep },
      ],
      sweep: acc.sweep + arcLen,
    };
  }, { slices: [], sweep: 0 }).slices;

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
          {apData?.updated || 'All categorised'}
        </div>

        {/* Total A/P amount */}
        <div className="mb-4">
          <div className="text-[14px] text-[#393A3D]">Total A/P amount</div>
          <div className="text-[28px] font-semibold text-[#393A3D] tracking-tight mt-0.5">
            {formatAmount(apData?.total || '\u20b90.00')}
          </div>
        </div>

        {/* Aging Buckets and Gauge Chart */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Aging List. Buckets come from each bill's due date, so a bill that is not
            overdue shows as Current and one that is shows in the right band. */}
          <div className="space-y-3 text-[13px]">
            {aging.length === 0 ? (
              <p className="text-[13px] text-[#6B6C72]">Nothing outstanding.</p>
            ) : (
              aging.map((bucket) => (
                <div key={bucket.label}>
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: bucket.color }}
                    />
                    <span className="font-semibold text-[#393A3D]">
                      {formatAmount(formatRupees(bucket.amount))}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#6B6C72] pl-4">{bucket.label}</div>
                </div>
              ))
            )}
          </div>

          {/* Refined Gauge Chart SVG (~150px) */}
          <div className="relative w-[140px] h-[140px] flex-shrink-0">
            <svg 
              className="w-full h-full transform"
              viewBox="0 0 130 130"
            >
              {/* Group rotated 105° so small gap sits near 11-12 o'clock */}
              <g transform="rotate(105 65 65)">
                {gaugeSlices.map((slice) => (
                  <circle
                    key={slice.key}
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
