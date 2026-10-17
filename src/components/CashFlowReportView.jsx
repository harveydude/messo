import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Share2, Printer, MoreVertical, 
  ChevronDown, ChevronRight, Eye, Table, Filter, Sliders, Settings
} from 'lucide-react';
import CustomizeAppMenusModal from './CustomizeAppMenusModal';
import api from '../api/client';

export default function CashFlowReportView({ onBack, onNavigateReport, isEmbedded = false }) {
  const [reportPeriod, setReportPeriod] = useState('This year to date');
  const [fromDate, setFromDate] = useState('01/01/2025');
  const [toDate, setToDate] = useState('10/24/2025');
  const [threeDotsOpen, setThreeDotsOpen] = useState(false);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [customizeMenusOpen, setCustomizeMenusOpen] = useState(false);
  const [reportCustomName, setReportCustomName] = useState('Statement of Cash Flows - Customized');
  const [liveReport, setLiveReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getCashFlow();
      if (res && res.success && res.report) {
        setLiveReport(res.report);
      }
    } catch (e) {
      console.warn('[Meso Report] Cash Flow fetch warning:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const fmt = (val) => {
    const n = Number(String(val || 0).replace(/,/g, ''));
    const prefix = n < 0 ? '-' : '';
    return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const op = liveReport?.operatingActivities;
  const netIncome = op ? Number(op.netIncome || 0) : 1173680;
  const adjustments = op?.adjustments || [
    { label: 'Change in Accounts Receivable', amount: '-285000.00' },
    { label: 'Change in Accounts Payable', amount: '160267.00' }
  ];
  const netCashFromOps = op ? Number(op.netCashFromOperations || 0) : 1048947;

  const inv = liveReport?.investingActivities;
  const investingItems = inv?.items || [
    { label: 'Purchase of Machinery & Equipment', amount: '-1349500.00' }
  ];
  const netCashFromInvesting = inv ? Number(inv.netCashFromInvesting || 0) : -1349500;

  const fin = liveReport?.financingActivities;
  const financingItems = fin?.items || [
    { label: "Owner's Contribution", amount: '1000000.00' }
  ];
  const netCashFromFinancing = fin ? Number(fin.netCashFromFinancing || 0) : 1000000;

  const netCashIncrease = liveReport ? Number(liveReport.netCashIncrease || 0) : 30560;
  const endingCashBalance = liveReport ? Number(liveReport.endingCashBalance || 0) : 170100;

  // Tree collapse state
  const [openSections, setOpenSections] = useState({
    operating: true,
    adjustments: true,
    investing: true,
    financing: true
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
          <span className="text-gray-500">Last updated a few seconds ago</span>
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
            onClick={() => setCustomizeMenusOpen(true)}
            className="border border-[#2ca01c] text-[#2ca01c] hover:bg-green-50 font-semibold px-2.5 py-1.5 rounded text-xs transition cursor-pointer flex items-center space-x-1"
            title="Customize your app menus"
          >
            <Settings size={13} />
            <span>Customize Menus</span>
          </button>

          <button 
            onClick={() => setSaveAsModalOpen(true)}
            className="bg-[#2ca01c] hover:bg-[#248217] text-white font-semibold px-3 py-1.5 rounded text-xs transition cursor-pointer shadow-xs"
          >
            Save As
          </button>
        </div>
      </div>

      {/* Controls Bar */}
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

          <div className="self-end pb-1">
            <button 
              onClick={() => alert("View options")}
              className="flex items-center space-x-1 text-[#0077c5] hover:underline font-semibold cursor-pointer"
            >
              <Eye size={13} />
              <span>View options</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-gray-700">
          <button 
            onClick={() => alert("Display settings")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <Table size={13} />
            <span>Display</span>
          </button>

          <button 
            onClick={() => alert("Filter by: Class, Location")}
            className="flex items-center space-x-1 hover:text-gray-900 cursor-pointer"
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>

          <button 
            onClick={() => alert("General options")}
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
            <h1 className="text-xl font-bold text-gray-900">Statement of Cash Flows</h1>
            <p className="text-sm font-medium text-gray-800 mt-1">Karan's Design and Landscaping Services</p>
            <p className="text-xs text-gray-600 mt-0.5">January 1-October 24, 2025 · Bangalore, India</p>
          </div>

          {/* Report Table */}
          <div className="border-t border-b border-gray-300">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f4f5f8] border-b border-gray-300 text-gray-800 font-bold text-xs">
                  <th className="py-2.5 px-3 text-left w-3/4">Full Name</th>
                  <th className="py-2.5 px-3 text-right w-1/4">
                    <span className="inline-flex items-center space-x-1">
                      <span>Total (₹)</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {/* OPERATING ACTIVITIES */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('operating')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.operating ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>OPERATING ACTIVITIES</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.operating && (
                  <>
                    <tr>
                      <td className="py-1.5 pl-6 pr-3 text-gray-700">Net Income</td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-semibold">{fmt(netIncome)}</td>
                    </tr>

                    {/* Adjustments */}
                    <tr className="cursor-pointer" onClick={() => toggle('adjustments')}>
                      <td className="py-1.5 pl-6 pr-3 flex items-center space-x-1 font-semibold text-gray-800">
                        {openSections.adjustments ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                        <span>Adjustments to reconcile Net Income to Net Cash provided by Operations</span>
                      </td>
                      <td className="py-1.5 px-3 text-right"></td>
                    </tr>

                    {openSections.adjustments && (
                      <>
                        {adjustments.map((adj, i) => (
                          <tr key={i}>
                            <td className="py-1 pl-10 pr-3 text-gray-600">{adj.label}</td>
                            <td className="py-1 px-3 text-right tabular-nums">{fmt(adj.amount)}</td>
                          </tr>
                        ))}
                      </>
                    )}

                    <tr className="font-semibold text-gray-900 border-t border-gray-200 bg-gray-50/30">
                      <td className="py-1.5 px-3">Net cash provided by operating activities</td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-bold">{fmt(netCashFromOps)}</td>
                    </tr>
                  </>
                )}

                {/* INVESTING ACTIVITIES */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('investing')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.investing ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>INVESTING ACTIVITIES</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.investing && (
                  <>
                    {investingItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pl-6 pr-3 text-gray-700">{item.label}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-gray-900 border-t border-gray-200 bg-gray-50/30">
                      <td className="py-1.5 px-3">Net cash provided by investing activities</td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-bold">{fmt(netCashFromInvesting)}</td>
                    </tr>
                  </>
                )}

                {/* FINANCING ACTIVITIES */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('financing')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.financing ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>FINANCING ACTIVITIES</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.financing && (
                  <>
                    {financingItems.map((item, i) => (
                      <tr key={i}>
                        <td className="py-1.5 pl-6 pr-3 text-gray-700">{item.label}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold text-gray-900 border-t border-gray-200 bg-gray-50/30">
                      <td className="py-1.5 px-3">Net cash provided by financing activities</td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-bold">{fmt(netCashFromFinancing)}</td>
                    </tr>
                  </>
                )}

                {/* NET CASH INCREASE FOR PERIOD */}
                <tr className="font-bold text-gray-900 bg-gray-100 border-t-2 border-b border-gray-400">
                  <td className="py-2 px-3">NET CASH INCREASE FOR PERIOD</td>
                  <td className="py-2 px-3 text-right tabular-nums font-bold">{fmt(netCashIncrease)}</td>
                </tr>

                <tr>
                  <td className="py-1.5 px-3 text-gray-700">Cash at beginning of period</td>
                  <td className="py-1.5 px-3 text-right tabular-nums">₹0.00</td>
                </tr>

                {/* Cash at end of period */}
                <tr className="font-extrabold text-sm text-gray-900 bg-gray-100 border-t-2 border-b-4 border-gray-900">
                  <td className="py-3 px-3">Cash at end of period</td>
                  <td className="py-3 px-3 text-right tabular-nums text-base text-gray-900">{fmt(endingCashBalance)}</td>
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

      {/* Customize App Menus Modal (Screenshot 4) */}
      <CustomizeAppMenusModal 
        isOpen={customizeMenusOpen}
        onClose={() => setCustomizeMenusOpen(false)}
        onSave={(apps) => {
          alert("App menus updated and pinned preferences saved.");
        }}
      />
    </div>
  );
}
