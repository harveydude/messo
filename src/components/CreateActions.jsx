import React from 'react';

export default function CreateActions({ onActionClick }) {
  const actions = [
    "Get paid online",
    "Create invoice",
    "Record expense",
    "Add bank deposit",
    "Create check"
  ];

  return (
    <div className="flex items-center space-x-[16px] my-5 select-none">
      <span className="text-[16px] font-semibold text-[#393A3D] shrink-0 mr-[4px]">
        Create actions
      </span>

      {actions.map((act, idx) => (
        <button
          key={idx}
          onClick={() => onActionClick && onActionClick(act)}
          className="h-[40px] px-[20px] rounded-full bg-white border border-[#C7CBCE] hover:border-[#8D9096] hover:shadow-2xs text-[15px] font-medium text-[#393A3D] cursor-pointer transition shrink-0"
        >
          {act}
        </button>
      ))}

      <button 
        onClick={() => onActionClick && onActionClick('Show all')}
        className="text-[15px] text-[#0077C5] hover:underline font-medium cursor-pointer pl-1"
      >
        Show all
      </button>
    </div>
  );
}
