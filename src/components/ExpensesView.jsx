import React, { useState } from 'react';
import { ChevronDown, Printer, Share2, Settings, Filter } from 'lucide-react';
import { INITIAL_EXPENSES } from '../data/qbData';

export default function ExpensesView({ onOpenExpenseModal }) {
  const [expenses] = useState(INITIAL_EXPENSES);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Expenses</h1>

        <div className="flex items-center space-x-2">
          <button className="text-xs text-[#2ca01c] hover:underline font-semibold mr-2">
            Give feedback
          </button>
          <div className="inline-flex rounded-full shadow-xs">
            <button className="px-4 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-l-full hover:bg-gray-50">
              Print Checks
            </button>
            <button className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-l-0 border-gray-300 rounded-r-full hover:bg-gray-50">
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="inline-flex rounded-full shadow-xs">
            <button 
              onClick={onOpenExpenseModal}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-l-full hover:bg-green-700"
            >
              New Transaction
            </button>
            <button className="px-2 py-1.5 text-xs font-bold text-white bg-[#2ca01c] border-l border-green-700 rounded-r-full hover:bg-green-700">
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <select className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium">
            <option>All transactions</option>
            <option>Expenses</option>
            <option>Bills</option>
          </select>
          <button className="flex items-center space-x-1.5 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-xs text-gray-700 hover:bg-gray-50">
            <Filter size={13} />
            <span>Filter</span>
          </button>
          <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
            Dates: Last 12 months
          </span>
        </div>

        <div className="flex items-center space-x-3 text-gray-600">
          <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
          <Printer size={15} className="cursor-pointer hover:text-gray-900" />
          <Settings size={15} className="cursor-pointer hover:text-gray-900" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3 w-8"><input type="checkbox" className="rounded text-[#2ca01c]" /></th>
                <th className="p-3">DATE</th>
                <th className="p-3">TYPE</th>
                <th className="p-3">NO.</th>
                <th className="p-3">PAYEE</th>
                <th className="p-3">CATEGORY</th>
                <th className="p-3 text-right">TOTAL</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    <input type="checkbox" className="rounded text-[#2ca01c]" />
                  </td>
                  <td className="p-3 text-gray-600">{exp.date}</td>
                  <td className="p-3 font-medium text-gray-900">{exp.type}</td>
                  <td className="p-3 text-gray-600">{exp.no}</td>
                  <td className="p-3 text-gray-800 font-medium">{exp.payee}</td>
                  <td className="p-3">
                    <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none max-w-xs">
                      <option>{exp.category}</option>
                      <option>Automobile</option>
                      <option>Checking</option>
                      <option>Job Expenses:Job Materials</option>
                      <option>Meals and Entertainment</option>
                      <option>Legal & Professional Fees</option>
                    </select>
                  </td>
                  <td className="p-3 text-right font-bold text-gray-900">
                    {exp.total < 0 ? `-$${Math.abs(exp.total).toFixed(2)}` : `$${exp.total.toFixed(2)}`}
                  </td>
                  <td className="p-3 text-right">
                    <button className="text-[#0077c5] font-semibold hover:underline">
                      {exp.action}
                    </button>
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
