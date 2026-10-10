import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  Download, 
  Printer, 
  Settings, 
  ArrowUpDown, 
  X,
  Clock,
  User,
  ShieldCheck,
  FileText,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const INITIAL_AUDIT_LOGS = [
  {
    id: 1,
    date: 'Oct 24, 2025, 7:11 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T19:11:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Signed Out.',
    eventType: 'Sign-in activity',
    hasView: false,
    historyDetails: null
  },
  {
    id: 2,
    date: 'Oct 24, 2025, 7:07 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T19:07:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Signed In.',
    eventType: 'Sign-in activity',
    hasView: false,
    historyDetails: null
  },
  {
    id: 3,
    date: 'Oct 24, 2025, 1:49 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:49:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Edited user Craig Carlson',
    eventType: 'User changes',
    hasView: true,
    historyDetails: {
      action: 'Edit User Permissions',
      target: 'Craig Carlson (craig@lawnsandpaws.com)',
      changes: [
        { field: 'User Role', before: 'Standard User (All Access)', after: 'Company Administrator' },
        { field: 'Multi-factor Auth', before: 'Disabled', after: 'Enabled (SMS Verification)' }
      ]
    }
  },
  {
    id: 4,
    date: 'Oct 24, 2025, 1:45 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:45:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Added Currency EUR',
    eventType: 'Currency changes',
    hasView: true,
    historyDetails: {
      action: 'Add Currency',
      target: 'Euro (EUR - €)',
      changes: [
        { field: 'Currency Code', before: '(None)', after: 'EUR' },
        { field: 'Exchange Rate Source', before: '(None)', after: 'Wall Street Journal (Live)' },
        { field: 'Current Exchange Rate', before: '(None)', after: '1 AUD = 0.6120 EUR' }
      ]
    }
  },
  {
    id: 5,
    date: 'Oct 24, 2025, 1:45 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:45:00+11:00').getTime() - 1000,
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Added Currency CAD',
    eventType: 'Currency changes',
    hasView: true,
    historyDetails: {
      action: 'Add Currency',
      target: 'Canadian Dollar (CAD - $)',
      changes: [
        { field: 'Currency Code', before: '(None)', after: 'CAD' },
        { field: 'Exchange Rate Source', before: '(None)', after: 'Wall Street Journal (Live)' },
        { field: 'Current Exchange Rate', before: '(None)', after: '1 AUD = 0.9015 CAD' }
      ]
    }
  },
  {
    id: 6,
    date: 'Oct 24, 2025, 1:45 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:45:00+11:00').getTime() - 2000,
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Enabled multi-currency',
    eventType: 'Currency changes',
    hasView: false,
    historyDetails: null
  },
  {
    id: 7,
    date: 'Oct 24, 2025, 1:44 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:44:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Changed settings',
    eventType: 'Settings changes',
    hasView: false,
    historyDetails: null
  },
  {
    id: 8,
    date: 'Oct 24, 2025, 1:43 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:43:00+11:00').getTime(),
    user: 'System Administration',
    userRole: 'System Process',
    event: 'Changed settings',
    eventType: 'Settings changes',
    hasView: false,
    historyDetails: null
  },
  {
    id: 9,
    date: 'Oct 24, 2025, 1:33 pm Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T13:33:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Signed In.',
    eventType: 'Sign-in activity',
    hasView: false,
    historyDetails: null
  },
  {
    id: 10,
    date: 'Oct 24, 2025, 11:58 am Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T11:58:00+11:00').getTime(),
    user: 'Craig Carlson',
    userRole: 'Company Admin',
    event: 'Edited Timesheet to Emily Platt',
    eventType: 'Timesheet changes',
    hasView: true,
    isTimesheet: true,
    targetPerson: 'Emily Platt',
    actionPrefix: 'Edited',
    historyDetails: {
      action: 'Edit Timesheet Entry',
      target: 'Emily Platt • 24 Oct 2025',
      changes: [
        { field: 'Customer/Project', before: 'Cool Cars (General)', after: "Amy's Bird Sanctuary (Landscaping)" },
        { field: 'Billable Hours', before: '4.50 hrs', after: '6.00 hrs' },
        { field: 'Pay Rate', before: '$32.00/hr', after: '$35.00/hr' },
        { field: 'Taxable', before: 'No', after: 'Yes' }
      ]
    }
  },
  {
    id: 11,
    date: 'Oct 24, 2025, 11:58 am Australian Eastern Daylight Time',
    timestamp: new Date('2025-10-24T11:58:00+11:00').getTime() - 1000,
    user: '',
    userRole: '',
    event: 'Added Timesheet to John Johnson',
    eventType: 'Timesheet changes',
    hasView: true,
    isTimesheet: true,
    targetPerson: 'John Johnson',
    actionPrefix: 'Added',
    historyDetails: {
      action: 'New Timesheet Entry',
      target: 'John Johnson • 24 Oct 2025',
      changes: [
        { field: 'Customer/Project', before: '(None)', after: 'Bill’s Windsurf Shop' },
        { field: 'Billable Hours', before: '(None)', after: '8.00 hrs' },
        { field: 'Pay Rate', before: '(None)', after: '$28.50/hr' },
        { field: 'Taxable', before: '(None)', after: 'Yes' }
      ]
    }
  }
];

export default function AuditLogView({ onNavigate }) {
  const [userFilter, setUserFilter] = useState('All Users');
  const [dateFilter, setDateFilter] = useState('This Month');
  const [eventFilter, setEventFilter] = useState('All events');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [tableDensity, setTableDensity] = useState('regular'); // 'regular' | 'compact'
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    let rows = [...INITIAL_AUDIT_LOGS];

    // Filter by user
    if (userFilter !== 'All Users') {
      rows = rows.filter(r => r.user === userFilter);
    }

    // Filter by event type
    if (eventFilter !== 'All events') {
      rows = rows.filter(r => r.eventType === eventFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      rows = rows.filter(r => 
        r.event.toLowerCase().includes(q) ||
        r.user.toLowerCase().includes(q) ||
        r.date.toLowerCase().includes(q)
      );
    }

    // Sort order
    rows.sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.timestamp - a.timestamp 
        : a.timestamp - b.timestamp;
    });

    return rows;
  }, [userFilter, dateFilter, eventFilter, searchQuery, sortOrder]);

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      ["Date Changed,User,Event", ...filteredRows.map(r => `"${r.date}","${r.user}","${r.event}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 h-full w-full bg-white select-none overflow-y-auto">
      <div className="px-10 py-8 max-w-[1780px] mx-auto min-h-full flex flex-col">
        
        {/* Title (Screenshot 2: "Audit Log" 28px #393A3D) */}
        <div className="mb-6">
          <h1 className="text-[28px] font-normal text-[#393A3D] leading-tight tracking-tight">
            Audit Log
          </h1>
        </div>

        {/* Filters Row: 4 inputs matching exact dimensions (233×38 each, 21px gap) */}
        <div className="flex flex-wrap items-end gap-5 mb-5">
          {/* 1. User Filter */}
          <div className="flex flex-col space-y-1.5 w-[233px]">
            <label className="text-[12px] font-normal text-[#6B6C72]">
              User
            </label>
            <div className="relative">
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full h-[38px] px-3.5 pr-8 bg-white border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] appearance-none focus:outline-none focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] cursor-pointer"
              >
                <option value="All Users">All Users</option>
                <option value="Craig Carlson">Craig Carlson</option>
                <option value="System Administration">System Administration</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-3 text-[#393A3D] pointer-events-none" />
            </div>
          </div>

          {/* 2. Date Changed Filter */}
          <div className="flex flex-col space-y-1.5 w-[233px]">
            <label className="text-[12px] font-normal text-[#6B6C72]">
              Date Changed
            </label>
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-[38px] px-3.5 pr-8 bg-white border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] appearance-none focus:outline-none focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] cursor-pointer"
              >
                <option value="This Month">This Month</option>
                <option value="Last Month">Last Month</option>
                <option value="This Quarter">This Quarter</option>
                <option value="This Year">This Year</option>
                <option value="All dates">All dates</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-3 text-[#393A3D] pointer-events-none" />
            </div>
          </div>

          {/* 3. Events Filter */}
          <div className="flex flex-col space-y-1.5 w-[233px]">
            <label className="text-[12px] font-normal text-[#6B6C72]">
              Events
            </label>
            <div className="relative">
              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                className="w-full h-[38px] px-3.5 pr-8 bg-white border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] appearance-none focus:outline-none focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C] cursor-pointer"
              >
                <option value="All events">All events</option>
                <option value="User changes">User changes</option>
                <option value="Currency changes">Currency changes</option>
                <option value="Settings changes">Settings changes</option>
                <option value="Sign-in activity">Sign-in activity</option>
                <option value="Timesheet changes">Timesheet changes</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-3 text-[#393A3D] pointer-events-none" />
            </div>
          </div>

          {/* 4. Search Filter */}
          <div className="flex flex-col space-y-1.5 w-[233px]">
            <label className="text-[12px] font-normal text-[#6B6C72]">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder=""
                className="w-full h-[38px] pl-9 pr-3 bg-white border border-[#8D9096] rounded-[4px] text-[14px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C] focus:ring-1 focus:ring-[#2CA01C]"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-[#6B6C72]" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#8D9096] hover:text-[#393A3D]"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Right Action Icons Trio: Export, Print, Settings */}
          <div className="ml-auto flex items-center space-x-3.5 text-[#0077C5] mb-1">
            <button
              onClick={handleExport}
              title="Export table to CSV"
              className="p-1.5 hover:bg-blue-50 rounded transition cursor-pointer"
            >
              <Download size={20} strokeWidth={2} />
            </button>
            <button
              onClick={handlePrint}
              title="Print table"
              className="p-1.5 hover:bg-blue-50 rounded transition cursor-pointer"
            >
              <Printer size={20} strokeWidth={2} />
            </button>
            <div className="relative">
              <button
                onClick={() => setSettingsOpen(prev => !prev)}
                title="Table settings"
                className="p-1.5 hover:bg-blue-50 rounded transition cursor-pointer"
              >
                <Settings size={20} strokeWidth={2} />
              </button>
              {settingsOpen && (
                <div className="absolute right-0 top-9 w-48 bg-white rounded-md shadow-xl border border-[#E3E5E8] p-3 z-30 text-[13px] text-[#393A3D]">
                  <div className="font-semibold text-[11px] text-[#6B6C72] uppercase tracking-wider mb-2">Display Density</div>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="density"
                      checked={tableDensity === 'regular'}
                      onChange={() => setTableDensity('regular')}
                      className="accent-[#2CA01C]"
                    />
                    <span>Regular rows</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer py-1">
                    <input
                      type="radio"
                      name="density"
                      checked={tableDensity === 'compact'}
                      onChange={() => setTableDensity('compact')}
                      className="accent-[#2CA01C]"
                    />
                    <span>Compact rows</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="w-full border-t border-[#E8EAEC] mt-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8EAEC] text-[12px] font-semibold text-[#6B6C72] uppercase tracking-[0.04em] h-[46px]">
                <th className="py-2.5 pl-4 pr-6 w-[42%] font-semibold">
                  <button 
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center space-x-1.5 hover:text-[#393A3D] transition cursor-pointer"
                  >
                    <span>DATE CHANGED</span>
                    <span className="text-[13px]">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                  </button>
                </th>
                <th className="py-2.5 px-6 w-[20%] font-semibold">
                  USER
                </th>
                <th className="py-2.5 px-6 w-[28%] font-semibold">
                  EVENT
                </th>
                <th className="py-2.5 pr-4 pl-6 w-[10%] text-right font-semibold">
                  HISTORY
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#6B6C72] text-[14px]">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr 
                    key={row.id}
                    className={`border-b border-[#E8EAEC] hover:bg-[#F9FAFB] transition ${
                      tableDensity === 'compact' ? 'h-[44px]' : 'h-[58px]'
                    }`}
                  >
                    {/* DATE CHANGED */}
                    <td className="py-2 pl-4 pr-6 text-[14px] text-[#393A3D]">
                      {row.date}
                    </td>

                    {/* USER */}
                    <td className="py-2 px-6 text-[14px] text-[#393A3D]">
                      {row.user}
                    </td>

                    {/* EVENT */}
                    <td className="py-2 px-6 text-[14px] text-[#393A3D]">
                      {row.isTimesheet ? (
                        <span>
                          {row.actionPrefix}{' '}
                          <button
                            onClick={() => onNavigate && onNavigate('time_entries')}
                            className="text-[#0077C5] hover:underline font-normal inline"
                          >
                            Timesheet
                          </button>
                          {' to '}{row.targetPerson}
                        </span>
                      ) : (
                        row.event
                      )}
                    </td>

                    {/* HISTORY (Teal "View" link) */}
                    <td className="py-2 pr-4 pl-6 text-right text-[14px]">
                      {row.hasView ? (
                        <button
                          onClick={() => setSelectedHistory(row)}
                          className="text-[#0077C5] hover:underline font-normal cursor-pointer"
                        >
                          View
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* History Detail Drawer / Modal when clicking "View" */}
      {selectedHistory && (
        <div 
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-[1px]"
          onClick={() => setSelectedHistory(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-2xl border border-[#E3E5E8] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E5E8] bg-[#F9FAFB]">
              <div>
                <h3 className="text-[18px] font-semibold text-[#393A3D]">
                  Audit History Detail
                </h3>
                <p className="text-[12px] text-[#6B6C72] mt-0.5">
                  {selectedHistory.date}
                </p>
              </div>
              <button 
                onClick={() => setSelectedHistory(null)}
                className="text-[#6B6C72] hover:text-[#393A3D] p-1.5 rounded hover:bg-gray-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 text-[14px] text-[#393A3D]">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100">
                <div>
                  <span className="text-[11px] font-semibold text-[#6B6C72] uppercase tracking-wider block">Initiated By</span>
                  <span className="font-medium text-[#393A3D] text-[15px]">{selectedHistory.user || 'System'}</span>
                  <span className="text-[12px] text-[#6B6C72] block">{selectedHistory.userRole || 'Automated Service'}</span>
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-[#6B6C72] uppercase tracking-wider block">Event Summary</span>
                  <span className="font-medium text-[#393A3D] text-[15px]">{selectedHistory.event}</span>
                  <span className="text-[12px] text-[#2CA01C] font-medium block">Status: Completed Successfully</span>
                </div>
              </div>

              {selectedHistory.historyDetails && (
                <div>
                  <h4 className="text-[13px] font-semibold text-[#6B6C72] uppercase tracking-wider mb-3">
                    Attribute Changes &amp; Field Diffs
                  </h4>
                  <div className="border border-[#E3E5E8] rounded-md overflow-hidden">
                    <table className="w-full text-left text-[13px]">
                      <thead className="bg-[#F4F5F8] border-b border-[#E3E5E8] text-[#6B6C72]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Field</th>
                          <th className="py-2.5 px-4 font-semibold text-rose-700">Before</th>
                          <th className="py-2.5 px-4 font-semibold text-emerald-700">After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E3E5E8]">
                        {selectedHistory.historyDetails.changes.map((ch, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="py-2.5 px-4 font-medium text-[#393A3D]">{ch.field}</td>
                            <td className="py-2.5 px-4 text-rose-800 bg-rose-50/40">{ch.before}</td>
                            <td className="py-2.5 px-4 text-emerald-800 bg-emerald-50/40 font-medium">{ch.after}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-[#F9FAFB] border-t border-[#E3E5E8] flex justify-end">
              <button
                onClick={() => setSelectedHistory(null)}
                className="px-5 py-1.5 rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[13px] font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
