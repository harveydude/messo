import React, { useState } from 'react';
import { 
  Search, 
  Printer, 
  Share2, 
  Settings, 
  ChevronDown, 
  ArrowUpDown,
  Plus
} from 'lucide-react';
import { INITIAL_CUSTOMERS } from '../data/qbData';

export default function CustomersView({ onOpenNewCustomer, onOpenCreateInvoice }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState(INITIAL_CUSTOMERS);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold text-gray-900">Customers</h1>
          <button className="text-xs text-[#0077c5] hover:underline font-medium">
            Check out the new view with filters
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button className="px-4 py-1.5 text-xs font-semibold text-[#2ca01c] border border-[#2ca01c] rounded-full hover:bg-green-50">
            Customer types
          </button>
          <div className="inline-flex rounded-full shadow-xs">
            <button 
              onClick={onOpenNewCustomer}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-l-full hover:bg-green-700"
            >
              New customer
            </button>
            <button className="px-2 py-1.5 text-xs font-bold text-white bg-[#2ca01c] border-l border-green-700 rounded-r-full hover:bg-green-700">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Colorful Status Funnel Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3 text-left">
          <div>
            <div className="text-base font-extrabold text-gray-900">$0</div>
            <div className="text-[11px] text-gray-500">0 estimates</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$0</div>
            <div className="text-[11px] text-gray-500">Unbilled income</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$0</div>
            <div className="text-[11px] text-gray-500">0 overdue invoices</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$2,850</div>
            <div className="text-[11px] text-gray-500">3 open invoices and credits</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$0</div>
            <div className="text-[11px] text-gray-500">0 recently paid</div>
          </div>
        </div>

        {/* Color bar indicators */}
        <div className="flex h-2.5 rounded-full overflow-hidden w-full space-x-0.5">
          <div className="bg-[#00a3e0] h-full" style={{ width: '15%' }} />
          <div className="bg-[#8b5cf6] h-full" style={{ width: '20%' }} />
          <div className="bg-[#f97316] h-full" style={{ width: '20%' }} />
          <div className="bg-[#94a3b8] h-full" style={{ width: '30%' }} />
          <div className="bg-[#2ca01c] h-full" style={{ width: '15%' }} />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="w-full text-xs pl-3 pr-8 py-1.5 border border-gray-300 rounded focus:border-[#2ca01c] focus:outline-none"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-gray-400" />
          </div>

          <div className="flex items-center space-x-3 text-gray-600">
            <Printer size={15} className="cursor-pointer hover:text-gray-900" />
            <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                <th className="p-3 cursor-pointer">Name ↑</th>
                <th className="p-3 cursor-pointer">Company name ↕</th>
                <th className="p-3">Phone</th>
                <th className="p-3 text-right cursor-pointer">Open balance ↕</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    <input type="checkbox" className="rounded text-[#2ca01c]" />
                  </td>
                  <td className={`p-3 font-medium text-gray-900 ${cust.isSub ? 'pl-8 text-gray-600' : ''}`}>
                    {cust.name}
                  </td>
                  <td className="p-3 text-gray-600">{cust.company}</td>
                  <td className="p-3 text-gray-600">{cust.phone}</td>
                  <td className="p-3 text-right font-medium text-gray-900">
                    ${cust.openBalance.toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center space-x-1 text-[#0077c5] font-semibold hover:underline cursor-pointer">
                      <span>{cust.action}</span>
                      <ChevronDown size={12} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
