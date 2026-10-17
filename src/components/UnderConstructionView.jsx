import React from 'react';
import { 
  Hammer, 
  Clock, 
  ArrowLeft, 
  LayoutDashboard, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  Layers 
} from 'lucide-react';

export default function UnderConstructionView({ feature = 'This Module', onNavigate, onBack }) {
  const handleBack = () => {
    if (onBack) return onBack();
    if (onNavigate) return onNavigate('dashboard');
    window.location.hash = '#/dashboard';
  };

  const activeModules = [
    { id: 'bank_transactions', label: 'Bank Transactions', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
    { id: 'expense_transactions', label: 'Expense Transactions', iconUrl: '/app-icons/expenses.png', category: 'Expenses' },
    { id: 'sales_transactions', label: 'Invoices & Sales', iconUrl: '/app-icons/sales.png', category: 'Sales' },
    { id: 'standard_reports', label: 'Financial Reports', iconUrl: '/app-icons/reports.jpg', category: 'Reports' },
    { id: 'sales_tax', label: 'GST Returns', iconUrl: '/app-icons/gst.jpg', category: 'Tax' },
    { id: 'chart_of_accounts', label: 'Chart of Accounts', iconUrl: '/app-icons/accounting.png', category: 'Accounting' },
  ];

  return (
    <div className="flex-1 w-full bg-[#f8fafc] flex flex-col items-center justify-center p-6 min-h-[calc(100vh-52px)] select-none">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-gray-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.06)] p-8 sm:p-10 text-center relative overflow-hidden animate-in fade-in duration-200">
        
        {/* Decorative top accent line */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#008927] via-cyan-500 to-blue-600" />
        
        {/* Badge & Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-xs mb-5">
          <Hammer size={30} className="stroke-[1.8]" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/60 text-amber-800 text-[11px] font-semibold tracking-wide uppercase mb-3">
          <Clock size={12} />
          <span>Work In Progress</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">
          {feature ? `${feature} is Under Construction` : 'Under Construction'}
        </h1>

        <p className="text-base sm:text-[17px] font-medium text-gray-700 max-w-md mx-auto mb-6">
          It is under construction and will be soon available.
        </p>

        <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto mb-8 leading-relaxed">
          Our engineering team is actively building this module to meet Indian statutory compliance and enterprise ERP standards.
        </p>

        {/* Action Button */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#008927] hover:bg-[#00701F] text-white font-semibold text-sm shadow-sm transition cursor-pointer active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </div>

        {/* Quick jump to live active modules */}
        <div className="border-t border-gray-100 pt-6 text-left">
          <div className="text-[11.5px] font-semibold text-gray-500 uppercase tracking-wider mb-3 text-center">
            Or continue in one of our active working modules
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {activeModules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => {
                  if (onNavigate) onNavigate(mod.id);
                  else window.location.hash = `#/${mod.id}`;
                }}
                className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200/70 hover:border-emerald-500 hover:bg-emerald-50/40 transition group cursor-pointer text-left"
              >
                <img 
                  src={mod.iconUrl} 
                  alt={mod.label} 
                  className="w-6 h-6 rounded-full object-cover shrink-0 shadow-xs border border-black/10 group-hover:scale-105 transition" 
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-gray-800 truncate group-hover:text-emerald-700">
                    {mod.label}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {mod.category}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
