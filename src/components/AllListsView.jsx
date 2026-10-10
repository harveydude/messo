import React, { useState } from 'react';
import { 
  Search, 
  ChevronRight, 
  BookOpen, 
  Repeat, 
  Package, 
  Sliders, 
  FileText, 
  CreditCard, 
  Calendar, 
  Paperclip, 
  Tag, 
  FolderTree,
  ChevronLeft
} from 'lucide-react';

export default function AllListsView({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');

  const listsData = [
    {
      id: 'rules',
      title: 'Rules',
      description: 'Create rules to automatically categorize downloaded transactions from your bank feeds.',
      icon: Sliders,
      color: '#0077C5',
      view: 'rules',
      badge: 'Bank rules'
    },
    {
      id: 'chart_of_accounts',
      title: 'Chart of accounts',
      description: 'Displays your accounts with detail types, account numbers, and current balances.',
      icon: BookOpen,
      color: '#2CA01C',
      view: 'chart_of_accounts'
    },
    {
      id: 'recurring_transactions',
      title: 'Recurring transactions',
      description: 'Templates for recurring transactions like invoices, bills, checks, and expenses.',
      icon: Repeat,
      color: '#00897B',
      view: 'recurring_transactions'
    },
    {
      id: 'products_services',
      title: 'Products and services',
      description: 'Displays the products and services you sell, inventory quantities, prices, and costs.',
      icon: Package,
      color: '#F47B16',
      view: 'products_services'
    },
    {
      id: 'custom_form_styles',
      title: 'Custom form styles',
      description: 'Customize the appearance and layout of your sales receipts, invoices, and estimates.',
      icon: FileText,
      color: '#6B6C72'
    },
    {
      id: 'payment_methods',
      title: 'Payment methods',
      description: 'Payment methods you accept from customers like Cash, Check, and Credit Card.',
      icon: CreditCard,
      color: '#6B6C72'
    },
    {
      id: 'terms',
      title: 'Terms',
      description: 'Payment terms for customers and vendors, like Net 30, Net 15, and Due on receipt.',
      icon: Calendar,
      color: '#6B6C72'
    },
    {
      id: 'attachments',
      title: 'Attachments',
      description: 'Files, photos, and PDF documents uploaded and attached to transactions and records.',
      icon: Paperclip,
      color: '#6B6C72'
    },
    {
      id: 'tags',
      title: 'Tags',
      description: 'Track transactions and see where you make and spend money across custom groups.',
      icon: Tag,
      color: '#6B6C72'
    },
    {
      id: 'product_categories',
      title: 'Product categories',
      description: 'Organize your products and services into hierarchical categories for reporting.',
      icon: FolderTree,
      color: '#6B6C72',
      view: 'products_services'
    }
  ];

  const filteredLists = listsData.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#F6F7F8] overflow-y-auto select-none">
      <div className="max-w-[1280px] w-full mx-auto px-8 py-8">
        
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[32px] font-bold text-[#393A3D] leading-tight">
              All Lists
            </h1>
            <p className="text-[15px] text-[#6B6C72] mt-1.5">
              Manage and view all your company&apos;s lists in one place.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-[320px]">
            <input 
              type="text"
              placeholder="Search lists"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[40px] pl-10 pr-4 rounded-[6px] border border-[#C9CDD2] bg-white text-[14px] text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5] shadow-xs"
            />
            <Search size={18} className="absolute left-3 top-[11px] text-[#6B6C72]" />
          </div>
        </div>

        {/* Grid of List Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          {filteredLists.map((item) => {
            const IconComponent = item.icon;
            const isClickable = !!item.view;

            return (
              <div 
                key={item.id}
                onClick={() => {
                  if (item.view && onNavigate) {
                    onNavigate(item.view);
                  }
                }}
                className={`bg-white rounded-[8px] border border-[#E3E5E8] p-5 flex items-start space-x-4 transition shadow-xs ${
                  isClickable 
                    ? 'hover:border-[#0077C5] hover:shadow-md cursor-pointer group' 
                    : 'opacity-85'
                }`}
              >
                <div 
                  className="w-[42px] h-[42px] rounded-[8px] flex items-center justify-center shrink-0 shadow-xs"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}
                >
                  <IconComponent size={22} strokeWidth={2} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h2 className={`text-[17px] font-semibold transition ${
                      isClickable ? 'text-[#0077C5] group-hover:underline' : 'text-[#393A3D]'
                    }`}>
                      {item.title}
                    </h2>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#E6F4EA] text-[#137333] rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[#6B6C72] mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {isClickable && (
                  <ChevronRight size={18} className="text-[#C1C5CA] group-hover:text-[#0077C5] shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" />
                )}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
