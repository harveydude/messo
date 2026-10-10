import React, { useState } from 'react';
import { ChevronDown, Car } from 'lucide-react';

export default function MileageView() {
  const [taxYear, setTaxYear] = useState("2025");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-medium text-gray-500 mb-1">Tax Year:</div>
          <select 
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-semibold"
          >
            <option>2025</option>
            <option>2024</option>
          </select>
        </div>

        <div className="inline-flex rounded-full shadow-xs">
          <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-l-full hover:bg-green-700">
            Add Trip
          </button>
          <button className="px-2 py-1.5 text-xs font-bold text-white bg-[#2ca01c] border-l border-green-700 rounded-r-full hover:bg-green-700">
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Main Deduction Card (Matching frame_789) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-6">
        <div>
          <div className="text-xs font-semibold text-gray-500">Potential deduction for {taxYear}</div>
          <div className="text-3xl font-extrabold text-gray-900 mt-1">$0</div>
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
            <div className="w-2 h-2 rounded-full bg-teal-500" />
            <span>Potential deduction: $0 (0 Business trips in October)</span>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="border border-gray-100 bg-gray-50/50 rounded-xl p-10 text-center flex flex-col items-center justify-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            📊
          </div>
          <div className="text-sm font-bold text-gray-800">No data to display</div>
          <div className="text-xs text-gray-500">Add trip to view data</div>
        </div>

        {/* Vehicles summary row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-gray-100 text-gray-700">
              <Car size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">My vehicle-2</div>
              <div className="text-[11px] text-gray-500">Primary vehicle</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-900">3 vehicles</div>
            <button className="text-xs text-[#0077c5] hover:underline font-medium">Manage vehicles</button>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-900">$0.70 <span className="font-normal text-gray-500">Per mile</span></div>
            <div className="text-[11px] text-gray-500">You're driving towards a sizable mileage allowance. Keep it up!</div>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 font-semibold text-xs text-gray-700 flex justify-between">
          <span>Trips</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">LOCATION</th>
                <th className="p-3">DISTANCE</th>
                <th className="p-3">POTENTIAL DEDUCTIONS</th>
                <th className="p-3">VEHICLE</th>
                <th className="p-3">TYPE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-12 text-center text-gray-400 font-medium">
                  No trips here - yet!
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
