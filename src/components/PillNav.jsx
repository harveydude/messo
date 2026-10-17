import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

const PILLS = [
  { id: 'bank_transactions', label: 'Accounting', iconUrl: '/app-icons/accounting.png' },
  { id: 'expense_transactions', label: 'Expenses & Pay Bills', iconUrl: '/app-icons/expenses.png' },
  { id: 'sales_transactions', label: 'Sales & Get Paid', iconUrl: '/app-icons/sales.png' },
  { id: 'sales_tax', label: 'GST Returns (GSTR-1/3B)', iconUrl: '/app-icons/gst.jpg' },
  { id: 'business_tax', label: 'TDS & Direct Tax', iconUrl: '/app-icons/gst.jpg' },
  { id: 'bills', label: 'Bills & MSME Pay', iconUrl: '/app-icons/bills.png' },
  { id: 'customers_list', label: 'Customers', iconUrl: '/app-icons/customers.png' },
  { id: 'standard_reports', label: 'Reports', iconUrl: '/app-icons/reports.jpg' },
  { id: 'customer_hub', label: 'Customer Hub', iconUrl: '/app-icons/customer_hub.jpg' },
  { id: 'team', label: 'Team', iconUrl: '/app-icons/team.jpg' },
  { id: 'time_entries', label: 'Time Tracking', iconUrl: '/app-icons/time.jpg' },
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
        {PILLS.map((pill) => (
          <button
            key={pill.id}
            type="button"
            onClick={() => onNavigate?.(pill.id)}
            className="h-[52px] px-[18px] rounded-full bg-white border border-[#C7CBCE] hover:border-[#8D9096] hover:shadow-xs flex items-center shrink-0 cursor-pointer transition select-none focus-visible:outline-2 focus-visible:outline-[#2CA01C] focus-visible:outline-offset-2 group"
          >
            <span
              className="w-[32px] h-[32px] rounded-full overflow-hidden flex items-center justify-center mr-[10px] shrink-0 shadow-xs border border-black/10 bg-gray-950 group-hover:scale-105 transition"
              aria-hidden="true"
            >
              <img
                src={pill.iconUrl}
                alt={pill.label}
                className="w-full h-full object-cover"
              />
            </span>
            <span className="text-[15px] font-medium text-[#393A3D] whitespace-nowrap group-hover:text-black">
              {pill.label}
            </span>
          </button>
        ))}

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
