import React, { useRef } from 'react';
import {
  Activity,
  CreditCard,
  BarChart2,
  Users,
  Clock,
  FileText,
  ChevronRight,
  Landmark,
} from 'lucide-react';

const PILLS = [
  { id: 'bank_transactions', label: 'Accounting', color: '#2CA01C', icon: Activity },
  { id: 'expense_transactions', label: 'Expenses & Pay Bills', color: '#107C41', icon: CreditCard },
  { id: 'sales_transactions', label: 'Sales & Get Paid', color: '#0E9F9F', icon: BarChart2 },
  { id: 'sales_tax', label: 'GST Returns (GSTR-1/3B)', color: '#7C3AED', icon: Landmark },
  { id: 'business_tax', label: 'TDS & Direct Tax', color: '#D97706', icon: FileText },
  { id: 'bills', label: 'Bills & MSME Pay', color: '#0077C5', icon: CreditCard },
  { id: 'customers_list', label: 'Customers', color: '#0E9F9F', icon: Users },
  { id: 'standard_reports', label: 'Reports', color: '#E5446D', icon: FileText },
];

const SCROLL_STEP = 300;

export default function PillNav({ onNavigate }) {
  const scrollRef = useRef(null);

  const handleScrollRight = () => {
    scrollRef.current?.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  };

  return (
    <div className="w-full flex justify-center py-2 relative">
      <div
        ref={scrollRef}
        className="flex items-center space-x-[12px] overflow-x-auto no-scrollbar scroll-smooth max-w-full px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {PILLS.map((pill) => {
          const Icon = pill.icon;
          return (
            <button
              key={pill.id}
              type="button"
              onClick={() => onNavigate?.(pill.id)}
              className="h-[52px] px-[20px] rounded-full bg-white border border-[#C7CBCE] hover:border-[#8D9096] hover:shadow-xs flex items-center shrink-0 cursor-pointer transition select-none focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2"
            >
              <span
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white mr-[8px] shrink-0 shadow-2xs"
                style={{ backgroundColor: pill.color }}
                aria-hidden="true"
              >
                <Icon size={16} strokeWidth={2.2} />
              </span>
              <span className="text-[15px] font-medium text-[#393A3D] whitespace-nowrap">
                {pill.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleScrollRight}
          className="w-[32px] h-[32px] rounded-full bg-white border border-[#C7CBCE] hover:bg-gray-50 flex items-center justify-center text-[#393A3D] shrink-0 shadow-xs cursor-pointer transition focus-visible:outline-2 focus-visible:outline-[#2CA01C]"
          aria-label="Scroll to more apps"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
