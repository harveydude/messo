import React, { useState } from 'react';
import { 
  X, Mail, ExternalLink, ChevronDown, Check, ThumbsUp, ThumbsDown, 
  ArrowRight, ListFilter, CreditCard, RotateCw, FileText
} from 'lucide-react';

/* High-fidelity SVG illustration matching Screenshot 5 (media_1791862605599_0b7f2202.jpg) */
function ReminderSuccessIllustration() {
  return (
    <svg width="240" height="200" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background teal/mint circle */}
      <circle cx="120" cy="100" r="62" fill="#D2EBEB" />
      
      {/* Motion dashed trajectory path */}
      <path 
        d="M 86 66 C 110 50, 140 55, 148 76" 
        stroke="#A5D6D6" 
        strokeWidth="1.5" 
        strokeDasharray="3 3" 
      />

      {/* Dark navy clock badge */}
      <circle cx="126" cy="92" r="10" fill="#1C3854" />
      <circle cx="126" cy="92" r="8.5" fill="#244B6D" />
      {/* Clock hands */}
      <line x1="126" y1="92" x2="126" y2="87" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="126" y1="92" x2="130" y2="92" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />

      {/* Floating green Rupee banknote */}
      <g transform="translate(114, 62) rotate(-18)">
        <rect width="18" height="10" rx="2" fill="#2CA01C" />
        <rect x="1.5" y="1.5" width="15" height="7" rx="1" fill="#48BB38" />
        <circle cx="9" cy="5" r="2.5" fill="#2CA01C" />
        <text x="7.2" y="6.8" fontSize="4.5" fill="#ffffff" fontWeight="bold" fontFamily="sans-serif">₹</text>
      </g>

      {/* Floating second small banknote */}
      <g transform="translate(94, 68) rotate(14)">
        <rect width="13" height="7.5" rx="1.5" fill="#34C724" />
        <circle cx="6.5" cy="3.75" r="1.8" fill="#268F18" />
      </g>

      {/* Character body & outfit */}
      <g transform="translate(100, 72)">
        {/* Head & hair */}
        {/* Back hair */}
        <path d="M 12 12 Q 6 18, 8 32 Q 14 36, 18 30 Z" fill="#231F20" />
        {/* Head */}
        <ellipse cx="16" cy="14" rx="5.5" ry="6.5" fill="#8D5B4C" />
        {/* Front wavy hair */}
        <path d="M 12 8 Q 16 4, 21 9 Q 23 16, 20 22 Q 18 16, 14 16 Z" fill="#231F20" />
        {/* Face details: jawline & neck */}
        <path d="M 15 19 L 15 24 L 18 24 L 18 19 Z" fill="#7C4E40" />

        {/* Orange top / knit sweater */}
        <path 
          d="M 12 24 C 7 26, 4 33, 4 43 L 26 43 C 26 33, 23 26, 18 24 Z" 
          fill="#EE6838" 
        />
        {/* Collar neckline */}
        <path d="M 13 24 Q 15 27, 17 24" stroke="#D75424" strokeWidth="1.5" fill="none" />

        {/* Crossbody Bag Strap */}
        <path d="M 12 24 L 23 44" stroke="#5B6570" strokeWidth="2.5" strokeLinecap="round" />

        {/* Right arm reaching forward holding papers */}
        <path d="M 23 28 C 30 32, 40 34, 46 34" stroke="#EE6838" strokeWidth="4.5" strokeLinecap="round" />
        {/* Hand */}
        <path d="M 46 34 L 50 33" stroke="#8D5B4C" strokeWidth="3.5" strokeLinecap="round" />

        {/* Held white document with green bars */}
        <g transform="translate(48, 30) rotate(-6)">
          <rect width="16" height="11" rx="1.5" fill="#ffffff" stroke="#D1D5DB" strokeWidth="0.8" />
          <line x1="2.5" y1="3" x2="13.5" y2="3" stroke="#2CA01C" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="2.5" y1="5.5" x2="10" y2="5.5" stroke="#9CA3AF" strokeWidth="0.9" strokeLinecap="round" />
          <line x1="2.5" y1="8" x2="7" y2="8" stroke="#9CA3AF" strokeWidth="0.9" strokeLinecap="round" />
        </g>

        {/* Left arm relaxed */}
        <path d="M 6 29 C 4 35, 3 40, 6 46" stroke="#EE6838" strokeWidth="4" strokeLinecap="round" />

        {/* Crossbody bag */}
        <rect x="0" y="42" width="13" height="16" rx="3" fill="#8C98A4" />
        <path d="M 0 45 L 13 45" stroke="#717D89" strokeWidth="1" />

        {/* Purple wide trousers */}
        <path 
          d="M 5 43 L 25 43 L 28 88 L 19 88 L 16 57 L 13 88 L 4 88 Z" 
          fill="#443963" 
        />
        {/* Trouser waist detail */}
        <line x1="5" y1="45" x2="25" y2="45" stroke="#332A4B" strokeWidth="1.5" />

        {/* Yellow-orange sneakers */}
        {/* Left shoe */}
        <path d="M 4 88 L 13 88 L 14 94 L 1 94 Z" fill="#E89B35" />
        <rect x="1" y="93" width="13" height="2.5" rx="1" fill="#FFFFFF" />
        {/* Right shoe */}
        <path d="M 19 88 L 28 88 L 29 94 L 16 94 Z" fill="#E89B35" />
        <rect x="16" y="93" width="13" height="2.5" rx="1" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

export default function ReviewInvoiceReminderModal({ 
  isOpen = true, 
  onClose, 
  onReminderSent,
  invoice = null
}) {
  const [tone, setTone] = useState('formal'); // 'formal' | 'friendly' | 'direct'
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [useDefaultMessage, setUseDefaultMessage] = useState(false);

  // Invoice parameters with Indian Rupee formatting
  const invNo = invoice?.no || '1018';
  const customerName = invoice?.customer || 'Sushi by Katsuyuki';
  const customerEmail = invoice?.email || 'sushi@notification.meso.in';
  const daysOverdue = invoice?.daysOverdue || 7;
  const amountStr = invoice?.amountFormatted || '₹6,680.00';
  const dueDateStr = invoice?.dueDate || '10-20-2025';

  // Pre-configured message tones
  const messageTones = {
    formal: `Hi Katsuyuki,\n\nWe're contacting you regarding the payment of the invoice due on ${dueDateStr}. The ${amountStr} balance is now ${daysOverdue} days overdue. We look forward to building a healthy business relationship and appreciate your prompt attention to this matter. Should you have any questions or require assistance, don't hesitate to contact us at billing@meso.in.`,
    friendly: `Hi Katsuyuki,\n\nHope you're having a wonderful week! Just checking in with a quick friendly reminder that invoice #${invNo} for ${amountStr} was due on ${dueDateStr} (${daysOverdue} days ago).\n\nWhenever you get a chance today, could you please look into this and send over the payment? If you've already sent it, please feel free to ignore this note. Thank you so much for your business!`,
    direct: `Hi Katsuyuki,\n\nThis is an urgent notice regarding invoice #${invNo}. The remaining balance of ${amountStr} is currently ${daysOverdue} days past due (original due date: ${dueDateStr}).\n\nPlease process this payment today to ensure your account remains in good standing. Should you require an updated statement or have any dispute, please email billing@meso.in immediately.`
  };

  const defaultMessage = `Dear Customer,\n\nPlease find attached a reminder for invoice #${invNo} in the amount of ${amountStr}, which was due on ${dueDateStr}.\n\nThank you for your prompt payment.\nSincerely,\nKaran's Design and Landscaping Services`;

  const [messageText, setMessageText] = useState(messageTones.formal);
  const [subjectText, setSubjectText] = useState(`REMINDER: Payment overdue for Invoice #${invNo}`);
  const [toEmailText, setToEmailText] = useState(customerEmail);
  const [sendCopy, setSendCopy] = useState(false);

  const handleToneChange = (newTone) => {
    setTone(newTone);
    setToneMenuOpen(false);
    setIsRewriting(true);
    setTimeout(() => {
      setMessageText(messageTones[newTone]);
      setIsRewriting(false);
    }, 250);
  };

  const handleRewrite = () => {
    setIsRewriting(true);
    setTimeout(() => {
      setMessageText(messageTones[tone]);
      setIsRewriting(false);
    }, 300);
  };

  const toggleDefault = () => {
    if (!useDefaultMessage) {
      setMessageText(defaultMessage);
      setUseDefaultMessage(true);
    } else {
      setMessageText(messageTones[tone]);
      setUseDefaultMessage(false);
    }
  };

  const handleSend = () => {
    setIsSent(true);
    if (onReminderSent) {
      onReminderSent({
        invNo,
        customerName,
        amount: amountStr,
        tone
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-auto border border-gray-200 transition-all text-[#393A3D]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================== 1. SUCCESS / ALL DONE STATE (Screenshot 5) ===================== */}
        {isSent ? (
          <div className="p-8 flex flex-col">
            {/* Top Bar Header */}
            <div className="flex items-start justify-between pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">All done!</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-700 mt-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                    <Check size={14} />
                  </span>
                  <span>
                    You just sent <strong className="font-semibold text-gray-900">1 invoice reminder worth {amountStr}!</strong>
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="flex items-center space-x-3 py-3 border-t border-gray-100 text-xs text-gray-500">
              <ListFilter size={15} className="text-gray-400" />
              <span className="font-medium whitespace-nowrap">&lt; 1 of 1</span>
              <div className="flex-1 h-1.5 bg-gray-400 rounded-full overflow-hidden" />
              <button 
                onClick={onClose}
                className="text-gray-700 hover:text-black font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <span>Done</span>
                <span>&gt;</span>
              </button>
            </div>

            {/* Center Illustrated Card */}
            <div className="border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center min-h-[340px] bg-white my-3">
              <ReminderSuccessIllustration />
            </div>

            {/* Bottom Feedback Bar */}
            <div className="flex items-center justify-between pt-4 text-xs text-gray-600">
              <div className="flex items-center space-x-2">
                <span>Is this useful?</span>
                {feedback ? (
                  <span className="text-[#2ca01c] font-semibold">Thanks for your feedback!</span>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <button 
                      onClick={() => setFeedback('up')}
                      className="p-1 text-gray-500 hover:text-gray-900 transition rounded hover:bg-gray-100 cursor-pointer"
                      title="Yes"
                    >
                      <ThumbsUp size={15} />
                    </button>
                    <button 
                      onClick={() => setFeedback('down')}
                      className="p-1 text-gray-500 hover:text-gray-900 transition rounded hover:bg-gray-100 cursor-pointer"
                      title="No"
                    >
                      <ThumbsDown size={15} />
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={onClose}
                className="px-6 py-2 bg-[#2ca01c] hover:bg-[#258717] text-white rounded-md font-semibold text-sm transition shadow-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ===================== 2. REVIEW INVOICE REMINDER STATE (Screenshot 4) ===================== */
          <div className="p-6 sm:p-7 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Review invoice reminder</h2>
                <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                  <span className="text-cyan-600">
                    <Mail size={14} />
                  </span>
                  <span>
                    Based on days overdue, I drafted a <strong className="font-semibold text-gray-900">formal invoice reminder</strong>. Review and make edits before sending.
                  </span>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Strip */}
            <div className="flex items-center space-x-3 py-2 text-xs text-gray-500 mb-2">
              <ListFilter size={15} className="text-gray-400" />
              <span className="font-medium whitespace-nowrap">&lt; 1 of 1</span>
              <div className="flex-1 h-1.5 bg-[#2ca01c] rounded-full overflow-hidden" />
              <button 
                onClick={onClose}
                className="text-gray-600 hover:text-black font-medium flex items-center space-x-0.5 cursor-pointer"
              >
                <span>Skip invoice</span>
                <span>&gt;</span>
              </button>
            </div>

            {/* Inner Content Card (Matches Screenshot 4) */}
            <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
              {/* Header row: Customer name, Overdue amount, Send reminder button */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{customerName}</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mt-0.5">
                    <span className="font-bold text-gray-900">{amountStr}</span>
                    <span>-</span>
                    <a 
                      href={`#invoice-${invNo}`} 
                      onClick={(e) => e.preventDefault()}
                      className="text-[#0077c5] hover:underline flex items-center space-x-0.5 font-medium"
                    >
                      <span>Invoice #{invNo}</span>
                      <ExternalLink size={11} className="inline ml-0.5" />
                    </a>
                    <span>-</span>
                    <span className="text-red-600 font-medium">{daysOverdue} days overdue</span>
                  </div>
                </div>

                <button 
                  onClick={handleSend}
                  className="px-6 py-2 bg-[#2ca01c] hover:bg-[#258717] text-white rounded-md font-semibold text-sm transition shadow-xs cursor-pointer"
                >
                  Send reminder
                </button>
              </div>

              {/* Accepted payment methods row */}
              <div className="flex items-center space-x-3 text-xs text-gray-500 py-1">
                <span>Accepted payment methods</span>
                <button 
                  onClick={() => alert("Configure payment methods: UPI, NetBanking, Debit/Credit Cards")}
                  className="text-[#0077c5] hover:underline font-medium"
                >
                  Set up
                </button>
                <div className="flex items-center space-x-1.5 ml-2">
                  <span className="px-1.5 py-0.5 border border-gray-200 rounded bg-gray-50 text-[10px] font-bold text-gray-700">UPI</span>
                  <span className="px-1.5 py-0.5 border border-gray-200 rounded bg-gray-50 text-[10px] font-bold text-blue-700">RuPay</span>
                  <span className="px-1.5 py-0.5 border border-gray-200 rounded bg-gray-50 text-[10px] font-bold text-blue-800">VISA</span>
                  <span className="px-1.5 py-0.5 border border-gray-200 rounded bg-gray-50 text-[10px] font-bold text-red-600">Mastercard</span>
                  <span className="px-1.5 py-0.5 border border-gray-200 rounded bg-gray-50 text-[10px] font-semibold text-emerald-700">NetBanking</span>
                </div>
              </div>

              {/* Main 2-column layout */}
              <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-5 items-start pt-1">
                {/* Left Column: Customer & Invoice Intelligence */}
                <div className="bg-[#F6F7F9] rounded-xl p-4 space-y-4 text-xs text-gray-700">
                  <div>
                    <h4 className="font-bold text-gray-900 mb-2">About this customer</h4>
                    <ul className="space-y-1.5 text-gray-600">
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>Customer since September 2025</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>1 paid invoice</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>1 late payment</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>1 coming due invoice</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-2">About this invoice</h4>
                    <ul className="space-y-1.5 text-gray-600">
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>Total amount: <strong className="font-semibold text-gray-900">{amountStr}</strong></span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>Remaining balance: <strong className="font-semibold text-gray-900">{amountStr}</strong></span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>First sent: not yet sent</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                        <span>Reminders sent: 0 times</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Column: AI Message Editor */}
                <div className="space-y-3">
                  {/* Generated Tone Controls Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="text-[#0077c5] flex items-center space-x-1">
                        <FileText size={14} />
                        <span className="font-bold text-xs text-gray-900">Generated</span>
                      </span>

                      {/* Tone selector dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setToneMenuOpen(!toneMenuOpen)}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-semibold text-gray-800 hover:bg-gray-50 transition cursor-pointer"
                        >
                          <span>{tone === 'formal' ? '😀 Formal' : tone === 'friendly' ? '😊 Friendly' : '⚡ Direct'}</span>
                          <ChevronDown size={13} className="text-gray-500" />
                        </button>

                        {toneMenuOpen && (
                          <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-30 text-xs">
                            <button
                              onClick={() => handleToneChange('formal')}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2 ${tone === 'formal' ? 'font-bold bg-gray-50 text-[#2ca01c]' : ''}`}
                            >
                              <span>😀 Formal</span>
                            </button>
                            <button
                              onClick={() => handleToneChange('friendly')}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2 ${tone === 'friendly' ? 'font-bold bg-gray-50 text-[#2ca01c]' : ''}`}
                            >
                              <span>😊 Friendly</span>
                            </button>
                            <button
                              onClick={() => handleToneChange('direct')}
                              className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 flex items-center space-x-2 ${tone === 'direct' ? 'font-bold bg-gray-50 text-[#2ca01c]' : ''}`}
                            >
                              <span>⚡ Direct</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={handleRewrite}
                        disabled={isRewriting}
                        className="text-[#0077c5] hover:underline text-xs font-medium cursor-pointer flex items-center space-x-1"
                      >
                        <RotateCw size={11} className={isRewriting ? "animate-spin" : ""} />
                        <span>Rewrite</span>
                      </button>
                    </div>

                    <button 
                      onClick={toggleDefault}
                      className="px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition cursor-pointer"
                    >
                      {useDefaultMessage ? "Switch to generated message" : "Switch to default message"}
                    </button>
                  </div>

                  {/* From Field */}
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-14 text-gray-500 font-medium shrink-0">From</span>
                    <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-md text-gray-800">
                      <span className="truncate">Karan's Design and Landscaping Services &lt;billing@notification.meso.in&gt;</span>
                      <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
                    </div>
                  </div>

                  {/* To Field */}
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-14 text-gray-500 font-medium shrink-0">To</span>
                    <input 
                      type="text"
                      value={toEmailText}
                      onChange={(e) => setToEmailText(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                    />
                  </div>

                  {/* Cc/Bcc Checkbox */}
                  <div className="flex items-center space-x-3 text-xs pl-[68px]">
                    <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                      <input 
                        type="checkbox"
                        checked={sendCopy}
                        onChange={(e) => setSendCopy(e.target.checked)}
                        className="rounded text-[#2ca01c] focus:ring-[#2ca01c]" 
                      />
                      <span>Send me a copy</span>
                    </label>
                  </div>

                  {/* Subject Field */}
                  <div className="flex items-center space-x-3 text-xs">
                    <span className="w-14 text-gray-500 font-medium shrink-0">Subject</span>
                    <input 
                      type="text"
                      value={subjectText}
                      onChange={(e) => setSubjectText(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                    />
                  </div>

                  {/* Message Field */}
                  <div className="flex items-start space-x-3 text-xs">
                    <span className="w-14 text-gray-500 font-medium shrink-0 pt-2">Message</span>
                    <textarea 
                      rows={6}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-md text-gray-800 font-normal leading-relaxed focus:outline-none focus:ring-1 focus:ring-[#2ca01c]"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom modal action bar */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => alert("Preview saved to draft")}
                    className="px-4 py-2 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                  >
                    Save as draft
                  </button>
                  <button 
                    onClick={handleSend}
                    className="px-6 py-2 bg-[#2ca01c] hover:bg-[#258717] text-white rounded-md font-semibold text-xs transition shadow-xs cursor-pointer"
                  >
                    Send reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
