import React from 'react';
import { Plus, LayoutGrid, HelpCircle } from 'lucide-react';

export default function AddWidgetsPlaceholderCard({ 
  onOpenDrawer, 
  onAddSuggestion,
  isEditing = false
}) {
  return (
    <div className={`bg-white rounded-[8px] p-[24px] shadow-[0_1px_2px_rgba(0,0,0,0.06)] flex flex-col justify-between items-center text-center h-full relative transition-colors ${
      isEditing 
        ? 'border-2 border-[#2CA01C]' 
        : 'border-2 border-dashed border-[#B9BDC1]'
    }`}>
      <div className="w-full flex flex-col items-center">
        {/* Title */}
        <h3 className="text-[18px] font-semibold text-[#393A3D] mb-4">
          Add widgets
        </h3>

        {/* Plus Button */}
        <button
          onClick={onOpenDrawer}
          className="w-[44px] h-[44px] rounded-full bg-[#E9EBED] hover:bg-[#DDE0E3] text-[#393A3D] flex items-center justify-center transition cursor-pointer shadow-2xs mb-5"
          title="Add widgets"
        >
          <Plus size={22} strokeWidth={2.2} />
        </button>

        {/* Divider */}
        <div className="w-full h-px bg-[#E3E5E8] mb-5" />

        {/* Suggested Widgets */}
        <div className="flex items-center justify-center space-x-2 text-[#393A3D] font-semibold text-[16px] mb-4">
          <LayoutGrid size={18} className="text-[#393A3D]" />
          <span>Suggested widgets</span>
        </div>

        {/* Pill Buttons */}
        <div className="flex items-center justify-center gap-2.5 w-full mb-4">
          <button
            onClick={() => onAddSuggestion && onAddSuggestion('sales')}
            className="flex-1 py-1.5 px-3 rounded-full border border-[#C7CBCE] hover:border-[#393A3D] hover:bg-gray-50 text-[14px] text-[#393A3D] font-medium transition cursor-pointer"
          >
            Sales
          </button>
          <button
            onClick={() => onAddSuggestion && onAddSuggestion('ar')}
            className="flex-1 py-1.5 px-2 rounded-full border border-[#C7CBCE] hover:border-[#393A3D] hover:bg-gray-50 text-[14px] text-[#393A3D] font-medium transition cursor-pointer truncate"
          >
            Accounts receivable
          </button>
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-2">
        <button className="flex items-center justify-center space-x-1.5 text-[13px] text-[#6B6C72] hover:text-[#393A3D] cursor-pointer">
          <HelpCircle size={15} />
          <span>Why am I seeing these suggestions?</span>
        </button>
      </div>
    </div>
  );
}
