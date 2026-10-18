import React, { useState } from 'react';
import {
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
  Info,
  ArrowRight,
  Upload,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../store';

/**
 * BusinessFeedView — Meso Business Feed.
 * Redesigned with Apple iOS UI / iPadOS design language:
 * - Clean iOS system background (#F2F2F7) with elevated white squircle cards (rounded-[20px])
 * - Apple SF-style visual hierarchy with high-contrast typography and tabular figures
 * - iOS Segmented Control for filtering and toggle states
 * - Squircle app-style icon badges with vibrant Apple System gradients
 * - Apple Inset Grouped list views with subtle hair-thin dividers
 * - Apple Health/Fitness-inspired progress capsules and donut charts
 * - Capsule pill buttons with tactile feedback
 * - Apple iPadOS companion widgets on the right rail
 * - Strictly zero AI sparkles/emojis
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

  // Filter logic
  const showCard = (type) => {
    if (filterActive === 'All') return true;
    if (filterActive === 'Invoices' && (type === 'invoices' || type === 'payments' || type === 'email' || type === 'caughtup')) return true;
    if (filterActive === 'Profit & Loss' && (type === 'pnl' || type === 'caughtup')) return true;
    if (filterActive === 'Payments' && (type === 'payments' || type === 'latefees' || type === 'caughtup')) return true;
    if (filterActive === 'Expenses' && (type === 'expenses' || type === 'email' || type === 'caughtup')) return true;
    return false;
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#F2F2F7] text-[#1C1C1E] select-none">
      
      {/* ────────────────── MAIN FEED SCROLLABLE CONTAINER ────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-[1180px] mx-auto">
          
          {/* ──── APPLE iOS HEADER ──── */}
          <div className="mb-6">
            
            {/* Top row: Title + Snoozed button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <span className="text-[11px] font-semibold tracking-wider text-[#8E8E93] uppercase">
                  Activity & Intelligence
                </span>
                <h1 className="text-[32px] sm:text-[36px] font-bold tracking-tight text-[#1C1C1E] leading-tight">
                  Business Feed
                </h1>
              </div>

              {/* iOS Pill Snoozed Control */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(snoozedCount > 0 ? `${snoozedCount} cards currently snoozed.` : 'No cards currently snoozed.')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white/90 hover:bg-white active:scale-95 transition-all rounded-full text-[12px] font-medium text-[#1C1C1E] shadow-xs border border-black/5 cursor-pointer"
                >
                  <Clock size={13} className="text-[#8E8E93]" />
                  <span>Snoozed {snoozedCount > 0 ? `(${snoozedCount})` : ''}</span>
                </button>
              </div>
            </div>

            {/* Apple Assistant Status Callout (Frosted Glass Banner) */}
            <div className="bg-white/90 backdrop-blur-md rounded-[18px] p-3.5 sm:p-4 border border-black/5 shadow-xs mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-[12px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-xs flex-none">
                <Activity size={18} />
              </div>
              <div className="flex-1 text-[13px] text-[#3A3A3C] leading-snug">
                <span className="font-semibold text-[#1C1C1E]">Meso Assist:</span> Reviewing your incoming revenue, recurring bills, and ledger transactions. Here is your latest brief.
              </div>
            </div>

            {/* iOS Segmented Control (Pill switcher) */}
            <div className="bg-[#E5E5EA] p-1 rounded-[14px] inline-flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar shadow-inner">
              {[
                { id: 'All', label: 'All Updates' },
                { id: 'Invoices', label: 'Invoices' },
                { id: 'Profit & Loss', label: 'Profit & Loss' },
                { id: 'Payments', label: 'Payments' },
                { id: 'Expenses', label: 'Expenses' }
              ].map((f) => {
                const isActive = filterActive === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilterActive(f.id)}
                    className={`px-3.5 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1C1C1E] shadow-sm'
                        : 'text-[#636366] hover:text-[#1C1C1E]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* ──── TWO-COLUMN CONTENT GRID ──── */}
          <div className="flex flex-col lg:flex-row items-start gap-6">
            
            {/* ════════════ LEFT COLUMN: MAIN FEED CARDS (Order 1 to 7) ════════════ */}
            <div className="flex-1 w-full space-y-5">

              {/* ──── CARD 1: OVERDUE INVOICES ──── */}
              {showCard('invoices') && (
                <section className="bg-white border border-black/5 rounded-[20px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  {/* iOS Card Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#FF453A] to-[#FF3B30] flex items-center justify-center text-white shadow-xs">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF3B30]">Overdue</div>
                        <h2 className="text-[17px] font-bold text-[#1C1C1E] leading-tight">Overdue Invoices</h2>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveMenuCard(activeMenuCard === 1 ? null : 1)}
                        className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                      >
                        <MoreVertical size={15} />
                      </button>
                      {activeMenuCard === 1 && (
                        <div className="absolute right-0 top-9 z-30 w-44 bg-white/95 backdrop-blur-md border border-black/10 rounded-[14px] shadow-lg py-1 text-xs">
                          <button onClick={() => snoozeCard(1)} className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F7] font-medium text-[#1C1C1E]">Snooze for 7 days</button>
                          <button onClick={() => { alert('Feedback recorded'); setActiveMenuCard(null); }} className="w-full text-left px-3.5 py-2 hover:bg-[#F2F2F7] font-medium text-[#1C1C1E]">Give feedback</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Headline & Amount */}
                  <div className="mb-4">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1C1E] tabular-nums mb-1">
                      ₹1,27,379.25
                    </div>
                    <p className="text-[13px] text-[#8E8E93]">
                      Invoice reminders are ready for you to review and send to customers.
                    </p>
                  </div>

                  {/* iOS Inset Callout */}
                  <div className="bg-[#007AFF]/8 rounded-[14px] p-3 flex items-start sm:items-center gap-2.5 text-[12px] text-[#1C1C1E] mb-4 border border-[#007AFF]/15">
                    <Info size={16} className="text-[#007AFF] flex-none mt-0.5 sm:mt-0" />
                    <span>
                      You have 10 overdue invoices from 9 customers. Make it easier for them to settle with digital links.{' '}
                      <button
                        type="button"
                        onClick={() => alert('Online payment collection enabled.')}
                        className="text-[#007AFF] font-semibold hover:underline cursor-pointer"
                      >
                        Set up payments
                      </button>
                    </span>
                  </div>

                  {/* iOS Grouped Table View */}
                  {card1Open && (
                    <div className="bg-[#F9F9FB] rounded-[16px] border border-black/5 divide-y divide-black/5 overflow-hidden mb-4">
                      {[
                        { customer: 'John Melton', no: 'INV-1007', amount: '₹37,350.00', status: '22 days overdue', initial: 'JM', tint: 'from-blue-500 to-indigo-600' },
                        { customer: 'Barnett Design', no: 'INV-1012', amount: '₹22,780.00', status: '11 days overdue', initial: 'BD', tint: 'from-amber-500 to-orange-600' },
                        { customer: "Amy's Bird Sanctuary", no: 'INV-1021', amount: '₹19,835.00', status: '19 days overdue', initial: 'AB', tint: 'from-emerald-500 to-teal-600' }
                      ].map((inv) => (
                        <div key={inv.no} className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#F2F2F7]/50 transition">
                          
                          {/* Customer Avatar & Details */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${inv.tint} text-white text-[11px] font-bold flex items-center justify-center flex-none shadow-xs`}>
                              {inv.initial}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[13px] text-[#1C1C1E] truncate">{inv.customer}</div>
                              <div className="text-[11px] text-[#8E8E93] flex items-center gap-2">
                                <span>{inv.no}</span>
                                <span>•</span>
                                <span className="text-[#FF3B30] font-medium">{inv.status}</span>
                              </div>
                            </div>
                          </div>

                          {/* Amount and Review Pill Button */}
                          <div className="flex items-center gap-3 flex-none">
                            <span className="font-bold text-[13px] text-[#1C1C1E] tabular-nums">{inv.amount}</span>
                            <button
                              type="button"
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
                              className="px-3 py-1 bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 text-white font-semibold text-[11px] rounded-full transition cursor-pointer shadow-xs"
                            >
                              Review
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  )}

                  {/* iOS Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setCard1Open(!card1Open)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0077AFF] text-[#007AFF] hover:underline cursor-pointer"
                    >
                      <span>{card1Open ? 'Hide list' : 'Show all (3)'}</span>
                      {card1Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Reviewing all overdue invoices')}
                      className="px-4 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/15 active:scale-95 text-[#007AFF] font-semibold text-[12px] rounded-full transition cursor-pointer"
                    >
                      Review all
                    </button>
                  </div>

                </section>
              )}

              {/* ──── CARD 2: PROFIT AND LOSS ──── */}
              {showCard('pnl') && (
                <section className="bg-white border border-black/5 rounded-[20px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#34C759] to-[#28CD41] flex items-center justify-center text-white shadow-xs">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#34C759]">Financial Summary</div>
                        <h2 className="text-[17px] font-bold text-[#1C1C1E] leading-tight">Profit and Loss</h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMenuCard(activeMenuCard === 2 ? null : 2)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  <p className="text-[13px] text-[#8E8E93] mb-4">
                    Based on verified ledger activity, here is your calculated net profit for the previous month.
                  </p>

                  {/* iOS Metric Showcase */}
                  <div className="bg-[#F9F9FB] rounded-[16px] p-4 border border-black/5 mb-4">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93] block mb-1">
                      Net Profit (September)
                    </span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-3xl font-bold tracking-tight text-[#1C1C1E] tabular-nums">
                        ₹1,16,342.22
                      </span>
                      <span className="inline-flex items-center gap-1 bg-[#34C759]/15 text-[#34C759] text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        ↑ +672%
                      </span>
                    </div>
                  </div>

                  {/* Apple iOS Smooth Progress Capsules */}
                  <div className="space-y-4 mb-5">
                    
                    {/* Income */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1.5 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                          <span className="font-semibold text-[#1C1C1E]">Income:</span>
                          <span className="font-bold text-[#1C1C1E] tabular-nums">₹6,96,974.50</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate ? onNavigate('sales_transactions') : alert('Reviewing 8 income transactions')}
                          className="text-[#007AFF] hover:underline font-semibold text-[11px] cursor-pointer"
                        >
                          8 to review
                        </button>
                      </div>
                      <div className="h-3 w-full bg-[#E5E5EA] rounded-full overflow-hidden flex">
                        <div className="bg-[#34C759] h-full rounded-full" style={{ width: '74%' }} />
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <div className="flex justify-between items-baseline mb-1.5 text-[12px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5856D6]" />
                          <span className="font-semibold text-[#1C1C1E]">Expenses:</span>
                          <span className="font-bold text-[#1C1C1E] tabular-nums">₹5,80,575.50</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate ? onNavigate('expense_transactions') : alert('Reviewing 15 expense transactions')}
                          className="text-[#007AFF] hover:underline font-semibold text-[11px] cursor-pointer"
                        >
                          15 to review
                        </button>
                      </div>
                      <div className="h-3 w-full bg-[#E5E5EA] rounded-full overflow-hidden flex">
                        <div className="bg-[#5856D6] h-full rounded-full" style={{ width: '62%' }} />
                      </div>
                    </div>

                  </div>

                  {/* iOS Card Footer */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('report_profit_loss') : alert('Opening Profit & Loss')}
                      className="px-4 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 text-[#1C1C1E] font-semibold text-[12px] rounded-full transition cursor-pointer"
                    >
                      View Report
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('bank_transactions') : alert('Categorizing transactions')}
                      className="px-4 py-1.5 bg-[#34C759] hover:bg-[#28CD41] active:scale-95 text-white font-semibold text-[12px] rounded-full transition cursor-pointer shadow-xs"
                    >
                      Categorize Transactions
                    </button>
                  </div>

                </section>
              )}

              {/* ──── CARD 3: PAYMENTS AGENT (LATE FEES RECOMMENDATION) ──── */}
              {showCard('latefees') && (
                <section className="bg-white border border-black/5 rounded-[20px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-xs">
                        <Activity size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#007AFF]">Meso Agent</div>
                        <h2 className="text-[17px] font-bold text-[#1C1C1E] leading-tight">Payments Optimization</h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMenuCard(activeMenuCard === 3 ? null : 3)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  <p className="text-[13px] text-[#3A3A3C] leading-relaxed mb-3">
                    37% of your invoices in the last year were settled late or remained overdue. We recommend adding a standard 1.5% late fee to encourage timely payments.
                  </p>

                  <div className="bg-[#007AFF]/8 rounded-[14px] p-3 flex items-start gap-2.5 text-[12px] text-[#1C1C1E] mb-4 border border-[#007AFF]/15">
                    <Info size={16} className="text-[#007AFF] flex-none mt-0.5" />
                    <span>
                      Apply a 1.5% late fee on unpaid balances after a 30-day grace period automatically.
                    </span>
                  </div>

                  {/* Donut Visualization (Apple Fitness Ring style) */}
                  {card3Open && (
                    <div className="bg-[#F9F9FB] p-4 rounded-[16px] border border-black/5 mb-4 flex flex-col sm:flex-row items-center justify-between gap-6">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">INVOICE STATUS (12 MO)</span>
                        <div className="text-3xl font-bold text-[#1C1C1E] mt-1 tabular-nums">37.5%</div>
                        <div className="text-[12px] text-[#FF9500] font-medium">Overdue or paid late</div>
                      </div>

                      {/* Donut SVG Ring */}
                      <div className="relative w-28 h-28 flex items-center justify-center flex-none">
                        <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
                          {/* Segment 1: Paid on time (Apple Green 45%) */}
                          <circle cx="18" cy="18" r="14" fill="transparent" stroke="#34C759" strokeWidth="6" strokeDasharray="45 100" strokeDashoffset="0" />
                          {/* Segment 2: Open invoices (Apple Indigo 17.5%) */}
                          <circle cx="18" cy="18" r="14" fill="transparent" stroke="#5856D6" strokeWidth="6" strokeDasharray="17.5 100" strokeDashoffset="-45" />
                          {/* Segment 3: Paid late or overdue (Apple Orange 37.5%) */}
                          <circle cx="18" cy="18" r="14" fill="transparent" stroke="#FF9500" strokeWidth="6" strokeDasharray="37.5 100" strokeDashoffset="-62.5" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-[10px] text-[#8E8E93] font-semibold">TOTAL</span>
                          <span className="text-[13px] font-bold text-[#1C1C1E]">100%</span>
                        </div>
                      </div>

                      {/* iOS Legend */}
                      <div className="space-y-1.5 text-[12px] text-[#3A3A3C] w-full sm:w-auto">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
                          <span>Paid on time (45%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#5856D6]" />
                          <span>Open invoices (17.5%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FF9500]" />
                          <span>Paid late (37.5%)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setCard3Open(!card3Open)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                    >
                      <span>{card3Open ? 'Hide analysis' : 'Show analysis'}</span>
                      {card3Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => alert('Late fee automation settings enabled: 1.5% late fee on invoices.')}
                      className="px-4 py-1.5 bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 text-white font-semibold text-[12px] rounded-full transition cursor-pointer shadow-xs"
                    >
                      Set up late fees
                    </button>
                  </div>

                </section>
              )}

              {/* ──── CARD 4: AUTOFILLING EXPENSES ──── */}
              {showCard('expenses') && (
                <section className="bg-white border border-black/5 rounded-[20px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#FF9500] to-[#FF9F0A] flex items-center justify-center text-white shadow-xs">
                        <Camera size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF9500]">Receipt Capture</div>
                        <h2 className="text-[17px] font-bold text-[#1C1C1E] leading-tight">Autofill Expenses</h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMenuCard(activeMenuCard === 4 ? null : 4)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  <p className="text-[13px] text-[#8E8E93] mb-4">
                    Snap and store receipts for expenses like fuel, supplies, and office materials. Maximize deductions without manual paper entry.
                  </p>

                  {/* iOS Photo Dropzone */}
                  <div
                    onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Opening Expense upload')}
                    className="border-2 border-dashed border-[#C7C7CC] hover:border-[#007AFF] bg-[#F9F9FB] hover:bg-[#F2F2F7] transition rounded-[16px] p-6 flex flex-col items-center justify-center cursor-pointer group"
                  >
                    <div className="w-11 h-11 rounded-full bg-white shadow-xs flex items-center justify-center text-[#007AFF] group-hover:scale-105 transition mb-2">
                      <Upload size={18} />
                    </div>
                    <button
                      type="button"
                      className="px-4 py-2 bg-[#007AFF] text-white font-semibold text-[12px] rounded-full shadow-xs hover:bg-[#0062CC] transition cursor-pointer mt-1"
                    >
                      Upload Receipt
                    </button>
                    <p className="text-[12px] text-[#8E8E93] mt-2">or drag and drop PDF, PNG, JPG here</p>
                  </div>

                </section>
              )}

              {/* ──── CARD 5: INVOICES PAID (PAYMENTS THIS WEEK) ──── */}
              {showCard('payments') && (
                <section className="bg-white border border-black/5 rounded-[20px] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-[#30B0C7] to-[#007AFF] flex items-center justify-center text-white shadow-xs">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#30B0C7]">Settled</div>
                        <h2 className="text-[17px] font-bold text-[#1C1C1E] leading-tight">Invoices Paid</h2>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveMenuCard(activeMenuCard === 5 ? null : 5)}
                      className="w-8 h-8 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                    >
                      <MoreVertical size={15} />
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1C1E] tabular-nums mb-1">
                      ₹1,86,668.42
                    </div>
                    <p className="text-[13px] text-[#8E8E93]">
                      9 customer payments have arrived in your account this week.
                    </p>
                  </div>

                  {card5Open && (
                    <div className="bg-[#F9F9FB] rounded-[16px] border border-black/5 divide-y divide-black/5 overflow-hidden mb-4">
                      {[
                        { customer: 'Cool Cars (Inv #1004)', amount: '₹98,400.00', date: 'Yesterday' },
                        { customer: 'Dylan Sollfrank (Inv #1005)', amount: '₹53,300.00', date: '2 days ago' },
                        { customer: 'Garden Depot (Inv #1006)', amount: '₹34,968.42', date: '3 days ago' }
                      ].map((item, idx) => (
                        <div key={idx} className="p-3 sm:px-4 flex items-center justify-between text-[13px]">
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 size={16} className="text-[#34C759]" />
                            <span className="font-semibold text-[#1C1C1E]">{item.customer}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] text-[#8E8E93]">{item.date}</span>
                            <span className="font-bold text-[#1C1C1E] tabular-nums">{item.amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-black/5">
                    <button
                      type="button"
                      onClick={() => setCard5Open(!card5Open)}
                      className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                    >
                      <span>{card5Open ? 'Hide list' : 'Show details (3)'}</span>
                      {card5Open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate ? onNavigate('sales_transactions') : alert('Navigating to payments')}
                      className="px-4 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/15 active:scale-95 text-[#007AFF] font-semibold text-[12px] rounded-full transition cursor-pointer"
                    >
                      Go to payments
                    </button>
                  </div>

                </section>
              )}

              {/* ──── CARD 6: FORWARDING EMAILS TO AUTOFILL TRANSACTIONS ──── */}
              {showCard('email') && (
                <section className="bg-white border border-black/5 rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all relative">
                  
                  {/* Apple Wallet / Pass style top banner */}
                  <div className="bg-gradient-to-r from-[#E3EDF7] via-[#EBF2FA] to-[#F4F7FB] p-5 sm:p-6 border-b border-black/5">
                    
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white shadow-xs">
                          <Mail size={16} />
                        </div>
                        <span className="text-[12px] font-bold text-[#1C1C1E]">Smart Mail Drop</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveMenuCard(activeMenuCard === 6 ? null : 6)}
                        className="w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                      >
                        <MoreVertical size={15} />
                      </button>
                    </div>

                    {/* iOS Floating Notification Pill */}
                    <div className="bg-white/95 backdrop-blur-md rounded-[16px] border border-black/5 shadow-xs p-3.5 max-w-md mx-auto">
                      <div className="flex items-center gap-2 font-bold text-[13px] text-[#1C1C1E] mb-2">
                        <CheckCircle2 size={16} className="text-[#34C759]" />
                        <span>₹5,25,382.00 in forwarded invoices ready</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#8E8E93] pt-2 border-t border-black/5">
                        <span>Just now</span>
                        <span className="font-medium text-[#1C1C1E] flex items-center gap-1">
                          <Mail size={12} className="text-[#8E8E93]" />
                          FWD: Annual maintenance quote
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Reviewing quote invoice')}
                          className="text-[#007AFF] font-bold hover:underline cursor-pointer"
                        >
                          Review
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Main Content */}
                  <div className="p-5 sm:p-6">
                    <h3 className="text-[16px] font-bold text-[#1C1C1E] mb-2">
                      Forward emails directly to automatically draft ledger transactions
                    </h3>
                    <p className="text-[13px] text-[#8E8E93] mb-4">
                      Skip manual typing. Any invoice or bill forwarded to these dedicated addresses is parsed and placed in your feed.
                    </p>

                    {/* Two email forwarding boxes (iOS Inset style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                      
                      {/* Left: Invoices & estimates */}
                      <div className="bg-[#F9F9FB] rounded-[16px] p-3 border border-black/5">
                        <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1.5">
                          Sales & Invoices
                        </label>
                        <div className="flex items-center justify-between gap-2 bg-white rounded-[12px] p-2 border border-black/5">
                          <span className="text-[12px] text-[#1C1C1E] font-medium truncate">
                            sales@assist.meso.in
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy('sales@assist.meso.in', 'sales')}
                            className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                          >
                            {copiedId === 'sales' ? <Check size={14} className="text-[#34C759]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Right: Bills & expenses */}
                      <div className="bg-[#F9F9FB] rounded-[16px] p-3 border border-black/5">
                        <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1.5">
                          Bills & Expenses
                        </label>
                        <div className="flex items-center justify-between gap-2 bg-white rounded-[12px] p-2 border border-black/5">
                          <span className="text-[12px] text-[#1C1C1E] font-medium truncate">
                            expenses@assist.meso.in
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy('expenses@assist.meso.in', 'expenses')}
                            className="p-1.5 rounded-full hover:bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                          >
                            {copiedId === 'expenses' ? <Check size={14} className="text-[#34C759]" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>

                    </div>

                    {/* Learn how */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setCard6LearnOpen(!card6LearnOpen)}
                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                      >
                        <span>Learn how it works</span>
                        {card6LearnOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {card6LearnOpen && (
                        <div className="mt-3 p-3.5 bg-[#F9F9FB] rounded-[14px] text-[12px] text-[#3A3A3C] space-y-2 border border-black/5">
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] font-bold text-[11px] flex items-center justify-center flex-none">1</span>
                            <span>Forward any vendor bill or customer receipt email directly to your custom address.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] font-bold text-[11px] flex items-center justify-center flex-none">2</span>
                            <span>Meso Assist extracts items, tax values, and customer dates automatically.</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#007AFF]/10 text-[#007AFF] font-bold text-[11px] flex items-center justify-center flex-none">3</span>
                            <span>Review and approve directly from your Business Feed in one click.</span>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                </section>
              )}

              {/* ──── CARD 7: YOU'RE ALL CAUGHT UP! ──── */}
              {showCard('caughtup') && (
                <section className="bg-gradient-to-br from-[#EBF9F1] via-[#F2FBF6] to-white border border-[#34C759]/20 rounded-[22px] p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  <div className="flex-1 space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#34C759]/15 text-[#34C759] text-[11px] font-bold rounded-full">
                      <CheckCircle2 size={13} />
                      <span>Up to date</span>
                    </div>

                    <h3 className="text-[24px] sm:text-[28px] font-bold text-[#1C1C1E] tracking-tight leading-tight">
                      You're all caught up!
                    </h3>
                    <p className="text-[13px] text-[#8E8E93]">
                      All incoming feeds, reminders, and pending reviews have been addressed. Come back anytime or trigger a new action below.
                    </p>

                    {/* Apple Quick Action Pills */}
                    <div className="flex flex-wrap gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Generate a bill')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 active:scale-95 border border-black/10 rounded-full text-[12px] font-semibold text-[#1C1C1E] shadow-xs transition cursor-pointer"
                      >
                        <Printer size={14} className="text-[#8E8E93]" />
                        <span>Generate a Bill</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Receipt upload')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 active:scale-95 border border-black/10 rounded-full text-[12px] font-semibold text-[#1C1C1E] shadow-xs transition cursor-pointer"
                      >
                        <Camera size={14} className="text-[#8E8E93]" />
                        <span>Receipt Upload</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenInvoiceModal ? onOpenInvoiceModal() : alert('Generate an invoice')}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] hover:bg-[#0062CC] active:scale-95 text-white rounded-full text-[12px] font-semibold shadow-xs transition cursor-pointer"
                      >
                        <FileText size={14} />
                        <span>Create Invoice</span>
                      </button>
                    </div>
                  </div>

                  {/* Clean Apple Accomplishment Graphic */}
                  <div className="w-40 h-40 flex-none flex items-center justify-center relative">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#34C759]/20 to-[#30B0C7]/20 flex items-center justify-center shadow-inner">
                      <div className="w-20 h-20 rounded-full bg-white shadow-md flex items-center justify-center text-[#34C759]">
                        <CheckCircle2 size={44} />
                      </div>
                    </div>
                  </div>

                </section>
              )}

            </div>

            {/* ════════════ RIGHT COLUMN: SIDEBAR WIDGETS (Apple iPadOS / macOS Desktop Widget style) ════════════ */}
            <div className="w-full lg:w-[340px] flex-none space-y-5 lg:sticky lg:top-6">
              
              {/* ──── WIDGET 1: AUTOFILL ──── */}
              <div className="bg-white border border-black/5 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-xs">
                      <Upload size={14} />
                    </div>
                    <h3 className="font-bold text-[15px] text-[#1C1C1E]">Quick Autofill</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAutofillWidgetOpen(!autofillWidgetOpen)}
                    className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                  >
                    {autofillWidgetOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {autofillWidgetOpen && (
                  <div className="space-y-3.5">
                    
                    {/* Document Type Dropdown */}
                    <div className="relative">
                      <select
                        value={autofillDocType}
                        onChange={(e) => setAutofillDocType(e.target.value)}
                        className="w-full h-[36px] px-3 pr-8 bg-[#F9F9FB] border border-black/10 rounded-[12px] text-[12px] font-medium text-[#1C1C1E] appearance-none outline-none focus:border-[#007AFF] cursor-pointer"
                      >
                        <option value="Bill">Bill document</option>
                        <option value="Expense">Expense receipt</option>
                        <option value="Invoice">Customer Invoice</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#8E8E93]" />
                    </div>

                    {/* iOS Segmented Toggle (Files / Images) */}
                    <div className="bg-[#E5E5EA] p-0.5 rounded-[12px] flex items-center">
                      <button
                        type="button"
                        onClick={() => setAutofillTab('files')}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-[10px] flex items-center justify-center gap-1 transition ${
                          autofillTab === 'files'
                            ? 'bg-white text-[#1C1C1E] shadow-xs'
                            : 'text-[#636366] hover:text-[#1C1C1E]'
                        }`}
                      >
                        <FileText size={13} />
                        <span>Files</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutofillTab('images')}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-[10px] flex items-center justify-center gap-1 transition ${
                          autofillTab === 'images'
                            ? 'bg-white text-[#1C1C1E] shadow-xs'
                            : 'text-[#636366] hover:text-[#1C1C1E]'
                        }`}
                      >
                        <ImageIcon size={13} />
                        <span>Images</span>
                      </button>
                    </div>

                    {/* Mini Drag & Drop Area */}
                    <div
                      onClick={() => onOpenExpenseModal ? onOpenExpenseModal() : alert('Dropzone clicked')}
                      className="border border-dashed border-[#C7C7CC] hover:border-[#007AFF] bg-[#F9F9FB] hover:bg-[#F2F2F7] rounded-[14px] p-4 text-center cursor-pointer transition"
                    >
                      <p className="text-[12px] font-semibold text-[#007AFF]">
                        Select or drag files here
                      </p>
                      <p className="text-[10px] text-[#8E8E93] mt-0.5">
                        PDF, JPG, PNG up to 25 MB
                      </p>
                    </div>

                    {/* Email Forward Section */}
                    <div>
                      <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-1">
                        Forward bills directly
                      </label>
                      <div className="flex items-center justify-between p-2 bg-[#F9F9FB] border border-black/5 rounded-[12px] text-[12px]">
                        <span className="text-[#1C1C1E] font-medium truncate">bills@assist.meso.in</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('bills@assist.meso.in', 'widget_bill')}
                          className="p-1 rounded-full hover:bg-[#E5E5EA] text-[#8E8E93] hover:text-[#1C1C1E] ml-1.5 cursor-pointer"
                        >
                          {copiedId === 'widget_bill' ? <Check size={14} className="text-[#34C759]" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Manage settings */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => alert('Autofill rules & settings opened')}
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#8E8E93] hover:text-[#007AFF] transition cursor-pointer"
                      >
                        <Settings size={13} />
                        <span>Autofill preferences</span>
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* ──── WIDGET 2: MESO'S AI AGENTS ──── */}
              <div className="bg-white border border-black/5 rounded-[20px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[9px] bg-gradient-to-br from-[#AF52DE] to-[#5856D6] flex items-center justify-center text-white shadow-xs">
                      <Layers size={14} />
                    </div>
                    <h3 className="font-bold text-[15px] text-[#1C1C1E]">Meso Agents</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAgentsWidgetOpen(!agentsWidgetOpen)}
                    className="w-7 h-7 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] flex items-center justify-center text-[#8E8E93] hover:text-[#1C1C1E] transition cursor-pointer"
                  >
                    {agentsWidgetOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <p className="text-[12px] text-[#8E8E93] mb-3.5">
                  3 active smart agents included in your business plan.
                </p>

                {agentsWidgetOpen && (
                  <div className="space-y-3">
                    
                    {/* Agent 1: Accounting Agent */}
                    <div className="bg-[#F9F9FB] rounded-[14px] p-3 border border-black/5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#34C759] to-[#28CD41] flex items-center justify-center text-white flex-none shadow-xs">
                        <Activity size={15} />
                      </div>
                      <div className="text-[12px] min-w-0">
                        <h4 className="font-bold text-[#1C1C1E]">Accounting Agent</h4>
                        <p className="text-[#8E8E93] mt-0.5 leading-snug">
                          Automates transaction categorization and reconciliations.
                        </p>
                      </div>
                    </div>

                    {/* Agent 2: Payments Agent */}
                    <div className="bg-[#F9F9FB] rounded-[14px] p-3 border border-black/5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white flex-none shadow-xs">
                        <TrendingUp size={15} />
                      </div>
                      <div className="text-[12px] min-w-0">
                        <h4 className="font-bold text-[#1C1C1E]">Payments Agent</h4>
                        <p className="text-[#8E8E93] mt-0.5 leading-snug">
                          Monitors overdue receivables and suggests invoice terms.
                        </p>
                      </div>
                    </div>

                    {/* Agent 3: Customer Agent */}
                    <div className="bg-[#F9F9FB] rounded-[14px] p-3 border border-black/5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#FF9500] to-[#FF9F0A] flex items-center justify-center text-white flex-none shadow-xs">
                        <Users size={15} />
                      </div>
                      <div className="text-[12px] min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-[#1C1C1E]">Customer Agent</h4>
                          <span className="bg-[#FF9500]/15 text-[#FF9500] text-[9px] font-bold px-1.5 py-0.2 rounded-full">BETA</span>
                        </div>
                        <p className="text-[#8E8E93] mt-0.5 leading-snug">
                          Drafts invoice follow-ups and tracks customer communication.
                        </p>
                      </div>
                    </div>

                    {/* Explore all agents button */}
                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => alert('Opening AI Agent Directory')}
                        className="w-full py-2 bg-[#F2F2F7] hover:bg-[#E5E5EA] active:scale-95 text-[#1C1C1E] text-[12px] font-semibold rounded-full transition cursor-pointer"
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

    </div>
  );
}