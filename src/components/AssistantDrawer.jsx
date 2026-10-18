import React, { useState } from 'react';
import { X, Search, Send, HelpCircle, Check } from 'lucide-react';
import dashboardData from '../data/dashboard.json';

export default function AssistantDrawer({ isOpen, onClose, onLaunchRecode }) {
  const [activeTab, setActiveTab] = useState('assistant');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const suggestions = [
    "Why did my expenses go up last month?",
    "What is my net GST payable for this month?",
    "Are any MSME vendor bills approaching the 45-day deadline?",
    "How do I reconcile my HDFC bank statement?",
    "How can I import Tally data or bank CSV files?"
  ];

  const handleSend = (text) => {
    if (!text || !text.trim()) return;
    const query = text.trim();
    setInputValue('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: query }]);

    // Intelligent financial assistant response from Meso GL Intelligence
    setTimeout(() => {
      const q = query.toLowerCase();
      let reply = '';
      let isAnomaly = false;

      if (q.includes('expense') || q.includes('last month') || q.includes('why did')) {
        isAnomaly = true;
        reply = `**General Ledger Analysis:**\nOperating expenses rose in May 2026. This was driven by a single payment to **Kanto Outdoor Media Pvt Ltd (₹8,75,000.00)** on 18/05/2026.\n\n⚠️ **Accounting Anomaly Detected:**\nThe attached supplier invoice indicates this ₹8,75,000 payment was a booking advance for billboard campaigns running in **July & August 2026**.\n\n💡 **Recommended Adjustment:**\nUnder Indian AS 1 / Accrual Accounting, this advance booking deposit must be reclassified from General Expense to **Prepaid Expenses (Current Asset)**, which will immediately restore your normalized monthly profit margin.`;
      } else if (q.includes('gst') || q.includes('tax')) {
        reply = `**GST Compliance Intelligence:**\nBased on outward sales and Input Tax Credit (ITC) logs for the current period:\n• **Total Outward Tax (CGST + SGST + IGST):** ₹1,86,200.00\n• **Eligible ITC in Electronic Credit Ledger:** ₹54,300.00\n• **Net Cash Payable (GSTR-3B):** ₹1,31,900.00\n\nYou can review your full return schedule under **GST Returns (GSTR-1/3B)** in the top navigation.`;
      } else if (q.includes('msme') || q.includes('45')) {
        reply = `**MSME (Udyam) Compliance Shield:**\nUnder Section 43B(h) of the Income Tax Act, payments to registered Micro and Small enterprises must be settled within 15 days (or 45 days with a written contract).\n\n• **Compliance Status:** SAFE (0 Breached Bills)\n• **Approaching Deadline:** 1 Vendor bill due within 5 days\n• **Interest Saved:** ₹0 penal interest at 3x RBI Bank Rate\n\nAll expenses remain 100% tax-deductible for the current fiscal year.`;
      } else if (q.includes('reconcil') || q.includes('bank')) {
        reply = `**Bank Reconciliation Assistant:**\nTo reconcile your HDFC Current Account:\n1. Open **Banking > Reconcile**.\n2. Review opening balance vs. bank statement closing balance.\n3. Match matched feed entries (green checkmarks) and clear remaining interest or bank fee adjustments to achieve a **Difference of ₹0.00**.`;
      } else {
        reply = `Here is what I found for **"${query}"**:\n\nYou can manage this directly under **Banking > Transactions**, or click the **Pills** at the top of your dashboard to jump into your accounting modules, GST returns, or financial statements.`;
      }

      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: reply,
          isAnomaly
        }
      ]);
    }, 450);
  };

  return (
    <div 
      className="fixed top-0 right-0 w-[637px] h-screen bg-white shadow-[-4px_0_24px_rgba(0,0,0,0.14)] z-[80] flex flex-col select-none animate-in slide-in-from-right duration-200"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* 1. Solid Blue Header Band (85px) */}
      <div className="h-[85px] w-full bg-[#0077C5] px-6 flex items-center justify-between shrink-0">
        <div className="text-white font-semibold text-[18px] flex items-center space-x-2.5">
          <HelpCircle size={20} className="text-[#80D0FF]" />
          <span>Meso Assistant</span>
        </div>

        <button 
          onClick={onClose}
          className="text-white hover:opacity-80 p-1.5 rounded-full transition cursor-pointer"
          title="Close assistant"
        >
          <X size={22} />
        </button>
      </div>

      {/* 2. Half-Width Tabs (Assistant / Search) */}
      <div className="h-[56px] border-b border-[#E3E5E8] flex shrink-0">
        {/* Assistant Tab (50% width, 3px green underline spans entire half) */}
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex-1 flex items-center justify-center space-x-2 text-[15px] font-semibold transition cursor-pointer relative ${
            activeTab === 'assistant' ? 'text-[#393A3D]' : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          {/* Teal circular spiral icon */}
          <div className="w-[18px] h-[18px] rounded-full border-2 border-[#0E9F9F] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[#0E9F9F]" />
          </div>
          <span>Assistant</span>

          {activeTab === 'assistant' && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2CA01C]" />
          )}
        </button>

        {/* Search Tab (50% width) */}
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 flex items-center justify-center space-x-2 text-[15px] font-semibold transition cursor-pointer relative ${
            activeTab === 'search' ? 'text-[#393A3D]' : 'text-[#6B6C72] hover:text-[#393A3D]'
          }`}
        >
          <Search size={16} className="text-[#6B6C72]" />
          <span>Search</span>

          {activeTab === 'search' && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2CA01C]" />
          )}
        </button>
      </div>

      {/* 3. Tab Body */}
      {activeTab === 'assistant' ? (
        <div className="flex-1 flex flex-col justify-between overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome State (Screenshot 1) */
            <div className="flex-1 flex flex-col justify-end px-5 pb-8 pt-12">
              {/* Centered Welcome Title & Subtitle */}
              <div className="text-center mb-10">
                <h2 className="text-[30px] font-semibold text-[#393A3D] mb-2">
                  Welcome
                </h2>
                <p className="text-[15px] text-[#6B6C72]">
                  Here are a few things I can help you with.
                </p>
              </div>

              {/* 4 Suggestion Chips (Exact 25px gap, pale cyan) */}
              <div className="space-y-[25px]">
                {suggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="w-full h-[44px] px-4 rounded-[8px] bg-[#DFF3F8] hover:bg-[#CFE9F2] text-[15px] text-[#393A3D] text-left transition cursor-pointer flex items-center truncate"
                  >
                    <span className="truncate">{chip}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Chat State */
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {messages.map((m, idx) => (
                <div 
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-[10px] p-4 text-[13.5px] leading-relaxed whitespace-pre-line ${
                      m.role === 'user' 
                        ? 'bg-[#DFF3F8] text-[#393A3D]' 
                        : 'bg-[#F4F5F7] text-[#393A3D] border border-[#E3E5E8]'
                    }`}
                  >
                    <div>{m.text}</div>
                    {m.isAnomaly && onLaunchRecode && (
                      <div className="mt-3 pt-2.5 border-t border-purple-200">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onLaunchRecode();
                          }}
                          className="px-3.5 py-1.5 rounded-md bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-[12px] font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <Check size={13} />
                          <span>Resolve Anomaly &amp; Reclassify (Module 29)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Composer Input Bar */}
          <div className="p-4 border-t border-[#E3E5E8] bg-white flex items-center space-x-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
              placeholder="Ask anything about your books..."
              className="flex-1 h-[42px] px-4 border border-[#8D9096] rounded-full text-[15px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
            />
            <button
              onClick={() => handleSend(inputValue)}
              className="w-[42px] h-[42px] rounded-full bg-[#0077C5] hover:bg-[#005e9e] text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        /* Search Tab Stub */
        <div className="flex-1 p-8 text-center text-[#6B6C72] flex flex-col items-center justify-center">
          <Search size={40} className="mb-4 text-[#9DA2A8]" />
          <h3 className="text-[18px] font-semibold text-[#393A3D] mb-1">
            Search Assistant
          </h3>
          <p className="text-[14px]">
            Search Meso help articles and documentation topics.
          </p>
        </div>
      )}
    </div>
  );
}
