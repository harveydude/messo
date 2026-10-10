import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RefreshCw, 
  Share2, 
  Printer, 
  MoreVertical, 
  Sparkles, 
  ChevronDown, 
  ChevronRight,
  Filter,
  Sliders,
  Calendar
} from 'lucide-react';

export default function BalanceSheetView({ onBack }) {
  const [reportPeriod, setReportPeriod] = useState("This year to date");
  const [fromDate, setFromDate] = useState("01/01/2025");
  const [toDate, setToDate] = useState("10/24/2025");
  const [method, setMethod] = useState("Accrual");

  // Collapsible tree nodes
  const [assetsOpen, setAssetsOpen] = useState(true);
  const [currentAssetsOpen, setCurrentAssetsOpen] = useState(true);
  const [bankAccountsOpen, setBankAccountsOpen] = useState(true);
  const [arOpen, setArOpen] = useState(true);
  const [otherAssetsOpen, setOtherAssetsOpen] = useState(true);
  const [fixedAssetsOpen, setFixedAssetsOpen] = useState(true);
  const [truckOpen, setTruckOpen] = useState(true);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Quick links */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-xs font-semibold text-[#0077c5] hover:underline"
        >
          <ArrowLeft size={14} />
          <span>Back to standard reports</span>
        </button>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#0077c5] font-medium">
          <button className="hover:underline">Switch to classic view</button>
          <span>•</span>
          <button className="hover:underline">Video Tour</button>
          <span>•</span>
          <button className="hover:underline">Video tutorials</button>
          <span>•</span>
          <button className="hover:underline">Learn more</button>
          <span>•</span>
          <button className="hover:underline">Give feedback</button>
        </div>
      </div>

      {/* Control Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Report period</label>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white font-medium"
              >
                <option>This year to date</option>
                <option>Last month</option>
                <option>This month</option>
                <option>All Dates</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">From</label>
              <input
                type="text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white w-28"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">To</label>
              <input
                type="text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white w-28"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Accounting method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white font-medium"
              >
                <option>Accrual</option>
                <option>Cash</option>
              </select>
            </div>

            <button className="text-xs text-[#0077c5] hover:underline font-semibold self-end pb-2">
              View options
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] text-gray-400">Last updated a few seconds ago</span>
            <button className="p-1.5 text-gray-600 hover:text-gray-900"><RefreshCw size={14} /></button>
            <button className="p-1.5 text-gray-600 hover:text-gray-900"><Share2 size={14} /></button>
            <button className="p-1.5 text-gray-600 hover:text-gray-900"><Printer size={14} /></button>
            <button className="p-1.5 text-gray-600 hover:text-gray-900"><MoreVertical size={14} /></button>
            <button className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-full hover:bg-green-700 shadow-xs">
              Save As
            </button>
          </div>
        </div>

        {/* Secondary options row */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-700">
          <div className="flex items-center space-x-4">
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold text-[11px]">
              <Sparkles size={12} className="text-[#2ca01c]" />
              <span>4 Insights BETA</span>
            </div>
            <button className="hover:text-gray-900 font-medium">Display</button>
            <button className="hover:text-gray-900 font-medium">Compare</button>
            <button className="hover:text-gray-900 font-medium">Filter</button>
            <button className="hover:text-gray-900 font-medium">General options</button>
          </div>
        </div>
      </div>

      {/* Printable Report Sheet Document (Matching frame_629) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-4xl mx-auto space-y-6">
        {/* Document Header */}
        <div className="text-center space-y-1 border-b border-gray-200 pb-6">
          <h2 className="text-xl font-extrabold text-gray-900">Balance Sheet</h2>
          <div className="text-sm font-semibold text-gray-700">Craig's Design and Landscaping Services</div>
          <div className="text-xs text-gray-500">As of October 24, 2025</div>
        </div>

        {/* Tree Table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-300 font-bold text-gray-700">
              <th className="py-2 text-left">Account</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* ASSETS */}
            <tr className="bg-gray-50/70 font-bold text-gray-900">
              <td 
                className="py-2 cursor-pointer flex items-center space-x-1"
                onClick={() => setAssetsOpen(!assetsOpen)}
              >
                {assetsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>Assets</span>
              </td>
              <td className="py-2 text-right"></td>
            </tr>

            {assetsOpen && (
              <>
                {/* Current Assets */}
                <tr className="font-semibold text-gray-800">
                  <td 
                    className="py-1.5 pl-4 cursor-pointer flex items-center space-x-1"
                    onClick={() => setCurrentAssetsOpen(!currentAssetsOpen)}
                  >
                    {currentAssetsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>Current Assets</span>
                  </td>
                  <td className="py-1.5 text-right"></td>
                </tr>

                {currentAssetsOpen && (
                  <>
                    {/* Bank Accounts */}
                    <tr className="text-gray-700">
                      <td 
                        className="py-1 pl-8 cursor-pointer flex items-center space-x-1"
                        onClick={() => setBankAccountsOpen(!bankAccountsOpen)}
                      >
                        {bankAccountsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="font-medium">Bank Accounts</span>
                      </td>
                      <td className="py-1 text-right"></td>
                    </tr>
                    {bankAccountsOpen && (
                      <>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12">Checking</td>
                          <td className="py-1 text-right">$201.00</td>
                        </tr>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12">Savings</td>
                          <td className="py-1 text-right">$800.00</td>
                        </tr>
                        <tr className="font-semibold text-gray-800 bg-gray-50/40">
                          <td className="py-1 pl-8">Total for Bank Accounts</td>
                          <td className="py-1 text-right font-bold">$1,001.00</td>
                        </tr>
                      </>
                    )}

                    {/* Accounts Receivable */}
                    <tr className="text-gray-700">
                      <td 
                        className="py-1 pl-8 cursor-pointer flex items-center space-x-1"
                        onClick={() => setArOpen(!arOpen)}
                      >
                        {arOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="font-medium">Accounts Receivable</span>
                      </td>
                      <td className="py-1 text-right"></td>
                    </tr>
                    {arOpen && (
                      <>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12 flex items-center space-x-1.5">
                            <span>Accounts Receivable (A/R)</span>
                            <Sparkles size={11} className="text-[#0077c5]" />
                          </td>
                          <td className="py-1 text-right">$5,475.92</td>
                        </tr>
                        <tr className="font-semibold text-gray-800 bg-gray-50/40">
                          <td className="py-1 pl-8">Total for Accounts Receivable</td>
                          <td className="py-1 text-right font-bold">$5,475.92</td>
                        </tr>
                      </>
                    )}

                    {/* Other Current Assets */}
                    <tr className="text-gray-700">
                      <td 
                        className="py-1 pl-8 cursor-pointer flex items-center space-x-1"
                        onClick={() => setOtherAssetsOpen(!otherAssetsOpen)}
                      >
                        {otherAssetsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="font-medium">Other Current Assets</span>
                      </td>
                      <td className="py-1 text-right"></td>
                    </tr>
                    {otherAssetsOpen && (
                      <>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12">Inventory Asset</td>
                          <td className="py-1 text-right">$596.25</td>
                        </tr>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12 flex items-center space-x-1.5">
                            <span>Undeposited Funds</span>
                            <Sparkles size={11} className="text-[#0077c5]" />
                          </td>
                          <td className="py-1 text-right">$2,062.52</td>
                        </tr>
                        <tr className="font-semibold text-gray-800 bg-gray-50/40">
                          <td className="py-1 pl-8">Total for Other Current Assets</td>
                          <td className="py-1 text-right font-bold">$2,658.77</td>
                        </tr>
                      </>
                    )}

                    {/* Total Current Assets */}
                    <tr className="font-bold text-gray-900 border-t border-gray-200">
                      <td className="py-2 pl-4">Total for Current Assets</td>
                      <td className="py-2 text-right">$9,135.69</td>
                    </tr>
                  </>
                )}

                {/* Fixed Assets */}
                <tr className="font-semibold text-gray-800">
                  <td 
                    className="py-1.5 pl-4 cursor-pointer flex items-center space-x-1"
                    onClick={() => setFixedAssetsOpen(!fixedAssetsOpen)}
                  >
                    {fixedAssetsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <span>Fixed Assets</span>
                  </td>
                  <td className="py-1.5 text-right"></td>
                </tr>
                {fixedAssetsOpen && (
                  <>
                    <tr className="text-gray-700">
                      <td 
                        className="py-1 pl-8 cursor-pointer flex items-center space-x-1"
                        onClick={() => setTruckOpen(!truckOpen)}
                      >
                        {truckOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <span className="font-medium">Truck</span>
                      </td>
                      <td className="py-1 text-right"></td>
                    </tr>
                    {truckOpen && (
                      <>
                        <tr className="text-gray-600">
                          <td className="py-1 pl-12">Original Cost</td>
                          <td className="py-1 text-right">$13,495.00</td>
                        </tr>
                        <tr className="font-semibold text-gray-800 bg-gray-50/40">
                          <td className="py-1 pl-8">Total for Truck</td>
                          <td className="py-1 text-right font-bold">$13,495.00</td>
                        </tr>
                      </>
                    )}
                    <tr className="font-bold text-gray-900 border-t border-gray-200">
                      <td className="py-2 pl-4">Total for Fixed Assets</td>
                      <td className="py-2 text-right">$13,495.00</td>
                    </tr>
                  </>
                )}

                {/* TOTAL ASSETS */}
                <tr className="font-extrabold text-gray-950 bg-gray-100/70 border-t-2 border-b-2 border-gray-300">
                  <td className="py-2.5">Total Assets</td>
                  <td className="py-2.5 text-right">$22,630.69</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
