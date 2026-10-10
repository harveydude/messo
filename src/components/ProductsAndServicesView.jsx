import React, { useState, useMemo } from 'react';
import { Filter, Printer, Settings, ChevronDown, ChevronUp, Check, Image as ImageIcon, X, FileSpreadsheet } from 'lucide-react';

// Products and Services catalog matching Screenshot 1 & 2
const initialItems = [
  {
    category: 'Design',
    items: [
      {
        id: 'prod-1',
        name: 'Design',
        sku: '',
        type: 'Service',
        description: 'Custom Design',
        price: 75,
        cost: null,
        taxable: false,
        qtyOnHand: null,
        reorderPoint: null,
      }
    ]
  },
  {
    category: 'Fountains',
    items: [
      {
        id: 'prod-2',
        name: 'Concrete',
        sku: '',
        type: 'Service',
        description: 'Concrete for fo...',
        price: 0,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-3',
        name: 'Pump',
        sku: 'P461-17',
        type: 'Inventory',
        description: 'Fountain Pump',
        price: 15,
        cost: 10,
        taxable: true,
        qtyOnHand: 25,
        reorderPoint: null,
      },
      {
        id: 'prod-4',
        name: 'Rock Fountain',
        sku: 'R154-88',
        type: 'Inventory',
        description: 'Rock Fountain',
        price: 275,
        cost: 125,
        taxable: true,
        qtyOnHand: 2,
        reorderPoint: null,
      },
      {
        id: 'prod-5',
        name: 'Lighting',
        sku: '',
        type: 'Service',
        description: 'Garden Lighting',
        price: 0,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-6',
        name: 'Sprinkler Pipes',
        sku: 'SP-102',
        type: 'Inventory',
        description: 'Sprinkler Pipes 1-inch',
        price: 45,
        cost: 20,
        taxable: true,
        qtyOnHand: 18,
        reorderPoint: null,
      },
      {
        id: 'prod-7',
        name: 'Sprinkler Heads',
        sku: 'SH-004',
        type: 'Inventory',
        description: 'Pop-up Sprinkler Heads',
        price: 12,
        cost: 5,
        taxable: true,
        qtyOnHand: 34,
        reorderPoint: null,
      },
      {
        id: 'prod-8',
        name: 'Pest Control',
        sku: '',
        type: 'Service',
        description: 'Eco-friendly pest control',
        price: 110,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-9',
        name: 'Lawn Care',
        sku: '',
        type: 'Service',
        description: 'Lawn Mowing & Edging',
        price: 60,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-10',
        name: 'Soil Prep',
        sku: '',
        type: 'Service',
        description: 'Soil preparation & fertilizing',
        price: 95,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-11',
        name: 'Installation',
        sku: '',
        type: 'Service',
        description: 'Landscape installation labor',
        price: 150,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-12',
        name: 'Bark Mulch',
        sku: 'BM-400',
        type: 'Inventory',
        description: 'Premium Red Bark Mulch',
        price: 35,
        cost: 15,
        taxable: true,
        qtyOnHand: 40,
        reorderPoint: null,
      },
      {
        id: 'prod-13',
        name: 'Sod',
        sku: 'SD-881',
        type: 'Inventory',
        description: 'Fresh Kentucky Bluegrass Sod',
        price: 50,
        cost: 22,
        taxable: true,
        qtyOnHand: 50,
        reorderPoint: null,
      },
      {
        id: 'prod-14',
        name: 'Plants',
        sku: 'PL-220',
        type: 'Inventory',
        description: 'Assorted perennial shrubs',
        price: 28,
        cost: 12,
        taxable: true,
        qtyOnHand: 15,
        reorderPoint: null,
      },
      {
        id: 'prod-15',
        name: 'Pavers',
        sku: 'PV-901',
        type: 'Inventory',
        description: 'Stone patio pavers',
        price: 85,
        cost: 40,
        taxable: true,
        qtyOnHand: 100,
        reorderPoint: null,
      },
      {
        id: 'prod-16',
        name: 'Trimming',
        sku: '',
        type: 'Service',
        description: 'Tree and hedge trimming',
        price: 80,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-17',
        name: 'Maintenance',
        sku: '',
        type: 'Service',
        description: 'Monthly grounds maintenance',
        price: 200,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      },
      {
        id: 'prod-18',
        name: 'Gardening Consultation',
        sku: '',
        type: 'Service',
        description: 'Horticulture advisory session',
        price: 120,
        cost: null,
        taxable: true,
        qtyOnHand: null,
        reorderPoint: null,
      }
    ]
  }
];

export default function ProductsAndServicesView({ onNavigate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bannerCollapsed, setBannerCollapsed] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);


  // Flattened items for count and filtering
  const allFlattened = useMemo(() => {
    return initialItems.flatMap(group => group.items);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return initialItems;
    const lower = searchTerm.toLowerCase();
    return initialItems.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.name.toLowerCase().includes(lower) ||
        (item.sku && item.sku.toLowerCase().includes(lower)) ||
        (item.description && item.description.toLowerCase().includes(lower)) ||
        item.type.toLowerCase().includes(lower)
      )
    })).filter(group => group.items.length > 0);
  }, [searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.size === allFlattened.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFlattened.map(i => i.id)));
    }
  };

  const toggleSelectItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-white select-none overflow-y-auto">
      {/* Page Content Container */}
      <div className="px-8 py-5 max-w-[1720px] w-full mx-auto">
        
        {/* Header row: Title + Actions */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-[#393A3D] leading-tight">
              Products and Services
            </h1>
            <button 
              onClick={() => onNavigate && onNavigate('all_lists')}
              className="text-[14px] text-[#0077C5] hover:underline flex items-center font-medium mt-1 cursor-pointer"
            >
              &lt; All Lists
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center space-x-3 relative">
            {/* More dropdown button */}
            <div className="relative">
              <button 
                onClick={() => setMoreMenuOpen(prev => !prev)}
                className="h-[38px] px-4 rounded-[4px] border border-[#8D9096] bg-white text-[14px] font-semibold text-[#393A3D] hover:bg-[#F4F5F8] flex items-center space-x-2 transition cursor-pointer"
              >
                <span>More</span>
                <ChevronDown size={14} className="text-[#393A3D]" />
              </button>

              {moreMenuOpen && (
                <div className="absolute right-0 top-[42px] w-[180px] bg-white rounded shadow-lg border border-[#E3E5E8] z-30 py-1 text-[14px] text-[#393A3D]">
                  <button 
                    onClick={() => setMoreMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Run report
                  </button>
                  <button 
                    onClick={() => setMoreMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Import
                  </button>
                  <button 
                    onClick={() => setMoreMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Export to Excel
                  </button>
                </div>
              )}
            </div>

            {/* New split button */}
            <div className="flex items-center relative">
              <button 
                onClick={() => setNewMenuOpen(prev => !prev)}
                className="h-[38px] px-6 rounded-l-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[14px] font-semibold transition cursor-pointer"
              >
                New
              </button>
              <div className="w-[1px] h-[38px] bg-[#248817]" />
              <button 
                onClick={() => setNewMenuOpen(prev => !prev)}
                className="h-[38px] px-2.5 rounded-r-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white transition flex items-center justify-center cursor-pointer"
              >
                <ChevronDown size={16} />
              </button>

              {newMenuOpen && (
                <div className="absolute right-0 top-[42px] w-[200px] bg-white rounded shadow-lg border border-[#E3E5E8] z-30 py-1 text-[14px] text-[#393A3D]">
                  <button 
                    onClick={() => setNewMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Inventory
                  </button>
                  <button 
                    onClick={() => setNewMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Non-inventory
                  </button>
                  <button 
                    onClick={() => setNewMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Service
                  </button>
                  <button 
                    onClick={() => setNewMenuOpen(false)}
                    className="w-full text-left px-4 py-2 hover:bg-[#F4F5F8]"
                  >
                    Bundle
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat Summary Banner (Screenshot 1 & 2) */}
        {!bannerCollapsed ? (
          <div className="mt-5 mb-5 rounded-[8px] border border-[#D4D7DC] bg-white p-6 relative flex items-center justify-between shadow-xs">
            <div className="flex items-center justify-around flex-1 px-12">
              
              {/* Left Stat: LOW STOCK */}
              <div className="flex items-center space-x-6 cursor-pointer group">
                {/* 130px Orange Circle with Package Box & Down Arrow */}
                <div className="w-[124px] h-[124px] rounded-full border-[3px] border-[#F47B16] bg-[#F47B16] flex items-center justify-center relative shadow-sm group-hover:scale-[1.02] transition-transform">
                  {/* Isometric box illustration in pure white */}
                  <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Top polygon */}
                    <polygon points="34,14 54,24 34,34 14,24" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Left polygon */}
                    <polygon points="14,24 34,34 34,56 14,46" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Right polygon */}
                    <polygon points="34,34 54,24 54,46 34,56" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Center tape line */}
                    <line x1="34" y1="24" x2="34" y2="34" stroke="white" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  {/* Circle badge at bottom-left with downward arrow */}
                  <div className="absolute -bottom-1 -left-1 w-[34px] h-[34px] rounded-full bg-white border-2 border-[#F47B16] flex items-center justify-center text-[#F47B16]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <polyline points="19 12 12 19 5 12" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[44px] font-bold text-[#F47B16] leading-none">
                    0
                  </span>
                  <span className="text-[14px] font-bold text-[#6B6C72] uppercase tracking-[0.06em] mt-1.5">
                    LOW STOCK
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="w-[1px] h-[84px] bg-[#E3E5E8] mx-8" />

              {/* Right Stat: OUT OF STOCK */}
              <div className="flex items-center space-x-6 cursor-pointer group">
                {/* 130px Red Circle with Package Box & No-Entry Badge */}
                <div className="w-[124px] h-[124px] rounded-full border-[3px] border-[#D0342C] bg-[#D0342C] flex items-center justify-center relative shadow-sm group-hover:scale-[1.02] transition-transform">
                  {/* Isometric box illustration in pure white */}
                  <svg width="68" height="68" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Top polygon */}
                    <polygon points="34,14 54,24 34,34 14,24" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Left polygon */}
                    <polygon points="14,24 34,34 34,56 14,46" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Right polygon */}
                    <polygon points="34,34 54,24 54,46 34,56" stroke="white" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
                    {/* Center tape line */}
                    <line x1="34" y1="24" x2="34" y2="34" stroke="white" strokeWidth="2" strokeDasharray="3 2" />
                  </svg>
                  {/* Circle badge at bottom-left with prohibition icon */}
                  <div className="absolute -bottom-1 -left-1 w-[34px] h-[34px] rounded-full bg-white border-2 border-[#D0342C] flex items-center justify-center text-[#D0342C]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                    </svg>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[44px] font-bold text-[#D0342C] leading-none">
                    0
                  </span>
                  <span className="text-[14px] font-bold text-[#6B6C72] uppercase tracking-[0.06em] mt-1.5">
                    OUT OF STOCK
                  </span>
                </div>
              </div>

            </div>

            {/* Collapse Chevron button at right */}
            <button 
              onClick={() => setBannerCollapsed(true)}
              className="w-[32px] h-[32px] rounded border border-[#E3E5E8] flex items-center justify-center text-[#6B6C72] hover:text-[#393A3D] hover:bg-[#F4F5F8] transition cursor-pointer ml-auto"
              title="Collapse summary banner"
            >
              <ChevronUp size={18} />
            </button>
          </div>
        ) : (
          <div className="mt-3 mb-4 flex justify-end">
            <button 
              onClick={() => setBannerCollapsed(false)}
              className="text-[13px] text-[#0077C5] hover:underline flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Show summary cards</span>
              <ChevronDown size={14} />
            </button>
          </div>
        )}

        {/* Toolbar: Search input + Funnel + Action Icons + Pagination */}
        <div className="flex items-center justify-between mt-4 mb-2">
          {/* Left search & filter */}
          <div className="flex items-center space-x-2">
            <div className="relative w-[230px]">
              <input 
                type="text"
                placeholder="Find products and services"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[32px] pl-3 pr-7 border border-[#C9CDD2] rounded-[4px] text-[13px] italic placeholder:italic text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5]"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-[#6B6C72] hover:text-[#393A3D]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter funnel icon with blue dot */}
            <button className="w-[32px] h-[32px] flex items-center justify-center text-[#0077C5] hover:bg-[#F4F5F8] rounded transition cursor-pointer relative" title="Filter products">
              <Filter size={18} />
              <span className="absolute bottom-1 right-1 w-[5px] h-[5px] bg-[#0077C5] rounded-full" />
            </button>
          </div>

          {/* Right: Print, Export, Gear Icons & Pagination */}
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-3 text-[#9AA0A6]">
              <button className="hover:text-[#393A3D] transition p-1 cursor-pointer" title="Print list">
                <Printer size={18} />
              </button>
              <button className="hover:text-[#393A3D] transition p-1 cursor-pointer" title="Export to Excel">
                <FileSpreadsheet size={18} />
              </button>
              <button className="hover:text-[#393A3D] transition p-1 cursor-pointer" title="Table settings">
                <Settings size={18} />
              </button>
            </div>

            {/* Pagination indicator: Previous 1-18 Next */}
            <div className="text-[12px] text-[#9AA0A6] flex items-center space-x-1.5 pt-0.5">
              <span>Previous</span>
              <span className="text-[#393A3D] font-medium">1-18</span>
              <span>Next</span>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="border border-[#D4D7DC] rounded-[4px] overflow-hidden bg-white mt-1 shadow-xs">
          <table className="w-full border-collapse text-left text-[14px]">
            {/* Table Header */}
            <thead>
              <tr className="h-[42px] border-b border-[#D4D7DC] text-[13px] font-semibold text-[#393A3D]">
                {/* Checkbox */}
                <th className="w-[44px] pl-3.5 pr-1 font-normal">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === allFlattened.length && allFlattened.length > 0}
                    onChange={toggleSelectAll}
                    className="w-[16px] h-[16px] rounded border-[#8D9096] text-[#2CA01C] focus:ring-0 cursor-pointer"
                  />
                </th>

                {/* NAME cell with active sort gray background and solid black triangle */}
                <th className="w-[260px] px-3 bg-[#ECEEF1] border-r border-[#E3E5E8] cursor-pointer">
                  <div className="flex items-center space-x-1.5">
                    <span className="uppercase text-[12px] tracking-wider">NAME</span>
                    <span className="text-[10px] leading-none">&#9650;</span>
                  </div>
                </th>

                <th className="w-[120px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  SKU
                </th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  TYPE
                </th>
                <th className="w-[200px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">
                  SALES DESCRIPTIO
                </th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">
                  SALES PRICE
                </th>
                <th className="w-[90px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">
                  COST
                </th>
                <th className="w-[80px] px-3 uppercase text-[12px] tracking-wider text-center border-r border-[#E3E5E8]">
                  TAXABLE
                </th>
                <th className="w-[110px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">
                  QTY ON HAND
                </th>
                <th className="w-[120px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">
                  REORDER POINT
                </th>
                <th className="w-[100px] px-3 uppercase text-[12px] tracking-wider text-right pr-4">
                  ACTION
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {filteredGroups.map((group) => (
                <React.Fragment key={group.category}>
                  {/* Category Section Header Row */}
                  <tr className="h-[31px] bg-[#F7F8FA] border-b border-[#E3E5E8]">
                    <td colSpan={11} className="pl-[52px] py-1 text-[13px] font-bold text-[#393A3D]">
                      {group.category}
                    </td>
                  </tr>

                  {/* Items in this Category */}
                  {group.items.map((item) => {
                    const isSelected = selectedIds.has(item.id);

                    return (
                      <tr 
                        key={item.id} 
                        className={`h-[83px] border-b border-[#E3E5E8] hover:bg-[#F9FAFB] transition ${
                          isSelected ? 'bg-[#F0FAF0]' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="pl-3.5 pr-1">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.id)}
                            className="w-[16px] h-[16px] rounded border-[#8D9096] text-[#2CA01C] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Thumbnail + Name */}
                        <td className="px-3 border-r border-[#E3E5E8]">
                          <div className="flex items-center space-x-3">
                            {/* 52x52px image placeholder box */}
                            <div className="w-[52px] h-[52px] rounded-[4px] border border-[#D4D7DC] bg-[#FAFBFB] flex items-center justify-center shrink-0">
                              <ImageIcon size={26} className="text-[#B0B4B9]" strokeWidth={1.5} />
                            </div>
                            <span className="font-medium text-[#393A3D] text-[14px]">
                              {item.name}
                            </span>
                          </div>
                        </td>

                        {/* SKU */}
                        <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.sku || ''}
                        </td>

                        {/* TYPE */}
                        <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.type}
                        </td>

                        {/* SALES DESCRIPTIO */}
                        <td className="px-3 text-[#393A3D] truncate max-w-[200px] border-r border-[#E3E5E8]">
                          {item.description}
                        </td>

                        {/* SALES PRICE */}
                        <td className="px-3 text-right text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.price !== null ? item.price : ''}
                        </td>

                        {/* COST */}
                        <td className="px-3 text-right text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.cost !== null ? item.cost : ''}
                        </td>

                        {/* TAXABLE (Green Checkmark) */}
                        <td className="px-3 text-center border-r border-[#E3E5E8]">
                          {item.taxable && (
                            <div className="flex items-center justify-center text-[#217A2B]">
                              <Check size={18} strokeWidth={2.5} />
                            </div>
                          )}
                        </td>

                        {/* QTY ON HAND */}
                        <td className="px-3 text-right text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.qtyOnHand !== null ? item.qtyOnHand : ''}
                        </td>

                        {/* REORDER POINT */}
                        <td className="px-3 text-right text-[#393A3D] border-r border-[#E3E5E8]">
                          {item.reorderPoint !== null ? item.reorderPoint : ''}
                        </td>

                        {/* ACTION (Edit dropdown) */}
                        <td className="px-3 text-right pr-4 relative">
                          <div className="inline-flex items-center space-x-1">
                            <button 
                              onClick={() => alert(`Editing ${item.name}`)}
                              className="text-[14px] font-semibold text-[#0077C5] hover:underline cursor-pointer"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                              className="text-[#0077C5] hover:text-[#005B94] p-0.5 cursor-pointer"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>

                          {/* Action context dropdown */}
                          {actionMenuId === item.id && (
                            <div className="absolute right-4 top-[50px] w-[140px] bg-white rounded shadow-lg border border-[#E3E5E8] z-20 py-1 text-[13px] text-left text-[#393A3D]">
                              <button 
                                onClick={() => {
                                  alert(`Made ${item.name} inactive`);
                                  setActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                              >
                                Make inactive
                              </button>
                              <button 
                                onClick={() => {
                                  alert(`Duplicated ${item.name}`);
                                  setActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                              >
                                Duplicate
                              </button>
                              <button 
                                onClick={() => {
                                  alert(`Running report for ${item.name}`);
                                  setActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 hover:bg-[#F4F5F8] text-left"
                              >
                                Run report
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
