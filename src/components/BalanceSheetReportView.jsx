import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, RefreshCw, Share2, Printer, MoreVertical, 
  ChevronDown, ChevronRight, Sparkles, Sliders, Eye, 
  Video, PlayCircle, BookOpen, MessageSquare, Table, GitCompare, Filter
} from 'lucide-react';
import api from '../api/client';

export default function BalanceSheetReportView({ onBack, onNavigateReport, isEmbedded = false }) {
  const [reportPeriod, setReportPeriod] = useState('This year to date');
  const [fromDate, setFromDate] = useState('01/01/2025');
  const [toDate, setToDate] = useState('10/24/2025');
  const [method, setMethod] = useState('Accrual');
  const [viewOptionsOpen, setViewOptionsOpen] = useState(false);
  const [threeDotsOpen, setThreeDotsOpen] = useState(false);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [reportCustomName, setReportCustomName] = useState('Balance Sheet - Customized');
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [tourOpen, setTourOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [liveReport, setLiveReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.getBalanceSheet({ accountingMethod: method.toUpperCase() });
      if (res && res.success && res.report) {
        setLiveReport(res.report);
      }
    } catch (e) {
      console.warn('[Meso Report] Balance sheet fetch warning:', e);
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

  const bankAccounts = liveReport?.assets?.items?.filter(i => i.type === 'BANK' || i.subType === 'bank' || i.subType === 'cash') || [
    { name: 'Checking Account (HDFC)', amount: 120100 },
    { name: 'Savings Reserve (SBI)', amount: 500000 },
    { name: 'Cash on Hand', amount: 50000 },
  ];
  const totalBank = bankAccounts.reduce((s, i) => s + Number(i.amount || 0), 0);

  const arItems = liveReport?.assets?.items?.filter(i => i.type === 'ACCOUNTS_RECEIVABLE' || i.subType === 'receivable') || [
    { name: 'Accounts Receivable (A/R)', amount: 285000 },
  ];
  const totalAr = arItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const otherCurrentAssets = liveReport?.assets?.items?.filter(i => ['INVENTORY', 'ASSET'].includes(i.type) && i.subType !== 'cash') || [
    { name: 'Inventory Asset', amount: 50000 },
    { name: 'GST Input Tax Credit (ITC)', amount: 1200 },
  ];
  const totalOtherCurrent = otherCurrentAssets.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCurrentAssets = totalBank + totalAr + totalOtherCurrent;

  const fixedAssets = liveReport?.assets?.items?.filter(i => i.type === 'FIXED_ASSET' || i.subType === 'fixed_asset') || [
    { name: 'Machinery & Equipment', amount: 1349500 },
  ];
  const totalFixedAssets = fixedAssets.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalAssets = liveReport ? Number(liveReport.assets.total) : (totalCurrentAssets + totalFixedAssets);

  const apItems = liveReport?.liabilities?.items?.filter(i => i.type === 'ACCOUNTS_PAYABLE') || [
    { name: 'Accounts Payable (A/P)', amount: 160267 },
  ];
  const totalAp = apItems.reduce((s, i) => s + Number(i.amount || 0), 0);

  const creditCards = liveReport?.liabilities?.items?.filter(i => i.type === 'CREDIT_CARD') || [
    { name: 'Mastercard Credit Account', amount: 15772 },
  ];
  const totalCreditCards = creditCards.reduce((s, i) => s + Number(i.amount || 0), 0);

  const otherLiabilities = liveReport?.liabilities?.items?.filter(i => ['TAX_PAYABLE', 'LIABILITY'].includes(i.type)) || [
    { name: 'GST Output Payable (18%)', amount: 4500 },
    { name: 'Payroll Liabilities', amount: 25000 },
  ];
  const totalOtherLiab = otherLiabilities.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCurrentLiabilities = totalAp + totalCreditCards + totalOtherLiab;
  const totalLiabilities = liveReport ? Number(liveReport.liabilities.total) : totalCurrentLiabilities;

  const equityItems = liveReport?.equity?.items || [
    { name: "Owner's Equity", amount: 1000000 },
    { name: 'Retained Earnings', amount: 549330 },
    { name: 'Net Income (Year to Date)', amount: 1173680 },
  ];
  const totalEquity = liveReport ? Number(liveReport.equity.total) : equityItems.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalLiabilitiesAndEquity = liveReport ? Number(liveReport.totalLiabilitiesAndEquity) : (totalLiabilities + totalEquity);

  const insightsList = liveReport?.ai_insights?.length > 0 ? liveReport.ai_insights : [
    "Liquidity health is strong: Current checking balance stands at ₹1,20,100.00.",
    "Debt-to-equity ratio remains at a conservative 0.16.",
    "Total Net Income YTD is ₹11,73,680.00 with 78% gross margin."
  ];

  // Tree collapse state
  const [openSections, setOpenSections] = useState({
    assets: true,
    currentAssets: true,
    bankAccounts: true,
    accountsReceivable: true,
    otherCurrentAssets: true,
    fixedAssets: true,
    truck: true,
    liabilitiesAndEquity: true,
    currentLiabilities: true,
    creditCards: true,
    otherCurrentLiabilities: true,
    longTermLiabilities: true,
    equity: true
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
            onClick={() => alert("Opening video tutorials for Balance Sheet...")}
            className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer"
          >
            <PlayCircle size={13} className="text-[#0077c5]" />
            <span>Video tutorials</span>
          </button>
          <span className="text-gray-300">|</span>
          <button 
            onClick={() => alert("Learn more: The Balance Sheet gives a snapshot of your company's financial condition in Meso at a single point in time.")}
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
            <span>4 Insights</span>
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
            <h1 className="text-xl font-bold text-gray-900">Balance Sheet</h1>
            <p className="text-sm font-medium text-gray-800 mt-1">Karan's Design and Landscaping Services</p>
            <p className="text-xs text-gray-600 mt-0.5">As of October 24, 2025 · Bangalore, India</p>
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
                {/* ASSETS */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('assets')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.assets ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>Assets</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.assets && (
                  <>
                    {/* Current Assets */}
                    <tr className="cursor-pointer" onClick={() => toggle('currentAssets')}>
                      <td className="py-1.5 pl-6 pr-3 flex items-center space-x-1 font-semibold text-gray-800">
                        {openSections.currentAssets ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                        <span>Current Assets</span>
                      </td>
                      <td className="py-1.5 px-3 text-right"></td>
                    </tr>

                    {openSections.currentAssets && (
                      <>
                        {/* Bank Accounts */}
                        <tr className="cursor-pointer" onClick={() => toggle('bankAccounts')}>
                          <td className="py-1 pl-10 pr-3 flex items-center space-x-1 font-medium text-gray-700">
                            {openSections.bankAccounts ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                            <span>Bank Accounts</span>
                          </td>
                          <td className="py-1 px-3 text-right"></td>
                        </tr>

                        {openSections.bankAccounts && (
                          <>
                            {bankAccounts.map((acc, i) => (
                              <tr key={i}>
                                <td className="py-1 pl-14 pr-3 text-gray-600">{acc.name}</td>
                                <td className="py-1 px-3 text-right tabular-nums">{fmt(acc.amount)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold text-gray-800 border-t border-gray-200">
                              <td className="py-1 pl-10 pr-3">Total for Bank Accounts</td>
                              <td className="py-1 px-3 text-right tabular-nums">{fmt(totalBank)}</td>
                            </tr>
                          </>
                        )}

                        {/* Accounts Receivable */}
                        <tr className="cursor-pointer" onClick={() => toggle('accountsReceivable')}>
                          <td className="py-1 pl-10 pr-3 flex items-center space-x-1 font-medium text-gray-700">
                            {openSections.accountsReceivable ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                            <span>Accounts Receivable</span>
                          </td>
                          <td className="py-1 px-3 text-right"></td>
                        </tr>

                        {openSections.accountsReceivable && (
                          <>
                            {arItems.map((acc, i) => (
                              <tr key={i}>
                                <td className="py-1 pl-14 pr-3 text-gray-600">{acc.name}</td>
                                <td className="py-1 px-3 text-right tabular-nums">{fmt(acc.amount)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold text-gray-800 border-t border-gray-200">
                              <td className="py-1 pl-10 pr-3">Total for Accounts Receivable</td>
                              <td className="py-1 px-3 text-right tabular-nums">{fmt(totalAr)}</td>
                            </tr>
                          </>
                        )}

                        {/* Other Current Assets */}
                        <tr className="cursor-pointer" onClick={() => toggle('otherCurrentAssets')}>
                          <td className="py-1 pl-10 pr-3 flex items-center space-x-1 font-medium text-gray-700">
                            {openSections.otherCurrentAssets ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                            <span>Other Current Assets</span>
                          </td>
                          <td className="py-1 px-3 text-right"></td>
                        </tr>

                        {openSections.otherCurrentAssets && (
                          <>
                            {otherCurrentAssets.map((acc, i) => (
                              <tr key={i}>
                                <td className="py-1 pl-14 pr-3 text-gray-600">{acc.name}</td>
                                <td className="py-1 px-3 text-right tabular-nums">{fmt(acc.amount)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold text-gray-800 border-t border-gray-200">
                              <td className="py-1 pl-10 pr-3">Total for Other Current Assets</td>
                              <td className="py-1 px-3 text-right tabular-nums">{fmt(totalOtherCurrent)}</td>
                            </tr>
                          </>
                        )}

                        <tr className="font-semibold text-gray-800 border-t border-gray-200 bg-gray-50/30">
                          <td className="py-1.5 pl-6 pr-3">Total for Current Assets</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{fmt(totalCurrentAssets)}</td>
                        </tr>
                      </>
                    )}

                    {/* Fixed Assets */}
                    <tr className="cursor-pointer" onClick={() => toggle('fixedAssets')}>
                      <td className="py-1.5 pl-6 pr-3 flex items-center space-x-1 font-semibold text-gray-800">
                        {openSections.fixedAssets ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                        <span>Fixed Assets</span>
                      </td>
                      <td className="py-1.5 px-3 text-right"></td>
                    </tr>

                    {openSections.fixedAssets && (
                      <>
                        {fixedAssets.map((acc, i) => (
                          <tr key={i}>
                            <td className="py-1 pl-10 pr-3 text-gray-700">{acc.name}</td>
                            <td className="py-1 px-3 text-right tabular-nums">{fmt(acc.amount)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold text-gray-800 border-t border-gray-200">
                          <td className="py-1.5 pl-6 pr-3">Total for Fixed Assets</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{fmt(totalFixedAssets)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="font-bold text-gray-900 border-t-2 border-b border-gray-400 bg-gray-50/50">
                      <td className="py-2 px-3">TOTAL ASSETS</td>
                      <td className="py-2 px-3 text-right tabular-nums font-extrabold">{fmt(totalAssets)}</td>
                    </tr>
                  </>
                )}

                {/* LIABILITIES AND EQUITY */}
                <tr className="font-bold bg-gray-50/50 cursor-pointer" onClick={() => toggle('liabilitiesAndEquity')}>
                  <td className="py-2 px-3 flex items-center space-x-1">
                    {openSections.liabilitiesAndEquity ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                    <span>Liabilities and Equity</span>
                  </td>
                  <td className="py-2 px-3 text-right"></td>
                </tr>

                {openSections.liabilitiesAndEquity && (
                  <>
                    {/* Current Liabilities */}
                    <tr className="cursor-pointer" onClick={() => toggle('currentLiabilities')}>
                      <td className="py-1.5 pl-6 pr-3 flex items-center space-x-1 font-semibold text-gray-800">
                        {openSections.currentLiabilities ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                        <span>Current Liabilities</span>
                      </td>
                      <td className="py-1.5 px-3 text-right"></td>
                    </tr>

                    {openSections.currentLiabilities && (
                      <>
                        <tr>
                          <td className="py-1 pl-10 pr-3 text-gray-700">Accounts Payable (A/P)</td>
                          <td className="py-1 px-3 text-right tabular-nums">{fmt(totalAp)}</td>
                        </tr>

                        {/* Credit Cards */}
                        <tr className="cursor-pointer" onClick={() => toggle('creditCards')}>
                          <td className="py-1 pl-10 pr-3 flex items-center space-x-1 font-medium text-gray-700">
                            {openSections.creditCards ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                            <span>Credit Cards</span>
                          </td>
                          <td className="py-1 px-3 text-right"></td>
                        </tr>
                        {openSections.creditCards && (
                          <>
                            {creditCards.map((cc, i) => (
                              <tr key={i}>
                                <td className="py-1 pl-14 pr-3 text-gray-600">{cc.name}</td>
                                <td className="py-1 px-3 text-right tabular-nums">{fmt(cc.amount)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold text-gray-800 border-t border-gray-200">
                              <td className="py-1 pl-10 pr-3">Total Credit Cards</td>
                              <td className="py-1 px-3 text-right tabular-nums">{fmt(totalCreditCards)}</td>
                            </tr>
                          </>
                        )}

                        {/* Other Current Liabilities */}
                        <tr className="cursor-pointer" onClick={() => toggle('otherCurrentLiabilities')}>
                          <td className="py-1 pl-10 pr-3 flex items-center space-x-1 font-medium text-gray-700">
                            {openSections.otherCurrentLiabilities ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-500" />}
                            <span>Other Current Liabilities</span>
                          </td>
                          <td className="py-1 px-3 text-right"></td>
                        </tr>
                        {openSections.otherCurrentLiabilities && (
                          <>
                            {otherLiabilities.map((ol, i) => (
                              <tr key={i}>
                                <td className="py-1 pl-14 pr-3 text-gray-600">{ol.name}</td>
                                <td className="py-1 px-3 text-right tabular-nums">{fmt(ol.amount)}</td>
                              </tr>
                            ))}
                            <tr className="font-semibold text-gray-800 border-t border-gray-200">
                              <td className="py-1 pl-10 pr-3">Total Other Current Liabilities</td>
                              <td className="py-1 px-3 text-right tabular-nums">{fmt(totalOtherLiab)}</td>
                            </tr>
                          </>
                        )}

                        <tr className="font-semibold text-gray-800 border-t border-gray-200">
                          <td className="py-1.5 pl-6 pr-3">Total Current Liabilities</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{fmt(totalCurrentLiabilities)}</td>
                        </tr>
                      </>
                    )}

                    <tr className="font-bold text-gray-900 border-t border-b border-gray-300">
                      <td className="py-2 px-3">Total Liabilities</td>
                      <td className="py-2 px-3 text-right tabular-nums">{fmt(totalLiabilities)}</td>
                    </tr>

                    {/* Equity */}
                    <tr className="cursor-pointer font-bold bg-gray-50/50" onClick={() => toggle('equity')}>
                      <td className="py-2 px-3 flex items-center space-x-1">
                        {openSections.equity ? <ChevronDown size={14} className="text-gray-600" /> : <ChevronRight size={14} className="text-gray-600" />}
                        <span>Equity</span>
                      </td>
                      <td className="py-2 px-3 text-right"></td>
                    </tr>
                    {openSections.equity && (
                      <>
                        {equityItems.map((eq, i) => (
                          <tr key={i}>
                            <td className="py-1 pl-8 pr-3 text-gray-700">{eq.name}</td>
                            <td className="py-1 px-3 text-right tabular-nums font-medium">{fmt(eq.amount)}</td>
                          </tr>
                        ))}
                        <tr className="font-semibold text-gray-800 border-t border-gray-200">
                          <td className="py-1.5 pl-6 pr-3">Total Equity</td>
                          <td className="py-1.5 px-3 text-right tabular-nums">{fmt(totalEquity)}</td>
                        </tr>
                      </>
                    )}

                    {/* TOTAL LIABILITIES AND EQUITY */}
                    <tr className="font-extrabold text-sm text-gray-900 bg-gray-100 border-t-2 border-b-4 border-gray-900">
                      <td className="py-3 px-3">TOTAL LIABILITIES AND EQUITY</td>
                      <td className="py-3 px-3 text-right tabular-nums text-base text-gray-900">{fmt(totalLiabilitiesAndEquity)}</td>
                    </tr>
                  </>
                )}
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
              <span>Video Tour: Understanding Your Balance Sheet in Meso</span>
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              This tour reviews your total assets, liabilities, and retained earnings to verify your accounting equation is balanced in Indian Rupee format.
            </p>
            <div className="aspect-video bg-gray-900 rounded flex items-center justify-center text-white text-xs">
              [ Video Tour Player: Balance Sheet Walkthrough ]
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
                  <span className="font-bold text-teal-900">{idx + 1}. Ledger Insight:</span>
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
