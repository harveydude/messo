import React, { useState } from 'react';
import { 
  ChevronDown, 
  Paperclip, 
  Printer, 
  Download, 
  RotateCw, 
  Maximize2, 
  PenTool, 
  Undo2, 
  Redo2, 
  Menu, 
  MoreVertical, 
  Check,
  X
} from 'lucide-react';

/* Schnauzer mascot SVG */
function DogArt() {
  return (
    <svg width="90" height="95" viewBox="0 0 120 126">
      <path d="M22 42 L6 10 L44 26 Z" fill="#4a525d" />
      <path d="M20 38 L10 16 L38 28 Z" fill="#6c7580" />
      <path d="M98 42 L114 10 L76 26 Z" fill="#4a525d" />
      <path d="M100 38 L110 16 L82 28 Z" fill="#6c7580" />
      <rect x="24" y="24" width="72" height="66" rx="22" fill="#4a525d" />
      <ellipse cx="60" cy="50" rx="28" ry="24" fill="#6c7580" />
      <ellipse cx="44" cy="46" rx="5.5" ry="6.5" fill="#1f2328" />
      <ellipse cx="76" cy="46" rx="5.5" ry="6.5" fill="#1f2328" />
      <circle cx="42" cy="44" r="2" fill="#ffffff" />
      <circle cx="74" cy="44" r="2" fill="#ffffff" />
      <path d="M36 38 Q44 34 52 38" stroke="#d5d9de" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M84 38 Q76 34 68 38" stroke="#d5d9de" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M30 58 Q14 80 28 116 Q60 126 92 116 Q106 80 90 58 Q78 86 60 86 Q42 86 30 58 Z" fill="#f0f2f5" />
      <ellipse cx="60" cy="74" rx="8" ry="6" fill="#1f2328" />
      <path d="M60 80 L60 92" stroke="#1f2328" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M52 92 Q60 97 68 92" stroke="#1f2328" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function InvoiceReview({ 
  invoiceData = {}, 
  onClose, 
  onBack,
  onSent 
}) {
  const [fromEmail, setFromEmail] = useState("Karan's Landscaping Services <billing@notification.meso.in>");
  const [toEmail, setToEmail] = useState(invoiceData.email || 'accounts@coolcars.in');
  const [ccBccOpen, setCcBccOpen] = useState(false);
  const [ccEmail, setCcEmail] = useState('');
  const [sendCopy, setSendCopy] = useState(false);
  const [subject, setSubject] = useState(
    invoiceData.subject || "Invoice from Karan's Design and Landscaping Services"
  );
  const [emailBody, setEmailBody] = useState(
    "Hey Buddy!\n\nYour invoice is attached. Please remit payment at your earliest convenience.\nThank you for your business - we appreciate it very much.\n\nSincerely,\nKaran's Design and Landscaping Services"
  );
  const [zoom, setZoom] = useState(96);
  const [sentSuccess, setSentSuccess] = useState(false);

  // Fallback defaults matching screenshot
  const customerName = invoiceData.customer || 'Cool Cars';
  const billToText = invoiceData.billTo || 'Gaurav Parikh\nCool Cars\n65 Marine Drive\nNariman Point, Mumbai, MH 400021';
  const invNo = invoiceData.no || '1038';
  const terms = invoiceData.terms || 'Net 30';
  const invDate = invoiceData.invDate || '10/24/2025';
  const dueDate = invoiceData.dueDate || '11/23/2025';

  const rows = invoiceData.rows && invoiceData.rows.length > 0 && invoiceData.rows[0].value ? invoiceData.rows : [
    {
      id: 1,
      name: 'Gardening',
      desc: 'Weekly Gardening Service',
      qty: 1,
      rate: '200.00',
      amount: '₹200.00'
    }
  ];

  const subtotal = invoiceData.subtotal !== undefined ? invoiceData.subtotal : 200.00;
  const discountVal = invoiceData.discountVal !== undefined ? invoiceData.discountVal : 20.00;
  const discountPct = invoiceData.discountPct !== undefined ? invoiceData.discountPct : 10;
  const salesTax = invoiceData.salesTax !== undefined ? invoiceData.salesTax : 14.40;
  const total = invoiceData.total !== undefined ? invoiceData.total : 194.40;
  const note = invoiceData.note || 'Thank you for your business and have a great day!';

  const handleSend = () => {
    setSentSuccess(true);
    setTimeout(() => {
      onSent?.();
      onClose?.();
    }, 1500);
  };

  const billToLines = billToText.split('\n').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col antialiased select-none overflow-hidden">
      
      {/* ──── SUCCESS BANNER / TOAST ──── */}
      {sentSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#2ca01c] text-white px-6 py-3 rounded-[6px] shadow-2xl flex items-center gap-3 animate-bounce">
          <Check size={20} strokeWidth={2.5} />
          <span className="font-semibold text-[15px]">Invoice {invNo} sent to {toEmail}!</span>
        </div>
      )}

      {/* ──── MAIN 2-COLUMN VIEW ──── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        
        {/* ──── LEFT COLUMN: EMAIL COMPOSER (w-1/2) ──── */}
        <div className="w-1/2 flex-none border-r border-[#d4d7dc] bg-white flex flex-col overflow-y-auto px-[32px] pt-[24px] pb-[32px]">
          
          {/* From row */}
          <div className="flex items-center mb-[18px]">
            <label className="w-[88px] text-[14px] text-[#393a3d] font-normal shrink-0">From</label>
            <div className="flex-1 relative">
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full h-[38px] px-3 pr-8 rounded-[4px] border border-[#8d9096] text-[14px] text-[#393a3d] bg-white appearance-none outline-none focus:border-[#0077c5]"
              >
                <option>Karan's Landscaping Services &lt;billing@notification.meso.in&gt;</option>
              </select>
              <ChevronDown size={16} className="absolute right-3 top-[11px] text-[#393a3d] pointer-events-none" />
            </div>
          </div>

          {/* To row */}
          <div className="flex items-center mb-[12px]">
            <div className="w-[88px] flex items-center gap-2 shrink-0">
              <label className="text-[14px] text-[#393a3d] font-normal">To</label>
              <button 
                type="button" 
                onClick={() => setCcBccOpen(!ccBccOpen)}
                className="text-[13px] text-[#0077c5] hover:underline cursor-pointer"
              >
                Cc/Bcc
              </button>
            </div>
            <div className="flex-1">
              <input
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="w-full h-[38px] px-3 rounded-[4px] border border-[#8d9096] text-[14px] text-[#393a3d] outline-none focus:border-[#0077c5]"
              />
            </div>
          </div>

          {/* Optional Cc / Bcc input if toggled */}
          {ccBccOpen && (
            <div className="flex items-center mb-[12px]">
              <label className="w-[88px] text-[14px] text-[#393a3d] font-normal shrink-0">Cc</label>
              <div className="flex-1">
                <input
                  type="email"
                  value={ccEmail}
                  onChange={(e) => setCcEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full h-[38px] px-3 rounded-[4px] border border-[#8d9096] text-[14px] text-[#393a3d] outline-none focus:border-[#0077c5]"
                />
              </div>
            </div>
          )}

          {/* Send me a copy checkbox */}
          <div className="flex items-center mb-[18px] pl-[88px]">
            <label className="flex items-center gap-2 cursor-pointer text-[14px] text-[#393a3d]">
              <input
                type="checkbox"
                checked={sendCopy}
                onChange={(e) => setSendCopy(e.target.checked)}
                className="w-4 h-4 rounded border-[#8d9096] text-[#2ca01c] focus:ring-0"
              />
              <span>Send me a copy</span>
            </label>
          </div>

          {/* Subject row */}
          <div className="flex items-center mb-[16px]">
            <label className="w-[88px] text-[14px] text-[#393a3d] font-normal shrink-0">Subject</label>
            <div className="flex-1">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-[38px] px-3 rounded-[4px] border border-[#8d9096] text-[14px] text-[#393a3d] outline-none focus:border-[#0077c5]"
              />
            </div>
          </div>

          {/* Attachment chip */}
          <div className="flex items-center mb-[18px] pl-[88px]">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#c9cdd2] rounded-[4px] text-[13px] text-[#393a3d] shadow-2xs">
              <Paperclip size={14} className="text-[#393a3d]" />
              <span>Invoice PDF</span>
            </div>
          </div>

          {/* Email body row */}
          <div className="flex items-start mb-[14px]">
            <label className="w-[88px] text-[14px] text-[#393a3d] font-normal shrink-0 pt-2">Email body</label>
            <div className="flex-1">
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={14}
                className="w-full p-3.5 rounded-[4px] border-2 border-[#2ca01c] ring-1 ring-[#2ca01c] text-[14.5px] leading-relaxed text-[#393a3d] outline-none resize-none font-sans"
              />
            </div>
          </div>

          {/* Manage online delivery settings link */}
          <div className="pl-[88px]">
            <button
              type="button"
              className="text-[13.5px] text-[#0077c5] hover:underline cursor-pointer"
            >
              Manage online delivery settings
            </button>
          </div>

        </div>

        {/* ──── RIGHT COLUMN: PDF VIEWER (w-1/2) ──── */}
        <div className="w-1/2 flex-none bg-[#525659] flex flex-col overflow-hidden">
          
          {/* PDF Viewer Dark Toolbar (Height 40px) */}
          <div className="h-[40px] flex-none bg-[#323639] text-[#f1f1f1] px-4 flex items-center justify-between text-[13px] border-b border-[#212426]">
            
            {/* Left: Menu & Filename */}
            <div className="flex items-center gap-3">
              <button title="Menu" className="text-white hover:text-gray-300 p-1">
                <Menu size={16} />
              </button>
              <span className="font-mono text-[12.5px] text-white tracking-wide">3d265639-6ff...</span>
            </div>

            {/* Center: Pagination & Zoom */}
            <div className="flex items-center gap-3">
              <span className="text-white text-[12.5px]">1 / 1</span>
              <div className="h-4 w-px bg-white/20" />
              <button 
                onClick={() => setZoom(z => Math.max(50, z - 10))} 
                className="text-white hover:text-gray-300 px-1 font-bold text-[15px]"
                title="Zoom out"
              >
                −
              </button>
              <span className="text-white text-[12.5px] w-9 text-center">{zoom}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(150, z + 10))} 
                className="text-white hover:text-gray-300 px-1 font-bold text-[15px]"
                title="Zoom in"
              >
                +
              </button>
            </div>

            {/* Right: Tools & Actions */}
            <div className="flex items-center gap-3">
              <button title="Fit to width" className="text-white hover:text-gray-300 p-1">
                <Maximize2 size={14} />
              </button>
              <button title="Rotate clockwise" className="text-white hover:text-gray-300 p-1">
                <RotateCw size={14} />
              </button>
              <button title="Markup" className="text-white hover:text-gray-300 p-1">
                <PenTool size={14} />
              </button>
              <button title="Undo" className="text-white hover:text-gray-300 p-1">
                <Undo2 size={14} />
              </button>
              <button title="Redo" className="text-white hover:text-gray-300 p-1">
                <Redo2 size={14} />
              </button>
              <div className="h-4 w-px bg-white/20" />
              <button onClick={() => window.print()} title="Download" className="text-white hover:text-gray-300 p-1">
                <Download size={14} />
              </button>
              <button onClick={() => window.print()} title="Print" className="text-white hover:text-gray-300 p-1">
                <Printer size={14} />
              </button>
              <button title="More options" className="text-white hover:text-gray-300 p-1">
                <MoreVertical size={14} />
              </button>
            </div>

          </div>

          {/* PDF Page Container - Responsive & Full Width (Matches Screenshot 2) */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white p-6 md:p-8 flex flex-col text-[#393a3d]">
            <div className="w-full max-w-full flex flex-col">
              
              {/* Header: Title, Company, Noreply, Mascot */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-[26px] font-bold text-[#0077c5] tracking-wide mb-1">
                    INVOICE
                  </h1>
                  <p className="font-bold text-[13px] text-[#393a3d]">Lawns & Paws</p>
                  <p className="text-[12px] text-[#6b6c72]">42 Brigade Road, Indiranagar</p>
                  <p className="text-[12px] text-[#6b6c72]">Bengaluru, Karnataka 560038</p>
                </div>

                <div className="pt-8">
                  <p className="text-[12px] text-[#6b6c72]">noreply@meso.in</p>
                </div>

                <div className="scale-75 origin-top-right">
                  <DogArt />
                </div>
              </div>

              {/* Blue Band */}
              <div className="mt-6 bg-[#eaf3fa] p-5 rounded-[2px]">
                {/* Bill to block */}
                <div>
                  <p className="text-[12px] font-bold text-[#393a3d] mb-1">Bill to</p>
                  {billToLines.map((line, idx) => (
                    <p key={idx} className="text-[12px] text-[#393a3d] leading-snug">{line}</p>
                  ))}
                </div>

                {/* Dotted divider line */}
                <div className="my-3 border-b border-dotted border-[#9dc5e4]" />

                {/* Invoice details block */}
                <div>
                  <p className="text-[12px] font-bold text-[#393a3d] mb-1">Invoice details</p>
                  <p className="text-[12px] text-[#393a3d] leading-snug">Invoice no.: {invNo}</p>
                  <p className="text-[12px] text-[#393a3d] leading-snug">Terms: {terms}</p>
                  <p className="text-[12px] text-[#393a3d] leading-snug">Invoice date: {invDate}</p>
                  <p className="text-[12px] text-[#393a3d] leading-snug">Due date: {dueDate}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="mt-6">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead>
                    <tr className="border-b border-[#e3e5e8] text-[#393a3d] font-semibold h-8">
                      <th className="w-6">#</th>
                      <th className="w-[140px]">Product or service</th>
                      <th>Description</th>
                      <th className="w-12 text-right">Qty</th>
                      <th className="w-16 text-right">Rate</th>
                      <th className="w-16 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id || i} className="h-10 border-b border-[#f0f1f4] text-[#393a3d]">
                        <td>{i + 1}.</td>
                        <td className="font-medium">{r.value || r.name || 'Gardening'}</td>
                        <td className="text-[#6b6c72]">{r.desc || 'Weekly Gardening Service'}</td>
                        <td className="text-right">{r.qty || 1}</td>
                        <td className="text-right">${typeof r.rate === 'number' ? r.rate.toFixed(2) : parseFloat(r.rate || 200).toFixed(2)}</td>
                        <td className="text-right">${typeof r.amount === 'number' ? r.amount.toFixed(2) : (parseFloat(r.qty || 1) * parseFloat(r.rate || 200)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bottom Note & Totals */}
              <div className="mt-6 flex items-start justify-between">
                
                {/* Note to customer */}
                <div className="max-w-[280px]">
                  <p className="text-[12px] font-semibold text-[#393a3d] mb-1">Note to customer</p>
                  <p className="text-[11px] text-[#6b6c72] leading-relaxed">{note}</p>
                </div>

                {/* Right Totals block */}
                <div className="w-[200px] text-[12px] space-y-1.5">
                  <div className="flex justify-between text-[#393a3d]">
                    <span>Subtotal</span>
                    <span>${typeof subtotal === 'number' ? subtotal.toFixed(2) : parseFloat(subtotal || 200).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#393a3d]">
                    <span>Discount {discountPct}%</span>
                    <span>-${typeof discountVal === 'number' ? discountVal.toFixed(2) : parseFloat(discountVal || 20).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#393a3d]">
                    <span>Sales tax</span>
                    <span>${typeof salesTax === 'number' ? salesTax.toFixed(2) : parseFloat(salesTax || 14.4).toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#e3e5e8] flex justify-between items-baseline font-bold text-[#393a3d]">
                    <span className="text-[14px]">Total</span>
                    <span className="text-[18px]">${typeof total === 'number' ? total.toFixed(2) : parseFloat(total || 194.40).toFixed(2)}</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>

      </div>

      {/* ──── FIXED BOTTOM ACTION BAR (Height 60px) ──── */}
      <footer className="h-[60px] flex-none bg-white border-t border-[#e3e5e8] px-[32px] flex items-center justify-between z-40">
        
        {/* Back link */}
        <button
          type="button"
          onClick={() => {
            if (onBack) onBack();
            else if (onClose) onClose();
          }}
          className="text-[16px] font-semibold text-[#2ca01c] hover:underline cursor-pointer"
        >
          Back
        </button>

        {/* Send invoice split button */}
        <div className="flex h-[38px] rounded-[4px] overflow-hidden bg-[#007722] shadow-xs">
          <button
            type="button"
            onClick={handleSend}
            className="px-[20px] text-[15px] font-semibold text-white hover:bg-[#00661c] active:scale-[0.98] transition cursor-pointer"
          >
            Send invoice
          </button>
          <div className="w-px bg-white/20" />
          <button
            type="button"
            onClick={handleSend}
            className="w-[36px] flex items-center justify-center text-white hover:bg-[#00661c] cursor-pointer"
          >
            <ChevronDown size={16} />
          </button>
        </div>

      </footer>

    </div>
  );
}
