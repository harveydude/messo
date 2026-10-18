import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  RotateCcw,
  Settings,
  MessageSquare,
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Tv,
} from 'lucide-react';
import InvoiceReview from './InvoiceReview';
import { useStore } from '../store';
import api from '../api/client';


/* ─── Customer seed data ─── */
const CUSTOMERS = [
  "Vermilion Bike Store Pvt Ltd",
  "Amy's Bird Sanctuary",
  "Bill's Windsurf Shop",
  "Cool Cars",
  "Diego Rodriguez",
  "Dukes Basketball Camp",
  "Dylan Sollfrank",
  "Eric Cloud",
  "Fountain Masters",
  "Garden Depot",
  "Hall Properties",
  "Island Events"
];

const CUSTOMER_DETAILS = {
  'Vermilion Bike Store Pvt Ltd': {
    email: 'bikestore@vermilion.in',
    gstin: '27AABCU9603R1ZM',
    billTo: 'Vermilion Bike Store Pvt Ltd\n214 Harborfront Avenue\nBandra West, Mumbai, MH 400050'
  },
  'Cool Cars': {
    email: 'Cool_Cars@meso.in',
    billTo: 'Gaurav Parikh\nCool Cars\n65 Marine Drive\nNariman Point, Mumbai, MH 400021'
  }
};

const TERMS_OPTIONS = ['Net 15', 'Net 30', 'Net 60', 'Due on receipt'];

/* ─── Product catalog seed data ─── */
const CATALOG = [
  { name: 'Brand Strategy Package', desc: 'June Campaign: Brand positioning, creative direction & digital collateral (SAC 998311)', cat: 'Professional Services', sku: 'SAC-998311', rate: 240000.00 },
  { name: 'Design', desc: 'Custom Design', cat: 'Design', sku: '', rate: 7500.00 },
  { name: 'Concrete', desc: 'Concrete for fountain installation', cat: 'Design > Fountains', sku: '', rate: 1200.00 },
  { name: 'Pump', desc: 'Fountain Pump', cat: 'Design > Fountains', sku: 'P461-17', rate: 4500.00 },
  { name: 'Rock Fountain', desc: 'Rock Fountain', cat: 'Design > Fountains', sku: 'R154-88', rate: 25000.00 },
  { name: 'Rocks', desc: 'Garden Rocks', cat: 'Design', sku: '', rate: 800.00 },
  { name: 'Services', desc: '', cat: 'Design', sku: '', rate: 5000.00 },
  { name: 'Gardening', desc: 'Weekly Gardening Service', cat: 'Landscaping', sku: '', rate: 0.00 },
  { name: 'Hours', desc: '', cat: 'Landscaping', sku: '', rate: 0.00 },
  { name: 'Installation', desc: 'Installation of landscape design', cat: 'Landscaping', sku: '', rate: 0.00 }
];

const TAX_RATES = [
  { label: 'GST 18% (Standard)', pct: 18.00 },
  { label: 'GST 5% (Essentials & Mass Consumption)', pct: 5.00 },
  { label: 'GST 40% (Demerit & Luxury Goods)', pct: 40.00 },
  { label: 'GST 3% (Gold & Precious Metals)', pct: 3.00 },
  { label: 'GST 0.25% (Diamonds & Precious Stones)', pct: 0.25 },
  { label: 'Exempt / Nil (0%)', pct: 0.00 }
];

const money = (n) => '₹' + (Math.round((n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Schnauzer mascot SVG ─── */
function DogArt() {
  return (
    <svg width="100" height="105" viewBox="0 0 120 126">
      <path d="M18 44 C8 22 30 8 42 22 L46 58 C36 66 22 60 18 44Z" fill="#3a3c40" />
      <path d="M102 44 C112 22 90 8 78 22 L74 58 C84 66 98 60 102 44Z" fill="#3a3c40" />
      <ellipse cx="60" cy="54" rx="38" ry="35" fill="#9aa0a6" />
      <ellipse cx="46" cy="42" rx="10" ry="5.5" fill="#eceef0" />
      <ellipse cx="74" cy="42" rx="10" ry="5.5" fill="#eceef0" />
      <circle cx="47" cy="48" r="4.2" fill="#26282b" />
      <circle cx="73" cy="48" r="4.2" fill="#26282b" />
      <ellipse cx="60" cy="68" rx="18" ry="14" fill="#c9cdd2" />
      <path d="M38 72 C34 96 50 112 60 112 C70 112 86 96 82 72 C76 86 68 90 60 90 C52 90 44 86 38 72Z" fill="#6b6c72" />
      <ellipse cx="60" cy="63" rx="7.5" ry="6" fill="#26282b" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6c72" strokeWidth="1.8" strokeLinecap="round">
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 10.5h16M8.5 3.5v4M15.5 3.5v4" />
    </svg>
  );
}

function DragDots() {
  return (
    <svg width="8" height="16" viewBox="0 0 8 16" fill="#b9bdc2">
      {[2, 8, 14].map((y) => [1.5, 6].map((x) => <circle key={x + '-' + y} cx={x} cy={y} r="1.4" />))}
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b6c72" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

function RevertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b6c72" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10a8 8 0 1 1-1.5 6" />
      <path d="M4 4v6h6" />
    </svg>
  );
}

function InfoQIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b6c72" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="7.6" r="1.1" fill="#6b6c72" stroke="none" />
    </svg>
  );
}

/* ─── Compact Dropdown helper ─── */
function CompactSelect({ val, set, opts, w = 113 }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref} style={{ width: w }}>
      <div
        onClick={() => setOpen((o) => !o)}
        className="w-full h-[27px] bg-white border border-[#8d9096] rounded-[3px] flex items-center text-[14px] text-[#393A3D] cursor-pointer hover:border-[#393A3D] transition-colors"
      >
        <span className="flex-1 pl-[9px] truncate">{typeof val === 'string' ? val : val.label}</span>
        <span className="w-[27px] h-full flex items-center justify-center border-l border-[#c9cdd2] text-[#393A3D]">
          <ChevronDown size={13} />
        </span>
      </div>
      {open && (
        <div className="absolute z-30 top-[31px] left-0 w-[160px] bg-white border border-[#d9d9d9] rounded-[3px] shadow-[0_4px_14px_rgba(0,0,0,0.15)] py-[4px]">
          {opts.map((o) => {
            const label = typeof o === 'string' ? o : o.label;
            const current = typeof val === 'string' ? val : val.label;
            return (
              <div
                key={label}
                onClick={() => { set(o); setOpen(false); }}
                className={`px-[12px] py-[6px] text-[14px] text-[#393A3D] cursor-pointer hover:bg-[#f4f5f8] ${label === current ? 'font-semibold' : ''}`}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateField({ val }) {
  return (
    <div className="w-[143px] h-[27px] bg-white border border-[#8d9096] rounded-[3px] flex items-center text-[14px] text-[#393A3D]">
      <span className="flex-1 pl-[9px]">{val}</span>
      <button className="w-[27px] h-full flex items-center justify-center border-l border-[#c9cdd2] hover:bg-[#f4f5f8] transition-colors cursor-pointer">
        <CalIcon />
      </button>
    </div>
  );
}

/* ─── Customer Picker ─── */
function CustomerPicker({ value, onSelect }) {
  const [q, setQ] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    setQ(value || '');
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const list = CUSTOMERS.filter((c) => q.trim() === '' || c.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="absolute left-[44px] top-[34px] z-20" ref={ref}>
      <div className={`flex w-[208px] h-[30px] bg-white rounded-[3px] transition-all ${open ? 'ring-2 ring-[#2ca01c] border-0' : 'border border-[#8d9096] focus-within:ring-2 focus-within:ring-[#2ca01c] focus-within:border-0'}`}>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Add customer"
          className="flex-1 min-w-0 px-[9px] text-[15px] text-[#393A3D] placeholder-[#6b6c72] outline-none bg-transparent rounded-l-[3px]"
        />
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-[38px] shrink-0 flex items-center justify-center text-[#393A3D] border-l border-[#c9cdd2] hover:bg-[#f4f5f8] transition-colors cursor-pointer rounded-r-[3px]"
        >
          <ChevronDown size={15} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-[36px] w-[444px] max-h-[335px] overflow-y-auto bg-white border border-[#d9d9d9] rounded-[3px] shadow-[0_6px_18px_rgba(0,0,0,0.18)] py-[2px]">
          <div
            onClick={() => setOpen(false)}
            className="flex items-center gap-[12px] h-[45px] px-[16px] text-[16px] text-[#393A3D] hover:bg-[#f4f5f8] cursor-pointer border-b border-[#eceef0]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add new</span>
          </div>
          {list.map((c) => (
            <div
              key={c}
              onClick={() => { setQ(c); setOpen(false); onSelect(c); }}
              className="flex items-center justify-between h-[45px] px-[16px] hover:bg-[#f4f5f8] cursor-pointer"
            >
              <span className="text-[16px] text-[#393A3D] truncate pr-3">{c}</span>
              <span className="text-[16px] italic text-[#6b6c72] shrink-0">Customer</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Product Picker ─── */
function ProductPicker({ row, onChange, open, setOpen }) {
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [setOpen]);

  const pick = (item) => {
    const topCat = item.cat.split(' > ')[0];
    onChange({
      ...row,
      value: `${topCat}:${item.name}`,
      desc: item.desc,
      qty: '1',
      rate: item.rate.toFixed(2)
    });
    setOpen(false);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };

  return (
    <div className="relative ml-[7px] mr-[7px] flex-1" ref={ref}>
      <div className={`flex h-[36px] bg-white rounded-[3px] transition-all ${open ? 'ring-2 ring-[#2ca01c]' : 'border border-[#c9cdd2] focus-within:ring-2 focus-within:ring-[#2ca01c] focus-within:border-0'}`}>
        <input
          ref={inputRef}
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
          onFocus={() => setOpen(true)}
          placeholder="Select a product/service"
          className="flex-1 min-w-0 px-[10px] text-[15px] text-[#393A3D] placeholder-[#9aa0a6] outline-none bg-transparent rounded-l-[3px]"
        />
        <button
          onClick={() => setOpen(!open)}
          className="w-[38px] shrink-0 flex items-center justify-center text-[#393A3D] border-l border-[#c9cdd2] hover:bg-[#f4f5f8] transition-colors cursor-pointer rounded-r-[3px]"
        >
          <ChevronDown size={15} />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-[42px] w-[601px] max-h-[302px] overflow-y-auto bg-white border border-[#d9d9d9] rounded-[3px] shadow-[0_6px_18px_rgba(0,0,0,0.18)] z-30">
          <div
            onClick={() => setOpen(false)}
            className="flex items-center gap-[12px] min-h-[52px] px-[12px] text-[16px] text-[#393A3D] hover:bg-[#f4f5f8] cursor-pointer border-b border-[#eceef0]"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add new</span>
          </div>
          {CATALOG.map((it) => (
            <div
              key={it.name}
              onClick={() => pick(it)}
              className="flex px-[12px] py-[9px] border-b border-[#eceef0] last:border-b-0 hover:bg-[#f4f5f8] cursor-pointer"
            >
              <div className="w-[288px] shrink-0">
                <p className="text-[16px] text-[#393A3D] leading-[26px]">{it.name}</p>
                {it.sku && <p className="text-[15px] italic text-[#6b6c72] leading-[26px] -mt-[2px]">{it.sku}</p>}
              </div>
              <div className="flex-1 min-w-0">
                {it.desc ? (
                  <React.Fragment>
                    <p className="text-[16px] text-[#393A3D] leading-[26px] truncate">{it.desc}</p>
                    <p className="text-[15px] italic text-[#6b6c72] leading-[26px] -mt-[2px]">{it.cat}</p>
                  </React.Fragment>
                ) : (
                  <p className="text-[15px] italic text-[#6b6c72] leading-[26px]">{it.cat}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── 6 Payment Chips Component ─── */
function PaymentChips() {
  return (
    <div className="flex items-center gap-[6px] mt-[12px]">
      <span className="h-[26px] px-[8px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center text-[12px] font-bold text-[#393A3D]"> Pay</span>
      <span className="h-[26px] px-[8px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center text-[11px] font-extrabold italic text-[#1a1f71]">VISA</span>
      <span className="h-[26px] px-[8px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center">
        <svg width="26" height="16"><circle cx="10" cy="8" r="6.5" fill="#eb001b" /><circle cx="16.5" cy="8" r="6.5" fill="#f79e1b" fillOpacity="0.9" /></svg>
      </span>
      <span className="h-[26px] px-[7px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center text-[8px] font-extrabold tracking-tight text-[#4a4a4a]">DISC<span className="text-[#f47b16]">O</span>VER</span>
      <span className="h-[26px] px-[7px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center text-[8px] font-extrabold text-white bg-[#2e77bc]">AMEX</span>
      <span className="h-[26px] px-[8px] rounded-[3px] border border-[#d9d9d9] bg-white flex items-center text-[9px] font-bold text-[#6b6c72]">BANK</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   InvoiceEditorModal – Full 5-Screenshot Replication
   ═══════════════════════════════════════════════════════════════════ */
export default function InvoiceEditorModal({ isOpen = true, onClose }) {
  const [tab, setTab] = useState('Edit');
  const [isReviewing, setIsReviewing] = useState(false);
  const [terms, setTerms] = useState('Net 30');
  const [customer, setCustomer] = useState(null);
  const [email, setEmail] = useState('');
  const [billTo, setBillTo] = useState('');
  const [ccOpen, setCcOpen] = useState(false);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');

  // Line items state
  const [rows, setRows] = useState([
    { id: 1, value: '', desc: '', qty: '', rate: '', taxable: false }
  ]);
  const [openPicker, setOpenPicker] = useState(null);

  // Totals state
  const [discount, setDiscount] = useState(0);
  const [discMode, setDiscMode] = useState('%');
  const [taxRate, setTaxRate] = useState(TAX_RATES[0]);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');

  const { dispatch } = useStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveInvoice = async (sendAfter = false) => {
    setIsSaving(true);
    try {
      const activeCustomer = customer || 'Cool Cars';
      const items = rows.filter((r) => r.value || r.rate).map((r) => ({
        name: r.value || 'Consulting Services',
        desc: r.desc || '',
        qty: parseFloat(r.qty) || 1,
        rate: parseFloat(r.rate) || 0,
      }));

      const totalAmount = rows.reduce(
        (s, r) => s + (parseFloat(r.qty) || 1) * (parseFloat(r.rate) || 0),
        0
      );
      const taxAmt = totalAmount * ((taxRate?.pct || 18) / 100);
      const finalTotal = totalAmount + taxAmt;

      // Optimistic store dispatch
      dispatch({
        type: 'ADD_INVOICE',
        payload: {
          id: Date.now(),
          no: `INV-${Date.now().toString().slice(-4)}`,
          customerName: activeCustomer,
          customerId: 1,
          date: new Date().toISOString().split('T')[0],
          dueDate: '2025-11-23',
          terms: terms || 'Net 30',
          status: 'Sent',
          lines: items.map((it) => ({ desc: it.name, qty: it.qty, rate: it.rate, taxable: true })),
          total: finalTotal,
        },
      });

      // Backend API call
      await api.createInvoice({
        customerId: 'cust_1',
        items,
        notes: note || msg || '',
      });

      if (sendAfter) {
        setIsReviewing(true);
      } else {
        onClose?.();
      }
    } catch (err) {
      console.warn('Invoice save note:', err.message);
      if (sendAfter) setIsReviewing(true);
      else onClose?.();
    } finally {
      setIsSaving(false);
    }
  };

  /* Close on Escape key */

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const setRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () => setRows((rs) => [...rs, { id: Date.now(), value: '', desc: '', qty: '', rate: '', taxable: false }]);
  const insertAbove = (id) => setRows((rs) => {
    const i = rs.findIndex((r) => r.id === id);
    const n = [...rs];
    n.splice(i, 0, { id: Date.now(), value: '', desc: '', qty: '', rate: '', taxable: false });
    return n;
  });
  const delRow = (id) => setRows((rs) => {
    const n = rs.filter((r) => r.id !== id);
    return n.length ? n : [{ id: Date.now(), value: '', desc: '', qty: '', rate: '', taxable: false }];
  });
  const clearAll = () => setRows([{ id: Date.now(), value: '', desc: '', qty: '', rate: '', taxable: false }]);

  const amounts = rows.map((r) => (parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0));
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const discountVal = discMode === '%' ? subtotal * (discount || 0) / 100 : (discount || 0);
  const taxableSubtotal = rows.reduce((a, r, i) => a + (r.taxable ? amounts[i] : 0), 0);
  const salesTax = taxableSubtotal * (taxRate.pct / 100);

  const selectCustomer = (name) => {
    const d = CUSTOMER_DETAILS[name] || {
      email: name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '@meso.in',
      billTo: name
    };
    setCustomer(name);
    setEmail(d.email);
    setBillTo(d.billTo);
  };

  const off = ccOpen ? 64 : 0;
  const tabs = ['Edit', 'Email view', 'Payor view', 'PDF view'];
  const COLS = '38px 27px 505px 445px 210px 150px 245px 60px 1fr';
  const head = "text-[15px] font-semibold text-[#393A3D] select-none";
  const inputCls = "h-[36px] mx-[7px] w-[calc(100%-14px)] border border-[#c9cdd2] rounded-[3px] px-[10px] text-[15px] text-[#393A3D] outline-none bg-white focus:border-[#8db8e8] focus:ring-2 focus:ring-[#d4e7fa] transition-all";

  if (isReviewing || tab === 'Email view') {
    return (
      <InvoiceReview
        invoiceData={{
          customer: customer || 'Cool Cars',
          email: email || 'Cool_Cars@meso.in',
          billTo: billTo || 'Gaurav Parikh\nCool Cars\n65 Marine Drive\nNariman Point, Mumbai, MH 400021',
          terms,
          invDate: '10/24/2025',
          dueDate: '11/23/2025',
          rows: rows && rows.length > 0 && rows[0].value ? rows : [
            { id: 1, name: 'Gardening', desc: 'Weekly Gardening Service', qty: 1, rate: 200, amount: 200 }
          ],
          subtotal: subtotal || 200,
          discountVal: discountVal || 20,
          discountPct: discount || 10,
          salesTax: salesTax || 14.40,
          total: (subtotal || 200) - (discountVal || 20) + (salesTax || 14.40),
          note: note || msg || 'Thank you for your business and have a great day!'
        }}
        onBack={() => {
          setIsReviewing(false);
          setTab('Edit');
        }}
        onClose={onClose}
        onSent={() => {
          setIsReviewing(false);
          onClose?.();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col antialiased select-none">
      


      {/* ──── 1. TOP BAR (Height 74px) ──── */}
      <header className="h-[74px] flex-none bg-white border-b border-[#e3e5e8] flex items-center pl-[44px] pr-[16px] sticky top-0 z-40">
        <button title="Recent transactions" className="text-[#393A3D] hover:text-[#2ca01c] p-1.5 rounded transition">
          <RotateCcw size={22} strokeWidth={2.2} />
        </button>
        <span className="ml-[18px] text-[20px] font-semibold text-[#393A3D]">Invoice</span>
        <div className="ml-auto flex items-center gap-[8px]">
          <button title="Help" className="w-9 h-9 rounded-full border border-[#D4D7DC] flex items-center justify-center text-[#393A3D] hover:bg-[#f0f1f4] transition">
            <span className="text-[15px] font-bold">?</span>
          </button>
          <button onClick={onClose} title="Close" className="w-9 h-9 rounded-full flex items-center justify-center text-[#393A3D] hover:bg-[#f0f1f4] transition">
            <X size={20} strokeWidth={2.2} />
          </button>
        </div>
      </header>

      {/* ──── 2. TAB ROW (Height 50px) ──── */}
      <div className="h-[50px] flex-none bg-white border-b border-[#d9d9d9] flex items-stretch px-4 sticky top-[74px] z-30">
        {tabs.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative flex items-center text-[17px] text-[#393A3D] cursor-pointer transition-colors hover:bg-[#f7f8fa] ${i === 0 ? 'pl-[37px] pr-[26px]' : 'px-[18px]'} ${tab === t ? 'font-semibold' : ''}`}
          >
            {t}
            {tab === t && <span className="absolute left-0 right-0 bottom-0 h-[3px] bg-[#2ca01c]" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-[36px] pr-[24px]">
          <button className="flex items-center gap-[9px] text-[16px] text-[#393A3D] hover:text-[#2ca01c] transition cursor-pointer">
            <Settings size={18} /><span>Manage</span>
          </button>
          <button className="flex items-center gap-[9px] text-[16px] text-[#393A3D] hover:text-[#2ca01c] transition cursor-pointer">
            <Tv size={18} /><span>Take tour</span>
          </button>
          <button className="flex items-center gap-[9px] text-[16px] text-[#393A3D] hover:text-[#2ca01c] transition cursor-pointer">
            <MessageSquare size={18} /><span>Feedback</span>
          </button>
        </div>
      </div>

      {/* ──── 3. MAIN CANVAS & PAPER CARD ──── */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-white">
        <div className="mx-[44px] mt-[30px] mb-[110px] relative bg-white border border-[#e3e5e8] shadow-[0_1px_4px_rgba(0,0,0,0.08)] rounded-[4px]">
          
          {/* Dog illustration mascot */}
          <div className="absolute right-[140px] top-[90px]">
            <DogArt />
          </div>

          {/* Card Header */}
          <div className="px-[46px] pt-[56px]">
            <div className="flex items-start justify-between">
              <h2 className="text-[26px] leading-[32px] font-bold text-[#0077c5] tracking-[1px] uppercase">
                INVOICE
              </h2>
              <p className="text-[15px] text-[#393A3D] mt-[2px]">
                Balance due (hidden): <b>₹0.00</b>
              </p>
            </div>
            <div className="mt-[22px] flex">
              <div className="w-[260px]">
                <p className="text-[15px] font-bold text-[#393A3D] leading-[23px]">Karan's Landscaping Services</p>
                <p className="text-[15px] text-[#6b6c72] leading-[23px]">42 Brigade Road, Indiranagar</p>
                <p className="text-[15px] text-[#6b6c72] leading-[23px]">Bengaluru, Karnataka 560038</p>
              </div>
              <p className="text-[15px] text-[#393A3D] leading-[23px]">noreply@meso.in</p>
            </div>
            <button className="inline-block mt-[36px] text-[15px] text-[#0077c5] hover:underline cursor-pointer">
              Edit company
            </button>
          </div>

          {/* ──── 4. LIGHT BLUE BAND ──── */}
          <div
            className="relative mt-[42px] bg-[#e2f0fa] transition-[height] duration-200"
            style={{ height: customer ? 350 + off : 204 }}
          >
            <CustomerPicker value={customer || ''} onSelect={selectCustomer} />
            


            {!customer && (
              <React.Fragment>
                <div className="absolute left-[491px] top-[100px] w-[115px] h-[7px] rounded-full bg-[#cfd4d9]" />
                <div className="absolute left-[491px] top-[122px] w-[40px] h-[7px] rounded-full bg-[#cfd4d9]" />
                <p className="absolute left-[636px] top-[97px] text-[15px] text-[#393A3D]">Terms</p>
                <p className="absolute left-[636px] top-[126px] text-[15px] text-[#393A3D]">Invoice date</p>
                <p className="absolute left-[636px] top-[155px] text-[15px] text-[#393A3D]">Due date</p>
                <div className="absolute left-[873px] top-[90px]"><CompactSelect val={terms} set={setTerms} opts={TERMS_OPTIONS} /></div>
                <div className="absolute left-[873px] top-[122px]"><DateField val="10/24/2025" /></div>
                <div className="absolute left-[873px] top-[151px]"><DateField val="11/23/2025" /></div>
              </React.Fragment>
            )}

            {customer && (
              <React.Fragment>
                {/* Email field with red validation chip */}
                <div className="absolute left-[44px] w-[437px]" style={{ top: 80 }}>
                  <div className="relative">
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-[27px] border border-[#8d9096] rounded-[3px] pl-[9px] pr-[44px] text-[15px] text-[#393A3D] outline-none bg-white focus:border-[#393A3D] transition-colors"
                    />
                    <span className="absolute right-[8px] top-1/2 -translate-y-1/2 w-[30px] h-[15px] bg-[#d0342c] rounded-[3px] flex items-center justify-center gap-[2px]">
                      <span className="w-[3px] h-[3px] rounded-full bg-white" />
                      <span className="w-[3px] h-[3px] rounded-full bg-white" />
                      <span className="w-[3px] h-[3px] rounded-full bg-white" />
                    </span>
                  </div>
                </div>

                {/* Cc/Bcc */}
                <button
                  onClick={() => setCcOpen((o) => !o)}
                  className="absolute left-[44px] text-[15px] text-[#0077c5] hover:underline cursor-pointer"
                  style={{ top: 124 }}
                >
                  Cc/Bcc
                </button>
                {ccOpen && (
                  <React.Fragment>
                    <input
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="Cc"
                      className="absolute left-[44px] w-[437px] h-[27px] border border-[#8d9096] rounded-[3px] px-[9px] text-[15px] text-[#393A3D] placeholder-[#9aa0a6] outline-none bg-white focus:border-[#393A3D]"
                      style={{ top: 148 }}
                    />
                    <input
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="Bcc"
                      className="absolute left-[44px] w-[437px] h-[27px] border border-[#8d9096] rounded-[3px] px-[9px] text-[15px] text-[#393A3D] placeholder-[#9aa0a6] outline-none bg-white focus:border-[#393A3D]"
                      style={{ top: 183 }}
                    />
                  </React.Fragment>
                )}

                {/* Bill to */}
                <p className="absolute left-[44px] text-[15px] font-bold text-[#393A3D]" style={{ top: 166 + off }}>
                  Bill to
                </p>
                <textarea
                  value={billTo}
                  onChange={(e) => setBillTo(e.target.value)}
                  className="absolute left-[44px] w-[569px] h-[97px] border border-[#8d9096] rounded-[3px] p-[10px] text-[15px] leading-[23px] text-[#393A3D] outline-none bg-white resize-none focus:ring-2 focus:ring-[#2ca01c] focus:border-0 transition-all overflow-y-auto"
                  style={{ top: 193 + off }}
                />
                <button
                  className="absolute left-[44px] text-[15px] text-[#0077c5] hover:underline cursor-pointer"
                  style={{ top: 303 + off }}
                >
                  Edit Customer
                </button>

                {/* Terms / Date block dropped down */}
                <p className="absolute left-[636px] text-[15px] text-[#393A3D]" style={{ top: 163 + off }}>Terms</p>
                <p className="absolute left-[636px] text-[15px] text-[#393A3D]" style={{ top: 192 + off }}>Invoice date</p>
                <p className="absolute left-[636px] text-[15px] text-[#393A3D]" style={{ top: 221 + off }}>Due date</p>
                <div className="absolute left-[873px]" style={{ top: 158 + off }}>
                  <CompactSelect val={terms} set={setTerms} opts={TERMS_OPTIONS} />
                </div>
                <div className="absolute left-[873px]" style={{ top: 187 + off }}>
                  <DateField val="10/24/2025" />
                </div>
                <div className="absolute left-[873px]" style={{ top: 216 + off }}>
                  <DateField val="11/23/2025" />
                </div>
              </React.Fragment>
            )}
          </div>

          {/* ──── 5. LINE ITEMS TABLE (9-Column layout) ──── */}
          <div className="px-[46px]">
            <h3 className="mt-[72px] text-[17px] font-bold text-[#393A3D]">Product or service</h3>
            <div className="mt-[24px]">
              {/* Header row */}
              <div className="grid border-b border-[#b9bdc2]" style={{ gridTemplateColumns: COLS }}>
                <div className="h-[40px] border-l border-[#e3e5e8]" />
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center justify-center"><span className={head}>#</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center pl-[9px]"><span className={head}>Product/service</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center pl-[7px]"><span className={head}>Description</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center justify-end pr-[15px]"><span className={head}>Qty</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center justify-end pr-[15px]"><span className={head}>Rate</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center justify-end pr-[15px]"><span className={head}>Amount</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8] flex items-center pl-[16px]"><span className={head}>Tax</span></div>
                <div className="h-[40px] border-l border-[#e3e5e8]" />
              </div>

              {/* Rows */}
              {rows.map((r, i) => (
                <div key={r.id} className="relative grid items-center h-[55px] border-b border-[#e8eaec]" style={{ gridTemplateColumns: COLS }}>
                  {i === 0 && (
                    <button
                      onClick={() => insertAbove(r.id)}
                      title="Insert line"
                      className="absolute -left-[30px] top-1/2 -translate-y-1/2 hover:opacity-70 active:scale-90 transition cursor-pointer"
                    >
                      <PlusCircleIcon />
                    </button>
                  )}
                  <div className="h-full flex items-center justify-center border-l border-[#e3e5e8]"><DragDots /></div>
                  <div className="h-full flex items-center justify-center border-l border-[#e3e5e8] text-[15px] text-[#393A3D]">{i + 1}</div>
                  <div className="h-full flex items-center border-l border-[#e3e5e8]">
                    <ProductPicker
                      row={r}
                      onChange={(patch) => setRow(r.id, patch)}
                      open={openPicker === r.id}
                      setOpen={(o) => setOpenPicker(o ? r.id : null)}
                    />
                  </div>
                  <div className="h-full flex items-center border-l border-[#e3e5e8]">
                    <input
                      value={r.desc}
                      onChange={(e) => setRow(r.id, { desc: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="h-full flex items-center border-l border-[#e3e5e8]">
                    <input
                      value={r.qty}
                      onChange={(e) => setRow(r.id, { qty: e.target.value })}
                      className={inputCls + " text-right"}
                    />
                  </div>
                  <div className="h-full flex items-center border-l border-[#e3e5e8]">
                    <input
                      value={r.rate}
                      onChange={(e) => setRow(r.id, { rate: e.target.value })}
                      className={inputCls + " text-right"}
                    />
                  </div>
                  <div className="h-full flex items-center border-l border-[#e3e5e8]">
                    <input
                      readOnly
                      value={money((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0))}
                      className={inputCls + " text-right cursor-default bg-gray-50/50"}
                    />
                  </div>
                  <div className="h-full flex items-center justify-center border-l border-[#e3e5e8]">
                    <input
                      type="checkbox"
                      checked={r.taxable}
                      onChange={() => setRow(r.id, { taxable: !r.taxable })}
                      className="w-4 h-4 rounded border-gray-300 accent-[#2ca01c] cursor-pointer"
                    />
                  </div>
                  <div className="h-full flex items-center justify-center border-l border-[#e3e5e8]">
                    <button
                      onClick={() => delRow(r.id)}
                      className="p-[4px] rounded hover:bg-[#eceef1] active:scale-90 transition cursor-pointer text-[#6b6c72] hover:text-[#393A3D]"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Table Buttons */}
            <div className="mt-[16px] ml-[17px] flex items-center">
              <div className="inline-flex h-[28px] rounded-[3px] overflow-hidden border border-[#8d9096] bg-[#e9ecef]">
                <button
                  onClick={addRow}
                  className="px-[12px] text-[15px] text-[#393A3D] hover:bg-[#dde0e4] active:scale-[0.98] transition cursor-pointer"
                >
                  Add product or service
                </button>
                <div className="w-px bg-[#b9bdc2]" />
                <button
                  onClick={addRow}
                  className="w-[30px] flex items-center justify-center text-[#393A3D] hover:bg-[#dde0e4] transition cursor-pointer"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <button
                onClick={clearAll}
                className="ml-[40px] h-[28px] px-[14px] rounded-[3px] bg-[#e9ecef] text-[15px] text-[#393A3D] hover:bg-[#dde0e4] active:scale-[0.98] transition cursor-pointer"
              >
                Clear all lines
              </button>
            </div>

            <div className="mt-[15px] border-t border-[#d9d9d9]" />
          </div>

          {/* ──── 6. PAYMENT OPTIONS + TOTALS ──── */}
          <div className="px-[46px] mt-[45px] flex items-start pb-8">
            {/* Left: Customer payment options */}
            <div className="w-[470px]">
              <div className="flex items-center gap-[18px]">
                <p className="text-[17px] font-bold text-[#393A3D]">Customer payment options</p>
                <button className="text-[15px] text-[#0077c5] hover:underline cursor-pointer">Edit</button>
              </div>
              
              <PaymentChips />

              <p className="mt-[12px] w-[400px] text-[15px] leading-[24px] text-[#393A3D]">
                Activate online card or bank transfer payments for your customers.{' '}
                <button className="text-[#0077c5] hover:underline cursor-pointer">Activate payments</button>
              </p>

              <textarea
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                placeholder="Tell your customer how you want to get paid."
                className="mt-[14px] w-[469px] h-[96px] border border-[#b9bdc2] rounded-[3px] p-[12px] text-[15px] text-[#393A3D] placeholder-[#6b6c72] outline-none resize-none focus:border-[#393A3D] transition-colors"
              />

              <p className="mt-[26px] text-[16px] font-medium text-[#393A3D]">Note to customer</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-[10px] w-[469px] h-[96px] border border-[#b9bdc2] rounded-[3px] p-[12px] text-[15px] text-[#393A3D] outline-none resize-none focus:border-[#393A3D] transition-colors"
              />
            </div>

            {/* Right: Totals summary */}
            <div className="ml-auto w-[427px] text-[15px] text-[#393A3D]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>

              {/* Discount row */}
              <div className="mt-[24px] flex items-center">
                <button
                  onClick={() => setDiscount(0)}
                  title="Reset discount"
                  className="mr-[16px] hover:opacity-70 active:scale-90 transition cursor-pointer"
                >
                  <RevertIcon />
                </button>
                <span>Discount</span>
                <input
                  value={(discount || 0) + (discMode === '%' ? '%' : '')}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value.replace(/[^0-9.]/g, ''));
                    setDiscount(isNaN(n) ? 0 : n);
                  }}
                  className="ml-[12px] w-[48px] text-[15px] text-[#393A3D] outline-none bg-transparent"
                />
                <div className="ml-auto mr-[14px] w-[70px] h-[26px] rounded-full bg-[#e3e5e8] p-[2px] flex cursor-pointer select-none">
                  <button
                    onClick={() => setDiscMode('%')}
                    className={`flex-1 rounded-full text-[13px] font-semibold transition cursor-pointer ${discMode === '%' ? 'bg-white text-[#393A3D] shadow-xs' : 'text-[#6b6c72]'}`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscMode('₹')}
                    className={`flex-1 rounded-full text-[13px] font-semibold transition cursor-pointer ${discMode === '₹' ? 'bg-white text-[#393A3D] shadow-xs' : 'text-[#6b6c72]'}`}
                  >
                    ₹
                  </button>
                </div>
                <span className="w-[60px] text-right">₹{discountVal.toFixed(2)}</span>
              </div>

              <div className="mt-[24px] flex justify-between">
                <span>Taxable subtotal</span>
                <span>{money(taxableSubtotal)}</span>
              </div>

              <p className="mt-[26px]">Select sales tax rate</p>
              <div className="mt-[8px]">
                <CompactSelect val={taxRate} set={setTaxRate} opts={TAX_RATES} w={427} />
              </div>

              <div className="mt-[22px] flex justify-between items-center">
                <span className="flex items-center gap-[8px]">Sales tax <InfoQIcon /></span>
                <span>{money(salesTax)}</span>
              </div>

              <div className="mt-[14px] text-right">
                <button className="text-[#0077c5] hover:underline cursor-pointer">See the math</button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ──── 7. FIXED BOTTOM ACTION BAR (Height 64px) ──── */}
      <footer className="fixed bottom-0 left-0 right-0 h-[64px] bg-white flex items-center pr-[24px] shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-40 border-t border-[#e3e5e8]">
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => window.print()}
            className="text-[16px] font-semibold text-[#0077c5] hover:underline active:opacity-70 transition cursor-pointer"
          >
            Print or download
          </button>
        </div>
        <div className="flex items-center gap-[13px]">
          {/* Save split button */}
          <div className="flex h-[40px] rounded-[4px] overflow-hidden border border-[#8d9096] bg-white">
            <button
              onClick={() => handleSaveInvoice(false)}
              disabled={isSaving}
              className="px-[20px] text-[16px] font-semibold text-[#393A3D] hover:bg-[#f4f5f8] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <div className="w-px bg-[#c9cdd2]" />
            <button
              onClick={() => handleSaveInvoice(false)}
              className="w-[36px] flex items-center justify-center text-[#393A3D] hover:bg-[#f4f5f8] transition cursor-pointer"
            >
              <ChevronDown size={15} />
            </button>
          </div>

          {/* Review and send split button */}
          <div className="flex h-[40px] rounded-[4px] overflow-hidden bg-[#2ca01c]">
            <button
              onClick={() => handleSaveInvoice(true)}
              disabled={isSaving}
              className="px-[18px] text-[16px] font-semibold text-white hover:bg-[#25900f] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Review and send'}
            </button>
            <div className="w-px bg-[#1e7a14]" />
            <button
              onClick={() => handleSaveInvoice(true)}
              className="w-[36px] flex items-center justify-center text-white hover:bg-[#25900f] transition cursor-pointer"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
