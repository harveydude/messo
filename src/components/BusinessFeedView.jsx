import React, { useState } from 'react';
import {
  Sparkles,
  Filter,
  Clock,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Copy,
  Check,
  Settings,
  CreditCard,
  Mail,
  Printer,
  Camera,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Activity,
  Users,
  Info
} from 'lucide-react';
import { useStore } from '../store';

/**
 * BusinessFeedView — Meso Business Feed.
 * Exact replication of the 5-screenshot continuous scroll page:
 * - Header: Title "Business Feed", Meso Assist greeting, Filter and Snoozed action buttons
 * - Two-column responsive layout:
 *   LEFT COLUMN (Main Feed Cards in order):
 *     Card 1: "Overdue invoices" (₹1,27,379.25 reminders, blue sparkle banner, 3-row table with John Melton, Barnett Design, Amy's Bird Sanctuary, Review links, Hide details, Review all button)
 *     Card 2: "Profit and loss" (Net profit September ₹1,16,342.22, +672%, Income ₹6,96,974.50 with striped bar "8 to review", Expense ₹5,80,575.50 with striped bar "15 to review", View report, Categorize transactions)
 *     Card 3: "Payments Agent" (37% paid late, 1.5% late fee recommendation, SVG Donut chart for Invoice payments, 37.5% overdue, Hide details, Set up late fees)
 *     Card 4: "Autofilling expenses keeps your records organized" (Snap receipts, dashed dropzone with "+ Upload receipt", drag and drop)
 *     Card 5: "Invoices paid" (₹1,86,668.42 in payments this week, 9 payments made, Show details, Go to payments)
 *     Card 6: "Forwarding emails to autofill transactions" (Gradient banner with "₹5,25,382.00 in new invoices ready to review" floating toast, two copyable email forward boxes for sales and expenses, Learn how)
 *     Card 7: "You're all caught up!" (End of feed card with pastel illustration, quick action pills for Generate a bill, Receipt upload, Generate an invoice)
 *   RIGHT COLUMN (Sticky sidebar widgets):
 *     Widget 1: "Autofill" (Doc type select, Files/Images toggle, dropzone, email forward chip, Manage settings)
 *     Widget 2: "Meso's AI agents" (3 active agents: Accounting Agent, Payments Agent, Customer Agent BETA, Explore all agents)
 */

export default function BusinessFeedView({
  onNavigate,
  onOpenInvoiceModal,
  onOpenExpenseModal,
  onOpenReviewInvoice
}) {
  const { state } = useStore();

  // Filters state
  const [filterActive, setFilterActive] = useState('All');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [snoozedOpen, setSnoozedOpen] = useState(false);
  const [snoozedCount, setSnoozedCount] = useState(0);

  // Card collapse toggles
  const [card1Open, setCard1Open] = useState(true);
  const [card3Open, setCard3Open] = useState(true);
  const [card5Open, setCard5Open] = useState(false);
  const [card6LearnOpen, setCard6LearnOpen] = useState(false);

  // Three dots menus active state
  const [activeMenuCard, setActiveMenuCard] = useState(null);

  // Right sidebar widgets toggles
  const [autofillWidgetOpen, setAutofillWidgetOpen] = useState(true);
  const [agentsWidgetOpen, setAgentsWidgetOpen] = useState(true);
  const [autofillDocType, setAutofillDocType] = useState('Bill');
  const [autofillTab, setAutofillTab] = useState('files');

  // Copy feedback state
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    } catch (e) {}
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const snoozeCard = (cardId) => {
    setSnoozedCount(prev => prev + 1);
    setActiveMenuCard(null);
    alert(`Card snoozed for 7 days.`);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white font-sans text-[#393a3d]">
      
      {/* ────────────────── MAIN FEED SCROLLABLE CONTAINER ────────────────── */}
      <div className="flex-1 overflow-y-auto px-8 py-7">
        
        {/* ──── PAGE HEADER ──── */}
        <div className="max-w-[1240px] mx-auto mb-7">
          <h1 className="text-[32px] font-bold text-[#111] tracking-tight mb-2">
            Business Feed
          </h1>

          <div className="flex items-center gap-2 text-sm text-[#393a3d] mb-5">
            <Sparkles size={17} className="text-[#0077c5] flex-none" />
            <span>
              Hi, I'm Meso Assist. I'll share work done for you and suggestions to help run your business. Check back often.
            </span>
          </div>

          {/* Filter & Snoozed Buttons */}
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c9cdd2] rounded-[4px] bg-white text-xs font-semibold text-[#393a3d] hover:bg-gray-50 transition cursor-pointer"
            >
              <span>Filter</span>
              <Filter size={13} className="text-[#6b6c72]" />
            </button>

            {filterMenuOpen && (
              <div className="absolute left-0 top-[38px] z-30 w-44 bg-white border border-[#c9cdd2] rounded-md shadow-lg py-1 text-xs">
                {['All', 'Invoices', 'Profit & Loss', 'AI Agents', 'Expenses'].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFilterActive(f); setFilterMenuOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 ${filterActive === f ? 'font-bold text-[#2ca01c]' : 'text-[#393a3d]'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => alert(snoozedCount > 0 ? `${snoozedCount} cards currently snoozed.` : 'No snoozed cards.')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c9cdd2] rounded-[4px] bg-white text-xs font-semibold text-[#393a3d] hover:bg-gray-50 transition cursor-pointer"
            >
              <Clock size={13} className="text-[#6b6c72]" />
              <span>Snoozed {snoozedCount > 0 ? `(${snoozedCount})` : ''}</span>
            </button>
          </div>
        </div>

        {/* ──── TWO-COLUMN CONTENT GRID ──── */}
        <div className="max-w-[1240px] mx-auto flex flex-col lg:flex-row items-start gap-8">
          
          {/* ════════════ LEFT COLUMN: MAIN FEED CARDS (Order 1 to 7) ════════════ */}
          <div className="flex-1 w-full space-y-6">

            {/* ──── CARD 1: OVERDUE INVOICES ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl p-6 shadow-xs relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f4f5f8] flex items-center justify-center text-[#6b6c72]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111] leading-tight">Overdue invoices</h2>
                    <p className="text-xs text-[#6b6c72]">Review reminders</p>
                  </div>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setActiveMenuCard(activeMenuCard === 1 ? null : 1)}
                    className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {activeMenuCard === 1 && (
                    <div className="absolute right-0 top-6 z-20 w-40 bg-white border border-[#c9cdd2] rounded-md shadow-lg py-1 text-xs">
                      <button onClick={() => snoozeCard(1)} className="w-full text-left px-3 py-1.5 hover:bg-gray-50">Snooze for 7 days</button>
                      <button onClick={() => { alert('Feedback recorded'); setActiveMenuCard(null); }} className="w-full text-left px-3 py-1.5 hover:bg-gray-50">Give feedback</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Message */}
              <h3 className="text-[17px] font-bold text-[#111] mb-3">
                Over ₹1,525.50 worth of invoice reminders are ready for you to review and send
              </h3>

              {/* Blue Sparkle Banner */}
              <div className="bg-[#eef6fc] rounded-[6px] p-3 flex items-center gap-2.5 text-xs text-[#393a3d] mb-5">
                <Sparkles size={15} className="text-[#0077c5] flex-none" />
                <span>
                  You have 10 overdue invoices from 9 customers. Give them more ways to pay.{' '}
                  <a
                    href="#payments"
                    onClick={(e) => { e.preventDefault(); alert('Payments onboarding opened'); }}
                    className="text-[#0077c5] font-semibold hover:underline"
                  >
                    Set up payments
                  </a>
                </span>
              </div>

              {/* Collapsible Table */}
              {card1Open && (
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#e3e5e8] text-[#6b6c72] font-semibold pb-2">
                        <th className="py-2 text-left font-bold">Customer</th>
                        <th className="py-2 text-left font-bold">Invoice #</th>
                        <th className="py-2 text-left font-bold">Amount</th>
                        <th className="py-2 text-left font-bold">Status</th>
                        <th className="py-2 text-right font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f2f4]">
                      {[
                        { customer: 'John Melton', no: '1007', amount: '₹450.00', status: '22 days overdue' },
                        { customer: 'Barnett Design', no: '1012', amount: '₹274.50', status: '11 days overdue' },
                        { customer: "Amy's Bird Sanctuary", no: '1021', amount: '₹239.00', status: '19 days overdue' }
                      ].map((inv) => (
                        <tr key={inv.no} className="hover:bg-[#fbfcfd] transition">
                          <td className="py-3 text-[#111] font-medium">{inv.customer}</td>
                          <td className="py-3 text-[#6b6c72]">{inv.no}</td>
                          <td className="py-3 text-[#111] font-semibold">{inv.amount}</td>
                          <td className="py-3 text-[#d32f2f] font-medium">{inv.status}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                if (onOpenReviewInvoice) {
                                  onOpenReviewInvoice({
                                    id: inv.no,
                                    customer: inv.customer,
                                    amount: parseFloat(inv.amount.replace(/[^0-9.]/g, '')),
                                    balanceDue: parseFloat(inv.amount.replace(/[^0-9.]/g, '')),
                                    dueDate: 'Overdue'
                                  });
                                } else if (onOpenInvoiceModal) {
                                  onOpenInvoiceModal();
                                }
                              }}
                              className="text-[#0077c5] font-semibold hover:underline cursor-pointer"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0f2f4]">
                <button
                  onClick={() => setCard1Open(!card1Open)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                >
                  <span>{card1Open ? 'Hide details' : 'Show details'}</span>
                  {card1Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <button
                  onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Reviewing all overdue invoices')}
                  className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] hover:bg-green-50 rounded-[4px] text-xs font-semibold transition cursor-pointer"
                >
                  Review all
                </button>
              </div>
            </section>

            {/* ──── CARD 2: PROFIT AND LOSS ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl p-6 shadow-xs relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f4f5f8] flex items-center justify-center text-[#6b6c72]">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111] leading-tight">Profit and loss</h2>
                    <p className="text-xs text-[#6b6c72]">Review transactions</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMenuCard(activeMenuCard === 2 ? null : 2)}
                  className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Message */}
              <p className="text-xs text-[#393a3d] mb-4">
                Based on your connected transactions, I calculated your net profit for the last month. Improve accuracy by reviewing transactions.
              </p>

              {/* Net profit metric */}
              <div className="mb-5">
                <p className="text-[11px] text-[#6b6c72] mb-0.5">Net profit from September</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-[#111]">₹1,393.32</span>
                  <span className="inline-flex items-center gap-1 bg-[#eef6fc] text-[#0077c5] text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                    <Info size={11} /> 78%
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#2ca01c] mt-0.5 flex items-center gap-1">
                  <span>↑ Up 672% from prior month</span>
                </p>
              </div>

              {/* Progress bars: Income & Expense */}
              <div className="space-y-4 mb-6">
                
                {/* Income Bar */}
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <div>
                      <span className="font-bold text-sm text-[#111]">₹8,347</span>
                      <span className="text-[#6b6c72] ml-1">Income</span>
                    </div>
                    <button
                      onClick={() => onNavigate ? onNavigate('sales_transactions') : alert('Reviewing 8 income transactions')}
                      className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                    >
                      8 to review
                    </button>
                  </div>

                  <div className="h-4 w-full bg-[#f0f2f4] rounded-sm flex overflow-hidden">
                    <div className="bg-[#2ca01c] h-full" style={{ width: '68%' }} />
                    <div
                      className="h-full"
                      style={{
                        width: '32%',
                        background: 'repeating-linear-gradient(45deg, #2ca01c, #2ca01c 4px, #e6f4ea 4px, #e6f4ea 8px)'
                      }}
                    />
                  </div>
                </div>

                {/* Expense Bar */}
                <div>
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <div>
                      <span className="font-bold text-sm text-[#111]">₹6,953</span>
                      <span className="text-[#6b6c72] ml-1">Expense</span>
                    </div>
                    <button
                      onClick={() => onNavigate ? onNavigate('expense_transactions') : alert('Reviewing 15 expense transactions')}
                      className="text-[#0077c5] hover:underline font-semibold cursor-pointer"
                    >
                      15 to review
                    </button>
                  </div>

                  <div className="h-4 w-full bg-[#f0f2f4] rounded-sm flex overflow-hidden">
                    <div className="bg-[#00828a] h-full" style={{ width: '60%' }} />
                    <div
                      className="h-full"
                      style={{
                        width: '40%',
                        background: 'repeating-linear-gradient(45deg, #00828a, #00828a 4px, #e6f6f7 4px, #e6f6f7 8px)'
                      }}
                    />
                  </div>
                </div>

              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-end gap-4 pt-2 border-t border-[#f0f2f4]">
                <button
                  onClick={() => onNavigate ? onNavigate('standard_reports') : alert('Viewing report')}
                  className="text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                >
                  View report
                </button>
                <button
                  onClick={() => onNavigate ? onNavigate('bank_transactions') : alert('Categorizing transactions')}
                  className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] hover:bg-green-50 rounded-[4px] text-xs font-semibold transition cursor-pointer"
                >
                  Categorize transactions
                </button>
              </div>
            </section>

            {/* ──── CARD 3: PAYMENTS AGENT (LATE FEES RECOMMENDATION) ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl p-6 shadow-xs relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0a3e42] flex items-center justify-center text-[#2ca01c]">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111] leading-tight">Payments Agent</h2>
                    <p className="text-xs text-[#6b6c72]">Consider adding late fees</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMenuCard(activeMenuCard === 3 ? null : 3)}
                  className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Message */}
              <p className="text-xs text-[#393a3d] leading-relaxed mb-3">
                37% of your invoices in the last year were paid late, or not at all. I suggest a late fee of 1.5%. Feel free to adjust. Late fees will be applied to all new invoices, beginning tomorrow.
              </p>

              {/* Sparkle banner */}
              <div className="bg-[#eef6fc] rounded-[6px] p-3 flex items-center gap-2.5 text-xs text-[#393a3d] mb-6">
                <Sparkles size={15} className="text-[#0077c5] flex-none" />
                <span>
                  Add a 1.5% late fee on the remaining balance, once, with a 30-day grace period, to all new invoices.
                </span>
              </div>

              {/* Donut Chart Section */}
              {card3Open && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6c72]">INVOICE PAYMENTS</span>
                    <span className="text-xs text-[#6b6c72]">Last 12 months</span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-[#fbfcfd] p-4 rounded-lg border border-[#f0f2f4]">
                    <div>
                      <p className="text-xs text-[#6b6c72] mb-1">Overdue payments</p>
                      <p className="text-3xl font-bold text-[#111]">37.5%</p>
                    </div>

                    {/* Donut SVG */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                        {/* Segment 1: Paid on time (Green 45%) */}
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="transparent"
                          stroke="#2ca01c"
                          strokeWidth="7"
                          strokeDasharray="45 100"
                          strokeDashoffset="0"
                        />
                        {/* Segment 2: Open invoices (Purple 17.5%) */}
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="transparent"
                          stroke="#6b46c1"
                          strokeWidth="7"
                          strokeDasharray="17.5 100"
                          strokeDashoffset="-45"
                        />
                        {/* Segment 3: Paid late or overdue (Orange 37.5%) */}
                        <circle
                          cx="18"
                          cy="18"
                          r="14"
                          fill="transparent"
                          stroke="#ea580c"
                          strokeWidth="7"
                          strokeDasharray="37.5 100"
                          strokeDashoffset="-62.5"
                        />
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#2ca01c]" />
                        <span>Paid on time</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6b46c1]" />
                        <span>Open invoices</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
                        <span>Paid late or overdue</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0f2f4]">
                <button
                  onClick={() => setCard3Open(!card3Open)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                >
                  <span>{card3Open ? 'Hide details' : 'Show details'}</span>
                  {card3Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <button
                  onClick={() => alert('Late fee automation settings enabled: 1.5% late fee on invoices.')}
                  className="px-4 py-1.5 border border-[#2ca01c] bg-white text-[#2ca01c] hover:bg-green-50 rounded-[4px] text-xs font-semibold transition cursor-pointer"
                >
                  Set up late fees
                </button>
              </div>
            </section>

            {/* ──── CARD 4: AUTOFILLING EXPENSES ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl p-6 shadow-xs relative">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-[17px] font-bold text-[#111] leading-tight">
                    Autofilling expenses keeps your records organized
                  </h2>
                  <p className="text-xs text-[#6b6c72] mt-1">
                    Snap and store receipts for expenses like fuel and supplies. Maximize deductions and minimize work at tax time.
                  </p>
                </div>
                <button
                  onClick={() => setActiveMenuCard(activeMenuCard === 4 ? null : 4)}
                  className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              {/* Dashed dropzone */}
              <div
                onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Opening Expense upload')}
                className="border-2 border-dashed border-[#9dbde0] bg-[#f5f8fc] hover:bg-[#eef4fb] transition rounded-lg p-7 flex flex-col items-center justify-center cursor-pointer mt-4"
              >
                <button className="flex items-center gap-2 px-4 py-2 border border-[#2ca01c] bg-white text-[#2ca01c] font-semibold text-xs rounded-[4px] shadow-xs hover:bg-green-50 transition cursor-pointer">
                  <Sparkles size={14} />
                  <span>Upload receipt</span>
                </button>
                <p className="text-xs text-[#6b6c72] mt-2">or drag and drop here</p>
              </div>
            </section>

            {/* ──── CARD 5: INVOICES PAID (PAYMENTS THIS WEEK) ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl p-6 shadow-xs relative">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#f4f5f8] flex items-center justify-center text-[#6b6c72]">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111] leading-tight">Invoices paid</h2>
                    <p className="text-xs text-[#6b6c72]">Payments this week</p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveMenuCard(activeMenuCard === 5 ? null : 5)}
                  className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-gray-100 transition cursor-pointer"
                >
                  <MoreVertical size={16} />
                </button>
              </div>

              <div className="my-3">
                <h3 className="text-[17px] font-bold text-[#111]">
                  ₹2,235.55 in payments were made this week
                </h3>
                <p className="text-xs text-[#6b6c72] mt-0.5">9 payments were made</p>
              </div>

              {card5Open && (
                <div className="my-3 p-3 bg-[#fbfcfd] rounded border border-[#f0f2f4] text-xs space-y-2">
                  <div className="flex justify-between font-medium"><span>Cool Cars (Inv #1004)</span><span>₹1,200.00</span></div>
                  <div className="flex justify-between font-medium"><span>Dylan Sollfrank (Inv #1005)</span><span>₹650.00</span></div>
                  <div className="flex justify-between font-medium"><span>Garden Depot (Inv #1006)</span><span>₹385.55</span></div>
                </div>
              )}

              {/* Card Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#f0f2f4]">
                <button
                  onClick={() => setCard5Open(!card5Open)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                >
                  <span>{card5Open ? 'Hide details' : 'Show details'}</span>
                  {card5Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                <button
                  onClick={() => onNavigate ? onNavigate('sales_transactions') : alert('Navigating to payments')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                >
                  <CreditCard size={14} />
                  <span>Go to payments</span>
                </button>
              </div>
            </section>

            {/* ──── CARD 6: FORWARDING EMAILS TO AUTOFILL TRANSACTIONS ──── */}
            <section className="bg-white border border-[#d4d7dc] rounded-xl overflow-hidden shadow-xs relative">
              {/* Top Banner with Floating Pill */}
              <div className="bg-gradient-to-r from-[#e3edf7] via-[#ebf2fa] to-[#f4f7fb] p-6 pb-8 border-b border-[#e3e5e8] relative">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setActiveMenuCard(activeMenuCard === 6 ? null : 6)}
                    className="p-1 text-[#6b6c72] hover:text-[#111] rounded hover:bg-white/50 transition cursor-pointer"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>

                {/* Floating white pill matching Screenshot 2 */}
                <div className="bg-white rounded-lg border border-[#c9cdd2] shadow-sm p-4 max-w-md mx-auto">
                  <div className="flex items-center gap-2 font-bold text-xs text-[#111] mb-2">
                    <CheckCircle size={15} className="text-[#2ca01c]" />
                    <span>₹6,292.00 in new invoices are ready for you to review</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#6b6c72] pt-2 border-t border-[#f0f2f4]">
                    <span>Just now</span>
                    <span className="flex items-center gap-1 font-medium text-[#111]">
                      <Mail size={13} className="text-[#6b6c72]" />
                      FWD: Quote for maintenace
                    </span>
                    <button
                      onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Reviewing quote invoice')}
                      className="text-[#0077c5] font-semibold hover:underline cursor-pointer"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="p-6">
                <h3 className="text-[17px] font-bold text-[#111] mb-4">
                  Forwarding emails to autofill transactions can help you cut down on manual work
                </h3>

                {/* Two email forwarding boxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  
                  {/* Left: Invoices and estimates */}
                  <div>
                    <label className="block text-[11px] text-[#6b6c72] mb-1">
                      For invoices and estimates, send to:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="lawns__paws+sales@assist.meso.in"
                        className="w-full h-[36px] px-3 bg-[#fbfcfd] border border-[#c9cdd2] rounded-[4px] text-xs text-[#111] outline-none"
                      />
                      <button
                        onClick={() => handleCopy('lawns__paws+sales@assist.meso.in', 'sales')}
                        title="Copy email address"
                        className="p-2 border border-[#c9cdd2] rounded-[4px] hover:bg-gray-50 text-[#6b6c72] hover:text-[#111] transition cursor-pointer"
                      >
                        {copiedId === 'sales' ? <Check size={14} className="text-[#2ca01c]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Right: Bills and expenses */}
                  <div>
                    <label className="block text-[11px] text-[#6b6c72] mb-1">
                      For bills and expenses, send to:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value="lawns__paws+expenses@assist.meso.in"
                        className="w-full h-[36px] px-3 bg-[#fbfcfd] border border-[#c9cdd2] rounded-[4px] text-xs text-[#111] outline-none"
                      />
                      <button
                        onClick={() => handleCopy('lawns__paws+expenses@assist.meso.in', 'expenses')}
                        title="Copy email address"
                        className="p-2 border border-[#c9cdd2] rounded-[4px] hover:bg-gray-50 text-[#6b6c72] hover:text-[#111] transition cursor-pointer"
                      >
                        {copiedId === 'expenses' ? <Check size={14} className="text-[#2ca01c]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* Learn how */}
                <div>
                  <button
                    onClick={() => setCard6LearnOpen(!card6LearnOpen)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
                  >
                    <span>Learn how</span>
                    {card6LearnOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {card6LearnOpen && (
                    <div className="mt-3 p-3 bg-[#f8fafc] rounded text-xs text-[#393a3d] space-y-1 border border-[#e2e8f0]">
                      <p>1. Forward any invoice or receipt email directly to your custom address.</p>
                      <p>2. Meso Assist extracts line items, totals, and payee details automatically.</p>
                      <p>3. Review and approve directly from your Business Feed in one click.</p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ──── CARD 7: YOU'RE ALL CAUGHT UP! ──── */}
            <section className="bg-gradient-to-br from-[#f0fbf7] to-[#f4fcf9] border border-[#d1fae5] rounded-xl p-8 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 space-y-3">
                <h3 className="text-[22px] font-bold text-[#111]">
                  You're all caught up!
                </h3>
                <p className="text-xs text-[#6b6c72]">
                  Looks like you've reached the end of your feed. Come back soon!
                </p>

                {/* Three quick action pills */}
                <div className="space-y-2 pt-2 max-w-sm">
                  <button
                    onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Generate a bill')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-[#e3e5e8] rounded-lg text-xs font-semibold text-[#111] hover:shadow-xs transition cursor-pointer"
                  >
                    <Printer size={15} className="text-[#6b6c72]" />
                    <span>Generate a bill</span>
                  </button>

                  <button
                    onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Receipt upload')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-[#e3e5e8] rounded-lg text-xs font-semibold text-[#111] hover:shadow-xs transition cursor-pointer"
                  >
                    <Camera size={15} className="text-[#6b6c72]" />
                    <span>Receipt upload</span>
                  </button>

                  <button
                    onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Generate an invoice')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 bg-white border border-[#e3e5e8] rounded-lg text-xs font-semibold text-[#111] hover:shadow-xs transition cursor-pointer"
                  >
                    <FileText size={15} className="text-[#6b6c72]" />
                    <span>Generate an invoice</span>
                  </button>
                </div>
              </div>

              {/* Pastel illustration of person reaching for checkmark */}
              <div className="w-48 h-48 flex-none flex items-center justify-center relative">
                {/* Background circular glow */}
                <div className="absolute w-40 h-40 rounded-full bg-[#dcfce7] opacity-80" />
                
                {/* SVG Illustration */}
                <svg viewBox="0 0 160 160" className="w-44 h-44 relative z-10">
                  {/* Floating check document */}
                  <rect x="30" y="22" width="70" height="24" rx="4" fill="#ffffff" stroke="#c9cdd2" strokeWidth="1.5" />
                  <circle cx="90" cy="34" r="5" fill="#2ca01c" />
                  <path d="M88 34l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.2" fill="none" />
                  <line x1="38" y1="30" x2="60" y2="30" stroke="#d4d7dc" strokeWidth="2" strokeLinecap="round" />
                  <line x1="38" y1="38" x2="52" y2="38" stroke="#d4d7dc" strokeWidth="2" strokeLinecap="round" />

                  {/* Character */}
                  {/* Body / Shirt (Teal) */}
                  <path d="M78 85 L95 85 L98 120 L76 120 Z" fill="#0d9488" />
                  {/* Trousers (Purple/Navy) */}
                  <path d="M76 120 L86 120 L84 150 L77 150 Z" fill="#312e81" />
                  <path d="M87 120 L98 120 L96 150 L89 150 Z" fill="#312e81" />
                  {/* Shoes (Pink) */}
                  <rect x="75" y="148" width="10" height="4" rx="2" fill="#ec4899" />
                  <rect x="88" y="148" width="10" height="4" rx="2" fill="#ec4899" />
                  {/* Head & Hair */}
                  <circle cx="88" cy="62" r="9" fill="#fed7aa" />
                  <path d="M80 58 C80 50 96 50 96 58 C96 66 92 68 88 68 C82 68 80 64 80 58 Z" fill="#854d0e" />
                  {/* Reaching Arm */}
                  <path d="M82 85 L92 42" stroke="#fed7aa" strokeWidth="4" strokeLinecap="round" />
                  <circle cx="92" cy="40" r="3" fill="#fed7aa" />
                  {/* Red Bag */}
                  <path d="M96 100 L104 102 L102 118 L94 116 Z" fill="#ef4444" rx="2" />
                  <path d="M85 85 L98 106" stroke="#991b1b" strokeWidth="1.5" />
                </svg>
              </div>
            </section>

          </div>

          {/* ════════════ RIGHT COLUMN: SIDEBAR WIDGETS ════════════ */}
          <div className="w-full lg:w-[360px] flex-none space-y-6 lg:sticky lg:top-4">
            
            {/* ──── WIDGET 1: AUTOFILL ──── */}
            <div className="bg-white border border-[#d4d7dc] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-[#111]">Autofill</h3>
                <button
                  onClick={() => setAutofillWidgetOpen(!autofillWidgetOpen)}
                  className="text-[#6b6c72] hover:text-[#111] cursor-pointer"
                >
                  {autofillWidgetOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {autofillWidgetOpen && (
                <div className="space-y-4">
                  {/* Document Type Select */}
                  <div className="relative">
                    <select
                      value={autofillDocType}
                      onChange={(e) => setAutofillDocType(e.target.value)}
                      className="w-full h-[36px] px-3 pr-8 bg-white border border-[#c9cdd2] rounded-[4px] text-xs text-[#111] appearance-none outline-none focus:border-[#2ca01c] cursor-pointer"
                    >
                      <option value="Bill">Bill</option>
                      <option value="Expense">Expense</option>
                      <option value="Receipt">Receipt</option>
                      <option value="Invoice">Invoice</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#6b6c72]" />
                  </div>

                  {/* Files / Images Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAutofillTab('files')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border transition cursor-pointer ${
                        autofillTab === 'files'
                          ? 'border-[#393a3d] bg-[#f0f2f4] text-[#111]'
                          : 'border-[#d4d7dc] bg-white text-[#6b6c72] hover:bg-gray-50'
                      }`}
                    >
                      <FileText size={14} />
                      <span>Files</span>
                    </button>
                    <button
                      onClick={() => setAutofillTab('images')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border transition cursor-pointer ${
                        autofillTab === 'images'
                          ? 'border-[#393a3d] bg-[#f0f2f4] text-[#111]'
                          : 'border-[#d4d7dc] bg-white text-[#6b6c72] hover:bg-gray-50'
                      }`}
                    >
                      <ImageIcon size={14} />
                      <span>Images</span>
                    </button>
                  </div>

                  {/* Dashed Dropzone */}
                  <div
                    onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Dropzone clicked')}
                    className="border border-dashed border-[#9dbde0] bg-[#f5f8fc] rounded-lg p-5 text-center cursor-pointer hover:bg-[#eef4fb] transition"
                  >
                    <p className="text-xs font-semibold text-[#0077c5] hover:underline">
                      Select a file or drag and drop here
                    </p>
                    <p className="text-[11px] text-[#8d9096] mt-1">
                      Supported formats: .pdf, .jpg, .png
                    </p>
                  </div>

                  {/* Email Forward Section */}
                  <div>
                    <label className="block text-xs font-semibold text-[#393a3d] mb-1.5">
                      Or forward bill-related emails here
                    </label>
                    <div className="flex items-center justify-between p-2.5 bg-[#fbfcfd] border border-[#c9cdd2] rounded-[4px] text-xs">
                      <span className="text-[#393a3d] truncate">lawns__paws@assist.meso.in</span>
                      <button
                        onClick={() => handleCopy('lawns__paws@assist.meso.in', 'widget_bill')}
                        title="Copy email"
                        className="text-[#6b6c72] hover:text-[#111] ml-2 cursor-pointer"
                      >
                        {copiedId === 'widget_bill' ? <Check size={14} className="text-[#2ca01c]" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Manage Settings */}
                  <div className="pt-1">
                    <button
                      onClick={() => alert('Autofill rules & settings opened')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#393a3d] hover:text-[#0077c5] transition cursor-pointer"
                    >
                      <Settings size={14} />
                      <span>Manage settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ──── WIDGET 2: MESO'S AI AGENTS ──── */}
            <div className="bg-white border border-[#d4d7dc] rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm text-[#111]">Meso's AI agents</h3>
                <button
                  onClick={() => setAgentsWidgetOpen(!agentsWidgetOpen)}
                  className="text-[#6b6c72] hover:text-[#111] cursor-pointer"
                >
                  {agentsWidgetOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              <p className="text-xs text-[#6b6c72] mb-4">
                3 active agents included in your plan.
              </p>

              {agentsWidgetOpen && (
                <div className="space-y-4">
                  
                  {/* Agent 1: Accounting Agent */}
                  <div className="flex items-start gap-3 pb-3 border-b border-[#f0f2f4]">
                    <div className="w-8 h-8 rounded-full bg-[#0a3e42] flex items-center justify-center text-white text-xs font-bold flex-none">
                      <Activity size={15} className="text-[#2ca01c]" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-[#111]">Accounting Agent</h4>
                      <p className="text-[#6b6c72] mt-0.5 leading-snug">
                        Automates categorization and expense tracking.{' '}
                        <button onClick={() => alert('Accounting Agent Details')} className="text-[#0077c5] hover:underline font-semibold cursor-pointer">Learn more</button>
                      </p>
                    </div>
                  </div>

                  {/* Agent 2: Payments Agent */}
                  <div className="flex items-start gap-3 pb-3 border-b border-[#f0f2f4]">
                    <div className="w-8 h-8 rounded-full bg-[#0a3e42] flex items-center justify-center text-white text-xs font-bold flex-none">
                      <TrendingUp size={15} className="text-[#00c5cd]" />
                    </div>
                    <div className="text-xs">
                      <h4 className="font-bold text-[#111]">Payments Agent</h4>
                      <p className="text-[#6b6c72] mt-0.5 leading-snug">
                        Suggests faster ways to get paid by optimizing your invoicing.{' '}
                        <button onClick={() => alert('Payments Agent Details')} className="text-[#0077c5] hover:underline font-semibold cursor-pointer">Learn more</button>
                      </p>
                    </div>
                  </div>

                  {/* Agent 3: Customer Agent BETA */}
                  <div className="flex items-start gap-3 pb-3 border-b border-[#f0f2f4]">
                    <div className="w-8 h-8 rounded-full bg-[#0a3e42] flex items-center justify-center text-white text-xs font-bold flex-none">
                      <Users size={15} className="text-[#2ca01c]" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-[#111]">Customer Agent</h4>
                        <span className="bg-[#0d7d72] text-white text-[9px] font-bold px-1 rounded">BETA</span>
                      </div>
                      <p className="text-[#6b6c72] mt-0.5 leading-snug">
                        Identifies leads in your inbox, drafts follow-ups and tracks status.{' '}
                        <button onClick={() => alert('Customer Agent Details')} className="text-[#0077c5] hover:underline font-semibold cursor-pointer">Learn more</button>
                      </p>
                    </div>
                  </div>

                  {/* Explore all agents */}
                  <div className="pt-1">
                    <button
                      onClick={() => alert('Opening AI Agent Marketplace')}
                      className="text-xs font-bold text-[#111] hover:underline cursor-pointer"
                    >
                      Explore all agents
                    </button>
                  </div>

                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}