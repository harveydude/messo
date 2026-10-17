import React, { useState } from 'react';
import { X, GripVertical, Pin } from 'lucide-react';

export default function CustomizeAppMenusModal({ isOpen = true, onClose, onSave, isEmbedded = false }) {
  if (!isOpen && !isEmbedded) return null;

  const defaultApps = [
    { id: 'accounting', name: 'Accounting', iconBg: '#107c41', iconLetter: 'A', pinned: true },
    { id: 'expenses', name: 'Expenses & Pay Bills', iconBg: '#00897b', iconLetter: 'E', pinned: true },
    { id: 'sales', name: 'Sales & Get Paid', iconBg: '#0077c5', iconLetter: 'S', pinned: true },
    { id: 'customer_hub', name: 'Customer Hub', iconBg: '#009688', iconLetter: 'C', pinned: false },
    { id: 'team', name: 'Team', iconBg: '#1976d2', iconLetter: 'T', pinned: false },
    { id: 'time', name: 'Time', iconBg: '#006064', iconLetter: 'T', pinned: false },
    { id: 'sales_tax', name: 'Sales Tax', iconBg: '#d81b60', iconLetter: '%', pinned: false },
    { id: 'business_tax', name: 'Business Tax', iconBg: '#4a148c', iconLetter: 'B', pinned: false },
    { id: 'lending', name: 'Lending', iconBg: '#2e7d32', iconLetter: '₹', pinned: false },
  ];

  const [apps, setApps] = useState(defaultApps);

  const togglePin = (id) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, pinned: !a.pinned } : a));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const next = [...apps];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    setApps(next);
  };

  const moveDown = (index) => {
    if (index === apps.length - 1) return;
    const next = [...apps];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    setApps(next);
  };

  const handleReset = () => {
    setApps(defaultApps);
  };

  const handleSave = () => {
    onSave?.(apps);
    if (onClose) onClose();
  };

  const content = (
    <div className={`w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${isEmbedded ? 'border border-gray-300' : ''}`}>
      {/* Header */}
      <div className="p-6 pb-2 relative">
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute right-5 top-5 text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
          >
            <X size={18} />
          </button>
        )}
          <h2 className="text-xl font-bold text-gray-900">Customize your app menus</h2>
          <p className="text-xs text-gray-600 mt-1">
            Drag and drop to reorder apps, and pin your top apps for easy access.
          </p>
        </div>

        {/* List of Apps */}
        <div className="p-6 pt-3 space-y-2 max-h-[420px] overflow-y-auto">
          {apps.map((app, index) => (
            <div 
              key={app.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
            >
              <div className="flex items-center space-x-3">
                {/* Drag Handle */}
                <div className="flex flex-col space-y-0.5 text-gray-400 cursor-grab">
                  <GripVertical size={16} />
                </div>

                {/* Pin Toggle Button */}
                <button
                  type="button"
                  onClick={() => togglePin(app.id)}
                  title={app.pinned ? "Unpin app" : "Pin app"}
                  className="p-1 cursor-pointer text-gray-400 hover:text-gray-700"
                >
                  <Pin 
                    size={16} 
                    className={app.pinned ? "fill-[#2ca01c] text-[#2ca01c] rotate-45" : "text-gray-300 hover:text-gray-600"} 
                  />
                </button>

                {/* App Icon Badge */}
                <span 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shadow-xs shrink-0"
                  style={{ backgroundColor: app.iconBg }}
                >
                  {app.iconLetter}
                </span>

                <span className="text-xs font-semibold text-gray-800">
                  {app.name}
                </span>
              </div>

              {/* Up/Down order reordering arrows */}
              <div className="flex items-center space-x-1 text-gray-400">
                <button 
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="p-1 hover:text-gray-700 disabled:opacity-20 cursor-pointer text-xs"
                >
                  ▲
                </button>
                <button 
                  onClick={() => moveDown(index)}
                  disabled={index === apps.length - 1}
                  className="p-1 hover:text-gray-700 disabled:opacity-20 cursor-pointer text-xs"
                >
                  ▼
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Row */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-semibold text-[#0077c5] hover:underline cursor-pointer"
          >
            Reset to default
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-[#2ca01c] text-[#2ca01c] hover:bg-green-50 rounded text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-[#2ca01c] hover:bg-green-700 text-white rounded text-xs font-bold transition cursor-pointer shadow-xs"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );

  if (isEmbedded) {
    return (
      <div className="w-full flex justify-center py-6 px-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      {content}
    </div>
  );
}
