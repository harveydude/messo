import React, { useState } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  Plus, 
  Copy, 
  Settings, 
  Upload, 
  Bot, 
  CheckCircle, 
  Building,
  Info
} from 'lucide-react';

export default function BusinessFeedView() {
  const [tone, setTone] = useState("😐 Formal");
  const [copied, setCopied] = useState(false);

  const banks = [
    { name: "Citi Bank", color: "text-blue-600" },
    { name: "Chase", color: "text-blue-800" },
    { name: "U.S. Bank", color: "text-red-700" },
    { name: "Bank of America", color: "text-red-600" },
    { name: "Wells Fargo", color: "text-amber-700" },
    { name: "Capital One", color: "text-red-800" }
  ];

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("sample_company_7825+expense@qbo.intuit.com");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Feed</h1>
        <div className="flex items-center space-x-1.5 text-xs text-gray-600 mt-1">
          <Sparkles size={14} className="text-[#0077c5]" />
          <span>Here are the latest suggestions and work done for you, TeachUcomp!</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Main Feed Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: AI Personalized Reminders */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs relative overflow-hidden space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-50 to-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="text-xs font-semibold bg-white border border-gray-300 rounded-lg px-3 py-1.5 shadow-2xs focus:outline-none"
                >
                  <option>😐 Formal</option>
                  <option>😊 Friendly</option>
                  <option>⚡ Direct & Urgent</option>
                </select>
                <span className="text-xs text-gray-600 truncate max-w-sm">
                  Hi Christine, this invoice was due 07-12-2024 and is now 4 days overdue. The outstanding balance is $3,190.65...
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Personalized reminders can get you paid on time
                </h3>
                <button className="text-xs text-[#0077c5] hover:underline font-semibold flex items-center space-x-1 mt-1">
                  <span>Learn how</span>
                  <ChevronDown size={12} />
                </button>
              </div>

              <button className="px-5 py-2 rounded-full border-2 border-gray-900 font-bold text-xs text-gray-900 hover:bg-gray-50 transition shrink-0">
                Try it out
              </button>
            </div>
          </div>

          {/* Card 2: Connect Bank Account Grid */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                <Building size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Bank transactions</div>
                <div className="text-sm font-bold text-gray-900">Connect account</div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Connect an account to bring in transactions
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                See your business finances clearly by tracking income and expenses automatically
              </p>
            </div>

            {/* Bank grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {banks.map((bank, i) => (
                <div 
                  key={i}
                  className="border border-gray-200 hover:border-[#2ca01c] hover:shadow-xs p-3 rounded-lg flex items-center justify-between cursor-pointer transition bg-white"
                >
                  <span className={`text-xs font-bold ${bank.color}`}>{bank.name}</span>
                  <button className="p-1 rounded-full text-blue-600 hover:bg-blue-50">
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Autofill & AI Agents Panel */}
        <div className="space-y-6">
          {/* Autofill Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Autofill</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            <select className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white">
              <option>Bill</option>
              <option>Expense</option>
              <option>Receipt</option>
            </select>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-sky-300 rounded-xl p-5 text-center bg-sky-50/30 hover:bg-sky-50/60 transition cursor-pointer">
              <Upload size={22} className="mx-auto text-sky-600 mb-2" />
              <div className="text-xs font-semibold text-gray-900">
                Select a file or drag and drop here
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                Supported formats: .pdf, .jpg, .png
              </div>
            </div>

            {/* Email Forwarding */}
            <div className="space-y-1">
              <div className="text-[11px] text-gray-500 font-medium">Or forward bill-related emails here:</div>
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 text-xs">
                <span className="truncate text-gray-700 font-mono text-[11px]">sample_company_7825+expense...</span>
                <button 
                  onClick={handleCopyEmail}
                  className="text-gray-500 hover:text-gray-800 ml-2"
                  title="Copy email"
                >
                  {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button className="text-xs text-gray-600 hover:text-gray-900 flex items-center space-x-1.5 pt-1">
              <Settings size={13} />
              <span>Manage settings</span>
            </button>
          </div>

          {/* Intuit's AI Agents Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Intuit's AI agents</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            <div className="text-xs text-gray-500 font-medium">
              3 active agents included in your plan.
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-gray-50/80">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  A
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Accounting Agent</div>
                  <div className="text-[11px] text-gray-500">Automates categorization and expense tracking.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-gray-50/80">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Payments Agent</div>
                  <div className="text-[11px] text-gray-500">Helps create tailored strategies to get paid faster.</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-2.5 rounded-lg bg-gray-50/80">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  C
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">Customer Agent</div>
                  <div className="text-[11px] text-gray-500">Prioritizes leads and personalizes email followups.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <button className="text-xs text-gray-400 hover:underline">
          Important information about how we use generative AI
        </button>
      </div>
    </div>
  );
}
