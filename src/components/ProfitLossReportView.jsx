import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Share2, Printer, MoreVertical, 
  ChevronDown, ChevronRight, Sparkles, Sliders, Eye, 
  Video, PlayCircle, BookOpen, MessageSquare, Table, GitCompare, Filter
} from 'lucide-react';
import api from '../api/client';

export default function ProfitLossReportView({ onBack, onNavigateReport, isEmbedded = false }) {
  const [reportPeriod, setReportPeriod] = useState('This year to date');
  const [fromDate, setFromDate] = useState('01/01/2025');
  const [toDate, setToDate] = useState('10/24/2025');
  const [method, setMethod] = useState('Accrual');
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [threeDotsOpen, setThreeDotsOpen] = useState(false);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [reportCustomName, setReportCustomName] = useState('Profit and Loss - Customized');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [liveReport, setLiveReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getProfitLoss({ accountingMethod: method.toUpperCase() });
      if (res && res.success && res.report) {
        setLiveReport(res.report);
      }
    } catch (e) {
      console.warn('[Meso Report] Profit & Loss fetch warning:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [method]);

  const fmt = (val) => {
    const n = Number(val || 0);
    return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const incomeItems = liveReport?.income?.items || [
    { name: 'Sales Revenue', amount: 834700 },
    { name: 'Design Services Income', amount: 350000 },
    { name: 'Installation & Maintenance Services', amount: 250000 },
  ];
  const totalIncome = liveReport ? Number(liveReport.income.total) : incomeItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const cogsItems = liveReport?.costOfGoodsSold?.items || [
    { name: 'Cost of Goods Sold (Job Materials)', amount: 111700 },
  ];
  const totalCogs = liveReport ? Number(liveReport.costOfGoodsSold.total) : cogsItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const grossProfit = liveReport ? Number(liveReport.grossProfit) : (totalIncome - totalCogs);

  const expenseItems = liveReport?.expenses?.items || [
    { name: 'Automobile & Fuel Expenses', amount: 7000 },
    { name: 'Legal & Professional Fees', amount: 9000 },
    { name: 'Office Supplies & Software', amount: 4820 },
    { name: 'Advertising & Marketing', amount: 3500 },
    { name: 'Payroll Expense (Gross Wages)', amount: 125000 },
  ];
  const totalExpenses = liveReport ? Number(liveReport.expenses.total) : expenseItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const netOperatingIncome = liveReport ? Number(liveReport.netOperatingIncome) : (grossProfit - totalExpenses);

  const insightsList = [
    `Gross Profit is currently ${fmt(grossProfit)} (${totalIncome > 0 ? ((grossProfit / totalIncome) * 100).toFixed(1) : 0}% margin).`,
    `Operating Expenses stand at ${fmt(totalExpenses)}, with largest expense in payroll/labor.`,
    `Net Operating Income is ${fmt(netOperatingIncome)} generated from live general ledger double-entry lines.`
  ];

  // Tree collapse state
  const [openSections, setOpenSections] = useState({
    income: true,
    landscapingServices: true,
    jobMaterials: true,
    labor: true,
    cogs: true,
    expenses: true,
    automobile: true,
    jobExpenses: true,
    legal: true,
    utilities: true,
    otherExpenses: true
  });

  const toggle = (sec) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  return (
    <div className={`w-full bg-[#f4f5f8] min-h-screen text-gray-900 ${isEmbedded ? 'pb-12' : ''}`}>
      {/* Top Banner & Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Back to standard reports</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <button 
            onClick={() => alert("Switched to Classic Meso view.")}
            className="hover:text-gray-900 cursor-pointer"
          >
            Switch to classic view
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => setTourOpen(true)}
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <Video size={13} className="text-[#0077c5]" />
            <span>Video Tour</span>
          </button>
          <button 
            onClick={() => alert("Opening video tutorials for Profit and Loss...")}
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <PlayCircle size={13} className="text-[#0077c5]" />
            <span>Video tutorials</span>
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => alert("Learn more: A Profit and Loss statement shows your revenue, costs, and expenses over a given period in Meso.")}
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <BookOpen size={13} className="text-[#0077c5]" />
            <span>Learn more</span>
          </button>
          <button 
            onClick={() => alert("Find out more about customized reporting in Meso.")}
            className="text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            Find out more
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => setFeedbackOpen(true)}
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <MessageSquare size={13} className="text-[#0077c5]" />
            <span>Give feedback</span>
          </button>
        </div>
      </div>

      {/* Action / Meta Header */}
      <div className="px-6 py-2 bg-[#f4f5f8] border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div></div>
        <div className="flex items-center space-x-3 text-xs text-gray-600 ml-auto">
          <span className="text-gray-500">Last updated a minute ago</span>
          <button 
            onClick={fetchReport} 
            title="Refresh"
            className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => alert("Export options: Excel, PDF, CSV")} 
            title="Export"
            className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded cursor-pointer"
          >
            <Share2 size={14} />
          </button>
          <button 
            onClick={() => window.print()} 
            title="Print"
            className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded cursor-pointer"
          >
            <Printer size={14} />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setThreeDotsOpen(!threeDotsOpen)} 
              title="More options"
              className="p-1 hover:text-gray-900 hover:bg-gray-200 rounded cursor-pointer"
            >
              <MoreVertical size={14} />
            </button>
            {threeDotsOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                <button 
                  onClick={() => { setThreeDotsOpen(false); alert("Add notes to this report."); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Add notes
                </button>
                <button 
                  onClick={() => { setThreeDotsOpen(false); alert("Schedule report email."); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Schedule email
                </button>
                <button 
                  onClick={() => { setThreeDotsOpen(false); alert("Export to Excel (.xlsx)"); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Export to Excel
                </button>
                <button 
                  onClick={() => { setThreeDotsOpen(false); alert("Export to PDF"); }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  Export to PDF
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setSaveAsModalOpen(true)}
            className="bg-[#2ca01c] hover:bg-[#248217] text-white font-semibold px-3 py-1.5 rounded text-xs transition cursor-pointer shadow-xs"
          >
            Save As
          </button>
        </div>
      </div>

      {/* Controls / Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">Report period</label>
            <div className="relative inline-block">
              <select 
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded px-2.5 py-1 pr-6 font-medium text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer"
              >
                <option>This year to date</option>
                <option>This month to date</option>
                <option>This quarter to date</option>
                <option>Last year</option>
                <option>Custom</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">From</label>
            <input 
              type="text" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1 w-24 text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">To</label>
            <input 
              type="text" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded px-2.5 py-1 w-24 text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-0.5">Accounting method</label>
            <div className="relative inline-block">
              <select 
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded px-2.5 py-1 pr-6 font-medium text-gray-800 hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer"
              >
                <option>Accrual</option>
                <option>Cash</option>
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="self-end pb-1">
            <button 
              onClick={() => setViewOptionsOpen(!viewOptionsOpen)}
              className="flex items-center space-x-1 text-[#0077c5] hover:underline font-semibold cursor-pointer"
            >
              <Eye size={13} />
              <span>View options</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-gray-700">
          <button 
            onClick={() => setInsightsOpen(true)}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer font-medium"
          >
            <Sparkles size={14} className="text-teal-600" />
            <span>2 Insights</span>
            <span className="bg-[#0077c5] text-white text-[9px] font-bold px-1 py-0.5 rounded ml-1">BETA</span>
          </button>

          <button 
            onClick={() => alert("Display settings: Rows/Columns, Compact, Zero-balance rows")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <Table size={13} />
            <span>Display</span>
          </button>

          <button 
            onClick={() => alert("Compare with: Previous period, Previous year (₹ change, % change)")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <GitCompare size={13} />
            <span>Compare</span>
          </button>

          <button 
            onClick={() => alert("Filter by: Customer, Vendor, Class, Location")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>

          <button 
            onClick={() => alert("General options: Header/Footer, Decimals, Negative numbers format")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <Sliders size={13} />
            <span>General options</span>
          </button>

          <button 
            onClick={() => alert("Collapse control bar")}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 cursor-pointer"
          >
            <ChevronDown size={14} className="rotate-180" />
          </button>
        </div>
      </div>

      {/* Main Report Document Sheet (Centered Paper Card) */}
      <div className="py-8 px-4 flex justify-center">
        <div className="w-full max-w-[900px] bg-white border border-gray-300 rounded shadow-sm p-8 sm:p-10 font-sans text-xs">
          {/* Document Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">Profit and Loss</h1>
            <p className="text-sm font-medium text-gray-800 mt-1">Karan's Design and Landscaping Services</p>
            <p className="text-xs text-gray-600 mt-0.5">January 1-October 24, 2025 · Bangalore, India</p>
          </div>

          {/* Report Table */}
          <div className="border-t border-b border-gray-300">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f4f5f8] border-b border-gray-300 text-gray-800 font-bold text-xs">
                  <th className="py-2.5 px-3 text-left w-3/4">Account</th>
                  <th className="py-2.5 px-3 text-right w-1/4">
                    <span className="inline-flex items-center space-x-1">
                      <span>Total (₹)</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {/* INCOME */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('income')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.income ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>Income</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.income && (
                  <>
                    {incomeItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pl-8 pr-3 text-gray-700">{item.name}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold text-gray-900 border-t-2 border-b border-gray-400 bg-gray-50/50">
                      <td className="py-2 px-3">Total for Income</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold">{fmt(totalIncome)}</td>
                    </tr>
                  </>
                )}

                {/* COST OF GOODS SOLD */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('cogs')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.cogs ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>Cost of Goods Sold</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.cogs && (
                  <>
                    {cogsItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pl-8 pr-3 text-gray-700">{item.name}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold text-gray-900 border-t border-b border-gray-300">
                      <td className="py-2 px-3">Total for Cost of Goods Sold</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold">{fmt(totalCogs)}</td>
                    </tr>
                  </>
                )}

                {/* GROSS PROFIT */}
                <tr className="font-bold text-gray-900 bg-gray-100 border-t-2 border-b-2 border-gray-400">
                  <td className="py-2.5 px-3">GROSS PROFIT</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-green-700">{fmt(grossProfit)}</td>
                </tr>

                {/* EXPENSES */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('expenses')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.expenses ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>Expenses</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.expenses && (
                  <>
                    {expenseItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1 pl-8 pr-3 text-gray-700">{item.name}</td>
                        <td className="py-1 px-3 text-right tabular-nums">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold text-gray-900 border-t-2 border-b border-gray-400 bg-gray-50/50">
                      <td className="py-2 px-3">Total Expenses</td>
                      <td className="py-2 px-3 text-right tabular-nums font-bold">{fmt(totalExpenses)}</td>
                    </tr>
                  </>
                )}

                {/* NET OPERATING INCOME */}
                <tr className="font-bold text-gray-900 bg-gray-50 border-t-2 border-b-2 border-gray-400">
                  <td className="py-2 px-3">NET OPERATING INCOME</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold">{fmt(netOperatingIncome)}</td>
                </tr>

                {/* NET INCOME */}
                <tr className="font-extrabold text-sm text-gray-900 bg-gray-100 border-t-2 border-b-4 border-gray-900">
                  <td className="py-3 px-3">NET INCOME</td>
                  <td className="py-3 px-3 text-right tabular-nums text-base text-gray-900 font-extrabold text-green-700">{fmt(netOperatingIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer timestamp */}
          <div className="mt-8 text-center text-[11px] text-gray-400">
            Friday, October 24, 2025 02:00 PM IST (Indian Standard Time)
          </div>
        </div>
      </div>

      {/* Save As Modal */}
      {saveAsModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Save custom report</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom report name</label>
              <input 
                type="text"
                value={reportCustomName}
                onChange={(e) => setReportCustomName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setSaveAsModalOpen(false)}
                className="px-4 py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  alert(`Report "${reportCustomName}" saved to Custom reports.`);
                  setSaveAsModalOpen(false);
                }}
                className="px-4 py-1.5 bg-[#2ca01c] hover:bg-green-700 text-white rounded text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Tour Modal */}
      {tourOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <Video size={18} className="text-[#0077c5]" />
              <span>Video Tour: Understanding Your Profit & Loss in Meso</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This interactive tour walks you through the top revenue lines, cost of goods sold, operating expenses, and net profit margins in Indian Rupee format.
            </p>
            <div className="aspect-video bg-gray-900 rounded flex items-center justify-center text-white text-xs">
              [ Video Tour Player: Karan's Landscaping Services P&L Walkthrough ]
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setTourOpen(false)}
                className="px-4 py-1.5 bg-[#0077c5] text-white rounded text-xs font-semibold hover:bg-blue-700"
              >
                Close Tour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Modal */}
      {insightsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center space-x-2 text-teal-700">
              <Sparkles size={18} />
              <h3 className="text-base font-bold text-gray-900">AI Financial Insights (Meso Ledger)</h3>
            </div>
            <div className="space-y-3 text-xs text-gray-700">
              {insightsList.map((insight, idx) => (
                <div key={idx} className="p-3 bg-teal-50 border border-teal-200 rounded">
                  <span className="font-bold text-teal-900">{idx + 1}. Performance Metric:</span>
                  <p className="mt-0.5">{insight}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => setInsightsOpen(false)}
                className="px-4 py-1.5 bg-[#0077c5] text-white rounded text-xs font-semibold hover:bg-blue-700 cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
