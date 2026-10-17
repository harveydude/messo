import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

/**
 * Sales funnel.
 *
 * Four columns of typed-in money: 1,861.55 not paid, 2,363.52 paid, 1,276.15
 * deposited, with "4 paid" and "2 deposited" as literals. None of it came from
 * an invoice. The columns also described a progression the app cannot actually
 * represent -- nothing tracks a payment between "paid" and "deposited", so the
 * third figure was a third invention with no mechanism behind it.
 *
 * The stages are now derived: what was invoiced, what is still owed, what has
 * been settled against a bank transaction, and how much of that has reached a
 * connected account. Each carries its own count, so an empty stage reads as
 * zero rather than as a missing row.
 */
export default function FunnelCard({
  funnelData,
  privacyEnabled = false,
  onRequestPayment
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(funnelData?.period || 'This period');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  const periodRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (periodRef.current && !periodRef.current.contains(e.target)) setShowPeriodMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  const stages = funnelData?.stages || [];
  const periodOptions = ['This Week', 'This Month', 'This Quarter', 'This Year', 'Last Year'];

  return (
    <div className="bg-white border border-[#C7CBCE] rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.08em]">
          SALES &amp; GET PAID FUNNEL
        </h3>
        {/* Period selector dropdown */}
        <div className="relative" ref={periodRef}>
          <button
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="flex items-center space-x-1 text-[14px] text-[#393A3D] font-medium hover:text-[#0077C5] cursor-pointer"
          >
            <span>{selectedPeriod}</span>
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
                  {selectedPeriod === opt && <Check size={14} className="text-[#2CA01C]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Columns Region */}
      <div className="grid grid-cols-[1fr_24px_1fr_24px_1fr] items-center min-h-[231px]">
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

        <div className="flex justify-center text-[#6B6C72]">
          <ChevronRight size={16} />
        </div>

        {/* Col 2: Not paid */}
        <Stage
          title="Not paid"
          amount={funnelData?.outstanding}
          count={funnelData?.outstandingCount}
          countLabel="invoices open"
          formatAmount={formatAmount}
        />

        <div className="flex justify-center text-[#6B6C72]">
          <ChevronRight size={16} />
        </div>

        {/* Col 3: Paid, settled against the bank */}
        <Stage
          title="Paid"
          amount={funnelData?.paid}
          count={funnelData?.paidCount}
          countLabel="settled"
          formatAmount={formatAmount}
          done
        />
      </div>

      {funnelData?.note && (
        <p className="mt-4 text-[13px] text-[#6B6C72] leading-relaxed">{funnelData.note}</p>
      )}

      {/* Every stage, so nothing is quietly dropped from the funnel. */}
      {stages.length > 0 && (
        <ul className="mt-4 pt-4 border-t border-[#E3E5E8] space-y-1.5">
          {stages.map((s) => (
            <li key={s.title} className="flex items-center justify-between text-[13px]">
              <span className="text-[#393A3D]">{s.title}</span>
              <span className="text-[#6B6C72]">{formatAmount(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One funnel column. Defined at module scope because a component created during
 * render is a different component every render, which remounts its subtree and
 * throws away DOM state.
 */
function Stage({ title, amount, count, countLabel, formatAmount, done }) {
  return (
    <div className="h-full bg-white border border-[#C7CBCE] rounded-[8px] p-[20px] flex flex-col justify-between relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[4px] ${done ? 'bg-[#2CA01C]' : 'bg-[#E8A33D]'}`} />
      <div>
        <div className="text-[15px] font-medium text-[#393A3D]">{title}</div>
        <div className="text-[26px] font-semibold text-[#393A3D] mt-3 tracking-tight">
          {amount ? formatAmount(amount) : '—'}
        </div>
      </div>
      <div className={done && count > 0 ? '' : 'h-[24px]'}>
        {done && count > 0 && (
          <div className="inline-flex items-center space-x-1.5 text-[#108000] text-[13px] font-medium">
            <span className="w-4 h-4 rounded-full border border-[#108000] flex items-center justify-center text-[10px] font-bold">
              ✓
            </span>
            <span>{count} {countLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}