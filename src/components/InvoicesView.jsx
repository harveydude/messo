import React, { useState } from 'react';
import { 
  Plus, 
  Upload, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  Search, 
  Printer, 
  Sparkles, 
  X, 
  FileSpreadsheet, 
  AlertCircle 
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

export function UploadInvoiceModal({ isOpen, onClose, onImportToEditor, onSaveToBooks }) {
  const [step, setStep] = useState(1); // 1: Select/Drop, 2: Parsing/Extracting, 3: Review
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSampleFile = () => {
    setSelectedFileName('Cool_Cars_Gardening_Invoice.pdf');
    setIsProcessing(true);
    setStep(2);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(3);
    }, 1200);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setIsProcessing(true);
      setStep(2);
      setTimeout(() => {
        setIsProcessing(false);
        setStep(3);
      }, 1200);
    }
  };

  const extractedData = {
    customer: 'Cool Cars',
    email: 'Cool_Cars@meso.in',
    billTo: 'Gaurav Parikh\nCool Cars\n65 Marine Drive\nNariman Point, Mumbai, MH 400021',
    invNo: '1038',
    terms: 'Net 30',
    invDate: '10/24/2025',
    dueDate: '11/23/2025',
    rows: [
      { id: 1, value: 'Landscaping:Gardening', desc: 'Weekly Gardening Service', qty: 1, rate: 200, amount: 200 }
    ],
    subtotal: 200.00,
    discountVal: 20.00,
    discountPct: 10,
    salesTax: 14.40,
    total: 194.40
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e3e5e8] flex items-center justify-between bg-[#f8f9fa]">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#e8f4fd] text-[#0077c5] flex items-center justify-center">
              <Upload size={18} />
            </span>
            <div>
              <h2 className="text-[18px] font-bold text-[#393a3d]">Upload & Import Invoices</h2>
              <p className="text-[12px] text-[#6b6c72]">Procedure for importing PDF bills, scans, and CSV spreadsheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 text-[#6b6c72]">
            <X size={18} />
          </button>
        </div>

        {/* Stepper indicator */}
        <div className="px-6 py-3 bg-white border-b border-[#e3e5e8] flex items-center justify-between text-[13px]">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#0077c5] font-semibold' : 'text-[#6b6c72]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-[#0077c5] text-white' : 'bg-gray-200'}`}>1</span>
            Upload Document
          </div>
          <div className="h-px w-12 bg-gray-300" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#0077c5] font-semibold' : 'text-[#6b6c72]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-[#0077c5] text-white' : 'bg-gray-200'}`}>2</span>
            AI Extraction & Parse
          </div>
          <div className="h-px w-12 bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 3 ? 'text-[#2ca01c] font-semibold' : 'text-[#6b6c72]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-[#2ca01c] text-white' : 'bg-gray-200'}`}>3</span>
            Review & Create
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5">
              {/* Dropzone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) {
                    setSelectedFileName(e.dataTransfer.files[0].name);
                    setIsProcessing(true);
                    setStep(2);
                    setTimeout(() => { setIsProcessing(false); setStep(3); }, 1200);
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive ? 'border-[#0077c5] bg-[#eef7fc]' : 'border-[#c9cdd2] bg-[#fbfcfd] hover:border-[#0077c5]'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-[#e8f4fb] text-[#0077c5] flex items-center justify-center mx-auto mb-3">
                  <Upload size={28} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#393a3d] mb-1">
                  Drag and drop your invoice here
                </h3>
                <p className="text-[13px] text-[#6b6c72] mb-4">
                  Supports PDF, JPEG, PNG, or Excel/CSV spreadsheets (up to 20MB)
                </p>

                <div className="flex items-center justify-center gap-3">
                  <label className="px-5 py-2 rounded-full bg-[#0077c5] hover:bg-[#005ea2] text-white text-[14px] font-semibold cursor-pointer shadow-xs">
                    Browse files
                    <input type="file" onChange={handleFileUpload} accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx" className="hidden" />
                  </label>
                  <button 
                    type="button" 
                    onClick={handleSampleFile}
                    className="px-4 py-2 rounded-full border border-[#0077c5] text-[#0077c5] hover:bg-[#f0f8fc] text-[13px] font-medium"
                  >
                    Try sample PDF
                  </button>
                </div>
              </div>

              {/* Supported formats tip */}
              <div className="grid grid-cols-2 gap-3 text-[12px] text-[#6b6c72]">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <FileText size={16} className="text-[#0077c5]" />
                  <span>PDF & Scans auto-extract customer, line items, and taxes with AI OCR.</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <FileSpreadsheet size={16} className="text-[#2ca01c]" />
                  <span>CSV/Excel bulk import maps columns to multiple customer invoices.</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 border-4 border-[#0077c5] border-t-transparent rounded-full animate-spin" />
              <h3 className="text-[18px] font-bold text-[#393a3d]">Analyzing document...</h3>
              <p className="text-[14px] text-[#6b6c72] max-w-sm">
                Parsing <b>{selectedFileName}</b>: extracting customer info, itemized services, amounts, and tax calculations.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-[#e6f4ea] border border-[#b7e1cd] rounded-lg text-[#137333] text-[13px]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} />
                  <span className="font-semibold">Successfully parsed from {selectedFileName}</span>
                </div>
                <span className="text-[12px] font-bold bg-white px-2 py-0.5 rounded border border-[#b7e1cd]">100% Match</span>
              </div>

              {/* Extracted preview card */}
              <div className="border border-[#e3e5e8] rounded-lg p-4 bg-white space-y-3">
                <div className="flex items-start justify-between border-b border-[#e3e5e8] pb-3">
                  <div>
                    <span className="text-[11px] font-bold tracking-wider text-[#6b6c72] uppercase">Customer</span>
                    <p className="text-[16px] font-bold text-[#393a3d]">{extractedData.customer}</p>
                    <p className="text-[12px] text-[#6b6c72]">{extractedData.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold tracking-wider text-[#6b6c72] uppercase">Invoice #</span>
                    <p className="text-[16px] font-bold text-[#393a3d]">{extractedData.invNo}</p>
                    <p className="text-[12px] text-[#6b6c72]">{extractedData.invDate}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-[13px]">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="font-medium text-[#393a3d]">Landscaping:Gardening (Weekly Gardening Service)</span>
                    <span className="font-semibold text-[#393a3d]">₹200.00</span>
                  </div>
                  <div className="flex justify-between text-[#6b6c72]">
                    <span>Discount (10%)</span>
                    <span>-₹20.00</span>
                  </div>
                  <div className="flex justify-between text-[#6b6c72]">
                    <span>Sales tax (California 8%)</span>
                    <span>₹14.40</span>
                  </div>
                  <div className="flex justify-between text-[15px] font-bold text-[#393a3d] pt-2 border-t border-[#e3e5e8]">
                    <span>Total Amount</span>
                    <span className="text-[#2ca01c]">₹194.40</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#f8f9fa] border-t border-[#e3e5e8] flex items-center justify-between">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-[14px] font-semibold text-[#6b6c72] hover:text-[#393a3d]"
          >
            Cancel
          </button>

          {step === 3 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  onSaveToBooks?.(extractedData);
                  onClose();
                }}
                className="px-4 py-2 border border-[#8d9096] text-[#393a3d] hover:bg-white rounded-[4px] text-[14px] font-semibold"
              >
                Save directly to books
              </button>
              <button
                type="button"
                onClick={() => {
                  onImportToEditor?.(extractedData);
                  onClose();
                }}
                className="px-5 py-2 bg-[#2ca01c] hover:bg-[#25900f] text-white rounded-[4px] text-[14px] font-semibold shadow-xs flex items-center gap-2"
              >
                <span>Open in Invoice Editor</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function InvoicesView({ onOpenInvoiceModal, onNavigate }) {
  const { state, dispatch } = useStore();
  const [filter, setFilter] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false);

  const invoices = state.invoices || [];

  const handleSaveUploaded = (data) => {
    dispatch({
      type: 'ADD_INVOICE',
      payload: {
        id: Date.now(),
        no: data.invNo,
        customerId: 3,
        date: data.invDate,
        dueDate: data.dueDate,
        status: 'Open',
        lines: [{ id: 1, desc: 'Weekly Gardening Service', qty: 1, rate: 200, taxable: true }],
        total: data.total
      }
    });
  };

  return (
    <div className="flex-1 bg-[#f4f5f8] overflow-y-auto min-h-0 select-none">
      
      {/* Upload Procedure Modal */}
      <UploadInvoiceModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)}
        onImportToEditor={() => {
          setUploadModalOpen(false);
          onOpenInvoiceModal?.();
        }}
        onSaveToBooks={handleSaveUploaded}
      />

      <div className="max-w-[1360px] mx-auto px-8 py-8 space-y-6">
        
        {/* ──── 1. TOP HEADER ROW ──── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <img src="/app-icons/sales.png" alt="Invoices" className="w-full h-full object-contain block" />
            </div>
            <div>
              <h1 className="text-[30px] font-bold text-[#393A3D] leading-tight">Invoices</h1>
              <p className="text-[14px] text-[#6B6C72] mt-1">
                Create, track, and manage customer billing, or upload existing invoice files.
              </p>
            </div>
          </div>

          {/* Action Split Button with prominent Plus Sign */}
          <div className="relative">
            <div className="flex h-[40px] rounded-[4px] overflow-hidden bg-[#2CA01C] shadow-xs">
              <button
                type="button"
                onClick={onOpenInvoiceModal}
                className="px-5 text-[15px] font-semibold text-white hover:bg-[#25900f] active:scale-[0.98] transition flex items-center gap-2 cursor-pointer"
              >
                <Plus size={18} strokeWidth={2.8} />
                <span>Create invoice</span>
              </button>
              <div className="w-px bg-[#1e7a14]" />
              <button
                type="button"
                onClick={() => setCreateDropdownOpen(!createDropdownOpen)}
                className="w-10 flex items-center justify-center text-white hover:bg-[#25900f] cursor-pointer"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {createDropdownOpen && (
              <div className="absolute right-0 top-[44px] w-[220px] bg-white rounded-lg shadow-xl border border-[#e3e5e8] py-1.5 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    onOpenInvoiceModal?.();
                  }}
                  className="w-full text-left px-4 py-2 text-[14px] text-[#393a3d] hover:bg-[#f4f5f8] flex items-center gap-2.5"
                >
                  <Plus size={16} className="text-[#2ca01c]" />
                  <span>Create invoice manually</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateDropdownOpen(false);
                    setUploadModalOpen(true);
                  }}
                  className="w-full text-left px-4 py-2 text-[14px] text-[#393a3d] hover:bg-[#f4f5f8] flex items-center gap-2.5"
                >
                  <Upload size={16} className="text-[#0077c5]" />
                  <span>Upload invoices (PDF/CSV)</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ──── 2. THE TWO DIVERSE & DIFFERENT SECTIONS (HERO CARDS) ──── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Section 1: Manual Invoice Creation Procedure */}
          <div className="bg-white rounded-xl border border-[#e3e5e8] p-6 shadow-xs flex flex-col justify-between hover:border-[#2ca01c] transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-12 h-12 rounded-xl bg-[#eaf7ec] text-[#2ca01c] flex items-center justify-center shadow-xs">
                  <Plus size={26} strokeWidth={2.8} />
                </span>
                <span className="px-3 py-1 bg-[#eaf7ec] text-[#1e7a14] text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Manual Procedure
                </span>
              </div>
              <h2 className="text-[19px] font-bold text-[#393A3D]">Create invoice from scratch</h2>
              <p className="text-[13.5px] text-[#6B6C72] mt-1.5 leading-relaxed">
                Start with a blank canvas. Choose your customer, specify payment terms, itemize products & services, apply discounts, and review live math before sending.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f0f1f4] flex items-center justify-between">
              <span className="text-[12px] text-[#6b6c72]">9-column itemized grid & live tax math</span>
              <button
                type="button"
                onClick={onOpenInvoiceModal}
                className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] text-white rounded-lg text-[14px] font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Create invoice</span>
              </button>
            </div>
          </div>

          {/* Section 2: Upload Invoice Procedure */}
          <div className="bg-white rounded-xl border border-[#e3e5e8] p-6 shadow-xs flex flex-col justify-between hover:border-[#0077c5] transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="w-12 h-12 rounded-xl bg-[#e8f4fb] text-[#0077c5] flex items-center justify-center shadow-xs">
                  <Upload size={24} strokeWidth={2.2} />
                </span>
                <span className="px-3 py-1 bg-[#e8f4fb] text-[#005ea2] text-[11px] font-bold rounded-full uppercase tracking-wider">
                  Import Procedure
                </span>
              </div>
              <h2 className="text-[19px] font-bold text-[#393A3D]">Upload or import invoices</h2>
              <p className="text-[13.5px] text-[#6B6C72] mt-1.5 leading-relaxed">
                Have a PDF bill, scanned invoice, or Excel spreadsheet? Upload it to auto-extract line items, customers, and totals with AI OCR, or batch-import multiple invoices.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-[#f0f1f4] flex items-center justify-between">
              <span className="text-[12px] text-[#6b6c72]">Supports PDF, JPEG, PNG, CSV & XLSX</span>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="px-5 py-2 border-2 border-[#0077c5] text-[#0077c5] hover:bg-[#e8f4fb] rounded-lg text-[14px] font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <Upload size={16} strokeWidth={2} />
                <span>Upload invoice</span>
              </button>
            </div>
          </div>

        </div>

        {/* ──── 3. INVOICES DATA TABLE ──── */}
        <div className="bg-white rounded-xl border border-[#e3e5e8] shadow-xs overflow-hidden">
          
          {/* Table Header Filter Row */}
          <div className="p-4 border-b border-[#e3e5e8] flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              {['all', 'open', 'overdue', 'paid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize transition ${
                    filter === f ? 'bg-[#393a3d] text-white' : 'text-[#6b6c72] hover:bg-gray-100'
                  }`}
                >
                  {f} invoices
                </button>
              ))}
            </div>

            <div className="relative w-[260px]">
              <input
                type="text"
                placeholder="Search invoices"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="w-full h-[36px] pl-9 pr-3 rounded-[6px] border border-[#c9cdd2] text-[13px] text-[#393a3d] outline-none focus:border-[#0077c5]"
              />
              <Search size={15} className="absolute left-3 top-[10px] text-[#6b6c72]" />
            </div>
          </div>

          {/* Invoices List */}
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-[#f8f9fa] h-[40px] text-[#6b6c72] font-semibold border-b border-[#e3e5e8]">
                <th className="pl-4 w-10"><input type="checkbox" className="rounded" /></th>
                <th className="px-3">Invoice #</th>
                <th className="px-3">Customer</th>
                <th className="px-3">Date</th>
                <th className="px-3">Due Date</th>
                <th className="px-3 text-right">Amount</th>
                <th className="px-3 text-center">Status</th>
                <th className="pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="h-[48px] border-b border-[#f0f1f4] hover:bg-[#fafbfc] text-[#393a3d]">
                  <td className="pl-4"><input type="checkbox" className="rounded" /></td>
                  <td className="px-3 font-semibold text-[#0077c5] hover:underline cursor-pointer" onClick={onOpenInvoiceModal}>
                    {inv.no}
                  </td>
                  <td className="px-3 font-medium">Cool Cars</td>
                  <td className="px-3 text-[#6b6c72]">{inv.date || '10/24/2025'}</td>
                  <td className="px-3 text-[#6b6c72]">{inv.dueDate || '11/23/2025'}</td>
                  <td className="px-3 text-right font-semibold">₹{inv.total ? inv.total.toFixed(2) : '194.40'}</td>
                  <td className="px-3 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f4ea] text-[#137333]">
                      {inv.status || 'Open'}
                    </span>
                  </td>
                  <td className="pr-4 text-right">
                    <button onClick={onOpenInvoiceModal} className="text-[#0077c5] font-semibold hover:underline cursor-pointer mr-3">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        </div>

      </div>

    </div>
  );
}
