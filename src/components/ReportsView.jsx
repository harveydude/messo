import React, { useState } from 'react';
import StandardReportsHub from './StandardReportsHub';
import ProfitLossReportView from './ProfitLossReportView';
import BalanceSheetReportView from './BalanceSheetReportView';
import CashFlowReportView from './CashFlowReportView';
import BankTransactionsView from './BankTransactionsView';
import ConnectAccountModal from './ConnectAccountModal';
import CustomizeAppMenusModal from './CustomizeAppMenusModal';

export default function ReportsView({ onNavigate, initialReport = null }) {
  // Current active report view ('hub', 'pnl', 'balance_sheet', 'cash_flows', 'banking', 'connect_bank', 'customize_menus')
  const [activeReport, setActiveReport] = useState(() => {
    if (initialReport === 'Profit and Loss' || initialReport === 'pnl') return 'pnl';
    if (initialReport === 'Balance Sheet' || initialReport === 'balance_sheet') return 'balance_sheet';
    if (initialReport === 'Statement of Cash Flows' || initialReport === 'cash_flows') return 'cash_flows';
    return 'hub';
  });

  const handleSelectReport = (name) => {
    if (name === 'Profit and Loss' || name === 'pnl') {
      setActiveReport('pnl');
    } else if (name === 'Balance Sheet' || name === 'balance_sheet') {
      setActiveReport('balance_sheet');
    } else if (name === 'Statement of Cash Flows' || name === 'cash_flows') {
      setActiveReport('cash_flows');
    } else {
      setActiveReport('pnl');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f4f5f8] flex flex-col select-none font-sans">
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
    </div>
  );
}