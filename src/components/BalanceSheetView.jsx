import React from 'react';
import BalanceSheetReportView from './BalanceSheetReportView';

export default function BalanceSheetView({ onBack }) {
  return (
    <BalanceSheetReportView 
      onBack={onBack ? onBack : () => { window.location.hash = '#/reports'; }} 
    />
  );
}