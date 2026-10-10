import React, { useState } from 'react';
import { ChevronDown, ArrowDown, MoreVertical } from 'lucide-react';

export default function ExpensesDonutCard({ 
  expensesData, 
  privacyEnabled = false,
  onNavigate 
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  /**
   * Nothing to show is stated plainly. An empty ring with no words beside it
   * reads as a broken chart rather than as "you have not spent anything".
   */
  const data = expensesData || {
    period: 'This period',
    title: 'EXPENSES',
    subtitle: 'Spending for the period to date',
    amount: '\u20b90.00',
    percentBadge: '\u2014',
    trendText: 'No data yet',
    categories: [],
    reviewText: 'Nothing to review',
    footerLink: 'Add an expense',
  };

  /**
   * Slices come from the data, not from a list typed into this file.
   *
   * The ring used to be five fixed segments -- Cost of Goods Sold 16%, Legal &
   * Professional Fees 9%, Automobile 7% -- with a legend that repeated those
   * names in hardcoded markup, so the two could not agree with each other even
   * if the data changed. Nothing spent is a legitimate result, so an empty ring
   * is handled rather than divided by.
   */
  const radius = 44;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  const segments = (data.categories || []).filter((c) => c.percent > 0);

  // Each slice starts where the one before it ended, so the running total is
  // carried through the reduce rather than kept in a variable reassigned during
  // the render pass -- which React's immutability rule rightly flags.
  const donutSlices = segments.reduce((acc, seg) => {
    const strokeDasharray = `${(seg.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((acc.offset / 100) * circumference);
    return {
      slices: [...acc.slices, { ...seg, strokeDasharray, strokeDashoffset }],
      offset: acc.offset + seg.percent,
    };
  }, { slices: [], offset: 0 }).slices;

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
            EXPENSES
          </h3>
          <button className="flex items-center space-x-1 text-[13px] text-[#393A3D] hover:text-[#0077C5] cursor-pointer">
            <span>{data.period}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Subtitle & Spending */}
        <div className="text-[14px] text-[#6B6C72]">
          {data.subtitle}
        </div>

        <div className="flex items-center space-x-2 mt-1 mb-1">
          <span className="text-[28px] font-semibold text-[#393A3D] tracking-tight">
            {formatAmount(data.amount)}
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
              <div className="absolute left-6 -top-2 w-52 bg-[#393A3D] text-white text-[11px] p-2 rounded shadow-lg z-20">
                Total business expenses incurred in the last 30 days.
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 bg-[#F0F1F3] text-[#393A3D] text-[12px] font-medium rounded-full">
            {data.percentBadge}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center space-x-1 text-[#C2410C] text-[13px] font-medium mb-4">
          <ArrowDown size={14} className="stroke-[2.5]" />
          <span>{data.trendText}</span>
        </div>

        {/* Donut Chart and Legend Row */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Donut Chart SVG */}
          <div className="relative w-[124px] h-[124px] flex-shrink-0">
            <svg
              className="w-full h-full -rotate-90 transform"
              viewBox="0 0 120 120"
            >
              {donutSlices.length === 0 && (
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#E3E5E8" strokeWidth={strokeWidth} />
              )}
              {donutSlices.map((slice, i) => (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={slice.strokeDasharray}
                  strokeDashoffset={slice.strokeDashoffset}
                  className="transition-all duration-300"
                />
              ))}
            </svg>
          </div>

          {/* Legend, from the same data the ring is drawn from. */}
          <div className="flex-1 space-y-1.5 text-[12px] text-[#393A3D]">
            {donutSlices.length === 0 ? (
              <p className="text-gray-500">No expenses recorded yet.</p>
            ) : (
              donutSlices.map((slice, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.name}</span>
                  <span className="ml-auto text-gray-500 tabular-nums">{slice.percent}%</span>
                </div>
              ))
            )}
            <div className="flex items-center space-x-2 pt-0.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9E9E9E] flex-shrink-0" />
              <button
                onClick={() => onNavigate && onNavigate('expense_transactions')}
                className="text-[#0077C5] hover:underline font-medium cursor-pointer"
              >
                {data.reviewText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 flex items-center justify-between border-t border-transparent">
        <button 
          onClick={() => onNavigate && onNavigate('expense_transactions')}
          className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer"
        >
          {data.footerLink}
        </button>

        <button
          type="button"
          className="text-[#6B6C72] hover:text-[#393A3D] p-1 cursor-pointer"
          aria-label="More options for the expenses card"
        >
          <MoreVertical size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
