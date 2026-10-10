import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';

export default function DragAffordance({ onRemove }) {
  return (
    <div className="flex flex-col items-center pointer-events-auto select-none">
      {/* 100x100 Green Move Cluster */}
      <div className="w-[100px] h-[100px] bg-[#1B8A1B] rounded-[8px] grid grid-cols-3 grid-rows-3 place-items-center text-white shadow-lg">
        {/* Up arrow at top center (row 1, col 2) */}
        <div className="col-start-2 row-start-1">
          <ArrowUp size={24} strokeWidth={2.5} />
        </div>
        {/* Left arrow at mid left (row 2, col 1) */}
        <div className="col-start-1 row-start-2">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </div>
        {/* Center space empty */}
        <div className="col-start-2 row-start-2" />
        {/* Right arrow at mid right (row 2, col 3) */}
        <div className="col-start-3 row-start-2">
          <ArrowRight size={24} strokeWidth={2.5} />
        </div>
        {/* Down arrow at bottom center (row 3, col 2) */}
        <div className="col-start-2 row-start-3">
          <ArrowDown size={24} strokeWidth={2.5} />
        </div>
      </div>

      {/* 44x44 Green Remove Trash Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove?.();
        }}
        className="w-[44px] h-[44px] mt-[36px] -ml-[26px] bg-[#1B8A1B] hover:bg-[#167016] text-white rounded-[8px] flex items-center justify-center cursor-pointer shadow-lg transition-transform hover:scale-105 active:scale-95"
        title="Remove widget"
        aria-label="Remove widget"
      >
        <Trash2 size={20} strokeWidth={2.2} />
      </button>
    </div>
  );
}
