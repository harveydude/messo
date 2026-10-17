import React, { useState, useEffect } from 'react';
import { X, Calendar, Check, AlertCircle, ChevronDown, Plus, Trash2, HelpCircle } from 'lucide-react';
import api from '../api/client';
import { useStore } from '../store';

const SEED_CUSTOMERS = [
  { id: 'cust_1', name: 'Cool Cars', email: 'Cool_Cars@meso.in' },
  { id: 'cust_2', name: "Amy's Bird Sanctuary", email: 'amy@birdsanctuary.in' },
  { id: 'cust_4', name: 'Sushi by Katsuyuki', email: 'katsuyuki@sushidelhi.in' },
  { id: 'cust_6', name: "Bill's Windsurf Shop", email: 'bill@windsurfgoa.in' },
  { id: 'cust_8', name: 'Dukes Basketball Camp', email: 'duke@dukesports.in' },
  { id: 'cust_10', name: 'Fountain Masters', email: 'francis@fountainmasters.in' }
];

const SEED_VENDORS = [
  { id: 'vend_1', name: 'Hicks Hardware' },
  { id: 'vend_2', name: 'Cal Telephone' },
  { id: 'vend_3', name: 'Brosnahan Insurance' },
  { id: 'vend_4', name: 'Office Supplies Co' },
  { id: 'vend_6', name: 'A Rental Equipment' }
];

export default function UniversalCreateWorkflowModal({
  isOpen,
  workflowType,
  onClose,
  onSuccess
}) {
  const { dispatch } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Common Header State
  const [docNumber, setDocNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');

  // Contact State
  const [selectedContact, setSelectedContact] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [depositToAccount, setDepositToAccount] = useState('acc_1010'); // Checking

  // Amount & Lines State
  const [totalAmount, setTotalAmount] = useState('1500');
  const [lines, setLines] = useState([
    { id: 1, desc: 'Professional Services', qty: 1, rate: 1500, amount: 1500 }
  ]);

  // Subledger Records (e.g. Invoices to allocate against or Bills to pay)
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);
  const [selectedInvoices, setSelectedInvoices] = useState({});
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [selectedBills, setSelectedBills] = useState({});

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    const defaultNum = `${(workflowType || 'TXN').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setDocNumber(defaultNum);

    // Contextual preload
    if (workflowType === 'Receive payment') {
      api.getInvoices().then(res => {
        if (res?.success && res.invoices) {
          const open = res.invoices.filter(i => i.status !== 'PAID');
          setUnpaidInvoices(open);
          if (open.length > 0) {
            setSelectedContact(open[0].customer_id || 'cust_1');
            setSelectedInvoices({ [open[0].id]: true });
            setTotalAmount(open[0].balance_due_inr || '3620.70');
          }
        }
      }).catch(() => {});
    } else if (workflowType === 'Pay bills') {
      api.getBills().then(res => {
        if (res?.success && res.bills) {
          const open = res.bills.filter(b => b.status !== 'PAID');
          setUnpaidBills(open);
          if (open.length > 0) {
            setSelectedBills({ [open[0].id]: true });
            setTotalAmount((Number(open[0].open_balance_paise || 2287500) / 100).toFixed(2));
          }
        }
      }).catch(() => {});
    } else if (['Bill', 'Check', 'Purchase order', 'Vendor credit', 'Credit card credit'].includes(workflowType)) {
      setSelectedContact(SEED_VENDORS[0].id);
    } else {
      setSelectedContact(SEED_CUSTOMERS[0].id);
    }
  }, [isOpen, workflowType]);

  if (!isOpen) return null;

  const handleLineChange = (id, field, val) => {
    setLines(prev => prev.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: val };
        if (field === 'qty' || field === 'rate') {
          updated.amount = (Number(updated.qty || 1) * Number(updated.rate || 0));
        }
        return updated;
      }
      return l;
    }));
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: Date.now(), desc: '', qty: 1, rate: 0, amount: 0 }]);
  };

  const removeLine = (id) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const numericTotal = parseFloat(totalAmount) || lines.reduce((s, l) => s + Number(l.amount || 0), 0) || 1000;

      // 1. Dispatch based on exact workflow specification
      switch (workflowType) {
        case 'Receive payment': {
          const invIds = Object.keys(selectedInvoices).filter(k => selectedInvoices[k]);
          await api.createTransaction({
            txnType: 'RECEIVE_PAYMENT',
            docNumber,
            date,
            contactId: selectedContact || 'cust_1',
            totalAmount: numericTotal,
            depositToAccountId: depositToAccount,
            memo: memo || `Payment received for ${invIds.join(', ')}`,
            invoiceIds: invIds
          });
          break;
        }

        case 'Pay bills': {
          const billIds = Object.keys(selectedBills).filter(k => selectedBills[k]);
          await api.createTransaction({
            txnType: 'PAY_BILLS',
            docNumber,
            date,
            totalAmount: numericTotal,
            paymentAccountId: depositToAccount,
            memo: memo || `Paid bills: ${billIds.join(', ')}`,
            billIds
          });
          break;
        }

        case 'Bill': {
          await api.createTransaction({
            txnType: 'BILL',
            docNumber,
            date,
            dueDate,
            contactId: selectedContact || 'vend_1',
            totalAmount: numericTotal,
            memo: memo || 'Vendor bill recorded',
            lines: lines.map(l => ({ description: l.desc, amount: l.amount }))
          });
          break;
        }

        case 'Check': {
          await api.createTransaction({
            txnType: 'CHECK',
            docNumber,
            date,
            contactId: selectedContact || 'vend_1',
            totalAmount: numericTotal,
            memo: memo || 'Check issued',
            lines: lines.map(l => ({ description: l.desc, amount: l.amount }))
          });
          break;
        }

        case 'Bank deposit': {
          await api.createTransaction({
            txnType: 'BANK_DEPOSIT',
            docNumber,
            date,
            totalAmount: numericTotal,
            depositToAccountId: depositToAccount || 'acc_1010',
            memo: memo || 'Deposit cleared to bank account'
          });
          break;
        }

        case 'Transfer': {
          await api.createTransaction({
            txnType: 'TRANSFER',
            docNumber,
            date,
            totalAmount: numericTotal,
            fromAccountId: 'acc_1010',
            toAccountId: 'acc_1015',
            memo: memo || 'Internal bank funds transfer'
          });
          break;
        }

        case 'Pay down credit card': {
          await api.createTransaction({
            txnType: 'PAY_CC',
            docNumber,
            date,
            totalAmount: numericTotal,
            creditCardAccountId: 'acc_1020',
            bankAccountId: 'acc_1010',
            memo: memo || 'Paid credit card balance'
          });
          break;
        }

        case 'Inventory qty adjustment': {
          await api.createTransaction({
            txnType: 'INVENTORY_ADJ',
            docNumber,
            date,
            totalAmount: numericTotal,
            changeInQty: -1,
            unitCost: numericTotal,
            memo: memo || 'Inventory physical count shrinkage'
          });
          break;
        }

        case 'Add customer': {
          await api.createContact({
            type: 'CUSTOMER',
            displayName: docNumber.startsWith('CUST-') ? memo || 'New Client' : docNumber,
            email: `${docNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.in`,
            phone: '+91 98200 11223',
            openingBalanceInr: numericTotal
          });
          break;
        }

        case 'Add vendor': {
          await api.createContact({
            type: 'VENDOR',
            displayName: docNumber.startsWith('VEND-') ? memo || 'New Supplier' : docNumber,
            email: `${docNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.in`,
            phone: '+91 98110 99887',
            openingBalanceInr: numericTotal
          });
          break;
        }

        case 'Add employee': {
          await api.createContact({
            type: 'EMPLOYEE',
            displayName: memo || 'New Team Member',
            phone: '+91 99000 11223'
          });
          break;
        }

        case 'Add contractor': {
          await api.createContact({
            type: 'CONTRACTOR',
            displayName: memo || 'Contractor Field Specialist',
            phone: '+91 99000 44332'
          });
          break;
        }

        case 'Single time activity':
        case 'Weekly timesheet': {
          await api.createTransaction({
            txnType: 'TIME_ACTIVITY',
            date,
            totalAmount: numericTotal,
            hours: 7.5,
            hourlyRateInr: numericTotal / 7.5,
            memo: memo || 'Site engineering & inspection hours'
          });
          break;
        }

        case 'Payroll': {
          await api.runPayroll({
            payDate: date,
            totalGrossInr: numericTotal,
            totalTaxesInr: numericTotal * 0.15,
            totalNetInr: numericTotal * 0.85
          });
          break;
        }

        case 'Add product/service': {
          await api.createProductService({
            name: memo || `New Product ${Date.now().toString().slice(-4)}`,
            type: 'SERVICE',
            priceInr: numericTotal,
            costInr: numericTotal * 0.6
          });
          break;
        }

        default: {
          // Standard Sales & Purchase documents (Estimate, Sales order, Credit memo, Purchase order, Vendor credit, etc.)
          await api.createTransaction({
            txnType: workflowType.toUpperCase().replace(/\s+/g, '_'),
            docNumber,
            date,
            dueDate,
            contactId: selectedContact,
            totalAmount: numericTotal,
            memo,
            lines: lines.map(l => ({ description: l.desc, amount: l.amount, qty: l.qty, rate: l.rate }))
          });
          break;
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Universal workflow creation error:', err);
      setErrorMsg(err.message || 'Error executing workflow transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-[8px] shadow-2xl w-full max-w-[850px] max-h-[90vh] flex flex-col overflow-hidden text-[#393A3D] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header */}
        <div className="px-6 py-4 bg-[#F4F5F8] border-b border-[#D5D8DC] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-[#2CA01C]" />
            <h2 className="text-[19px] font-bold tracking-tight text-[#111]">
              {workflowType}
            </h2>
            <span className="text-[12px] bg-white border border-[#C7CBCE] px-2 py-0.5 rounded text-[#6B6C72] font-mono">
              #{docNumber}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-md text-[#6B6C72] hover:text-black hover:bg-gray-200 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* 2. Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2 text-red-700 text-sm">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form Context Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Selector */}
            {!['Bank deposit', 'Transfer', 'Pay down credit card', 'Add product/service'].includes(workflowType) && (
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6C72] uppercase mb-1">
                  {['Bill', 'Check', 'Pay bills', 'Purchase order', 'Vendor credit', 'Add vendor'].includes(workflowType) ? 'Vendor' : 'Customer'}
                </label>
                <select
                  value={selectedContact}
                  onChange={(e) => setSelectedContact(e.target.value)}
                  className="w-full h-[38px] px-3 bg-white border border-[#C7CBCE] rounded-[4px] text-[14px] text-[#393A3D] outline-none focus:border-[#2CA01C]"
                >
                  {(['Bill', 'Check', 'Pay bills', 'Purchase order', 'Vendor credit'].includes(workflowType) ? SEED_VENDORS : SEED_CUSTOMERS).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-[12px] font-semibold text-[#6B6C72] uppercase mb-1">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-[38px] px-3 bg-white border border-[#C7CBCE] rounded-[4px] text-[14px] text-[#393A3D] outline-none focus:border-[#2CA01C]"
                />
              </div>
            </div>

            {/* Payment / Deposit Account */}
            {['Receive payment', 'Pay bills', 'Check', 'Bank deposit', 'Pay down credit card'].includes(workflowType) && (
              <div>
                <label className="block text-[12px] font-semibold text-[#6B6C72] uppercase mb-1">
                  {workflowType === 'Receive payment' ? 'Deposit to' : 'Payment account'}
                </label>
                <select
                  value={depositToAccount}
                  onChange={(e) => setDepositToAccount(e.target.value)}
                  className="w-full h-[38px] px-3 bg-white border border-[#C7CBCE] rounded-[4px] text-[14px] text-[#393A3D] outline-none focus:border-[#2CA01C]"
                >
                  <option value="acc_1010">Checking (HDFC) - ₹1,201.00</option>
                  <option value="acc_1015">Savings Reserve (SBI) - ₹50,000.00</option>
                  <option value="acc_1020">Mastercard Business Credit - ₹157.72</option>
                </select>
              </div>
            )}

            {/* Amount (Single Total) */}
            <div className={['Receive payment', 'Pay bills', 'Bank deposit', 'Transfer', 'Pay down credit card'].includes(workflowType) ? 'md:col-span-3' : ''}>
              <label className="block text-[12px] font-semibold text-[#6B6C72] uppercase mb-1">
                Total Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full h-[38px] px-3 bg-white border border-[#C7CBCE] rounded-[4px] text-[16px] font-bold text-[#393A3D] outline-none focus:border-[#2CA01C]"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Subledger Invoices Allocation Table for Receive Payment */}
          {workflowType === 'Receive payment' && unpaidInvoices.length > 0 && (
            <div className="mt-4 border border-[#D5D8DC] rounded-[6px] overflow-hidden">
              <div className="bg-[#F4F5F8] px-4 py-2 font-semibold text-[13px] border-b border-[#D5D8DC]">
                Outstanding Invoices for Allocation
              </div>
              <table className="w-full text-[13px] text-left">
                <thead className="bg-[#FAFBFD] border-b border-[#E3E5E8] text-[#6B6C72]">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Invoice #</th>
                    <th className="p-2">Due Date</th>
                    <th className="p-2 text-right">Original</th>
                    <th className="p-2 text-right">Open Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-[#E3E5E8] hover:bg-blue-50/50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={!!selectedInvoices[inv.id]}
                          onChange={(e) => setSelectedInvoices({ ...selectedInvoices, [inv.id]: e.target.checked })}
                          className="accent-[#2CA01C]"
                        />
                      </td>
                      <td className="p-2 font-medium">{inv.invoice_number}</td>
                      <td className="p-2 text-[#6B6C72]">{inv.due_date}</td>
                      <td className="p-2 text-right">₹{inv.total_inr}</td>
                      <td className="p-2 text-right font-semibold text-[#D52B1E]">₹{inv.balance_due_inr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Subledger Bills Table for Pay Bills */}
          {workflowType === 'Pay bills' && unpaidBills.length > 0 && (
            <div className="mt-4 border border-[#D5D8DC] rounded-[6px] overflow-hidden">
              <div className="bg-[#F4F5F8] px-4 py-2 font-semibold text-[13px] border-b border-[#D5D8DC]">
                Unpaid Vendor Bills to Disburse
              </div>
              <table className="w-full text-[13px] text-left">
                <thead className="bg-[#FAFBFD] border-b border-[#E3E5E8] text-[#6B6C72]">
                  <tr>
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Bill #</th>
                    <th className="p-2">Due Date</th>
                    <th className="p-2 text-right">Amount Due</th>
                  </tr>
                </thead>
                <tbody>
                  {unpaidBills.map(b => (
                    <tr key={b.id} className="border-b border-[#E3E5E8] hover:bg-blue-50/50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={!!selectedBills[b.id]}
                          onChange={(e) => setSelectedBills({ ...selectedBills, [b.id]: e.target.checked })}
                          className="accent-[#2CA01C]"
                        />
                      </td>
                      <td className="p-2 font-medium">{b.bill_number}</td>
                      <td className="p-2 text-[#6B6C72]">{b.due_date}</td>
                      <td className="p-2 text-right font-semibold text-[#D52B1E]">
                        ₹{(Number(b.open_balance_paise || b.amount_paise) / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Multi-Line Items Grid for Standard Documents */}
          {!['Receive payment', 'Pay bills', 'Bank deposit', 'Transfer', 'Pay down credit card', 'Add customer', 'Add vendor', 'Add contractor', 'Add product/service', 'Payroll'].includes(workflowType) && (
            <div className="mt-4 border border-[#D5D8DC] rounded-[6px] overflow-hidden">
              <div className="bg-[#F4F5F8] px-4 py-2 font-semibold text-[13px] border-b border-[#D5D8DC] flex items-center justify-between">
                <span>Line Items</span>
                <button 
                  type="button" 
                  onClick={addLine}
                  className="text-[12px] text-[#0077C5] hover:underline flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add line</span>
                </button>
              </div>
              <div className="p-3 space-y-2">
                {lines.map((line, idx) => (
                  <div key={line.id} className="flex items-center space-x-2">
                    <span className="text-xs text-[#6B6C72] w-4">{idx + 1}</span>
                    <input
                      type="text"
                      placeholder="Product / Service Description"
                      value={line.desc}
                      onChange={(e) => handleLineChange(line.id, 'desc', e.target.value)}
                      className="flex-1 h-[32px] px-2 text-[13px] border border-[#C7CBCE] rounded"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={line.qty}
                      onChange={(e) => handleLineChange(line.id, 'qty', e.target.value)}
                      className="w-16 h-[32px] px-2 text-[13px] border border-[#C7CBCE] rounded text-right"
                    />
                    <input
                      type="number"
                      placeholder="Rate"
                      value={line.rate}
                      onChange={(e) => handleLineChange(line.id, 'rate', e.target.value)}
                      className="w-24 h-[32px] px-2 text-[13px] border border-[#C7CBCE] rounded text-right"
                    />
                    <span className="w-24 text-[13px] font-semibold text-right text-[#393A3D]">
                      ₹{line.amount.toFixed(2)}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => removeLine(line.id)}
                      className="text-[#6B6C72] hover:text-red-600 p-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Memo / Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-[#6B6C72] uppercase mb-1">
              Memo / Notes
            </label>
            <textarea
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add optional internal note or description..."
              className="w-full p-2 bg-white border border-[#C7CBCE] rounded-[4px] text-[13px] text-[#393A3D] outline-none focus:border-[#2CA01C]"
            />
          </div>
        </form>

        {/* 3. Modal Footer */}
        <div className="px-6 py-4 bg-[#F4F5F8] border-t border-[#D5D8DC] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="h-[38px] px-5 bg-white border border-[#C7CBCE] rounded-[6px] text-[14px] font-semibold text-[#393A3D] hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="h-[38px] px-6 bg-[#2CA01C] hover:bg-[#248517] text-white rounded-[6px] text-[14px] font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving to Ledger...' : 'Save and post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
