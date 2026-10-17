import React, { useState } from 'react';
import { ChevronDown, Printer, Settings, Sliders, MessageSquare, X, Gem } from 'lucide-react';

export default function RecurringTransactionsView({ onNavigate }) {

  const [filterText, setFilterText] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState(false);
  const [newTypeModalOpen, setNewTypeModalOpen] = useState(false);
  const [selectedTxnType, setSelectedTxnType] = useState('Bill');
  const [actionMenuId, setActionMenuId] = useState(null);

  // Table rows matching Screenshot 3
  const [templates, setTemplates] = useState([
    {
      id: 'rec-1',
      templateName: 'Monthly Building Lease',
      type: 'Scheduled',
      txnType: 'Bill',
      interval: 'Every Month',
      previousDate: '',
      nextDate: '10/12/2025',
      customerVendor: 'Hall Properties',
      amount: '900.00'
    },
    {
      id: 'rec-2',
      templateName: 'Telephone Bill',
      type: 'Scheduled',
      txnType: 'Bill',
      interval: 'Every Month',
      previousDate: '',
      nextDate: '10/12/2025',
      customerVendor: 'Cal Telephone',
      amount: '74.36'
    }
  ]);

  const filteredTemplates = templates.filter(t => {
    if (!activeFilter) return true;
    return t.templateName.toLowerCase().includes(activeFilter.toLowerCase()) ||
           t.customerVendor.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const handleApplyFilter = () => {
    setActiveFilter(filterText);
  };

  const handleCreateTemplate = () => {
    const newId = `rec-${templates.length + 1}`;
    setTemplates(prev => [
      ...prev,
      {
        id: newId,
        templateName: `New ${selectedTxnType} Template`,
        type: 'Scheduled',
        txnType: selectedTxnType,
        interval: 'Every Month',
        previousDate: '',
        nextDate: '11/01/2025',
        customerVendor: 'Sample Vendor',
        amount: '150.00'
      }
    ]);
    setNewTypeModalOpen(false);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white select-none">
      


      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-white flex flex-col">
        <div className="px-8 py-5 max-w-[1600px] w-full">
          
          {/* Header Row: Title + All Lists link + Feedback + Reminder List + New */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-normal text-[#393A3D] leading-tight">
                Recurring Transactions
              </h1>
              <button 
                onClick={() => onNavigate && onNavigate('all_lists')}
                className="text-[14px] text-[#0077C5] hover:underline flex items-center font-medium mt-0.5 cursor-pointer"
              >
                &lt; All Lists
              </button>
            </div>

            {/* Right Action Cluster */}
            <div className="flex items-center space-x-3">
              {/* Give feedback link */}
              <button className="flex items-center space-x-1.5 text-[#2CA01C] hover:text-[#248817] text-[14px] font-semibold cursor-pointer mr-2">
                <MessageSquare size={16} />
                <span>Give feedback</span>
              </button>

              {/* Reminder List split dropdown button */}
              <div className="relative">
                <button 
                  onClick={() => setReminderDropdownOpen(prev => !prev)}
                  className="h-[38px] px-3.5 rounded-[4px] border-[1.5px] border-[#393A3D] bg-white text-[14px] font-semibold text-[#393A3D] hover:bg-[#F4F5F8] flex items-center space-x-2 transition cursor-pointer"
                >
                  <span>Reminder List</span>
                  <div className="w-[1px] h-[20px] bg-[#393A3D] mx-1" />
                  <ChevronDown size={14} className="text-[#393A3D]" />
                </button>

                {reminderDropdownOpen && (
                  <div className="absolute right-0 top-[42px] w-[180px] bg-white rounded shadow-lg border border-[#E3E5E8] z-30 py-1 text-[14px] text-[#393A3D]">
                    <button 
                      onClick={() => setReminderDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                    >
                      Reminder List
                    </button>
                    <button 
                      onClick={() => setReminderDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                    >
                      Recurring Transactions
                    </button>
                    <button 
                      onClick={() => setReminderDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                    >
                      Unscheduled
                    </button>
                  </div>
                )}
              </div>

              {/* New Button (Opens Select Transaction Type modal) */}
              <button 
                onClick={() => setNewTypeModalOpen(true)}
                className="h-[38px] px-6 rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[14px] font-semibold transition cursor-pointer"
              >
                New
              </button>
            </div>
          </div>

          {/* Filter Bar: Filter by Name input + Filter button + "All" + Print / Gear */}
          <div className="flex items-center justify-between mt-6 mb-3">
            <div className="flex items-center space-x-3">
              <input 
                type="text"
                placeholder="Filter by Name"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-[198px] h-[40px] px-3 border border-[#8D9096] rounded-[4px] text-[14px] italic placeholder:italic text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5]"
              />
              <button 
                onClick={handleApplyFilter}
                className="h-[40px] px-6 border-[1.5px] border-[#393A3D] bg-white rounded-[4px] text-[14px] font-semibold text-[#393A3D] hover:bg-[#F4F5F8] transition cursor-pointer"
              >
                Filter
              </button>
              <span className="text-[14px] font-medium text-[#393A3D] ml-1">
                All
              </span>
            </div>

            {/* Right icons: Print & Gear */}
            <div className="flex items-center space-x-3 text-[#9AA0A6]">
              <button className="hover:text-[#393A3D] transition p-1 cursor-pointer" title="Print list">
                <Printer size={18} />
              </button>
              <button className="hover:text-[#393A3D] transition p-1 cursor-pointer" title="Settings">
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Recurring Transactions Table */}
          <div className="border border-[#D4D7DC] rounded-[4px] overflow-hidden bg-white mt-1 shadow-xs">
            <table className="w-full border-collapse text-left text-[14px]">
              {/* Header */}
              <thead>
                <tr className="h-[36px] border-b border-[#D4D7DC] text-[12px] font-semibold text-[#393A3D]">
                  {/* TEMPLATE NAME with gray active sort cell and solid triangle */}
                  <th className="w-[230px] px-3.5 bg-[#ECEEF1] border-r border-[#E3E5E8] cursor-pointer">
                    <div className="flex items-center space-x-1.5">
                      <span className="uppercase tracking-wider">TEMPLATE NAME</span>
                      <span className="text-[10px] leading-none">&#9650;</span>
                    </div>
                  </th>

                  <th className="w-[110px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    TYPE
                  </th>
                  <th className="w-[110px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    TXN TYPE
                  </th>
                  <th className="w-[130px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    INTERVAL
                  </th>
                  <th className="w-[120px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    PREVIOUS DATE
                  </th>
                  <th className="w-[120px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    NEXT DATE
                  </th>
                  <th className="w-[190px] px-3 uppercase tracking-wider border-r border-[#E3E5E8]">
                    CUSTOMER/VENDOR
                  </th>
                  <th className="w-[110px] px-3 uppercase tracking-wider text-right border-r border-[#E3E5E8]">
                    AMOUNT
                  </th>
                  <th className="w-[100px] px-3 uppercase tracking-wider text-right pr-4">
                    ACTION
                  </th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {filteredTemplates.map((row) => (
                  <tr key={row.id} className="h-[46px] border-b border-[#E3E5E8] hover:bg-[#F9FAFB] transition">
                    <td className="px-3.5 font-medium text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.templateName}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.type}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.txnType}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.interval}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.previousDate}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.nextDate}
                    </td>
                    <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.customerVendor}
                    </td>
                    <td className="px-3 text-right text-[#393A3D] border-r border-[#E3E5E8]">
                      {row.amount}
                    </td>
                    <td className="px-3 text-right pr-4 relative">
                      <div className="inline-flex items-center space-x-1">
                        <button 
                          onClick={() => alert(`Editing template: ${row.templateName}`)}
                          className="text-[14px] font-semibold text-[#0077C5] hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => setActionMenuId(actionMenuId === row.id ? null : row.id)}
                          className="text-[#0077C5] hover:text-[#005B94] p-0.5 cursor-pointer"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Dropdown options */}
                      {actionMenuId === row.id && (
                        <div className="absolute right-4 top-[35px] w-[130px] bg-white rounded shadow-lg border border-[#E3E5E8] z-20 py-1 text-[13px] text-left text-[#393A3D]">
                          <button 
                            onClick={() => {
                              alert(`Used template ${row.templateName}`);
                              setActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                          >
                            Use
                          </button>
                          <button 
                            onClick={() => {
                              alert(`Duplicated template ${row.templateName}`);
                              setActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                          >
                            Duplicate
                          </button>
                          <button 
                            onClick={() => {
                              alert(`Paused template ${row.templateName}`);
                              setActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                          >
                            Pause
                          </button>
                          <button 
                            onClick={() => {
                              setTemplates(prev => prev.filter(t => t.id !== row.id));
                              setActionMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination: 1-2 < [ 1 ] > */}
          <div className="flex items-center justify-end space-x-2 mt-4 text-[13px] text-[#6B6C72]">
            <span>1-2</span>
            <button className="text-[#C1C5CA] cursor-not-allowed px-1" disabled>
              &lt;
            </button>
            <div className="w-[28px] h-[28px] rounded border border-[#D4D7DC] bg-[#ECEEF1] text-[#393A3D] font-semibold flex items-center justify-center">
              1
            </div>
            <button className="text-[#C1C5CA] cursor-not-allowed px-1" disabled>
              &gt;
            </button>
          </div>

        </div>
      </div>

      {/* 3. SELECT TRANSACTION TYPE MODAL */}
      {newTypeModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 animate-in fade-in duration-150"
          onClick={() => setNewTypeModalOpen(false)}
        >
          <div 
            className="w-[428px] bg-white rounded-[8px] shadow-[0_12px_40px_rgba(0,0,0,0.25)] border border-[#E3E5E8] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-[28px] font-bold text-[#1F2937] leading-tight max-w-[300px]">
                    Select Transaction Type
                  </h2>
                  <p className="text-[14px] text-[#6B6C72] mt-2">
                    Select the type of template to create
                  </p>
                </div>
                <button 
                  onClick={() => setNewTypeModalOpen(false)}
                  className="text-[#6B6C72] hover:text-[#393A3D] transition -mt-1 -mr-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Input */}
              <div className="mt-6">
                <label className="block text-[14px] font-semibold text-[#393A3D] mb-1.5">
                  Transaction Type
                </label>
                <div className="relative">
                  <select 
                    value={selectedTxnType}
                    onChange={(e) => setSelectedTxnType(e.target.value)}
                    className="w-[260px] h-[40px] px-3 pr-8 border border-[#8D9096] rounded-[4px] text-[15px] text-[#393A3D] bg-white appearance-none focus:outline-none focus:border-[#0077C5] cursor-pointer"
                  >
                    <option value="Bill">Bill</option>
                    <option value="Check">Check</option>
                    <option value="Credit Card Credit">Credit Card Credit</option>
                    <option value="Credit Memo">Credit Memo</option>
                    <option value="Estimate">Estimate</option>
                    <option value="Expense">Expense</option>
                    <option value="Invoice">Invoice</option>
                    <option value="Journal Entry">Journal Entry</option>
                    <option value="Refund Receipt">Refund Receipt</option>
                    <option value="Sales Receipt">Sales Receipt</option>
                    <option value="Transfer">Transfer</option>
                    <option value="Vendor Credit">Vendor Credit</option>
                  </select>
                  <ChevronDown size={16} className="absolute left-[232px] top-[12px] text-[#393A3D] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-[#E3E5E8] w-full mt-4" />

            {/* Footer Buttons */}
            <div className="p-4 px-6 flex items-center justify-end space-x-3 bg-white">
              <button 
                onClick={() => setNewTypeModalOpen(false)}
                className="w-[111px] h-[40px] rounded-[4px] border border-[#8D9096] bg-white text-[14px] font-semibold text-[#393A3D] hover:bg-[#F4F5F8] transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateTemplate}
                className="w-[111px] h-[40px] rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-[14px] font-semibold text-white transition cursor-pointer shadow-xs"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
