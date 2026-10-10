import React, { useRef } from 'react';
import { 
  Activity, 
  CreditCard, 
  BarChart2, 
  Users, 
  UserCheck, 
  Clock, 
  Percent, 
  FileText, 
  ChevronRight 
} from 'lucide-react';

export default function PillNav({ onNavigate }) {
  const scrollRef = useRef(null);

  const pills = [
    { id: "bank_transactions", label: "Accounting", color: "#2CA01C", icon: Activity },
    { id: "expense_transactions", label: "Expenses & Pay Bills", color: "#107C41", icon: CreditCard },
    { id: "sales_transactions", label: "Sales & Get Paid", color: "#0E9F9F", icon: BarChart2 },
    { id: "customers_list", label: "Customers", color: "#0E9F9F", icon: Users },
    { id: "time_entries", label: "Team", color: "#0E9F9F", icon: UserCheck },
    { id: "time_entries", label: "Time", color: "#0E9F9F", icon: Clock },
    { id: "sales_transactions", label: "Sales Tax", color: "#E5446D", icon: Percent },
    { id: "standard_reports", label: "Business Tax", color: "#E5446D", icon: FileText },
  ];

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex justify-center py-2 relative">
      <div 
        ref={scrollRef}
        className="flex items-center space-x-[12px] overflow-x-auto no-scrollbar scroll-smooth max-w-full px-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {pills.map((pill, idx) => {
          const Icon = pill.icon;
          return (
            <button
              key={idx}
              onClick={() => onNavigate && onNavigate(pill.id)}
              className="h-[52px] px-[20px] rounded-full bg-white border border-[#C7CBCE] hover:border-[#8D9096] hover:shadow-xs flex items-center shrink-0 cursor-pointer transition select-none"
            >
              <div 
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white mr-[8px] shrink-0 shadow-2xs"
                style={{ backgroundColor: pill.color }}
              >
                <Icon size={16} strokeWidth={2.2} />
              </div>
              <span className="text-[15px] font-medium text-[#393A3D] whitespace-nowrap">
                {pill.label}
              </span>
            </button>
          );
        })}

        {/* 32px circular chevron button at end of pills */}
        <button
          onClick={handleScrollRight}
          className="w-[32px] h-[32px] rounded-full bg-white border border-[#C7CBCE] hover:bg-gray-50 flex items-center justify-center text-[#393A3D] shrink-0 shadow-xs cursor-pointer transition"
          title="Scroll more"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
