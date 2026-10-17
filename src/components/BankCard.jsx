import React, { useState, useRef, useEffect } from 'react';
import { CreditCard, ChevronDown, Settings, MoreVertical } from 'lucide-react';

/**
 * Bank accounts.
 *
 * This card was three hardcoded blocks: Checking showing -3,621.93 against
 * 1,201.00 "in Meso", Mastercard 304.96 against 157.72, and "25 to
 * review" as a literal. None of it moved when anything happened, and it named
 * a Mastercard account that the app's own bank feed does not even contain.
 *
 * It now renders whatever accounts exist. The bank figure is the institution's
 * -- passed in, because this app does not connect to a bank. The "in the books"
 * figure is the ledger's, and the review count is the real queue length.
 *
 * With no accounts it says so rather than showing a fabricated one.
 */
export default function BankCard({
  bankData,
  privacyEnabled = false,
  onOpenRegisters
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatAmount = (val) => {
    if (privacyEnabled) return "••••••";
    return val;
  };

  const accounts = bankData?.accounts || [];

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
          <div className="text-[15px] text-[#393A3D]">Total in the books</div>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-[28px] font-semibold text-[#393A3D] tracking-tight">
              {formatAmount(bankData?.todaysBalance || '₹0.00')}
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
                  Bank balances are the institution's figures. The book figure moves
                  as you categorise; the gap is the review queue.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Rows */}
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-[14px] text-[#6B6C72] py-4">
              No bank accounts connected yet.
            </p>
          ) : (
            accounts.map((acct, i) => (
              <div key={acct.name} className="space-y-1">
                {i > 0 && <div className="w-full h-px bg-[#E3E5E8] my-3" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-[32px] h-[32px] rounded-full bg-[#0077C5] flex items-center justify-center text-white shadow-2xs">
                      <CreditCard size={16} />
                    </div>
                    <span className="text-[15px] font-semibold text-[#393A3D]">{acct.name}</span>
                  </div>
                </div>

                <div className="pl-[42px] space-y-0.5 text-[14px]">
                  <div className="flex justify-between text-[#393A3D]">
                    <span>Bank balance</span>
                    <span className="font-medium">{formatAmount(acct.bankBalance)}</span>
                  </div>
                  <div className="flex justify-between text-[#393A3D]">
                    <span>In the books</span>
                    <span className="font-medium">{formatAmount(acct.inBooks)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="text-[13px] text-[#6B6C72]">{acct.updated}</span>
                    <button
                      onClick={onOpenRegisters}
                      className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer"
                    >
                      {acct.reviewLink
                        ? acct.reviewLink
                        : acct.reviewList
                        ? `${acct.reviewList} to review`
                        : 'All caught up'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
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
          <button onClick={onOpenRegisters} className="hover:text-black p-1 cursor-pointer" title="Bank registers & accounts">
            <Settings size={20} />
          </button>
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="hover:text-black p-1 cursor-pointer"
              title="More options"
            >
              <MoreVertical size={20} />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-[#D5D8DC] rounded-[6px] shadow-lg z-50 py-1">
                <button
                  onClick={() => { onOpenRegisters && onOpenRegisters(); setShowMoreMenu(false); }}
                  className="px-3 py-2 text-[13px] text-[#393A3D] hover:bg-[#F0F1F3] cursor-pointer w-full text-left"
                >
                  Go to registers
                </button>
                <button
                  onClick={() => { onOpenRegisters && onOpenRegisters(); setShowMoreMenu(false); }}
                  className="px-3 py-2 text-[13px] text-[#393A3D] hover:bg-[#F0F1F3] cursor-pointer w-full text-left"
                >
                  View all accounts
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
