import React, { useState } from 'react';
import { Clock, Search, ChevronDown, X, MessageSquare } from 'lucide-react';

export default function TimeView() {
  const [showTooltip, setShowTooltip] = useState(true);
  const [displayBy, setDisplayBy] = useState("Employee");
  const [dateRange, setDateRange] = useState("7/13/2025 - 7/19/2025");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Time</h1>
        <button className="flex items-center space-x-1.5 text-xs text-[#2ca01c] font-semibold hover:underline">
          <MessageSquare size={13} />
          <span>Feedback</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Display by</label>
            <select
              value={displayBy}
              onChange={(e) => setDisplayBy(e.target.value)}
              className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium"
            >
              <option>Employee</option>
              <option>Date</option>
              <option>Customer</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Date range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium"
            >
              <option>7/13/2025 - 7/19/2025</option>
              <option>This week</option>
              <option>Last week</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase">Team member</label>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members"
                className="text-xs border border-gray-300 rounded pl-7 pr-3 py-1.5 bg-white w-48"
              />
            </div>
          </div>
        </div>

        <div className="relative flex items-center space-x-3">
          <button className="text-xs text-[#0077c5] hover:underline font-semibold">
            Learn about time entries
          </button>
          <button className="px-5 py-1.5 text-xs font-bold text-[#2ca01c] border-2 border-[#2ca01c] rounded-lg hover:bg-green-50 shadow-2xs">
            Add time
          </button>

          {/* Tooltip Popup (Matching Screenshot 031455) */}
          {showTooltip && (
            <div className="absolute top-10 right-0 w-64 bg-[#393a3d] text-white p-3 rounded-lg shadow-xl z-20 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm">Ready to add a timesheet?</span>
                <button onClick={() => setShowTooltip(false)} className="text-gray-400 hover:text-white">
                  <X size={14} />
                </button>
              </div>
              <div className="text-[11px] text-gray-300">
                Select Add time to enter hours for your team.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State Illustration */}
      <div className="bg-white rounded-xl border border-gray-200 p-16 shadow-xs flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-16 h-16 rounded-full border-4 border-teal-500/70 flex items-center justify-center text-teal-600 bg-teal-50">
          <Clock size={32} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">No time entries yet</h3>
        <p className="text-xs text-gray-500 max-w-xs">
          After you add time, you'll see it here.
        </p>
      </div>
    </div>
  );
}
