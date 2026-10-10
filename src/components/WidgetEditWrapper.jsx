import React from 'react';

export default function WidgetEditWrapper({ 
  isEditing = false, 
  children,
  className = ""
}) {
  if (!isEditing) {
    return <div className={`h-full ${className}`}>{children}</div>;
  }

  return (
    <div className={`relative h-full rounded-[8px] border-2 border-[#2CA01C] select-none ${className}`}>
      {/* 4 Green Midpoint Resize / Drag Handles (12px circular dots) */}
      {/* North */}
      <div 
        className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-[#2CA01C] z-20 cursor-ns-resize shadow-xs" 
        title="Resize"
      />
      {/* South */}
      <div 
        className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-[#2CA01C] z-20 cursor-ns-resize shadow-xs" 
        title="Resize"
      />
      {/* West */}
      <div 
        className="absolute -left-[6px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-[#2CA01C] z-20 cursor-ew-resize shadow-xs" 
        title="Resize"
      />
      {/* East */}
      <div 
        className="absolute -right-[6px] top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-[#2CA01C] z-20 cursor-ew-resize shadow-xs" 
        title="Resize"
      />

      {/* Child Widget */}
      <div className="h-full overflow-hidden rounded-[6px]">
        {children}
      </div>
    </div>
  );
}
