import React, { useState } from 'react';
import { 
  Plus, 
  Bookmark, 
  LayoutGrid, 
  Sparkles, 
  TrendingUp, 
  Grid, 
  Sliders, 
  ChevronRight, 
  ChevronDown,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  setCurrentView, 
  onOpenCreateMenu, 
  onOpenCustomizeMenus 
}) {
  const [appsExpanded, setAppsExpanded] = useState(true);
  const [activeCategory, setActiveCategory] = useState("accounting");

  // App menus definition matching exact screenshots
  const appMenus = {
    accounting: {
      name: "Accounting",
      items: [
        { id: "bank_transactions", label: "Bank transactions" },
        { id: "integration_transactions", label: "Integration transactions" },
        { id: "receipts", label: "Receipts" },
        { id: "reconcile", label: "Reconcile" },
        { id: "rules", label: "Rules" },
        { id: "chart_of_accounts", label: "Chart of accounts" },
        { id: "recurring_transactions", label: "Recurring transactions" },
        { id: "my_accountant", label: "My accountant" },
      ]
    },
    expenses: {
      name: "Expenses & Bills",
      items: [
        { id: "expenses_overview", label: "Overview" },
        { id: "expense_transactions", label: "Expense transactions" },
        { id: "vendors", label: "Vendors" },
        { id: "bills", label: "Bills" },
        { id: "bill_payments", label: "Bill payments" },
        { id: "mileage", label: "Mileage" },
        { id: "employees", label: "Employees" },
        { id: "contractors", label: "Contractors" },
        { id: "1099s", label: "1099s" },
      ]
    },
    sales: {
      name: "Sales & Get Paid",
      items: [
        { id: "sales_overview", label: "Overview" },
        { id: "sales_transactions", label: "Sales transactions" },
        { id: "invoices", label: "Invoices" },
        { id: "payment_links", label: "Payment links" },
        { id: "recurring_payments", label: "Recurring payments" },
        { id: "sales_orders", label: "Sales orders" },
        { id: "sales_channels", label: "Sales channels" },
        { id: "payouts", label: "Payouts" },
        { id: "products_services", label: "Products & services" },
      ]
    },
    customers: {
      name: "Customer Hub",
      items: [
        { id: "customer_overview", label: "Overview" },
        { id: "leads", label: "Leads" },
        { id: "customers_list", label: "Customers" },
        { id: "estimates", label: "Estimates" },
        { id: "contracts", label: "Contracts" },
        { id: "appointments", label: "Appointments" },
        { id: "reviews", label: "Reviews" },
      ]
    },
    time: {
      name: "Time",
      items: [
        { id: "time_entries", label: "Time entries" },
        { id: "time_schedule", label: "Schedule" },
      ]
    },
    reports: {
      name: "Reports & Analytics",
      items: [
        { id: "standard_reports", label: "Standard reports" },
        { id: "custom_reports", label: "Custom reports" },
        { id: "management_reports", label: "Management reports" },
        { id: "budgets", label: "Budgets" },
      ]
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-[calc(100vh-3.5rem)] sticky top-14 select-none shrink-0 z-20">
      <div className="p-3 border-b border-gray-100">
        {/* + Create Pill Button */}
        <button
          onClick={onOpenCreateMenu}
          className="w-full flex items-center justify-center space-x-2 bg-white border-2 border-gray-800 hover:bg-gray-50 text-gray-900 rounded-full py-2 px-4 font-semibold text-xs transition shadow-sm hover:shadow"
        >
          <Plus size={16} className="text-[#2ca01c]" strokeWidth={3} />
          <span>Create</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {/* Primary Navigation Section */}
        <button
          onClick={() => setCurrentView('bookmarks')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentView === 'bookmarks' ? 'bg-gray-100 text-gray-950 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Bookmark size={16} />
          <span>Bookmarks</span>
        </button>

        <button
          onClick={() => setCurrentView('dashboard')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentView === 'dashboard' ? 'bg-[#e8f5e9] text-[#2ca01c] font-bold border-l-4 border-[#2ca01c]' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
          }`}
        >
          <LayoutGrid size={16} />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setCurrentView('feed')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentView === 'feed' ? 'bg-gray-100 text-[#2ca01c] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Sparkles size={16} />
          <span>Feed</span>
        </button>

        <button
          onClick={() => setCurrentView('standard_reports')}
          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
            currentView.includes('report') ? 'bg-gray-100 text-[#2ca01c] font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={16} />
          <span>Reports</span>
        </button>

        {/* My Apps / Apps Accordion Header */}
        <div className="pt-3 pb-1">
          <div className="flex items-center justify-between px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <span>MY APPS</span>
            <button 
              onClick={() => setAppsExpanded(!appsExpanded)}
              className="hover:text-gray-600"
            >
              {appsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {appsExpanded && (
          <div className="space-y-0.5">
            {Object.entries(appMenus).map(([key, section]) => {
              const isSelected = activeCategory === key;
              return (
                <div key={key}>
                  <button
                    onClick={() => {
                      setActiveCategory(isSelected ? "" : key);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isSelected ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`w-2 h-2 rounded-full ${key === 'accounting' ? 'bg-emerald-500' : key === 'expenses' ? 'bg-blue-500' : key === 'sales' ? 'bg-green-600' : key === 'customers' ? 'bg-teal-500' : 'bg-purple-500'}`} />
                      <span>{section.name}</span>
                    </div>
                    {isSelected ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                  </button>

                  {/* Submenu items */}
                  {isSelected && (
                    <div className="ml-5 pl-2 border-l border-gray-200 py-1 space-y-0.5">
                      {section.items.map(item => {
                        const isItemActive = currentView === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setCurrentView(item.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition ${
                              isItemActive 
                                ? 'bg-[#e8f5e9] text-[#2ca01c] font-semibold' 
                                : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PINNED SECTION */}
        <div className="pt-4 pb-1">
          <div className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            PINNED
          </div>
        </div>

        <div className="space-y-0.5">
          <button
            onClick={() => setCurrentView('bank_transactions')}
            className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition ${
              currentView === 'bank_transactions' ? 'bg-[#e8f5e9] text-[#2ca01c] font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-white text-[10px] font-bold">A</div>
            <span>Accounting</span>
          </button>

          <button
            onClick={() => setCurrentView('expense_transactions')}
            className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition ${
              currentView === 'expense_transactions' ? 'bg-[#e8f5e9] text-[#2ca01c] font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-teal-800 flex items-center justify-center text-white text-[10px] font-bold">E</div>
            <span>Expenses</span>
          </button>

          <button
            onClick={() => setCurrentView('sales_transactions')}
            className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-lg text-xs transition ${
              currentView === 'sales_transactions' ? 'bg-[#e8f5e9] text-[#2ca01c] font-bold' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-900 flex items-center justify-center text-white text-[10px] font-bold">S</div>
            <span>Sales</span>
          </button>
        </div>
      </div>

      {/* Bottom Customize Button */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={onOpenCustomizeMenus}
          className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition"
        >
          <Sliders size={15} />
          <span>Customize</span>
        </button>
      </div>
    </aside>
  );
}
