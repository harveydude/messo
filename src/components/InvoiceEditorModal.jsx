import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  RotateCcw, 
  HelpCircle, 
  Settings, 
  MessageSquare, 
  Calendar, 
  ChevronDown, 
  Plus, 
  Trash2, 
  GripVertical, 
  Sparkles, 
  Check, 
  ArrowLeft,
  Tv,
  Eye,
  FileCheck,
  CreditCard
} from 'lucide-react';

const INITIAL_CUSTOMERS = [
  { id: 'c1', name: "Amy's Bird Sanctuary", email: 'amy@birdsanctuary.com', address: '456 Falcon Way, San Pablo CA' },
  { id: 'c2', name: "Bill's Windsurf Shop", email: 'bill@windsurf.com', address: '12 Ocean Blvd, Half Moon Bay CA' },
  { id: 'c3', name: 'Cool Cars', email: 'service@coolcars.com', address: '789 Auto Mall Pkwy, Fremont CA' },
  { id: 'c4', name: 'Diego Rodriguez', email: 'diego@rodriguez.org', address: '101 Palm Ave, San Jose CA' },
  { id: 'c5', name: 'Dukes Basketball Camp', email: 'duke@hoopscamp.com', address: '88 Arena Way, Oakland CA' },
  { id: 'c6', name: 'Dylan Sollfrank', email: 'dylan@sollfrank.io', address: '320 Pine St, Berkeley CA' },
  { id: 'c7', name: 'Geeta Kalapatapu', email: 'geeta@kalapatapu.com', address: '55 Innovation Way, Sunnyvale CA' },
  { id: 'c8', name: 'Kate Whelan', email: 'kate@whelanlaw.com', address: '900 Court St, Martinez CA' },
  { id: 'c9', name: 'Mark Cho', email: 'mark@armorlux.com', address: '42 Boutique Row, San Francisco CA' },
  { id: 'c10', name: 'Red Rock Diner', email: 'accounts@redrockdiner.com', address: '66 Route 1, Pacifica CA' },
  { id: 'c11', name: 'Sooke Inlet Boat Tours', email: 'captain@sookeinlet.com', address: '7 Pier 3, Richmond CA' },
  { id: 'c12', name: 'Travis Waldron', email: 'travis@waldrondesign.com', address: '14 Studio Lane, Sausalito CA' },
  { id: 'c13', name: 'Weiskopf Consulting', email: 'paul@weiskopfconsulting.com', address: '200 Financial Plaza, San Francisco CA' }
];

export default function InvoiceEditorModal({ isOpen = true, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('Edit'); // 'Edit', 'Email view', 'Payor view', 'PDF view'
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(true); // Open by default matching screenshot!
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [terms, setTerms] = useState('Net 30');
  const [invoiceDate, setInvoiceDate] = useState('2025-10-24');
  const [dueDate, setDueDate] = useState('2025-11-23');

  // Line items state
  const [lines, setLines] = useState([
    { id: 1, product: '', description: '', qty: '', rate: '', amount: '', tax: false }
  ]);

  const dropdownRef = useRef(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredCustomers = INITIAL_CUSTOMERS.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const handleSelectCustomer = (c) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name);
    setCustomerDropdownOpen(false);
  };

  const handleLineChange = (id, field, value) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      if (field === 'qty' || field === 'rate') {
        const q = parseFloat(field === 'qty' ? value : l.qty) || 0;
        const r = parseFloat(field === 'rate' ? value : l.rate) || 0;
        updated.amount = q && r ? (q * r).toFixed(2) : '';
      }
      return updated;
    }));
  };

  const handleAddLine = () => {
    const nextId = lines.length ? Math.max(...lines.map(l => l.id)) + 1 : 1;
    setLines([...lines, { id: nextId, product: '', description: '', qty: '', rate: '', amount: '', tax: false }]);
  };

  const handleClearAllLines = () => {
    setLines([{ id: 1, product: '', description: '', qty: '', rate: '', amount: '', tax: false }]);
  };

  const handleDeleteLine = (id) => {
    if (lines.length === 1) {
      handleClearAllLines();
    } else {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const subtotal = lines.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const taxAmount = lines.reduce((acc, curr) => acc + (curr.tax ? (parseFloat(curr.amount) || 0) * 0.0825 : 0), 0);
  const totalAmount = subtotal + taxAmount;

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F5F8] flex flex-col overflow-y-auto select-none antialiased">
      
      {/* 1. TOP BAR (Height 74px, white, border-b #E3E5E8) */}
      <header className="h-[74px] bg-white border-b border-[#E3E5E8] px-8 flex items-center justify-between shrink-0 sticky top-0 z-40">
        {/* Left: Clock History Icon + "Invoice" Title */}
        <div className="flex items-center space-x-3.5">
          <button 
            title="Recent Invoices History"
            className="text-[#393A3D] hover:text-[#2CA01C] p-1.5 rounded transition cursor-pointer"
          >
            <RotateCcw size={20} strokeWidth={2.2} />
          </button>
          <h1 className="text-[20px] font-semibold text-[#393A3D]">
            Invoice
          </h1>
        </div>

        {/* Right: Help ? and Close X */}
        <div className="flex items-center space-x-5 text-[#6B6C72]">
          <button 
            title="Help & Support"
            className="w-8 h-8 rounded-full border border-[#D4D7DC] flex items-center justify-center hover:bg-gray-50 text-[#393A3D] transition cursor-pointer"
          >
            <span className="text-[15px] font-bold">?</span>
          </button>
          <button 
            onClick={onClose}
            title="Close Invoice (Esc)"
            className="text-[#393A3D] hover:text-black p-1.5 rounded transition cursor-pointer"
          >
            <X size={24} strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* 2. TAB ROW (Height 50px, white, border-b #D9D9D9) */}
      <div className="h-[50px] bg-white border-b border-[#D9D9D9] px-8 flex items-center justify-between shrink-0 sticky top-[74px] z-30">
        {/* Left Tabs */}
        <div className="flex items-center space-x-8 h-full">
          {['Edit', 'Email view', 'Payor view', 'PDF view'].map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`h-full flex items-center text-[15px] transition relative cursor-pointer ${
                  isActive ? 'font-semibold text-[#393A3D]' : 'font-normal text-[#6B6C72] hover:text-[#393A3D]'
                }`}
              >
                <span>{tab}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2CA01C] rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Actions: Manage, Take tour, Feedback */}
        <div className="flex items-center space-x-7 text-[14px] text-[#393A3D]">
          <button className="flex items-center space-x-2 hover:text-[#2CA01C] transition cursor-pointer">
            <Settings size={18} />
            <span>Manage</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-[#2CA01C] transition cursor-pointer">
            <Tv size={18} />
            <span>Take tour</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-[#2CA01C] transition cursor-pointer">
            <MessageSquare size={18} />
            <span>Feedback</span>
          </button>
        </div>
      </div>

      {/* Decorative Sparkle floating badge on far-left (y≈580px) */}
      <div className="fixed left-3 top-[560px] z-20 hidden 2xl:flex items-center justify-center w-8 h-8 rounded-full bg-white border border-[#E3E5E8] shadow-sm text-[#0077C5] cursor-pointer hover:shadow-md transition">
        <Sparkles size={16} />
      </div>

      {/* 3. MAIN CANVAS: White Invoice Paper Card */}
      <div className="flex-1 px-4 sm:px-8 py-6 w-full flex justify-center">
        <div className="w-full max-w-[1836px] bg-white border border-[#E3E5E8] rounded-[6px] shadow-sm p-8 sm:p-12 relative flex flex-col justify-between min-h-[920px]">
          
          <div>
            {/* Top Row: INVOICE header + Company block + Schnauzer dog illustration */}
            <div className="flex items-start justify-between pb-8">
              {/* Left Side: INVOICE + Company info */}
              <div className="space-y-4">
                <h2 className="text-[26px] font-bold text-[#0077C5] tracking-[0.03em] uppercase">
                  INVOICE
                </h2>

                <div className="flex flex-col sm:flex-row sm:items-start gap-8 text-[15px] text-[#393A3D] leading-relaxed">
                  <div>
                    <div className="font-bold text-[#393A3D]">Lawns &amp; Paws</div>
                    <div className="text-[#6B6C72]">123 Sierra Way</div>
                    <div className="text-[#6B6C72]">San Pablo CA 87999</div>
                    <button className="mt-2 text-[#0077C5] hover:underline text-[14px] font-medium block cursor-pointer">
                      Edit company
                    </button>
                  </div>
                  <div className="text-[#6B6C72] sm:pt-0">
                    <span>noreply@quickbooks.com</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Balance Due & Schnauzer Dog SVG */}
              <div className="flex flex-col items-end space-y-4">
                <div className="text-[15px] text-[#393A3D]">
                  <span className="text-[#6B6C72]">Balance due (hidden): </span>
                  <span className="font-bold text-[#393A3D]">$0.00</span>
                </div>

                {/* Pixel-perfect Schnauzer Dog SVG matching Screenshot 1 */}
                <div className="w-[105px] h-[105px] relative" title="Lawns & Paws Logo">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs">
                    {/* Dark charcoal floppy ears */}
                    <path d="M18 35 C10 20, 30 14, 38 25 C34 38, 25 45, 18 35 Z" fill="#3D4148" />
                    <path d="M82 35 C90 20, 70 14, 62 25 C66 38, 75 45, 82 35 Z" fill="#3D4148" />

                    {/* Head main contour - slate gray coat */}
                    <ellipse cx="50" cy="46" rx="30" ry="28" fill="#5A6069" />

                    {/* Lighter gray forehead bridge */}
                    <path d="M42 22 C46 20, 54 20, 58 22 C56 36, 44 36, 42 22 Z" fill="#78808C" />

                    {/* Bushy gray eyebrows */}
                    <path d="M30 38 C35 32, 45 34, 46 40 C41 40, 34 42, 30 38 Z" fill="#ABB1BA" />
                    <path d="M70 38 C65 32, 55 34, 54 40 C59 40, 66 42, 70 38 Z" fill="#ABB1BA" />

                    {/* Eyes under brows */}
                    <circle cx="39" cy="41" r="3.2" fill="#1C1E21" />
                    <circle cx="40" cy="40.2" r="1" fill="#FFFFFF" />
                    <circle cx="61" cy="41" r="3.2" fill="#1C1E21" />
                    <circle cx="62" cy="40.2" r="1" fill="#FFFFFF" />

                    {/* Schnauzer Long White/Light-Gray Beard & Moustache */}
                    <path d="M30 50 C26 65, 34 82, 50 84 C66 82, 74 65, 70 50 C62 55, 50 56, 30 50 Z" fill="#E8EBED" />
                    
                    {/* Beard texture lines */}
                    <path d="M40 56 L38 78" stroke="#D0D5DB" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M50 58 L50 82" stroke="#D0D5DB" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M60 56 L62 78" stroke="#D0D5DB" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Black Wet Nose */}
                    <ellipse cx="50" cy="51" rx="6.5" ry="4.5" fill="#1C1E21" />
                    <ellipse cx="51.5" cy="49.5" rx="2" ry="1.2" fill="#6A7079" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 4. LIGHT BLUE BAND (Screenshot 1: y≈400-604, bg #E2F0FA) */}
            <div className="bg-[#E2F0FA] rounded-[6px] p-6 sm:p-7 mb-8 relative border border-[#CDE5F7]/70">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                
                {/* Left: Customer Input + Shimmer Skeletons */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* Customer Picker with Composite Dropdown */}
                  <div className="relative w-[240px] sm:w-[280px]" ref={dropdownRef}>
                    <div className="flex h-[32px] rounded-[4px] border-2 border-[#2CA01C] bg-white overflow-hidden shadow-xs">
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setCustomerDropdownOpen(true);
                        }}
                        onFocus={() => setCustomerDropdownOpen(true)}
                        placeholder="Add customer"
                        className="flex-1 px-3 text-[14px] text-[#393A3D] placeholder-[#6B6C72] focus:outline-none"
                      />
                      <button
                        onClick={() => setCustomerDropdownOpen(prev => !prev)}
                        className="w-[36px] bg-white border-l border-gray-200 flex items-center justify-center text-[#393A3D] hover:bg-gray-50 cursor-pointer"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>

                    {/* Open Customer Dropdown (Screenshot 1: 444px wide, shadow) */}
                    {customerDropdownOpen && (
                      <div className="absolute left-0 top-[36px] w-[380px] sm:w-[444px] bg-white rounded-[6px] shadow-2xl border border-[#D4D7DC] z-50 overflow-hidden max-h-[340px] flex flex-col">
                        {/* + Add new row */}
                        <button
                          onClick={() => {
                            setCustomerSearch('New Customer (Walk-in)');
                            setCustomerDropdownOpen(false);
                          }}
                          className="h-[46px] px-4 border-b border-[#E8EAEC] flex items-center space-x-2 text-[14px] font-semibold text-[#0077C5] hover:bg-[#F4F5F8] transition cursor-pointer shrink-0 text-left"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                          <span>Add new</span>
                        </button>

                        {/* Customer List items */}
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                          {filteredCustomers.length === 0 ? (
                            <div className="p-4 text-center text-[13px] text-[#6B6C72]">
                              No customer found matching &quot;{customerSearch}&quot;
                            </div>
                          ) : (
                            filteredCustomers.map((cust) => (
                              <button
                                key={cust.id}
                                onClick={() => handleSelectCustomer(cust)}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#F4F5F8] transition cursor-pointer text-[14px]"
                              >
                                <span className="font-normal text-[#393A3D]">{cust.name}</span>
                                <span className="text-[13px] text-[#8D9096] italic">Customer</span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Two Shimmer Bars in screenshot at x≈535 (115×7px and 40×7px) */}
                  <div className="hidden sm:flex flex-col space-y-2 pt-2.5">
                    <div className="w-[115px] h-[7px] bg-[#CFD4D9] rounded-full animate-pulse" />
                    <div className="w-[40px] h-[7px] bg-[#CFD4D9] rounded-full animate-pulse" />
                  </div>
                </div>

                {/* Right: Terms, Invoice date, Due date */}
                <div className="flex flex-wrap items-center gap-6 text-[14px] text-[#393A3D]">
                  
                  {/* Terms */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[12px] font-normal text-[#6B6C72]">Terms</label>
                    <div className="relative">
                      <select
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="h-[28px] w-[115px] px-2.5 pr-7 bg-white border border-[#8D9096] rounded-[3px] text-[13px] text-[#393A3D] appearance-none focus:outline-none focus:border-[#2CA01C] cursor-pointer"
                      >
                        <option value="Net 30">Net 30</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Due on receipt">Due on receipt</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-2 text-[#393A3D] pointer-events-none" />
                    </div>
                  </div>

                  {/* Invoice Date */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[12px] font-normal text-[#6B6C72]">Invoice date</label>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="h-[28px] w-[145px] px-2 bg-white border border-[#8D9096] rounded-[3px] text-[13px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="flex flex-col space-y-1">
                    <label className="text-[12px] font-normal text-[#6B6C72]">Due date</label>
                    <div className="relative flex items-center">
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="h-[28px] w-[145px] px-2 bg-white border border-[#8D9096] rounded-[3px] text-[13px] text-[#393A3D] focus:outline-none focus:border-[#2CA01C]"
                      />
                    </div>
                  </div>

                </div>

              </div>
            </div>

            {/* 5. LINE ITEMS TABLE (6 Columns with vertical dividers) */}
            <div className="w-full border border-[#D9D9D9] rounded-[4px] overflow-hidden mb-5">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#F8F9FA] border-b border-[#D9D9D9] text-[12px] font-semibold text-[#6B6C72] uppercase">
                  <tr>
                    <th className="w-[40px] px-2 py-2.5 text-center border-r border-[#D9D9D9]"></th>
                    <th className="w-[32%] px-3.5 py-2.5 border-r border-[#D9D9D9]">Product/service</th>
                    <th className="w-[26%] px-3.5 py-2.5 border-r border-[#D9D9D9]">Description</th>
                    <th className="w-[10%] px-3.5 py-2.5 border-r border-[#D9D9D9]">Qty</th>
                    <th className="w-[12%] px-3.5 py-2.5 border-r border-[#D9D9D9]">Rate</th>
                    <th className="w-[14%] px-3.5 py-2.5 border-r border-[#D9D9D9]">Amount</th>
                    <th className="w-[6%] px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <span>Tax</span>
                        <input type="checkbox" className="accent-[#2CA01C]" readOnly />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D9D9]">
                  {lines.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/70 group h-[44px]">
                      {/* Drag Grip Handle */}
                      <td className="px-2 py-1 text-center border-r border-[#D9D9D9] text-[#8D9096]">
                        <GripVertical size={16} className="mx-auto cursor-grab" />
                      </td>

                      {/* Product/service */}
                      <td className="p-0 border-r border-[#D9D9D9]">
                        <input
                          type="text"
                          placeholder="Select a product or service"
                          value={row.product}
                          onChange={(e) => handleLineChange(row.id, 'product', e.target.value)}
                          className="w-full h-[42px] px-3.5 text-[14px] text-[#393A3D] focus:outline-none focus:bg-blue-50/20"
                        />
                      </td>

                      {/* Description */}
                      <td className="p-0 border-r border-[#D9D9D9]">
                        <input
                          type="text"
                          placeholder=""
                          value={row.description}
                          onChange={(e) => handleLineChange(row.id, 'description', e.target.value)}
                          className="w-full h-[42px] px-3.5 text-[14px] text-[#393A3D] focus:outline-none focus:bg-blue-50/20"
                        />
                      </td>

                      {/* Qty */}
                      <td className="p-0 border-r border-[#D9D9D9]">
                        <input
                          type="number"
                          placeholder="1"
                          value={row.qty}
                          onChange={(e) => handleLineChange(row.id, 'qty', e.target.value)}
                          className="w-full h-[42px] px-3.5 text-[14px] text-[#393A3D] focus:outline-none focus:bg-blue-50/20"
                        />
                      </td>

                      {/* Rate */}
                      <td className="p-0 border-r border-[#D9D9D9]">
                        <input
                          type="number"
                          placeholder="0.00"
                          value={row.rate}
                          onChange={(e) => handleLineChange(row.id, 'rate', e.target.value)}
                          className="w-full h-[42px] px-3.5 text-[14px] text-[#393A3D] focus:outline-none focus:bg-blue-50/20"
                        />
                      </td>

                      {/* Amount */}
                      <td className="p-0 border-r border-[#D9D9D9] bg-gray-50/30">
                        <div className="w-full h-[42px] px-3.5 flex items-center justify-between text-[14px] font-medium text-[#393A3D]">
                          <span>{row.amount ? `$${row.amount}` : '$0.00'}</span>
                          {lines.length > 1 && (
                            <button
                              onClick={() => handleDeleteLine(row.id)}
                              className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition p-1"
                              title="Delete row"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Tax Checkbox */}
                      <td className="px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={row.tax}
                          onChange={(e) => handleLineChange(row.id, 'tax', e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 accent-[#2CA01C] cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Line Table Buttons: Add product or service & Clear all lines */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="flex h-[28px] rounded-[3px] border border-[#C9CDD2] bg-[#E9ECEF] overflow-hidden text-[13px] font-semibold text-[#393A3D]">
                <button
                  onClick={handleAddLine}
                  className="px-3 hover:bg-gray-200 transition cursor-pointer"
                >
                  Add product or service
                </button>
                <div className="w-px bg-[#C9CDD2]" />
                <button
                  onClick={handleAddLine}
                  className="px-2 hover:bg-gray-200 transition cursor-pointer"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <button
                onClick={handleClearAllLines}
                className="h-[28px] px-3 rounded-[3px] border border-[#C9CDD2] bg-[#E9ECEF] hover:bg-gray-200 text-[13px] font-semibold text-[#393A3D] transition cursor-pointer"
              >
                Clear all lines
              </button>
            </div>

            <hr className="border-[#D9D9D9] mb-6" />

            {/* 6. BOTTOM ROW: Payment Badges + Subtotal */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6">
              
              {/* Left: Customer payment options + Edit + 5 Badges */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="text-[17px] font-bold text-[#393A3D]">
                    Customer payment options
                  </span>
                  <button className="text-[14px] text-[#0077C5] hover:underline font-medium cursor-pointer">
                    Edit
                  </button>
                </div>

                {/* 5 Payment Badges (Mastercard, VISA, AMEX, Discover, PayPal) */}
                <div className="flex items-center space-x-2 pt-1">
                  {/* Mastercard */}
                  <div className="h-[26px] px-2.5 rounded border border-gray-300 bg-white flex items-center space-x-1 shadow-2xs" title="Mastercard">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90 -mr-1.5" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] opacity-90" />
                  </div>

                  {/* VISA */}
                  <div className="h-[26px] px-2 rounded border border-gray-300 bg-white flex items-center justify-center shadow-2xs" title="Visa">
                    <span className="text-[12px] font-black italic tracking-tighter text-[#1A1F71]">VISA</span>
                  </div>

                  {/* AMEX */}
                  <div className="h-[26px] px-2 rounded border border-gray-300 bg-[#006FCF] text-white flex items-center justify-center shadow-2xs" title="American Express">
                    <span className="text-[10px] font-bold tracking-tight">AMEX</span>
                  </div>

                  {/* Discover */}
                  <div className="h-[26px] px-2 rounded border border-gray-300 bg-white flex items-center space-x-0.5 shadow-2xs" title="Discover">
                    <span className="text-[10px] font-bold text-gray-800">DISC</span>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#FF6000]" />
                  </div>

                  {/* PayPal */}
                  <div className="h-[26px] px-2 rounded border border-gray-300 bg-white flex items-center justify-center shadow-2xs" title="PayPal">
                    <span className="text-[11px] font-black italic text-[#003087]">Pay<span className="text-[#0079C1]">Pal</span></span>
                  </div>
                </div>
              </div>

              {/* Right: Subtotal + Total */}
              <div className="w-[280px] space-y-2.5 text-[15px] text-[#393A3D]">
                <div className="flex justify-between items-center">
                  <span className="font-normal text-[#6B6C72]">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between items-center text-[13px] text-[#6B6C72]">
                    <span>Sales Tax (8.25%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-[#D9D9D9] text-[18px] font-bold text-[#393A3D]">
                  <span>Total</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
              </div>

            </div>
          </div>

          {/* 7. BOTTOM ACTION FOOTER */}
          <div className="pt-6 border-t border-[#E3E5E8] flex flex-wrap items-center justify-between gap-4 mt-8">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-[4px] border border-[#8D9096] bg-white hover:bg-gray-50 text-[14px] font-semibold text-[#393A3D] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllLines}
                className="px-4 py-2 rounded-[4px] border border-[#8D9096] bg-white hover:bg-gray-50 text-[14px] font-semibold text-[#393A3D] transition cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 text-[14px] font-semibold text-[#0077C5] hover:underline cursor-pointer">
                Print or Preview
              </button>
              <button className="px-4 py-2 text-[14px] font-semibold text-[#0077C5] hover:underline cursor-pointer">
                Make recurring
              </button>

              {/* Primary Green Split Action Button */}
              <div className="flex h-[38px] rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white shadow-xs overflow-hidden transition cursor-pointer">
                <button
                  onClick={() => {
                    if (onSave) onSave({ customer: customerSearch, total: totalAmount });
                    onClose();
                  }}
                  className="px-6 text-[14px] font-semibold flex items-center cursor-pointer"
                >
                  Save and send
                </button>
                <div className="w-px bg-[#1E7A14]" />
                <button
                  onClick={() => {
                    if (onSave) onSave({ customer: customerSearch, total: totalAmount });
                    onClose();
                  }}
                  className="px-2.5 flex items-center justify-center hover:bg-[#1E7A14] transition cursor-pointer"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
