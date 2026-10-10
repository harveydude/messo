import React from 'react';
import { X, Sparkles, Check, Info } from 'lucide-react';

export default function AddWidgetsDrawer({ 
  isOpen, 
  onClose, 
  activeWidgets = {}, 
  onToggleWidget 
}) {
  if (!isOpen) return null;

  const smartSuggestionsList = [
    { id: 'sales', label: 'Sales' },
    { id: 'ar', label: 'Accounts receivable' }
  ];

  const allWidgetsList = [
    { id: 'ap', label: 'Accounts Payable' },
    { id: 'ar', label: 'Accounts receivable' },
    { id: 'bank', label: 'Bank Accounts' },
    { id: 'cashflow', label: 'Cash flow' },
    { id: 'deposits', label: 'Deposits' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'mileage', label: 'Mileage' },
    { id: 'integrations', label: 'My Integrations' },
    { id: 'pnl', label: 'Profit & loss' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'sales', label: 'Sales' },
    { id: 'funnel', label: 'Sales & Get Paid Funnel' },
    { id: 'smart', label: 'Smart suggestions', hasInfo: true }
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[425px] bg-white shadow-[-6px_0_24px_rgba(0,0,0,0.12)] z-50 flex flex-col border-l border-[#D5D8DC] animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="h-[56px] px-6 border-b border-[#E3E5E8] flex items-center justify-between flex-shrink-0">
        <div className="w-6" /> {/* spacer for center alignment */}
        <h2 className="text-[18px] font-semibold text-[#393A3D]">
          Add widgets
        </h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center text-[#393A3D] cursor-pointer transition"
          title="Close drawer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Main Title */}
        <h3 className="text-[20px] font-semibold text-[#393A3D] mb-5">
          Select widgets for your dashboard
        </h3>

        {/* Smart Suggestions Section */}
        <div className="mb-5">
          <div className="flex items-center space-x-1.5 text-[14px] font-semibold text-[#393A3D] mb-3">
            <Sparkles size={16} className="text-[#393A3D]" />
            <span>Smart suggestions</span>
          </div>

          <div className="space-y-1">
            {smartSuggestionsList.map((item) => {
              const isChecked = !!activeWidgets[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => onToggleWidget && onToggleWidget(item.id)}
                  className="flex items-center space-x-3.5 h-[42px] px-2 rounded-[4px] hover:bg-[#F6F7F8] cursor-pointer transition select-none"
                >
                  <div
                    className={`w-[20px] h-[20px] rounded-[4px] flex items-center justify-center transition ${
                      isChecked
                        ? 'bg-[#2CA01C] border border-[#2CA01C] text-white'
                        : 'border-[1.5px] border-[#9DA2A8] bg-white'
                    }`}
                  >
                    {isChecked && <Check size={14} strokeWidth={3} />}
                  </div>
                  <span className="text-[15px] text-[#393A3D] font-normal">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-[#E3E5E8] my-4" />

        {/* All Widgets Section */}
        <div>
          <div className="text-[14px] font-semibold text-[#393A3D] mb-3">
            All widgets
          </div>

          <div className="space-y-1">
            {allWidgetsList.map((item) => {
              const isChecked = !!activeWidgets[item.id];
              return (
                <div
                  key={item.id}
                  onClick={() => onToggleWidget && onToggleWidget(item.id)}
                  className="flex items-center justify-between h-[42px] px-2 rounded-[4px] hover:bg-[#F6F7F8] cursor-pointer transition select-none group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div
                      className={`w-[20px] h-[20px] rounded-[4px] flex items-center justify-center transition ${
                        isChecked
                          ? 'bg-[#2CA01C] border border-[#2CA01C] text-white'
                          : 'border-[1.5px] border-[#9DA2A8] bg-white'
                      }`}
                    >
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                    <span className="text-[15px] text-[#393A3D] font-normal">
                      {item.label}
                    </span>
                  </div>

                  {item.hasInfo && (
                    <span className="text-[#6B6C72] pr-1">
                      <Info size={16} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
