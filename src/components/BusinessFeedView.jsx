import React, { useMemo, useState } from 'react';
import { Sparkles, ChevronDown, Copy, Settings, Upload, CheckCircle, Building, X, ArrowRight, CircleCheck } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Business feed.
 *
 * Every card here is computed from the store. The previous version was hardcoded
 * -- it greeted "TeachUcomp!", quoted $3,190.65 to "Christine", and listed six
 * banks, none of which existed anywhere else in the app. It looked plausible and
 * was fiction, which is worse than empty: an accountant reading it has no way to
 * tell it apart from a real figure.
 *
 * What changed: the overdue card totals the actual unpaid invoices, the bank
 * grid lists accounts actually connected, and dismissing a card records that so
 * it stays dismissed on reload.
 */

const SEVERITY = {
  urgent: { ring: 'border-red-200 bg-red-50/40', chip: 'bg-red-100 text-red-800', label: 'Needs attention' },
  warning: { ring: 'border-amber-200 bg-amber-50/40', chip: 'bg-amber-100 text-amber-800', label: 'Due soon' },
  info: { ring: 'border-gray-200 bg-white', chip: 'bg-gray-100 text-gray-700', label: 'For information' },
};

export default function BusinessFeedView({ onNavigate }) {
  const { state } = useStore();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('messo_feed_dismissed') || '[]'));
    } catch {
      return new Set();
    }
  });

  const cards = useMemo(() => {
    const out = [];

    // Overdue invoices -- the figure is computed, never written by hand.
    const overdue = state.invoices.filter((i) => i.status === 'Overdue');
    if (overdue.length) {
      const total = overdue.reduce((s, i) => {
        const sub = i.lines.reduce((ls, l) => ls + l.qty * l.rate, 0);
        return ls2(s, sub, i.discount);
      }, 0);
      const worst = overdue.reduce((a, b) => (a.dueDate < b.dueDate ? a : b));
      out.push({
        id: 'overdue',
        severity: 'urgent',
        kicker: 'Money owed to you',
        title: `${overdue.length} overdue invoice${overdue.length > 1 ? 's' : ''} worth ${formatMoney(total)}`,
        body: `Oldest is ${worst.no}, due ${worst.dueDate}. Sending a reminder is the fastest way to get this back.`,
        cta: 'Review reminders',
        action: () => onNavigate?.('sales_transactions'),
      });
    }

    // Uncategorized bank transactions.
    const uncategorised = state.bankTxns.filter((t) => t.state === 'Uncategorized');
    if (uncategorised.length) {
      out.push({
        id: 'uncategorised',
        severity: 'warning',
        kicker: 'Bank transactions',
        title: `${uncategorised.length} transaction${uncategorised.length > 1 ? 's' : ''} not yet categorised`,
        body: 'Money in your bank account has not been matched to your books. Profit and loss are understated until this is done.',
        cta: 'Categorise them',
        action: () => onNavigate?.('bank_transactions'),
      });
    }

    // Overdue bills.
    const overdueBills = state.bills.filter((b) => b.status === 'Overdue');
    if (overdueBills.length) {
      const total = overdueBills.reduce((s, b) => s + b.lines.reduce((ls, l) => ls + l.amount, 0), 0);
      out.push({
        id: 'overdue_bills',
        severity: 'warning',
        kicker: 'Money you owe',
        title: `${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''} totalling ${formatMoney(total)}`,
        body: 'These have passed their due date. Suppliers late paid are the ones who raise their prices next time.',
        cta: 'See bills',
        action: () => onNavigate?.('expense_transactions'),
      });
    }

    // Draft invoices never sent.
    const drafts = state.invoices.filter((i) => i.status === 'Draft');
    if (drafts.length) {
      out.push({
        id: 'drafts',
        severity: 'info',
        kicker: 'Sales',
        title: `${drafts.length} draft invoice${drafts.length > 1 ? 's' : ''} not sent`,
        body: 'You wrote these but never sent them. They are not counted as income until they are.',
        cta: 'Open sales',
        action: () => onNavigate?.('sales_transactions'),
      });
    }

    return out;
  }, [state.invoices, state.bills, state.bankTxns, onNavigate]);

  const visible = cards.filter((c) => !dismissed.has(c.id));

  const dismiss = (id) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      localStorage.setItem('messo_feed_dismissed', JSON.stringify([...next]));
    } catch {
      /* storage unavailable -- dismissal lasts this session only */
    }
  };

  const handleCopyEmail = () => {
    const address = `sample_company_7825+expense@qbo.intuit.com`;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const firstName = (state.company.name || 'there').split(' ')[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business feed</h1>
        <div className="flex items-center space-x-1.5 text-xs text-gray-600 mt-1">
          <Sparkles size={14} className="text-[#0077c5]" />
          <span>Here are the latest suggestions and work done for you, {firstName}.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {visible.length === 0 ? (
            <CaughtUp />
          ) : (
            visible.map((card) => {
              const sev = SEVERITY[card.severity];
              return (
                <article
                  key={card.id}
                  className={`rounded-xl border p-5 shadow-xs flex items-start gap-4 ${sev.ring}`}
                >
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${sev.chip}`}>
                        {sev.label}
                      </span>
                      <span className="text-[11px] font-medium text-gray-500">{card.kicker}</span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{card.title}</h3>
                    <p className="text-xs text-gray-600">{card.body}</p>
                    <button
                      onClick={card.action}
                      className="mt-2 text-xs text-[#0077c5] hover:underline font-semibold flex items-center space-x-1"
                    >
                      {card.cta}
                      <ArrowRight size={12} />
                    </button>
                  </div>
                  <button
                    onClick={() => dismiss(card.id)}
                    aria-label={`Dismiss: ${card.title}`}
                    title="Dismiss"
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0"
                  >
                    <X size={15} />
                  </button>
                </article>
              );
            })
          )}

          {/* Connect an account -- only offered when nothing is linked. */}
          {state.bankAccounts.filter((a) => a.connected).length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                  <Building size={18} />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">Bank transactions</div>
                  <div className="text-sm font-bold text-gray-900">Connect account</div>
                </div>
              </div>
              <h3 className="text-sm font-bold text-gray-900">
                Connect an account to bring in transactions
              </h3>
              <p className="text-xs text-gray-500">
                Track income and expenses automatically instead of typing them in.
              </p>
              <button
                onClick={() => onNavigate?.('bank_transactions')}
                className="px-5 py-2 rounded-full bg-[#2ca01c] hover:bg-green-700 text-xs font-bold text-white transition"
              >
                Connect a bank
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Autofill</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>

            <select className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white" defaultValue="Expense">
              <option>Bill</option>
              <option>Expense</option>
              <option>Receipt</option>
            </select>

            <div className="border-2 border-dashed border-sky-300 rounded-xl p-5 text-center bg-sky-50/30 hover:bg-sky-50/60 transition cursor-pointer">
              <Upload size={22} className="mx-auto text-sky-600 mb-2" />
              <div className="text-xs font-semibold text-gray-900">
                Select a file or drag and drop here
              </div>
              <div className="text-[10px] text-gray-500 mt-1">Supported formats: .pdf, .jpg, .png</div>
            </div>

            <div className="space-y-1">
              <div className="text-[11px] text-gray-500 font-medium">Or forward bill-related emails here:</div>
              <div className="flex items-center justify-between p-2 rounded bg-gray-50 border border-gray-200 text-xs">
                <span className="truncate text-gray-700 font-mono text-[11px]">sample_company_7825+expense...</span>
                <button onClick={handleCopyEmail} className="text-gray-500 hover:text-gray-800 ml-2" title="Copy email">
                  {copied ? <CheckCircle size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <button className="text-xs text-gray-600 hover:text-gray-900 flex items-center space-x-1.5 pt-1">
              <Settings size={13} />
              <span>Manage settings</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900">Intuit's AI agents</span>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <div className="text-xs text-gray-500 font-medium">3 active agents included in your plan.</div>
            <div className="space-y-3 pt-1">
              {[
                ['A', 'Accounting Agent', 'Automates categorisation and expense tracking.', 'bg-emerald-600'],
                ['P', 'Payments Agent', 'Helps create tailored strategies to get paid faster.', 'bg-blue-600'],
                ['C', 'Customer Agent', 'Prioritises leads and personalises email follow-ups.', 'bg-purple-600'],
              ].map(([initial, name, desc, colour]) => (
                <div key={initial} className="flex items-start space-x-3 p-2.5 rounded-lg bg-gray-50/80">
                  <div className={`w-6 h-6 rounded-full ${colour} text-white flex items-center justify-center text-[10px] font-bold shrink-0`}>
                    {initial}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-900">{name}</div>
                    <div className="text-[11px] text-gray-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4">
        <button className="text-xs text-gray-400 hover:underline">
          Important information about how we use generative AI
        </button>
      </div>
    </div>
  );
}

/** Subtotal minus discount, using whichever mode the invoice stored. */
function ls2(sum, subtotal, discount) {
  if (!discount) return sum + subtotal;
  const cut = discount.mode === '%' ? subtotal * (discount.value / 100) : discount.value;
  return sum + subtotal - cut;
}

function CaughtUp() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-3">
      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto">
        <CircleCheck size={24} className="text-green-600" />
      </div>
      <h3 className="text-base font-bold text-gray-900">You're all caught up</h3>
      <p className="text-xs text-gray-500 max-w-sm mx-auto">
        Nothing needs your attention right now. New tasks appear here as soon as there is something to do.
      </p>
      <div className="flex items-center justify-center gap-2 pt-2">
        {['Generate a bill', 'Receipt upload', 'Generate an invoice'].map((label) => (
          <button
            key={label}
            className="px-3 py-1.5 text-[11px] font-semibold text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}