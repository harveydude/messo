import React, { useState } from 'react';
import { 
  X, Download, Printer, ZoomIn, ZoomOut, RotateCw, 
  FileText, Sparkles, Check, ChevronDown, CheckCircle2, ShieldCheck, ArrowRight
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

export default function VendorBillScannerModal({ isOpen, onClose, onSaveSuccess }) {
  const { dispatch } = useStore();

  const [vendor, setVendor] = useState('Brock Stone');
  const [terms, setTerms] = useState('Net 30');
  const [billDate, setBillDate] = useState('2026-06-30');
  const [dueDate, setDueDate] = useState('2026-07-30');
  const [billNo, setBillNo] = useState('1234');
  const [category, setCategory] = useState('Contract Labor / Video Editing (TDS 194J)');
  const [description, setDescription] = useState('Freelance Video Editing Services: June Campaign Assets');
  const [amount, setAmount] = useState('120000.00');
  const [tdsDeducted, setTdsDeducted] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const grossAmount = parseFloat(amount) || 0;
  // Section 194J TDS rate for technical/professional fees is 10%
  const tdsRate = 0.10;
  const tdsAmount = tdsDeducted ? grossAmount * tdsRate : 0;
  const netPayable = grossAmount - tdsAmount;

  const handleSave = () => {
    // Add bill to store
    dispatch({
      type: 'ADD_BILL',
      payload: {
        id: Date.now(),
        vendor,
        due: dueDate,
        amount: grossAmount,
        open: grossAmount,
        status: 'Unpaid',
        tdsAmount,
        netPayable,
        billNo,
        description
      }
    });

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: Date.now(),
        text: `Vendor Bill #${billNo} for ₹${grossAmount.toLocaleString('en-IN')} recorded with ₹${tdsAmount.toLocaleString('en-IN')} TDS (Sec 194J).`,
        time: 'Just now',
        read: false,
        route: '/bills'
      }
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onSaveSuccess?.();
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[1250] flex bg-black/60 backdrop-blur-xs font-sans overflow-hidden">
      <div className="w-full h-full bg-white flex flex-col md:flex-row relative">

        {/* ── LEFT PANE: AI Document Scanner Preview (Width ~460px) ────────── */}
        <div className="w-full md:w-[460px] h-[300px] md:h-full bg-[#1e293b] border-r border-[#334155] flex flex-col text-white shrink-0">
          {/* Document Header Bar */}
          <div className="h-[52px] flex items-center justify-between px-4 border-b border-[#334155]">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#38bdf8]" />
              <span className="text-[13px] font-semibold text-white truncate max-w-[240px]">
                Bill - Brock Stone.pdf
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={() => setZoomLevel(prev => Math.min(prev + 15, 150))}
                className="p-1 hover:bg-[#334155] rounded text-gray-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button 
                type="button" 
                onClick={() => setZoomLevel(prev => Math.max(prev - 15, 70))}
                className="p-1 hover:bg-[#334155] rounded text-gray-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <button 
                type="button" 
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                className="p-1 hover:bg-[#334155] rounded text-gray-300 hover:text-white"
                title="Rotate"
              >
                <RotateCw size={15} />
              </button>
            </div>
          </div>

          {/* Rendered Uploaded Document Sheet */}
          <div className="flex-1 p-5 overflow-y-auto flex justify-center items-start bg-[#0f172a]/60">
            <div 
              style={{ 
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out'
              }}
              className="w-[370px] min-h-[490px] bg-white rounded-md text-[#1e293b] p-6 shadow-2xl text-[11px] select-none"
            >
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                <div>
                  <div className="text-[16px] font-bold text-gray-900 leading-tight">Brock Stone</div>
                  <div className="text-[12px] text-gray-600 font-medium">Video & Motion Specialist</div>
                  <div className="text-[11px] text-gray-500 mt-1 font-mono">PAN: BKPPS1234F</div>
                  <div className="text-[10px] text-gray-400">GSTIN: 27BKPPS1234F1Z8</div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-extrabold text-[#007755] uppercase tracking-wider">
                    Tax Invoice
                  </div>
                  <div className="text-[12px] font-semibold text-gray-800">#1234</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">Date: June 30, 2026</div>
                  <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                    Terms: Net 30
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-4 text-[11px]">
                <div className="text-gray-400 font-semibold uppercase text-[9px]">Bill To:</div>
                <div className="font-semibold text-gray-800">MESO Financial Cloud India Pvt Ltd</div>
                <div className="text-gray-500">BKC, Bandra East, Mumbai 400051</div>
              </div>

              {/* Items Table */}
              <div className="border-t border-b border-gray-300 py-2 my-3">
                <div className="flex justify-between font-bold text-gray-700 mb-2">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-gray-800 leading-snug">
                  <span className="max-w-[220px]">
                    Freelance Video Editing Services: June Campaign Assets (SAC 998314)
                  </span>
                  <span className="font-semibold">₹1,20,000.00</span>
                </div>
              </div>

              {/* Totals & Tax Compliance breakdown */}
              <div className="space-y-1.5 text-right mt-4 pt-2 border-t border-gray-200">
                <div className="flex justify-between text-gray-600 text-[11px]">
                  <span>Subtotal:</span>
                  <span>₹1,20,000.00</span>
                </div>
                <div className="flex justify-between text-emerald-700 text-[11px]">
                  <span>Applicable TDS (Sec 194J @ 10%):</span>
                  <span>-₹12,000.00</span>
                </div>
                <div className="flex justify-between text-gray-900 font-bold text-[13px] pt-1 border-t border-gray-300">
                  <span>Net Payable to Vendor:</span>
                  <span className="text-[#007755]">₹1,08,000.00</span>
                </div>
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>Total Expense Booking:</span>
                  <span>₹1,20,000.00</span>
                </div>
              </div>

              {/* Bank Transfer Details */}
              <div className="mt-6 pt-3 border-t border-dashed border-gray-300 text-[10px] text-gray-500">
                <div className="font-semibold text-gray-700">Bank Transfer Details:</div>
                <div>A/C Name: Brock Stone | Bank: HDFC Bank Bandra</div>
                <div>A/C No: 50100098765432 | IFSC: HDFC0000123</div>
              </div>
            </div>
          </div>

          {/* AI Extraction Confidence Banner */}
          <div className="p-3 bg-[#0f172a] border-t border-[#334155] text-[11px] text-[#94a3b8] flex items-center gap-2">
            <Sparkles size={14} className="text-[#38bdf8] shrink-0" />
            <span>
              <strong className="text-white">AI OCR Auto-Extraction:</strong> 100% matched vendor, invoice #, terms, and TDS Section 194J.
            </span>
          </div>
        </div>

        {/* ── RIGHT PANE: Bill Form Body ──────────────────────────────────── */}
        <div className="flex-1 h-full flex flex-col bg-white overflow-y-auto">
          {/* Header */}
          <div className="h-[52px] border-b border-[#dfe1e6] flex items-center justify-between px-6 shrink-0 bg-[#f8f9fa]">
            <div className="flex items-center gap-3">
              <h2 className="text-[17px] font-bold text-[#172b4d]">Vendor Bill #1234</h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e3fcef] text-[#00875a]">
                <ShieldCheck size={12} />
                AI Verified Document
              </span>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="p-1 text-[#5e6c84] hover:text-[#172b4d] hover:bg-gray-200 rounded"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-6 md:p-8 space-y-6 max-w-5xl">
            {/* Top 4 Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] text-[13px] font-semibold text-[#172b4d] focus:outline-none focus:border-[#007755]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1">
                  Payment Terms
                </label>
                <div className="relative">
                  <select 
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full h-[40px] px-3 pr-8 rounded-md border border-[#dfe1e6] bg-white text-[13px] text-[#172b4d] appearance-none focus:outline-none focus:border-[#007755]"
                  >
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45 (MSME Limit)">Net 45 (MSME Limit)</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1">
                  Bill Date
                </label>
                <input 
                  type="date" 
                  value={billDate} 
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] text-[13px] text-[#172b4d] focus:outline-none focus:border-[#007755]" 
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#5e6c84] mb-1">
                  Due Date
                </label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-[40px] px-3 rounded-md border border-[#dfe1e6] text-[13px] text-[#172b4d] focus:outline-none focus:border-[#007755]" 
                />
              </div>
            </div>

            {/* Bill Category Table */}
            <div className="border border-[#dfe1e6] rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f4f5f8] border-b border-[#dfe1e6] text-left text-[12px] font-semibold text-[#5e6c84]">
                    <th className="py-2.5 px-3 w-[40px]">#</th>
                    <th className="py-2.5 px-3 w-[320px]">Category &amp; Tax Section</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 w-[180px] text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#dfe1e6]">
                    <td className="py-3 px-3 text-gray-500">1</td>
                    <td className="py-3 px-3">
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-[36px] px-2 rounded border border-[#dfe1e6] bg-white text-[12px] font-medium"
                      >
                        <option value="Contract Labor / Video Editing (TDS 194J)">
                          Contract Labor / Video Editing (TDS 194J)
                        </option>
                        <option value="Professional & Legal Fees (TDS 194J)">
                          Professional &amp; Legal Fees (TDS 194J)
                        </option>
                        <option value="Contractor Payment (TDS 194C)">
                          Contractor Payment (TDS 194C)
                        </option>
                        <option value="Advertising & Marketing">
                          Advertising &amp; Marketing
                        </option>
                        <option value="Office Supplies & Software">
                          Office Supplies &amp; Software
                        </option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full h-[36px] px-3 rounded border border-[#dfe1e6] text-[12px]"
                      />
                    </td>
                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-[36px] px-2 text-right font-bold text-[13px] text-gray-900 rounded border border-[#dfe1e6]"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TDS & Net Settlement Card */}
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <input 
                  type="checkbox" 
                  id="tds_check"
                  checked={tdsDeducted}
                  onChange={(e) => setTdsDeducted(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#007755] rounded border-gray-300 focus:ring-[#007755]"
                />
                <label htmlFor="tds_check" className="text-[12px] text-gray-700">
                  <span className="font-semibold text-gray-900">Apply Indian Income Tax Withholding (TDS Sec 194J - 10%)</span>
                  <div className="text-gray-500 mt-0.5">
                    Automatically credits TDS Payable (Sec 194J) ledger and generates Form 26Q return entry.
                  </div>
                </label>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[11px] text-gray-500">Gross Bill Amount: <strong>₹{grossAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                {tdsDeducted && (
                  <div className="text-[11px] text-rose-600 font-medium">
                    Less TDS 10%: -₹{tdsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                )}
                <div className="text-[14px] font-bold text-[#007755] mt-0.5">
                  Net Amount Payable: ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Attachment Box */}
            <div className="flex items-center justify-between p-3.5 bg-[#f8f9fa] rounded-lg border border-[#dfe1e6] max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-emerald-100 text-[#007755] flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-gray-900">Bill - Brock Stone.pdf (2.4 MB)</div>
                  <div className="text-[11px] text-[#5e6c84]">Attached as primary vendor voucher</div>
                </div>
              </div>
              <CheckCircle2 size={18} className="text-[#00875a]" />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="h-[64px] border-t border-[#dfe1e6] flex items-center justify-between px-8 bg-[#f8f9fa] shrink-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-5 py-2 rounded-md border border-[#c1c7d0] text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button 
                type="button" 
                onClick={handleSave}
                disabled={isSaved}
                className="px-6 py-2 rounded-md bg-[#007755] hover:bg-[#005f43] text-white text-[13px] font-semibold transition cursor-pointer flex items-center gap-2 shadow-xs"
              >
                {isSaved ? (
                  <>
                    <Check size={16} />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save and Close</span>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
