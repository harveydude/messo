import React, { useState } from 'react';
import { ChevronDown, Printer, Share2, Settings, Sparkles, X } from 'lucide-react';
import { INITIAL_SALES_TRANSACTIONS } from '../data/qbData';

export default function SalesTransactionsView({ onOpenInvoiceModal }) {
  const [showAiBanner, setShowAiBanner] = useState(true);
  const [transactions] = useState(INITIAL_SALES_TRANSACTIONS);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Status Funnel Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3 text-left">
          <div>
            <div className="text-base font-extrabold text-gray-900">$0.00</div>
            <div className="text-[11px] text-gray-500">0 estimates</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$750.00</div>
            <div className="text-[11px] text-gray-500">Unbilled income</div>
          </div>
          <div className="bg-orange-50 -m-2 p-2 rounded-lg border border-orange-200">
            <div className="text-base font-extrabold text-orange-950">$1,525.50</div>
            <div className="text-[11px] text-orange-800 font-medium">10 overdue invoices</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$5,281.52</div>
            <div className="text-[11px] text-gray-500">20 open invoices and credits</div>
          </div>
          <div>
            <div className="text-base font-extrabold text-gray-900">$2,916.32</div>
            <div className="text-[11px] text-gray-500">10 recently paid</div>
          </div>
        </div>

        {/* Color bar */}
        <div className="flex h-2.5 rounded-full overflow-hidden w-full space-x-0.5">
          <div className="bg-[#00a3e0] h-full" style={{ width: '10%' }} />
          <div className="bg-[#8b5cf6] h-full" style={{ width: '15%' }} />
          <div className="bg-[#f97316] h-full ring-2 ring-orange-500" style={{ width: '25%' }} />
          <div className="bg-[#94a3b8] h-full" style={{ width: '30%' }} />
          <div className="bg-[#2ca01c] h-full" style={{ width: '20%' }} />
        </div>
      </div>

      {/* Intuit Assist AI Draft Banner (Matching frame_752) */}
      {showAiBanner && (
        <div className="bg-white border-2 border-emerald-400 rounded-xl p-4 shadow-xs flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-[#2ca01c]">
              <Sparkles size={16} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">
                I drafted 10 reminders for invoices worth $4,490.92
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                You can edit a reminder for Paulsen Medical Supplies and other customers.{" "}
                <button className="text-[#0077c5] hover:underline font-semibold">
                  Review reminders
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setShowAiBanner(false)}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Table Toolbar & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1">
            <span>Batch actions</span>
            <ChevronDown size={14} />
          </button>
          <select className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
            <option>All transactions</option>
            <option>Invoices</option>
            <option>Estimates</option>
          </select>
          <select className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
            <option>Last 30 days</option>
            <option>This month</option>
            <option>Last 12 months</option>
          </select>
          <input 
            type="text" 
            placeholder="Search customer" 
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white w-36"
          />
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-full shadow-xs">
            <button 
              onClick={onOpenInvoiceModal}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-l-full hover:bg-green-700"
            >
              New transaction
            </button>
            <button className="px-2 py-1.5 text-xs font-bold text-white bg-[#2ca01c] border-l border-green-700 rounded-r-full hover:bg-green-700">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-3 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            <input type="checkbox" className="rounded text-[#2ca01c]" />
            <span>Select all</span>
          </div>
          <div className="flex items-center space-x-3">
            <Printer size={15} className="cursor-pointer hover:text-gray-900" />
            <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
            <Settings size={15} className="cursor-pointer hover:text-gray-900" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">DATE ▼</th>
                <th className="p-3">TYPE</th>
                <th className="p-3">NO.</th>
                <th className="p-3">CUSTOMER</th>
                <th className="p-3">MEMO</th>
                <th className="p-3 text-right">AMOUNT</th>
                <th className="p-3">STATUS</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    <input type="checkbox" className="rounded text-[#2ca01c]" />
                  </td>
                  <td className="p-3 text-gray-600">{t.date}</td>
                  <td className="p-3 font-medium text-gray-900">{t.type}</td>
                  <td className="p-3 text-gray-600">{t.no}</td>
                  <td className="p-3 font-semibold text-gray-900">{t.customer}</td>
                  <td className="p-3 text-gray-500">{t.memo}</td>
                  <td className="p-3 text-right font-bold text-gray-900">${t.amount.toFixed(2)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center space-x-2">
                      <button className="text-gray-600 hover:text-gray-900 font-medium">View/Edit</button>
                      <span className="text-gray-300">|</span>
                      <button className="text-[#0077c5] font-semibold hover:underline flex items-center space-x-1">
                        <span>{t.action}</span>
                        <ChevronDown size={11} />
                      </button>
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
