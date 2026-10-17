import React from 'react';
import { Plus, ChevronDown } from 'lucide-react';

export default function ManagementReportsView() {
  const reports = [
    { name: "Company Overview", createdBy: "Meso", period: "This year" },
    { name: "Sales Performance", createdBy: "Meso", period: "This year" },
    { name: "Expenses Performance", createdBy: "Meso", period: "This year" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Management reports</h1>
        <button className="px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs">
          <Plus size={15} />
          <span>Management report</span>
        </button>
      </div>

      {/* Table (Matching Screenshot 031127) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">NAME</th>
                <th className="p-3">CREATED BY</th>
                <th className="p-3">LAST MODIFIED</th>
                <th className="p-3">REPORT PERIOD</th>
                <th className="p-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50 transition">
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900">{r.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500 text-white uppercase tracking-wider">
                        MESO REPORT
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-gray-600">{r.createdBy}</td>
                  <td className="p-3 text-gray-400"></td>
                  <td className="p-3">
                    <select className="text-xs border border-gray-300 rounded px-2.5 py-1 bg-white font-medium">
                      <option>{r.period}</option>
                      <option>Last year</option>
                      <option>All time</option>
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center space-x-1 text-[#0077c5] font-semibold hover:underline cursor-pointer">
                      <span>Preview</span>
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
