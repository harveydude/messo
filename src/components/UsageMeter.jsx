import React from 'react';
import { Info } from 'lucide-react';

/**
 * UsageMeter Component
 * Conforms to §53 of QuickBooks Online Spec (Part 11)
 *
 * @param {string} label - Meter label (e.g. "Billable Users", "Chart of accounts")
 * @param {number} used - Current usage count
 * @param {number} limit - Plan maximum limit
 * @param {string} unit - Unit description (e.g. "user(s)", "account(s)")
 * @param {string} href - Destination link for managing usage
 * @param {function} onClick - Optional click handler for navigation
 */
export default function UsageMeter({ label, used, limit, unit, href = '#', onClick }) {
  const percentage = Math.min(Math.round((used / limit) * 1000) / 10, 100);
  const isWarning = used / limit >= 0.9;

  return (
    <section className="usage-meter w-full max-w-[654px]" aria-label={`${label} usage meter`}>
      {/* Header: Label + Info Icon, and Right-aligned "N OF M" */}
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] font-semibold text-[#393A3D] flex items-center">
          <span>{label}</span>
          <button 
            type="button"
            className="text-[#6B6C72] hover:text-[#393A3D] ml-2 inline-flex items-center cursor-pointer transition-colors"
            title={`More info about ${label}`}
          >
            <Info size={16} />
          </button>
        </h3>
        <span className="count text-right tracking-wide select-none">
          <b className="text-[15px] font-bold text-[#393A3D]">{used}</b>
          <span className="text-[13px] font-semibold text-[#6B6C72] uppercase ml-1">OF {limit}</span>
        </span>
      </div>

      {/* Progress Bar: 654×10, radius 999, track #CDD0D4, fill charcoal #454A52 (or #C0392B if >= 90%) */}
      <div 
        className="w-full h-[10px] rounded-full bg-[#CDD0D4] my-[14px] overflow-hidden"
        role="progressbar" 
        aria-valuenow={used} 
        aria-valuemin={0} 
        aria-valuemax={limit} 
        aria-label={`${label}: ${used} of ${limit}`}
      >
        <div 
          className={`h-full rounded-full transition-all duration-300 ${isWarning ? 'bg-[#C0392B]' : 'bg-[#454A52]'}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Usage Unit Link & Limit description */}
      <div>
        <a 
          href={href}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick();
            }
          }}
          className="text-[14px] font-semibold text-[#0077C5] hover:underline cursor-pointer inline-block"
        >
          {used} {unit}
        </a>
        <p className="text-[15px] text-[#6B6C72] mt-1">
          The limit for your plan is {limit}.
        </p>
      </div>
    </section>
  );
}
