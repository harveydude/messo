import React, { useState, useEffect, useRef } from 'react';
import StandardReportsHub from './StandardReportsHub';
import ProfitLossReportView from './ProfitLossReportView';
import BalanceSheetReportView from './BalanceSheetReportView';
import CashFlowReportView from './CashFlowReportView';
import BankTransactionsView from './BankTransactionsView';
import ConnectAccountModal from './ConnectAccountModal';
import CustomizeAppMenusModal from './CustomizeAppMenusModal';
import { Layers, MousePointer, Eye, ArrowDown, ChevronRight, LayoutList } from 'lucide-react';

export default function ReportsView({ onNavigate, initialReport = null }) {
  // Current active single view ('hub', 'pnl', 'balance_sheet', 'cash_flows', 'banking', 'connect_bank', 'customize_menus')
  const [activeReport, setActiveReport] = useState(() => {
    if (initialReport === 'Profit and Loss') return 'pnl';
    if (initialReport === 'Balance Sheet') return 'balance_sheet';
    if (initialReport === 'Statement of Cash Flows') return 'cash_flows';
    return 'hub';
  });

  // View Mode: 'continuous' (connected long scrollable page of all 8 frames) or 'interactive' (standard Meso clickable flow)
  const [viewMode, setViewMode] = useState('continuous');

  // Refs for smooth scrolling across all 8 connected frames
  const frame1Ref = useRef(null);
  const frame2Ref = useRef(null);
  const frame3Ref = useRef(null);
  const frame4Ref = useRef(null);
  const frame5Ref = useRef(null);
  const frame6Ref = useRef(null);
  const frame7Ref = useRef(null);
  const frame8Ref = useRef(null);

  const scrollToFrame = (ref) => {
    if (viewMode !== 'continuous') {
      setViewMode('continuous');
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectReport = (name) => {
    if (name === 'Profit and Loss') {
      if (viewMode === 'continuous') {
        frame2Ref.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveReport('pnl');
      }
    } else if (name === 'Balance Sheet') {
      if (viewMode === 'continuous') {
        frame3Ref.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveReport('balance_sheet');
      }
    } else if (name === 'Statement of Cash Flows') {
      if (viewMode === 'continuous') {
        frame4Ref.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveReport('cash_flows');
      }
    } else {
      if (viewMode === 'continuous') {
        frame2Ref.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveReport('pnl');
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f4f5f8] flex flex-col">
      {/* Connected Flow / Mode Switcher Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            View Experience:
          </span>

          <div className="inline-flex rounded-full border border-gray-300 p-0.5 bg-gray-50 text-xs">
            <button
              onClick={() => setViewMode('continuous')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'continuous' 
                  ? 'bg-[#393a3d] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers size={13} />
              <span>Connected Long Page (All 8 Frames Scrollable)</span>
            </button>
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1 rounded-full font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                viewMode === 'interactive' 
                  ? 'bg-[#393a3d] text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MousePointer size={13} />
              <span>Standard Click Navigation</span>
            </button>
          </div>
        </div>

        {/* Quick Frame Anchors for smooth sliding/scrolling across all 8 frames */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-600 overflow-x-auto py-1">
          <span className="text-[11px] text-gray-400 font-medium mr-1">Jump to Frame:</span>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('hub');
              else scrollToFrame(frame1Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            1. Reports Hub
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('pnl');
              else scrollToFrame(frame2Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            2. Profit & Loss
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('balance_sheet');
              else scrollToFrame(frame3Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            3. Balance Sheet
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('cash_flows');
              else scrollToFrame(frame4Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            4. Cash Flows
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('banking');
              else scrollToFrame(frame5Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            5. Bank Accounts
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('banking');
              else scrollToFrame(frame6Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            6. Bank Table
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('connect_bank');
              else scrollToFrame(frame7Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            7. Bank Registration
          </button>
          <button
            onClick={() => {
              if (viewMode !== 'continuous') setActiveReport('customize_menus');
              else scrollToFrame(frame8Ref);
            }}
            className="px-2.5 py-1 bg-white hover:bg-gray-100 border border-gray-200 rounded text-gray-800 font-medium transition cursor-pointer whitespace-nowrap"
          >
            8. Customize Menus
          </button>
        </div>
      </header>

      {/* CONTINUOUS LONG PAGE VIEW MODE */}
      {viewMode === 'continuous' ? (
        <div className="flex-1 w-full space-y-12">
          {/* Frame 1: Standard Reports Hub */}
          <section ref={frame1Ref} className="scroll-mt-14 relative">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <span>Frame 1: Standard Reports Hub</span>
              <span className="text-gray-500 font-normal lowercase">Click any report below or scroll down</span>
            </div>
            <StandardReportsHub 
              onSelectReport={handleSelectReport}
              onNavigateSub={(sub) => onNavigate?.(sub)}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#0077c5] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Standard Reports Hub ➔ Profit & Loss Statement (in ₹)</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame2Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Profit & Loss</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 2: Profit and Loss Report (Screenshot 1) */}
          <section ref={frame2Ref} className="scroll-mt-14 relative border-t border-gray-300">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <span>Frame 2: Profit and Loss Report (in ₹)</span>
              <button 
                onClick={() => scrollToFrame(frame1Ref)} 
                className="text-[#0077c5] hover:underline font-semibold capitalize cursor-pointer"
              >
                ↑ Back to standard reports hub
              </button>
            </div>
            <ProfitLossReportView 
              isEmbedded={true}
              onBack={() => scrollToFrame(frame1Ref)}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#107c41] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Profit & Loss ➔ Balance Sheet Report (in ₹)</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame3Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Balance Sheet</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 3: Balance Sheet Report (Screenshot 3) */}
          <section ref={frame3Ref} className="scroll-mt-14 relative border-t border-gray-300">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <span>Frame 3: Balance Sheet Report (in ₹)</span>
              <button 
                onClick={() => scrollToFrame(frame1Ref)} 
                className="text-[#0077c5] hover:underline font-semibold capitalize cursor-pointer"
              >
                ↑ Back to standard reports hub
              </button>
            </div>
            <BalanceSheetReportView 
              isEmbedded={true}
              onBack={() => scrollToFrame(frame1Ref)}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#393a3d] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Balance Sheet ➔ Statement of Cash Flows (in ₹)</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame4Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Statement of Cash Flows</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 4: Statement of Cash Flows (Screenshot 4) */}
          <section ref={frame4Ref} className="scroll-mt-14 relative border-t border-gray-300">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <span>Frame 4: Statement of Cash Flows (in ₹)</span>
              <button 
                onClick={() => scrollToFrame(frame1Ref)} 
                className="text-[#0077c5] hover:underline font-semibold capitalize cursor-pointer"
              >
                ↑ Back to standard reports hub
              </button>
            </div>
            <CashFlowReportView 
              isEmbedded={true}
              onBack={() => scrollToFrame(frame1Ref)}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#0077c5] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Cash Flows & My Apps &gt; Accounting ➔ Bank Transactions Page</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame5Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Bank Transactions</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 5: Bank Transactions Cards & Overview (Screenshot af6fd77e) */}
          <section ref={frame5Ref} className="scroll-mt-14 relative border-t border-gray-300">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider">
              <span>Frame 5: Bank Transactions — Account Cards & Overview (in ₹)</span>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => scrollToFrame(frame6Ref)} 
                  className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                >
                  Jump to Table ↓
                </button>
                <button 
                  onClick={() => scrollToFrame(frame1Ref)} 
                  className="text-gray-600 hover:underline font-semibold cursor-pointer"
                >
                  ↑ Top
                </button>
              </div>
            </div>
            <BankTransactionsView 
              isEmbedded={true}
              onNavigate={onNavigate}
              tableRef={frame6Ref}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#2ca01c] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Bank Transactions ➔ Indian Bank Account Registration Flow</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame7Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Bank Registration</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 7: Indian Bank Registration Flow (Screenshot 750adeea) */}
          <section ref={frame7Ref} className="scroll-mt-14 relative border-t border-gray-300 py-4 bg-[#f4f5f8]">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-4">
              <span>Frame 7: Indian Bank Account Registration Flow (Connect an Account)</span>
              <button 
                onClick={() => scrollToFrame(frame5Ref)} 
                className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
              >
                ↑ Back to Bank Transactions
              </button>
            </div>
            <ConnectAccountModal
              isOpen={true}
              isEmbedded={true}
              onClose={() => scrollToFrame(frame5Ref)}
              onAccountConnected={(bank) => {
                alert(`Account registered: ${bank.name} is now connected to Meso feeds!`);
                scrollToFrame(frame5Ref);
              }}
            />
          </section>

          {/* Smooth Divider Banner */}
          <div className="px-6 py-3 bg-[#393a3d] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs uppercase tracking-wider">Connected Flow:</span>
              <span className="text-xs">From Bank Registration ➔ Customize App Menus & Reorder Navigation</span>
            </div>
            <button 
              onClick={() => scrollToFrame(frame8Ref)}
              className="flex items-center space-x-1 text-xs underline font-semibold cursor-pointer"
            >
              <span>Scroll to Customize Menus</span>
              <ArrowDown size={14} />
            </button>
          </div>

          {/* Frame 8: Customize App Menus (Screenshot 8f5a941a) */}
          <section ref={frame8Ref} className="scroll-mt-14 relative border-t border-gray-300 py-4 bg-[#f4f5f8]">
            <div className="bg-gray-200/80 px-6 py-1.5 border-b border-gray-300 flex items-center justify-between text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-4">
              <span>Frame 8: Customize App Menus (Reorder & Pin Apps)</span>
              <button 
                onClick={() => scrollToFrame(frame1Ref)} 
                className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
              >
                ↑ Back to Top
              </button>
            </div>
            <CustomizeAppMenusModal
              isOpen={true}
              isEmbedded={true}
              onClose={() => scrollToFrame(frame1Ref)}
              onSave={(apps) => {
                alert("App menu preferences saved successfully in Meso!");
              }}
            />
          </section>
        </div>
      ) : (
        /* STANDARD INTERACTIVE VIEW MODE */
        <div className="flex-1 w-full">
          {activeReport === 'hub' && (
            <StandardReportsHub 
              onSelectReport={handleSelectReport}
              onNavigateSub={(sub) => onNavigate?.(sub)}
            />
          )}

          {activeReport === 'pnl' && (
            <ProfitLossReportView 
              onBack={() => setActiveReport('hub')}
            />
          )}

          {activeReport === 'balance_sheet' && (
            <BalanceSheetReportView 
              onBack={() => setActiveReport('hub')}
            />
          )}

          {activeReport === 'cash_flows' && (
            <CashFlowReportView 
              onBack={() => setActiveReport('hub')}
            />
          )}

          {activeReport === 'banking' && (
            <BankTransactionsView 
              onNavigate={onNavigate}
            />
          )}

          {activeReport === 'connect_bank' && (
            <div className="py-8 bg-[#f4f5f8] min-h-screen">
              <ConnectAccountModal
                isOpen={true}
                isEmbedded={true}
                onClose={() => setActiveReport('banking')}
                onAccountConnected={() => setActiveReport('banking')}
              />
            </div>
          )}

          {activeReport === 'customize_menus' && (
            <div className="py-8 bg-[#f4f5f8] min-h-screen">
              <CustomizeAppMenusModal
                isOpen={true}
                isEmbedded={true}
                onClose={() => setActiveReport('hub')}
                onSave={() => setActiveReport('hub')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}