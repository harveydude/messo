import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ArrowUp, MoreVertical, Check } from 'lucide-react';

export default function ProfitLossCard({ 
  pnlData, 
  privacyEnabled = false,
  onNavigate 
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const periodRef = useRef(null);
  const moreRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  /**
   * A missing figure is stated as missing. The previous fallback offered net
   * profit of $1,393 and a trend of "Up 673% from prior month" -- a comparison
   * against a period this app holds no data for at all.
   */
  const data = pnlData || {
    period: 'This period',
    title: 'PROFIT & LOSS',
    subtitle: 'Nothing recorded for this period yet',
    amount: '\u20b90.00',
    marginBadge: '\u2014',
    trendText: 'No earlier period to compare',
    trendDirection: 'up',
    income: { amount: '\u20b90.00', label: 'Income', bookedPercent: 100, unreviewedPercent: 0, reviewText: 'Nothing to review' },
    expenses: { amount: '\u20b90.00', label: 'Expenses', bookedPercent: 100, unreviewedPercent: 0, reviewText: 'Nothing to review' },
    footerLink: 'Add a transaction'
  };

  const periodOptions = ['This Month', 'Last Month', 'This Quarter', 'This Year', 'Last Year'];
  const activePeriod = selectedPeriod || data.period;

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
            PROFIT & LOSS
          </h3>
          {/* Period selector dropdown */}
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => { setShowPeriodMenu(!showPeriodMenu); setShowMoreMenu(false); }}
              className="flex items-center space-x-1 text-[13px] text-[#393A3D] hover:text-[#0077C5] cursor-pointer"
            >
              <span>{activePeriod}</span>
              <ChevronDown size={14} />
            </button>
            {showPeriodMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-[#D5D8DC] rounded-[6px] shadow-lg z-50 py-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setSelectedPeriod(opt); setShowPeriodMenu(false); }}
                    className="px-3 py-2 text-[13px] text-[#393A3D] hover:bg-[#F0F1F3] cursor-pointer w-full text-left flex items-center justify-between"
                  >
                    <span>{opt}</span>
                    {activePeriod === opt && <Check size={14} className="text-[#2CA01C]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subtitle & Net Profit */}
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
                Net profit = Total income minus total expenses.
              </div>
            )}
          </div>
          <span className="px-2 py-0.5 bg-[#F0F1F3] text-[#393A3D] text-[12px] font-medium rounded-full">
            {data.marginBadge}
          </span>
        </div>

        {/* Trend Indicator */}
        <div className="flex items-center space-x-1 text-[#108000] text-[13px] font-medium mb-6">
          <ArrowUp size={14} className="stroke-[2.5]" />
          <span>{data.trendText}</span>
        </div>

        {/* Income & Expenses Bars */}
        <div className="space-y-4">
          {/* Income Row */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline space-x-2">
                <span className="text-[16px] font-semibold text-[#393A3D]">
                  {formatAmount(data.income.amount)}
                </span>
                <span className="text-[13px] text-[#6B6C72]">
                  {data.income.label}
                </span>
              </div>
              <button 
                onClick={() => onNavigate && onNavigate('sales_transactions')}
                className="text-[13px] text-[#0077C5] hover:underline font-medium cursor-pointer"
              >
                {data.income.reviewText}
              </button>
            </div>
            
            <div className="w-full h-[18px] rounded-[3px] overflow-hidden flex border border-[#D5D8DC]">
              <div 
                className="h-full bg-[#2CA01C]" 
                style={{ width: `${data.income.bookedPercent}%` }}
                title={`Booked: ${data.income.bookedPercent}%`}
              />
              <div 
                className="h-full hatched-green-stripes" 
                style={{ width: `${data.income.unreviewedPercent}%` }}
                title={`To review: ${data.income.unreviewedPercent}%`}
              />
            </div>
          </div>

          {/* Expenses Row */}
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="flex items-baseline space-x-2">
                <span className="text-[16px] font-semibold text-[#393A3D]">
                  {formatAmount(data.expenses.amount)}
                </span>
                <span className="text-[13px] text-[#6B6C72]">
                  {data.expenses.label}
                </span>
              </div>
              <button 
                onClick={() => onNavigate && onNavigate('expense_transactions')}
                className="text-[13px] text-[#0077C5] hover:underline font-medium cursor-pointer"
              >
                {data.expenses.reviewText}
              </button>
            </div>

            <div className="w-full h-[18px] rounded-[3px] overflow-hidden flex border border-[#D5D8DC]">
              <div 
                className="h-full bg-[#00897B]" 
                style={{ width: `${data.expenses.bookedPercent}%` }}
                title={`Booked: ${data.expenses.bookedPercent}%`}
              />
              <div 
                className="h-full hatched-teal-stripes" 
                style={{ width: `${data.expenses.unreviewedPercent}%` }}
                title={`To review: ${data.expenses.unreviewedPercent}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 flex items-center justify-between border-t border-transparent">
        <button 
          onClick={() => onNavigate && onNavigate('bank_transactions')}
          className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer"
        >
          {data.footerLink}
        </button>

        {/* More menu dropdown */}
        <div className="relative" ref={moreRef}>
          <button
            onClick={() => { setShowMoreMenu(!showMoreMenu); setShowPeriodMenu(false); }}
            className="text-[#6B6C72] hover:text-[#393A3D] p-1 cursor-pointer"
          >
            <MoreVertical size={18} />
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-[#D5D8DC] rounded-[6px] shadow-lg z-50 py-1">
              <button
                onClick={() => { onNavigate && onNavigate('report_profit_loss'); setShowMoreMenu(false); }}
                className="px-3 py-2 text-[13px] text-[#393A3D] hover:bg-[#F0F1F3] cursor-pointer w-full text-left"
              >
                See full report
              </button>
              <button
                onClick={() => { onNavigate && onNavigate('standard_reports'); setShowMoreMenu(false); }}
                className="px-3 py-2 text-[13px] text-[#393A3D] hover:bg-[#F0F1F3] cursor-pointer w-full text-left"
              >
                View all financial reports
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
