import React, { useRef } from 'react';
import {
  Activity,
  CreditCard,
  BarChart2,
  Users,
  Clock,
  FileText,
  ChevronRight,
} from 'lucide-react';

/**
 * The dashboard's app pills.
 *
 * WHAT WAS WRONG, AND WHY IT MATTERED
 *
 * Three of the eight pills pointed at the wrong screen and two shared one id:
 * "Team" and "Time" both went to time, "Sales Tax" went to the Sales overview,
 * and "Business Tax" went to the Reports list. Clicking a pill named for one
 * thing and silently landing on another is worse than the pill not existing --
 * the user concludes the app is broken, or worse, that the figure they are
 * looking at belongs to the screen they asked for.
 *
 * There is no Sales Tax or Business Tax screen, so those pills are gone rather
 * than relabelled onto something unrelated. When the GST screens are built they
 * come back, pointing at themselves. A navigation that tells the truth about
 * what exists is worth more than one that covers every label.
 *
 * Keys are the pill id, not the array index. Index keys make a reordering move
 * the wrong row's state along with it.
 */
const PILLS = [
  { id: 'bank_transactions', label: 'Accounting', color: '#2CA01C', icon: Activity },
  { id: 'expense_transactions', label: 'Expenses & Pay Bills', color: '#107C41', icon: CreditCard },
  { id: 'sales_transactions', label: 'Sales & Get Paid', color: '#0E9F9F', icon: BarChart2 },
  { id: 'customers_list', label: 'Customers', color: '#0E9F9F', icon: Users },
  { id: 'time_entries', label: 'Time', color: '#0E9F9F', icon: Clock },
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
