import React, { useState, useMemo } from 'react';
import { X, Send, Download, Check, ChevronLeft } from 'lucide-react';
import { useStore } from '../store.jsx';
import { formatMoney } from '../money';

/**
 * Invoice review & send flow.
 *
 * Three sub-states: preview (rendered invoice), email (composer), success.
 * Triggered from the invoice editor's "Review and send" button.
 */

export default function InvoiceReview({ invoice, onClose, onSent }) {
  const { state, dispatch } = useStore();
  const [step, setStep] = useState('preview'); // preview | email | success
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [attachPdf, setAttachPdf] = useState(true);
  const [sending, setSending] = useState(false);

  const customer = state.customers.find(c => c.id === invoice.customerId);
  const taxRate = state.taxRates.find(t => t.id === invoice.taxRateId);

  const totals = useMemo(() => {
    const subtotal = invoice.lines.reduce((s, l) => s + (l.qty * l.rate), 0);
    const discount = invoice.discount?.mode === '%'
      ? subtotal * (invoice.discount.value / 100)
      : (invoice.discount?.value || 0);
    const taxableSubtotal = invoice.lines.filter(l => l.taxable).reduce((s, l) => s + (l.qty * l.rate), 0);
    const tax = taxRate ? taxableSubtotal * (taxRate.pct / 100) : 0;
    const total = subtotal - discount + tax;
    return { subtotal, discount, taxableSubtotal, tax, total };
  }, [invoice, taxRate]);

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      const updated = { ...invoice, status: invoice.dueDate < new Date().toISOString().slice(0, 10) ? 'Overdue' : 'Sent', sentAt: new Date().toISOString() };
      dispatch({ type: 'UPDATE_INVOICE', payload: updated });
      dispatch({ type: 'ADD_NOTIFICATION', payload: { id: Date.now(), text: `Invoice ${invoice.no} sent to ${customer?.displayName}`, time: 'Just now', read: false, route: '/sales' } });
      setSending(false);
      setStep('success');
      onSent?.(updated);
    }, 1000);
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice sent</h2>
          <p className="text-sm text-gray-600 mb-6">
            {invoice.no} sent to {customer?.displayName || 'customer'}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-[#2CA01C] hover:bg-[#25900f] text-white text-sm font-semibold rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (step === 'email') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setStep('preview')} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">Send invoice</h2>
            </div>
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={18} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">To</label>
              <input
                type="email"
                value={emailTo}
                onChange={e => setEmailTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
                placeholder="customer@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2CA01C] resize-none"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={attachPdf}
                onChange={e => setAttachPdf(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#2CA01C] focus:ring-[#2CA01C]"
              />
              Attach PDF
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setStep('preview')}
              className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !emailTo}
              className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview step
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Review and send</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Invoice preview */}
        <div className="p-8 bg-gray-50">
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-blue-600">INVOICE</h1>
                <p className="text-sm text-gray-600 mt-1">{state.company.name}</p>
                <p className="text-xs text-gray-500">{state.company.address?.street}</p>
                <p className="text-xs text-gray-500">{state.company.address?.city}, {state.company.address?.state} {state.company.address?.zip}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{invoice.no}</p>
                <p className="text-xs text-gray-500">Date: {invoice.date}</p>
                <p className="text-xs text-gray-500">Due: {invoice.dueDate}</p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bill to</p>
              <p className="text-sm font-semibold text-gray-900">{customer?.displayName}</p>
              <p className="text-xs text-gray-500">{customer?.billingAddress}</p>
            </div>

            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Description</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Qty</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Rate</th>
                  <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 text-sm text-gray-900">{line.desc}</td>
                    <td className="py-2 text-sm text-gray-600 text-right">{line.qty}</td>
                    <td className="py-2 text-sm text-gray-600 text-right">{formatMoney(line.rate)}</td>
                    <td className="py-2 text-sm text-gray-900 text-right font-medium">{formatMoney(line.qty * line.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{formatMoney(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">-{formatMoney(totals.discount)}</span>
                  </div>
                )}
                {totals.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Sales tax ({taxRate?.pct}%)</span>
                    <span className="text-gray-900">{formatMoney(totals.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total</span>
                  <span className="text-gray-900">{formatMoney(totals.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
          >
            <Download size={16} />
            Download PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setEmailTo(customer?.email || '');
              setEmailSubject(`Invoice ${invoice.no} from ${state.company.name}`);
              setEmailBody(`Hi ${customer?.displayName || ''},\n\nHere's invoice ${invoice.no} for ${formatMoney(totals.total)}.\n\nThanks for your business!`);
              setStep('email');
            }}
            className="px-5 py-2 bg-[#2CA01C] hover:bg-[#25900f] text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            <Send size={16} />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
