import React, { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';

export default function CashFlowCard({ 
  cashflowData, 
  privacyEnabled = false,
  onNavigate 
}) {
  const [activeTab, setActiveTab] = useState('Cash balance');
  const [period] = useState('12 months');

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  const amount = cashflowData?.amount || "-$3,422";
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];

  // SVG Chart Dimensions
  const svgWidth = 720;
  const svgHeight = 160;
  const paddingLeft = 45;
  const paddingRight = 20;
  const chartWidth = svgWidth - paddingLeft - paddingRight;
  
  // Y-axis: $1K is at top (y=15), $0 is at y=42, -$4K is at bottom (y=150)
  // Range from +$1,000 to -$4,000 (total span 5,000)
  // Mapping: y = 42 + (value / -4000) * (150 - 42) for negative values
  // For $1K: y = 42 - (1000/4000) * (108) = 15
  const getY = (val) => {
    if (val >= 0) {
      return 42 - (val / 1000) * 27; // $0 -> 42, $1000 -> 15
    }
    return 42 + (-val / 4000) * 108; // -$4000 -> 150
  };

  // Month coordinates: 12 months evenly spaced
  const getX = (index) => paddingLeft + (index / 11) * chartWidth;

  const y1K = getY(1000);   // ~15
  const y0 = getY(0);       // ~42
  const yNeg1K = getY(-1000); // ~69
  const yNeg2K = getY(-2000); // ~96
  const yNeg3K = getY(-3000); // ~123
  const yNeg4K = getY(-4000); // ~150

  // Points along the curve
  // JAN(0) to AUG(7): at $0 (y=42)
  // SEP(8): drops to -$2500 then -$3422 (y=134.4)
  // OCT(9): -$3422 (y=134.4)
  // NOV(10) to DEC(11): -$3422 (y=134.4) projected
  const xAug = getX(7);
  const xSep = getX(8);
  const xOct = getX(9);
  const xDec = getX(11);
  const yNeg3422 = getY(-3422);

  // Stepped path coordinates matching screenshot:
  // Aug 15 -> drop begins
  const xDropStart = xAug + (xSep - xAug) * 0.45;
  const xDropMid = xAug + (xSep - xAug) * 0.75;

  // Solid line up to Oct (Present)
  const solidLinePath = `
    M ${getX(0)},${y0}
    L ${xDropStart},${y0}
    L ${xDropStart},${getY(-1200)}
    L ${xDropMid},${getY(-2500)}
    L ${xDropMid},${yNeg3422}
    L ${xOct},${yNeg3422}
  `;

  // Projected line from Oct to Dec
  const projectedLinePath = `
    M ${xOct},${yNeg3422}
    L ${xDec},${yNeg3422}
  `;

  // Pink negative area fill (between y0 and curve from drop to Dec)
  const negativeAreaPath = `
    M ${xDropStart},${y0}
    L ${xDropStart},${getY(-1200)}
    L ${xDropMid},${getY(-2500)}
    L ${xDropMid},${yNeg3422}
    L ${xDec},${yNeg3422}
    L ${xDec},${y0}
    Z
  `;

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      <div>
        {/* Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
            CASH FLOW TREND
          </h3>

          <div className="flex items-center space-x-4">
            {/* Legend */}
            <div className="hidden sm:flex items-center space-x-3 text-[12px] text-[#6B6C72]">
              <span className="flex items-center space-x-1">
                <span>Cash balance</span>
                <span className="w-3.5 h-[2px] bg-[#2CA01C] inline-block" />
              </span>
              <span className="flex items-center space-x-1">
                <span>Future</span>
                <span className="w-4 border-b-2 border-dotted border-[#2CA01C] inline-block" />
              </span>
            </div>

            {/* Segmented Control */}
            <div className="flex items-center bg-[#F4F5F7] p-0.5 rounded-[6px] border border-[#D5D8DC]">
              <button
                onClick={() => setActiveTab('Money in/out')}
                className={`px-3 py-1 text-[12px] font-medium rounded-[4px] transition cursor-pointer ${
                  activeTab === 'Money in/out'
                    ? 'bg-[#393A3D] text-white shadow-xs'
                    : 'text-[#393A3D] hover:text-black'
                }`}
              >
                Money in/out
              </button>
              <button
                onClick={() => setActiveTab('Cash balance')}
                className={`px-3 py-1 text-[12px] font-medium rounded-[4px] transition cursor-pointer ${
                  activeTab === 'Cash balance'
                    ? 'bg-[#393A3D] text-white shadow-xs'
                    : 'text-[#393A3D] hover:text-black'
                }`}
              >
                Cash balance
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown under controls on right & Big Amount on left */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-[28px] font-semibold text-[#393A3D] tracking-tight">
              {formatAmount(amount)}
            </span>
            <button 
              onClick={() => onNavigate && onNavigate('bank_transactions')}
              className="text-[#393A3D] hover:text-[#0077C5] p-1 cursor-pointer"
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <button className="flex items-center space-x-1 text-[13px] text-[#393A3D] hover:text-[#0077C5] cursor-pointer">
            <span>{period}</span>
            <ChevronDown size={14} />
          </button>
        </div>

        {/* Chart Canvas */}
        <div className="w-full overflow-x-auto">
          <div className="min-w-[620px]">
            <svg 
              viewBox={`0 0 ${svgWidth} ${svgHeight + 25}`} 
              className="w-full h-[180px] overflow-visible"
            >
              {/* Horizontal Grid lines and Y-axis labels */}
              {[
                { label: '$1K', y: y1K },
                { label: '$0', y: y0, isZero: true },
                { label: '-$1K', y: yNeg1K },
                { label: '-$2K', y: yNeg2K },
                { label: '-$3K', y: yNeg3K },
                { label: '-$4K', y: yNeg4K },
              ].map((tick, i) => (
                <g key={i}>
                  <text 
                    x={paddingLeft - 8} 
                    y={tick.y + 4} 
                    textAnchor="end" 
                    className="text-[11px] fill-[#6B6C72] font-sans"
                  >
                    {tick.label}
                  </text>
                  <line 
                    x1={paddingLeft} 
                    y1={tick.y} 
                    x2={svgWidth - paddingRight} 
                    y2={tick.y} 
                    stroke={tick.isZero ? "#B5B8BD" : "#E8EAED"} 
                    strokeWidth={tick.isZero ? "1.2" : "1"} 
                  />
                </g>
              ))}

              {/* Pink negative cash balance area fill */}
              <path
                d={negativeAreaPath}
                fill="#FCDAD7"
                fillOpacity="0.8"
              />

              {/* Thin vertical guideline separating historical vs future projection */}
              <line
                x1={xOct}
                y1={y0}
                x2={xOct}
                y2={svgHeight}
                stroke="#B5B8BD"
                strokeWidth="1"
              />

              {/* Solid Green line (Historical) */}
              <path
                d={solidLinePath}
                fill="none"
                stroke="#2CA01C"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Dotted Green line (Projected) */}
              <path
                d={projectedLinePath}
                fill="none"
                stroke="#2CA01C"
                strokeWidth="2.5"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />

              {/* X-axis Month Labels */}
              {months.map((m, idx) => (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={svgHeight + 18}
                  textAnchor="middle"
                  className="text-[11px] fill-[#6B6C72] font-medium font-sans"
                >
                  {m}
                </text>
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
