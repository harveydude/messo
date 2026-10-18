import React, { useState, useRef, useEffect } from 'react';
import { X, Search, RotateCcw, Check, GripVertical, Trash2, Plus } from 'lucide-react';

const DEFAULT_BOOKMARK_PAGES = [
  { id: 'bank_transactions', name: 'Accounting', enabled: true },
  { id: 'expense_transactions', name: 'Expenses & Bills', enabled: true },
  { id: 'sales_transactions', name: 'Sales & Get Paid', enabled: true },
  { id: 'invoices', name: 'Invoices', enabled: false },
  { id: 'vendors', name: 'Vendors', enabled: false },
  { id: 'customers_list', name: 'Customers', enabled: false },
  { id: 'bills', name: 'Bills', enabled: false },
  { id: 'dashboard', name: 'Dashboard', enabled: false },
  { id: 'feed', name: 'Feed', enabled: false },
  { id: 'standard_reports', name: 'Standard reports', enabled: false },
  { id: 'custom_reports', name: 'Custom reports', enabled: false },
  { id: 'management_reports', name: 'Management reports', enabled: false },
  { id: 'financial_planning', name: 'Cash flow planner', enabled: false },
  { id: 'budgets', name: 'Budgets', enabled: false },
  { id: 'integration_transactions', name: 'Integration transactions', enabled: false }
];

export default function CustomizeBookmarksModal({ isOpen, onClose, onSave }) {
  const [search, setSearch] = useState('');
  const [newBookmarkText, setNewBookmarkText] = useState('');
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('meso_custom_bookmarks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BOOKMARK_PAGES;
  });

  const [initialBaseline, setInitialBaseline] = useState(() => {
    try {
      const saved = localStorage.getItem('meso_custom_bookmarks');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_BOOKMARK_PAGES;
  });

  const dragItemIndex = useRef(null);
  const dragOverItemIndex = useRef(null);

  if (!isOpen) return null;

  const filteredItems = items.filter(it => 
    it.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handleToggle = (id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, enabled: !it.enabled } : it));
  };

  const handleAddCustomBookmark = (e) => {
    e?.preventDefault();
    const text = newBookmarkText.trim();
    if (!text) return;
    const newEntry = { id: 'custom_' + Date.now(), name: text, enabled: true, custom: true };
    const updated = [newEntry, ...items];
    setItems(updated);
    setNewBookmarkText('');
    try {
      localStorage.setItem('meso_custom_bookmarks', JSON.stringify(updated));
    } catch (err) {}
  };

  const handleDeleteBookmark = (id) => {
    const updated = items.filter(it => it.id !== id);
    setItems(updated);
    try {
      localStorage.setItem('meso_custom_bookmarks', JSON.stringify(updated));
    } catch (err) {}
  };

  const handleDragStart = (idx) => {
    dragItemIndex.current = idx;
  };

  const handleDragEnter = (idx) => {
    dragOverItemIndex.current = idx;
  };

  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragOverItemIndex.current !== null) {
      const copy = [...items];
      const draggedItemContent = copy.splice(dragItemIndex.current, 1)[0];
      copy.splice(dragOverItemIndex.current, 0, draggedItemContent);
      setItems(copy);
    }
    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  const handleReset = () => {
    setItems([...initialBaseline]);
  };

  const handleSaveInternal = () => {
    try {
      localStorage.setItem('meso_custom_bookmarks', JSON.stringify(items));
    } catch (e) {}
    if (onSave) onSave(items);
    onClose?.();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[2px] flex items-start justify-center pt-[70px] pb-6 px-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-[620px] max-h-[820px] flex flex-col border border-gray-200 overflow-hidden text-[#393A3D] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top Right */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-md border border-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header & Content */}
        <div className="p-7 pb-4 flex flex-col flex-1 min-h-0">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Customize your bookmarks
          </h2>

          <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-[500px]">
            Select pages to bookmark, or type anything to create your own custom bookmark:
          </p>

          {/* Type Anything to Add a Bookmark */}
          <form onSubmit={handleAddCustomBookmark} className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Create a Bookmark
              </label>
              <span className="text-[11px] text-emerald-700">Type anything to add</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBookmarkText}
                onChange={(e) => setNewBookmarkText(e.target.value)}
                placeholder="Type anything (e.g. GST Filing, Monthly Payroll, Vendor Ledger)..."
                className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#2ca01c]"
              />
              <button
                type="submit"
                disabled={!newBookmarkText.trim()}
                className="px-4 py-1.5 bg-[#2ca01c] hover:bg-[#258717] disabled:opacity-50 text-white text-xs font-bold rounded-md transition cursor-pointer shrink-0 shadow-xs"
              >
                + Add Bookmark
              </button>
            </div>
          </form>

          {/* Search Box */}
          <div className="mt-3.5 w-full h-9 border border-gray-300 rounded-md flex items-center px-3 gap-2.5 focus-within:border-[#2ca01c] focus-within:ring-1 focus-within:ring-[#2ca01c] transition">
            <Search size={15} className="text-gray-500 shrink-0" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search existing pages to bookmark"
              className="flex-1 min-w-0 text-xs text-gray-900 placeholder:italic placeholder:text-gray-400 outline-none bg-transparent"
            />
          </div>

          {/* Reset button */}
          <button 
            onClick={handleReset}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-black cursor-pointer self-start"
          >
            <RotateCcw size={13} className="text-gray-500" />
            <span>Reset to last arrangement</span>
          </button>

          {/* Scrollable Checkbox List */}
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100 pr-2 border-t border-b border-gray-100 py-1">
            {filteredItems.map((item, idx) => {
              const realIndex = items.findIndex(it => it.id === item.id);
              return (
                <div 
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(realIndex)}
                  onDragEnter={() => handleDragEnter(realIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center h-11 px-2 hover:bg-gray-50 rounded-lg transition cursor-grab active:cursor-grabbing select-none group"
                >
                  {/* Drag dots */}
                  <div className="w-5 flex items-center justify-center text-gray-400 group-hover:text-gray-600">
                    <GripVertical size={15} />
                  </div>

                  {/* Checkbox */}
                  <label className="flex items-center gap-3 ml-1.5 cursor-pointer flex-1 min-w-0">
                    <input 
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded text-[#2ca01c] border-gray-300 focus:ring-[#2ca01c]"
                    />
                    <span className="text-xs font-medium text-gray-900 truncate">{item.name}</span>
                    {item.custom && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded ml-1 shrink-0">
                        Custom
                      </span>
                    )}
                  </label>

                  {item.custom && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBookmark(item.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition cursor-pointer"
                      title="Delete bookmark"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400 italic">
                No pages match "{search}"
              </div>
            )}
          </div>

          {/* Modal Footer: Cancel / Save */}
          <div className="mt-5 flex items-center justify-end gap-3 pt-1">
            <button 
              onClick={onClose}
              className="px-5 py-2 border-2 border-[#2ca01c] rounded-md text-sm font-semibold text-[#2ca01c] bg-white hover:bg-green-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveInternal}
              className="px-6 py-2 bg-[#2ca01c] hover:bg-[#258717] rounded-md text-sm font-bold text-white transition shadow-xs cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
