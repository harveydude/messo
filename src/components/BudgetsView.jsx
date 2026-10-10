import React from 'react';
import { PlayCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export default function BudgetsView({ onOpenBudgetModal }) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10">
        {/* Left description */}
        <div className="space-y-6 max-w-lg">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Plan better with budgets
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              Manage all your profit and loss and balance sheet budgets in one place.
            </p>
            <button className="flex items-center space-x-1.5 text-xs text-[#0077c5] hover:underline font-semibold mt-2">
              <PlayCircle size={15} />
              <span>See how it works (4:12)</span>
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-2.5 text-xs text-gray-700">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
              <span>Use the latest data available in QuickBooks to make budgets.</span>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-gray-700">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
              <span>See if you're on track by comparing actual performance with budgeted numbers.</span>
            </div>
            <div className="flex items-start space-x-2.5 text-xs text-gray-700">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-1.5 shrink-0" />
              <span>Bring in profit and loss budgets created elsewhere into QuickBooks.</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 pt-2">
            <button 
              onClick={onOpenBudgetModal}
              className="px-6 py-2.5 bg-[#2ca01c] hover:bg-green-700 text-white font-bold text-xs rounded-full shadow-xs transition"
            >
              Create budget
            </button>
            <button className="text-xs font-semibold text-[#0077c5] hover:underline">
              Import budget
            </button>
          </div>
        </div>

        {/* Right Illustration */}
        <div className="w-72 h-64 bg-gradient-to-tr from-emerald-50 to-teal-50 rounded-2xl flex items-center justify-center p-6 border border-emerald-100 shadow-inner">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-full bg-white shadow-md flex items-center justify-center text-[#2ca01c]">
              <TrendingUp size={40} />
            </div>
            <div className="text-xs font-bold text-gray-800">Forecast with confidence</div>
            <div className="text-[11px] text-gray-500">Live P&L analytics sync</div>
          </div>
        </div>
      </div>
    </div>
  );
}
