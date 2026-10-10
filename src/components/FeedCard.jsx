import React from 'react';
import { MoreVertical, Receipt, FileText } from 'lucide-react';

export default function FeedCard({ 
  type, 
  icon, 
  title, 
  body, 
  link, 
  border, 
  onAction 
}) {
  const IconComponent = icon === 'receipt' ? Receipt : icon === 'file-text' ? FileText : null;

  // Render markdown-like bold text (e.g. **$3,110.97**)
  const renderFormattedBody = (text) => {
    if (!text.includes('**')) return text;
    const parts = text.split('**');
    return (
      <>
        {parts[0]}
        <strong className="font-semibold text-[#393A3D]">{parts[1]}</strong>
        {parts[2]}
      </>
    );
  };

  const getBorderClass = () => {
    if (border === 'gradient-green') return 'gradient-border-green';
    if (border === 'gradient-blue') return 'gradient-border-blue';
    return 'border border-[#C7CBCE] rounded-[8px]';
  };

  const innerContent = (
    <div className="p-[20px] px-[24px] flex flex-col justify-between h-[169px] bg-white rounded-[7px]">
      <div>
        {/* Title row if present */}
        {title ? (
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {IconComponent && <IconComponent size={20} className="text-[#393A3D]" />}
              <span className="text-[17px] font-semibold text-[#393A3D] leading-tight">
                {title}
              </span>
            </div>
            <button className="text-[#6B6C72] hover:text-[#393A3D] p-1">
              <MoreVertical size={18} />
            </button>
          </div>
        ) : (
          <div className="flex justify-end mb-1">
            <button className="text-[#6B6C72] hover:text-[#393A3D] p-1">
              <MoreVertical size={18} />
            </button>
          </div>
        )}

        {/* Body */}
        <p className="text-[15px] leading-[1.5] text-[#393A3D]">
          {renderFormattedBody(body)}
        </p>
      </div>

      {/* Link bottom-left */}
      <div>
        <button 
          onClick={onAction}
          className="text-[15px] text-[#0077C5] hover:underline font-medium text-left cursor-pointer"
        >
          {link}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`shadow-[0_1px_2px_rgba(0,0,0,0.06)] h-[169px] ${getBorderClass()}`}>
      {border.startsWith('gradient') ? (
        <div className="gradient-card-inner">
          {innerContent}
        </div>
      ) : (
        innerContent
      )}
    </div>
  );
}
