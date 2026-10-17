import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Check, Copy, GripVertical, Pin, Trash2, ExternalLink, History, Settings as SettingsIcon, Calendar, Paperclip, CheckCircle2, ChevronDown, ChevronRight, PlayCircle, Store, Pencil } from 'lucide-react';
import UsageMeter from './UsageMeter';
import dashboardData from '../data/dashboard.json';
import api from '../api/client';

/* =========================================================
   1. QUICK CREATE MEGA MENU (+ Create)
   Matching Screenshot 025237
========================================================= */
export function QuickCreateMenu({ isOpen, onClose, onActionSelect }) {
  if (!isOpen) return null;

  const columns = [
    {
      title: 'Customers',
      width: 177,
      items: [
        'Invoice', 'Receive payment', 'Statement', 'Estimate',
        'Sales order', 'Credit memo', 'Sales receipt',
        'Refund receipt', 'Delayed credit', 'Delayed charge',
        'Add customer',
      ],
    },
    {
      title: 'Vendors',
      width: 177,
      items: [
        'Expense', 'Check', 'Bill', 'Pay bills',
        'Purchase order', 'Vendor credit', 'Credit card credit',
        'Print checks', 'Add vendor',
      ],
    },
    {
      title: 'Team',
      width: 161,
      items: [
        'Single time activity',
        'Weekly timesheet',
        'Add employee',
        'Add contractor',
        { label: 'Payroll', external: true },
      ],
    },
    {
      title: 'Other',
      width: 179,
      items: [
        'Task', 'Bank deposit', 'Transfer', 'Journal entry',
        'Inventory qty adjustment', 'Pay down credit card',
        'Add product/service',
      ],
    },
  ];

  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    /* Scrim – click to close */
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Panel: anchored at left:78 top:60, w=754, white, rounded-[6px] */}
      <div
        className="absolute bg-white rounded-[6px] py-6 px-[30px] select-none"
        style={{
          left: 78,
          top: 60,
          width: 754,
          boxShadow: '0 10px 36px rgba(0,0,0,0.22)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex">
          {columns.map((col, ci) => (
            <div key={ci} style={{ width: col.width }} className="pr-4">
              {/* Column header – 17px bold */}
              <h4 className="text-[17px] font-bold text-[#393A3D] mb-3 leading-tight">{col.title}</h4>

              {/* Items – 40px pitch */}
              <ul className="space-y-0">
                {col.items.map((raw, ii) => {
                  const isObj = typeof raw === 'object';
                  const label = isObj ? raw.label : raw;
                  const isExternal = isObj && raw.external;
                  const itemKey = `${ci}-${ii}`;
                  const isHovered = hoveredItem === itemKey;

                  return (
                    <li key={ii}>
                      <button
                        onMouseEnter={() => setHoveredItem(itemKey)}
                        onMouseLeave={() => setHoveredItem(null)}
                        onClick={() => {
                          onActionSelect(label);
                          onClose();
                        }}
                        className={`w-full text-left h-[36px] px-3 rounded-[6px] text-[15px] text-[#393A3D] flex items-center transition-colors ${
                          isHovered ? 'bg-[#F4F5F8]' : ''
                        }`}
                      >
                        <span>{label}</span>
                        {isExternal && (
                          <ExternalLink size={13} className="ml-1.5 text-[#6B6C72] shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   2. SETTINGS MEGA MENU (Gear Icon)
   Matching Reference Gear Mega Menu (Part 9, §44–§46)
========================================================= */
export function SettingsMegaMenu({ isOpen, onClose, onSelectOption }) {
  const [accountantView, setAccountantView] = useState(() => {
    const saved = localStorage.getItem('qb_accountant_view');
    return saved !== null ? JSON.parse(saved) : true;
  });

  if (!isOpen) return null;

  const toggleView = () => {
    setAccountantView(prev => {
      const next = !prev;
      localStorage.setItem('qb_accountant_view', JSON.stringify(next));
      return next;
    });
  };

  const yourCompany = [
    { label: "Account and settings" },
    { label: "Manage users" },
    { label: "Custom form styles" },
    { label: "Chart of accounts" },
    { label: "Payroll settings" },
    { label: "Workers' comp" },
    { label: "Get the desktop app" },
    { label: "Additional info", muted: true }
  ];

  const lists = [
    { label: "All lists" },
    { label: "Products and services" },
    { label: "Recurring transactions" },
    { label: "Attachments" },
    { label: "Custom fields" },
    { label: "Rules" }
  ];

  const tools = [
    { label: "Order checks", external: true },
    { label: "Import data" },
    { label: "Import desktop data" },
    { label: "Export data" },
    { label: "Reconcile" },
    { label: "Budgeting" },
    { label: "Audit log" },
    { label: "Share screen" },
    { label: "Resolution center" }
  ];

  const profile = [
    { label: "Subscriptions and billing" },
    { label: "What's new" },
    { label: "Feedback", muted: true },
    { label: "Privacy" }
  ];

  return (
    <div 
      className="fixed inset-0 z-[65] bg-transparent"
      onClick={onClose}
    >
      <div 
        className="absolute top-[56px] right-[16px] w-[890px] bg-white rounded-[8px] shadow-[0_8px_28px_rgba(0,0,0,0.18)] border border-[#E3E5E8] z-[70] overflow-hidden select-none animate-in fade-in duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 4-column layout */}
        <div className="grid grid-cols-[205px_214px_225px_1fr] gap-6 px-8 pt-7 pb-6">
          {/* Col 1: YOUR COMPANY */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.06em] mb-4">
              YOUR COMPANY
            </h4>
            <ul className="space-y-1">
              {yourCompany.map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => {
                      onSelectOption(item.label);
                      onClose();
                    }}
                    className={`h-[35px] px-2 -ml-2 rounded flex items-center text-[15px] w-full text-left transition hover:bg-[#F6F7F8] cursor-pointer ${
                      item.muted ? 'text-[#6B6C72]' : 'text-[#393A3D]'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 2: LISTS */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.06em] mb-4">
              LISTS
            </h4>
            <ul className="space-y-1">
              {lists.map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => {
                      onSelectOption(item.label);
                      onClose();
                    }}
                    className="h-[35px] px-2 -ml-2 rounded flex items-center text-[15px] text-[#393A3D] w-full text-left transition hover:bg-[#F6F7F8] cursor-pointer"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: TOOLS */}
          <div>
            <h4 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.06em] mb-4">
              TOOLS
            </h4>
            <ul className="space-y-1">
              {tools.map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => {
                      onSelectOption(item.label);
                      onClose();
                    }}
                    className="h-[35px] px-2 -ml-2 rounded flex items-center justify-between text-[15px] text-[#393A3D] w-full text-left transition hover:bg-[#F6F7F8] cursor-pointer"
                  >
                    <span>{item.label}</span>
                    {item.external && (
                      <ExternalLink size={14} className="text-[#6B6C72] ml-1.5 shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: PROFILE (with border-left) */}
          <div className="border-l border-[#D4D7DC] pl-6">
            <h4 className="text-[13px] font-semibold text-[#393A3D] uppercase tracking-[0.06em] mb-4">
              PROFILE
            </h4>
            <ul className="space-y-1">
              {profile.map((item, idx) => (
                <li key={idx}>
                  <button 
                    onClick={() => {
                      onSelectOption(item.label);
                      onClose();
                    }}
                    className={`h-[35px] px-2 -ml-2 rounded flex items-center text-[15px] w-full text-left transition hover:bg-[#F6F7F8] cursor-pointer ${
                      item.muted ? 'text-[#6B6C72]' : 'text-[#393A3D]'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer Strip */}
        <div className="h-[64px] border-t border-[#D4D7DC] px-6 flex items-center justify-center space-x-2 text-[15px] text-[#0077C5]">
          <div className="flex items-center space-x-1.5 cursor-pointer hover:underline">
            <PlayCircle size={18} className="text-[#0077C5]" />
            <span className="underline">Video tutorials</span>
          </div>

          <span className="text-[#D4D7DC] mx-2">|</span>

          <div className="flex items-center space-x-1.5">
            <button 
              onClick={toggleView}
              className="text-[#0077C5] hover:underline cursor-pointer"
            >
              <span>Switch </span>
              <strong className="font-semibold">
                from {accountantView ? "Accountant" : "Business"} view
              </strong>
              <span> to {accountantView ? "Business" : "Accountant"} view</span>
            </button>
            <HelpCircle size={16} className="text-[#6B6C72] cursor-pointer" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   3. ACCOUNT AND SETTINGS MODAL
   Matching Reference Specs (Parts 10-12, §47–§58)
========================================================= */

function SettingsFooterLinks({ className = 'mt-[72px]' }) {
  const links = ['Privacy', 'Security', 'Terms of Service'];
  return (
    <div className={`flex items-center justify-center gap-[14px] pb-[44px] text-[15px] select-none ${className}`}>
      {links.map((l, i) => (
        <React.Fragment key={l}>
          {i > 0 && <span className="text-[#A0A4A8]">|</span>}
          <a
            href={`#${l.toLowerCase().replace(/\s+/g, '-')}`}
            onClick={(e) => e.preventDefault()}
            className="text-[#0077C5] hover:underline underline-offset-2 transition-colors duration-150 cursor-pointer"
          >
            {l}
          </a>
        </React.Fragment>
      ))}
    </div>
  );
}

function SettingsPencilBtn({ top = 14, onClick }) {
  return (
    <button
      title="Edit"
      style={{ top }}
      onClick={onClick}
      className="absolute right-[34px] w-[36px] h-[36px] rounded-full flex items-center justify-center text-[#6B6C72] hover:bg-[#E8EAED] hover:text-[#393A3D] active:scale-90 transition-all duration-150 cursor-pointer"
    >
      <Pencil size={18} />
    </button>
  );
}

function SettingsSection({
  title,
  titleW,
  labelW,
  rows = [],
  rowH = 37,
  innerPl = 18,
  innerPr = 64,
  showPencil = true,
  pencilTop = 14,
  outer = 'mx-[16px]',
  divider = true
}) {
  return (
    <div className={`relative ${outer}`}>
      <div className="pt-[22px] pb-[22px] flex" style={{ paddingLeft: innerPl, paddingRight: innerPr }}>
        <div className="shrink-0 font-bold text-[16px] leading-[24px] text-[#393A3D]" style={{ width: titleW }}>
          {title}
        </div>
        <div className="flex-1 min-w-0">
          {rows.map((r, i) => (
            <div key={i} className="flex" style={{ minHeight: r.h || rowH }}>
              <div
                className={`shrink-0 pr-4 text-[16px] leading-[24px] text-[#393A3D] ${r.strong ? 'font-bold' : ''}`}
                style={{ width: labelW }}
              >
                {r.indent ? <span className="inline-block pl-[33px]">{r.label}</span> : r.label}
              </div>
              <div className={`text-[16px] leading-[24px] ${r.muted ? 'text-[#6B6C72] font-normal' : 'font-bold text-[#393A3D]'}`}>
                {r.value}
              </div>
            </div>
          ))}
        </div>
      </div>
      {showPencil && <SettingsPencilBtn top={pencilTop} />}
      {divider && <div className="border-b border-[#D9D9D9]" />}
    </div>
  );
}

export function AccountSettingsModal({ isOpen, onClose, currentName, onSaveName }) {
  // NOTE: the closed-check moved BELOW the hooks. React requires every hook to
  // run in the same order on every render; returning early before them made all
  // 18 useStates conditional. It happened to survive because React remounts the
  // modal each time -- one ordinary line added above the check would have turned
  // opening this dialog into a blank white screen.
  const [activeTab, setActiveTab] = useState("Company");
  const [hasUploadedLogo, setHasUploadedLogo] = useState(false);
  const [companyNameState, setCompanyNameState] = useState(currentName || "Craig's Design and Landscaping Services");
  const [nameValue, setNameValue] = useState(currentName || "Craig's Design and Landscaping Services");
  const [editingRow, setEditingRow] = useState(null); // 'name' | 'business_type' | null
  
  const [businessType, setBusinessType] = useState("Corporation, one or more shareholders (Form 1120)");
  const [selectedBusinessType, setSelectedBusinessType] = useState("Corporation, one or more shareholders (Form 1120)");
  const [businessTypeMenuOpen, setBusinessTypeMenuOpen] = useState(false);

  const usageData = dashboardData?.usage || {
    plan: "Meso Plus",
    meters: [
      {
        key: "billableUsers",
        label: "Billable Users",
        used: 1,
        limit: 5,
        unit: "user(s)",
        href: "/manage-users"
      },
      {
        key: "chartOfAccounts",
        label: "Chart of accounts",
        used: 44,
        limit: 250,
        unit: "account(s)",
        href: "/chart-of-accounts"
      }
    ]
  };

  const tabs = ["Company", "Usage", "Sales", "Expenses", "Time", "Advanced"];

  const businessTypeOptions = [
    "Sole proprietor (Form 1040)",
    "Partnership or limited liability company (Form 1065)",
    "Small business corporation, two or more owners (Form 1120S)",
    "Corporation, one or more shareholders (Form 1120)",
    "Nonprofit organization (Form 990)",
    "Limited liability",
    "Not sure/Other/None"
  ];

  const [editingAdvancedCard, setEditingAdvancedCard] = useState(null); // 'accounting_method' | 'currency' | null
  const [accountingMethod, setAccountingMethod] = useState(dashboardData?.advanced?.accountingMethod || "Accrual");
  const [selectedMethod, setSelectedMethod] = useState(dashboardData?.advanced?.accountingMethod || "Accrual");
  const [methodDropdownOpen, setMethodDropdownOpen] = useState(false);
  const [saveToastVisible, setSaveToastVisible] = useState(false);

  // Currency card edit state (§56, Screenshots 1-3)
  const [multicurrencyEnabled, setMulticurrencyEnabled] = useState(false);
  const [tempMulticurrencyToggle, setTempMulticurrencyToggle] = useState(false);
  const [tempMulticurrencyChecked, setTempMulticurrencyChecked] = useState(false);
  const [homeCurrency] = useState("Indian Rupee (INR)");
  const [selectedHomeCurrency] = useState("INR - Indian Rupee (₹)");

  useEffect(() => {
    api.getCompanySettings().then(res => {
      if (res && res.success && res.settings) {
        if (res.settings.name) {
          setCompanyNameState(res.settings.name);
          setNameValue(res.settings.name);
        }
        if (res.settings.accounting_method) {
          const methodVal = res.settings.accounting_method === 'CASH' ? 'Cash' : 'Accrual';
          setAccountingMethod(methodVal);
          setSelectedMethod(methodVal);
        }
        if (res.settings.multicurrency_enabled !== undefined) {
          setMulticurrencyEnabled(Boolean(res.settings.multicurrency_enabled));
        }
      }
    }).catch(err => console.warn('[Meso API] Company settings fetch warning:', err));
  }, []);

  // Hooks above, render gate here. A side benefit: the dialog now keeps what you
  // typed when you close and reopen it, instead of silently discarding it.
  if (!isOpen) return null;

  const handleSaveName = async () => {
    setCompanyNameState(nameValue);
    if (onSaveName) onSaveName(nameValue);
    try {
      await api.updateCompanySettings({ name: nameValue });
    } catch (e) {
      console.warn('[Meso API] Error saving company name:', e);
    }
    setEditingRow(null);
    setSaveToastVisible(true);
  };

  const handleSaveAccountingMethod = async () => {
    setAccountingMethod(selectedMethod);
    try {
      await api.updateCompanySettings({ accountingMethod: selectedMethod.toUpperCase() });
    } catch (e) {
      console.warn('[Meso API] Error saving accounting method:', e);
    }
    setEditingAdvancedCard(null);
    setSaveToastVisible(true);
  };

  const handleSaveCurrency = async () => {
    const enabled = tempMulticurrencyToggle && tempMulticurrencyChecked;
    setMulticurrencyEnabled(enabled);
    try {
      await api.updateCompanySettings({ multicurrencyEnabled: enabled });
    } catch (e) {
      console.warn('[Meso API] Error saving currency:', e);
    }
    setEditingAdvancedCard(null);
    setSaveToastVisible(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 select-none">
      <div className="bg-white rounded-[12px] shadow-2xl border border-gray-200 w-full max-w-[1600px] h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150 relative">
        {/* Toast Notification (top-center, 512×57, §57) */}
        {saveToastVisible && (
          <div 
            role="status"
            className="absolute top-[14px] left-1/2 -translate-x-1/2 w-[512px] h-[57px] bg-white rounded-[4px] shadow-[0_2px_8px_rgba(0,0,0,0.20)] z-50 flex items-center px-5 gap-3 border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <CheckCircle2 size={20} className="text-[#2CA01C] shrink-0" />
            <span className="text-[15px] font-medium text-[#393A3D]">Settings saved</span>
            <button 
              onClick={() => setSaveToastVisible(false)}
              className="ml-auto text-[15px] text-[#0077C5] hover:underline font-normal cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {/* Header */}
        <div className="h-[62px] px-6 bg-[#ECEEF1] border-b border-[#E3E5E8] flex items-center justify-between shrink-0">
          <h2 className="text-[26px] font-semibold text-[#393A3D]">Account and settings</h2>
          <div className="flex items-center space-x-2 text-[#6B6C72]">
            <button className="w-[36px] h-[36px] rounded-full flex items-center justify-center hover:bg-[#D8DBDF] hover:text-[#393A3D] cursor-pointer" title="Help">
              <HelpCircle size={20} />
            </button>
            <button onClick={onClose} className="w-[36px] h-[36px] rounded-full flex items-center justify-center hover:bg-[#D8DBDF] hover:text-[#393A3D] cursor-pointer" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Vertical Nav Rail */}
          <div className="w-[221px] bg-[#F4F5F8] border-r border-[#E3E5E8] shrink-0 overflow-y-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left h-[49px] pl-4 pr-3 text-[16px] text-[#393A3D] cursor-pointer relative flex items-center transition-colors duration-150 ${
                    isActive 
                      ? 'bg-[#D9DCE0] font-normal' 
                      : 'hover:bg-[#E9EBEE]'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#2CA01C]" />
                  )}
                  <span>{tab}</span>
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Content Canvas */}
          <div className="flex-1 p-8 overflow-y-auto bg-white min-w-0">
            {activeTab === 'Company' && (
              <div className="space-y-8 animate-in fade-in duration-100">
                {/* 1. Logo Block at Top */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-[96px] h-[96px] rounded-[16px] bg-[#F1F1F2] border border-[#E3E5E8] flex items-center justify-center relative shadow-xs">
                {hasUploadedLogo ? (
                  /* Official Company Logo */
                  <img src="/logo.png" alt="Company Logo" className="w-[84px] h-[84px] object-cover rounded-xl bg-black" />
                ) : (
                  /* Default Storefront Icon */
                  <Store size={52} className="text-[#393A3D]" />
                )}

                {/* 44px Pencil Edit Circle Button */}
                <button 
                  onClick={() => setHasUploadedLogo(prev => !prev)}
                  className="absolute -bottom-2 -right-2 w-[44px] h-[44px] rounded-full bg-white border border-[#D4D7DC] shadow-md flex items-center justify-center text-[#393A3D] hover:bg-gray-50 transition cursor-pointer"
                  title="Upload company logo"
                >
                  <Pencil size={18} />
                </button>
              </div>
            </div>

            {/* 2. Company Info Card */}
            <div className="bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-xs">
              <div className="p-6 border-b border-[#E3E5E8]">
                <h3 className="text-[24px] font-semibold text-[#393A3D]">Company info</h3>
                <p className="text-[15px] text-[#6B6C72] mt-1">
                  This info may be connected to the Business Network or used for billing purposes.
                </p>
              </div>

              <div className="divide-y divide-[#E3E5E8]">
                {/* Row: Name */}
                {editingRow === 'name' ? (
                  /* Expanded Green-Bordered Edit Form */
                  <div className="border-2 border-[#2CA01C] p-6 bg-white animate-in fade-in duration-100">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="w-[280px]">
                        <h4 className="text-[15px] font-semibold text-[#393A3D]">Name</h4>
                        <p className="text-[14px] text-[#6B6C72] mt-1.5 leading-relaxed">
                          Your public name or DBA. Shown on sales forms and purchase orders. Connected to the Business Network.
                        </p>
                      </div>

                      <div className="flex-1 flex justify-end">
                        <input
                          type="text"
                          autoFocus
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-[455px] h-[40px] px-3 border-2 border-[#2CA01C] rounded-[4px] text-[15px] text-[#393A3D] focus:outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#E3E5E8] mt-6 pt-4 flex justify-end items-center space-x-6">
                      <button 
                        onClick={() => setEditingRow(null)}
                        className="text-[15px] font-semibold text-[#2CA01C] hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveName}
                        className="w-[110px] h-[44px] rounded-[6px] bg-[#2CA01C] hover:bg-[#248817] text-white font-semibold text-[15px] transition cursor-pointer shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal State with #E8F0FB Row Hover */
                  <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                    <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Name</span>
                    <span className="text-[15px] text-[#393A3D] flex-1">{companyNameState}</span>
                    <button 
                      onClick={() => {
                        setNameValue(companyNameState);
                        setEditingRow('name');
                      }}
                      className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}

                {/* Address */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Address</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* Email */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Email</span>
                  <span className="text-[15px] text-[#393A3D] flex-1">noreply@meso.in</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* Phone */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Phone</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* Website */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Website</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* Industry */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Industry</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>
              </div>
            </div>

            {/* 3. Legal Info Card */}
            <div className="bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-xs">
              <div className="p-6 border-b border-[#E3E5E8]">
                <h3 className="text-[24px] font-semibold text-[#393A3D]">Legal info</h3>
                <p className="text-[15px] text-[#6B6C72] mt-1">
                  This is the info your business uses for tax purposes.
                </p>
              </div>

              <div className="divide-y divide-[#E3E5E8]">
                {/* Legal business name */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Legal business name</span>
                  <span className="text-[15px] text-[#393A3D] flex-1">Lawns & Paws</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* EIN / SSN */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">EIN / SSN</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>

                {/* Business type */}
                {editingRow === 'business_type' ? (
                  /* Expanded Green-Bordered Business Type Dropdown Edit */
                  <div className="border-2 border-[#2CA01C] p-6 bg-white animate-in fade-in duration-100 relative">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="w-[280px]">
                        <h4 className="text-[15px] font-semibold text-[#393A3D]">Business type</h4>
                        <p className="text-[14px] text-[#6B6C72] mt-1.5 leading-relaxed">
                          How your business is structured.
                        </p>
                      </div>

                      <div className="relative flex-1 flex justify-end">
                        <div 
                          onClick={() => setBusinessTypeMenuOpen(prev => !prev)}
                          className="w-[455px] h-[40px] px-3 border-2 border-[#2CA01C] rounded-[4px] flex items-center justify-between text-[15px] text-[#393A3D] cursor-pointer bg-white"
                        >
                          <span className="truncate">{selectedBusinessType}</span>
                          <ChevronDown size={18} className="text-[#6B6C72] ml-2 shrink-0" />
                        </div>

                        {/* Open Menu Dropdown (554px wide, right-aligned) */}
                        {businessTypeMenuOpen && (
                          <div className="absolute top-[44px] right-0 w-[554px] bg-white border border-[#E3E5E8] rounded-[8px] shadow-2xl z-40 py-2 divide-y divide-[#F0F1F3]">
                            {businessTypeOptions.map((opt, i) => (
                              <div 
                                key={i}
                                onClick={() => {
                                  setSelectedBusinessType(opt);
                                  setBusinessTypeMenuOpen(false);
                                }}
                                className="px-4 py-3 text-[15px] hover:bg-[#F6F7F8] cursor-pointer flex items-center space-x-2 text-[#393A3D] transition"
                              >
                                {selectedBusinessType === opt ? (
                                  <Check size={16} className="text-[#2CA01C] stroke-[2.5] shrink-0" />
                                ) : (
                                  <div className="w-4 shrink-0" />
                                )}
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-[#E3E5E8] mt-6 pt-4 flex justify-end items-center space-x-6">
                      <button 
                        onClick={() => {
                          setEditingRow(null);
                          setBusinessTypeMenuOpen(false);
                        }}
                        className="text-[15px] font-semibold text-[#2CA01C] hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setBusinessType(selectedBusinessType);
                          setEditingRow(null);
                          setBusinessTypeMenuOpen(false);
                          setSaveToastVisible(true);
                        }}
                        className="w-[110px] h-[44px] rounded-[6px] bg-[#2CA01C] hover:bg-[#248817] text-white font-semibold text-[15px] transition cursor-pointer shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                    <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Business type</span>
                    <span className="text-[15px] text-[#393A3D] flex-1">{businessType}</span>
                    <button 
                      onClick={() => {
                        setSelectedBusinessType(businessType);
                        setEditingRow('business_type');
                      }}
                      className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                )}

                {/* Legal address */}
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Legal address</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>
              </div>
            </div>

            {/* 4. Customer Contact Info Card */}
            <div className="bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-xs">
              <div className="p-6 border-b border-[#E3E5E8]">
                <h3 className="text-[24px] font-semibold text-[#393A3D]">Customer contact info</h3>
                <p className="text-[15px] text-[#6B6C72] mt-1">
                  This is how customers get in touch with you.
                </p>
              </div>

              <div className="divide-y divide-[#E3E5E8]">
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Customer-facing address</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Customer-facing email</span>
                  <span className="text-[15px] text-[#393A3D] flex-1">noreply@meso.in</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>
                <div className="h-[72px] px-6 flex items-center justify-between hover:bg-[#E8F0FB] transition-colors cursor-pointer">
                  <span className="text-[15px] font-semibold text-[#393A3D] w-[260px]">Customer-facing phone</span>
                  <span className="text-[15px] text-[#6B6C72] flex-1">None listed</span>
                  <button className="text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">Edit</button>
                </div>
              </div>
            </div>
          </div>
        )}

            {/* USAGE TAB (§52–§54) */}
            {activeTab === 'Usage' && (
              <div className="w-full max-w-[970px] space-y-6 animate-in fade-in duration-100">
                {/* Title & Description */}
                <div>
                  <h1 className="text-[32px] font-semibold text-[#393A3D] leading-tight">Usage limits</h1>
                  <p className="text-[15px] text-[#393A3D] max-w-[590px] leading-relaxed mt-2.5">
                    Beginning April 2019, usage limits will go into effect and will depend on your plan. Your current plan is Meso Plus. Upgrade to have greater capacity, or learn how to manage to these limits.
                  </p>
                  <a 
                    href="#usage-limits" 
                    onClick={(e) => e.preventDefault()}
                    className="inline-block mt-3 text-[15px] text-[#0077C5] underline hover:text-[#005a94] cursor-pointer"
                  >
                    Find out more about usage limits
                  </a>
                </div>

                {/* Usage Meters List (654px width constraint) */}
                <div className="pt-4 divide-y divide-[#E3E5E8] max-w-[654px]">
                  {usageData.meters.map((meter, index) => (
                    <div key={meter.key} className={index === 0 ? "pb-8" : "pt-8 pb-8"}>
                      <UsageMeter
                        label={meter.label}
                        used={meter.used}
                        limit={meter.limit}
                        unit={meter.unit}
                        href={meter.href}
                      />
                    </div>
                  ))}
                </div>

                {/* Footer Legal Links */}
                <SettingsFooterLinks className="mt-[88px]" />
              </div>
            )}

            {/* SALES TAB (§55) */}
            {activeTab === 'Sales' && (
              <div className="pt-[16px] pb-[6px] animate-in fade-in duration-100">
                <SettingsSection
                  title="Sales form content"
                  titleW={210}
                  labelW={428}
                  rows={[
                    { label: 'Preferred invoice terms', value: 'Net 30', muted: true },
                    { label: 'Preferred delivery method', value: 'Print later', strong: true },
                    { label: 'Shipping', value: 'Off' },
                    { label: 'Custom fields', strong: true },
                    { label: 'Custom transaction numbers', value: 'Off' },
                    { label: 'Service date', value: 'Off' },
                    { label: 'Discount', value: 'On' },
                    { label: 'Deposit', value: 'Off' },
                    { label: 'Accept tips', value: 'Off' },
                    { label: 'Tags', value: 'On' }
                  ]}
                />
                <SettingsSection
                  title="Products and services"
                  titleW={210}
                  labelW={428}
                  rows={[
                    { label: 'Show Product/Service column on sales forms', value: 'On' },
                    { label: 'Show SKU column', value: 'Off', indent: true },
                    {
                      label: (
                        <span>
                          Turn on{' '}
                          <a
                            href="#price-rules"
                            onClick={(e) => e.preventDefault()}
                            className="text-[#0077C5] border-b border-dotted border-[#0077C5] hover:text-[#005a94] transition-colors cursor-pointer"
                          >
                            price rules
                          </a>
                        </span>
                      ),
                      value: 'Off'
                    },
                    { label: 'Track quantity and price/rate', value: 'On' },
                    { label: 'Track inventory quantity on hand', value: 'On' }
                  ]}
                />
                <SettingsSection
                  title="Late fees"
                  titleW={210}
                  labelW={428}
                  rows={[
                    { label: 'Default charge applied to overdue invoices', value: 'Off' },
                    {
                      label: (
                        <span className="text-[#393A3D] text-[16px] leading-[24px]">
                          Appears as a line under <b>Product/Service</b> on the invoice, and applies to all customers.
                        </span>
                      )
                    }
                  ]}
                />
                <SettingsSection
                  title="Progress Invoicing"
                  titleW={210}
                  labelW={428}
                  rows={[
                    { label: 'Create multiple partial invoices from a single estimate', value: 'Off' }
                  ]}
                />
                <SettingsSection
                  title="Messages"
                  titleW={210}
                  labelW={428}
                  rows={[
                    { label: 'Default email message sent with sales forms' }
                  ]}
                />
                <SettingsFooterLinks className="mt-[72px]" />
              </div>
            )}

            {/* EXPENSES TAB (§56) */}
            {activeTab === 'Expenses' && (
              <div className="pt-[46px] px-[24px] animate-in fade-in duration-100">
                <div className="max-w-[1553px] mx-auto bg-white border border-[#E3E3E3] rounded-[8px] shadow-[0_1px_5px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-between pl-[22px] pr-[56px] h-[72px]">
                    <h2 className="text-[24px] font-bold text-[#393A3D]">Expenses</h2>
                    <button className="text-[16px] font-semibold text-[#2CA01C] hover:underline active:opacity-70 transition-all cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="border-t border-[#D9D9D9]" />
                  <SettingsSection
                    title="Bills and expenses"
                    titleW={288}
                    labelW={420}
                    rowH={32}
                    innerPl={22}
                    innerPr={22}
                    showPencil={false}
                    outer=""
                    rows={[
                      { label: 'Show Items table on expense and purchase forms', value: 'On' },
                      { label: 'Show Tags field on expense and purchase forms', value: 'On' },
                      { label: 'Track expenses and items by customer', value: 'On' },
                      { label: 'Make expenses and items billable', value: 'On' },
                      { label: 'Default bill payment terms', value: '' }
                    ]}
                  />
                  <SettingsSection
                    title="Purchase orders"
                    titleW={288}
                    labelW={420}
                    rowH={32}
                    innerPl={22}
                    innerPr={22}
                    showPencil={false}
                    outer=""
                    rows={[
                      { label: 'Use purchase orders', value: 'On' }
                    ]}
                  />
                  <SettingsSection
                    title="Messages"
                    titleW={288}
                    labelW={420}
                    rowH={32}
                    innerPl={22}
                    innerPr={22}
                    showPencil={false}
                    outer=""
                    rows={[
                      { label: 'Default email message sent with purchase orders', value: '' }
                    ]}
                  />
                </div>
                <SettingsFooterLinks className="mt-[92px]" />
              </div>
            )}

            {/* TIME TAB (§57) */}
            {activeTab === 'Time' && (
              <div className="pt-[24px] animate-in fade-in duration-100">
                <SettingsSection
                  title="General"
                  titleW={209}
                  labelW={450}
                  rowH={48}
                  pencilTop={12}
                  rows={[
                    { label: 'First day of work week', value: 'Monday' }
                  ]}
                />
                <SettingsSection
                  title="Timesheet"
                  titleW={209}
                  labelW={450}
                  rowH={54}
                  pencilTop={16}
                  rows={[
                    { label: 'Show service field', value: 'On' },
                    { label: 'Allow time to be billable', value: 'On' }
                  ]}
                />
                <SettingsFooterLinks className="mt-[80px]" />
              </div>
            )}

            {/* ADVANCED TAB (§55–§58) */}
            {activeTab === 'Advanced' && (
              <div className="pt-4 pb-8 space-y-6 max-w-[1544px] animate-in fade-in duration-100">
                {/* 1. Accounting method Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Accounting method</h3>
                    {editingAdvancedCard !== 'accounting_method' && (
                      <button
                        onClick={() => {
                          setSelectedMethod(accountingMethod);
                          setEditingAdvancedCard('accounting_method');
                        }}
                        className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingAdvancedCard === 'accounting_method' ? (
                    <div className="px-6 py-6 space-y-6 animate-in fade-in duration-100">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setMethodDropdownOpen(prev => !prev)}
                            className="w-[213px] h-[38px] px-3 border-2 border-[#2CA01C] rounded-[4px] bg-white flex items-center justify-between text-[15px] text-[#393A3D] cursor-pointer"
                          >
                            <span>{selectedMethod}</span>
                            <ChevronDown size={18} className="text-[#6B6C72] shrink-0" />
                          </button>
                          {methodDropdownOpen && (
                            <div className="absolute top-[42px] left-0 w-[213px] bg-white border border-[#E3E5E8] rounded-[6px] shadow-lg z-30 py-1">
                              {["Accrual", "Cash"].map((m) => (
                                <div
                                  key={m}
                                  onClick={() => {
                                    setSelectedMethod(m);
                                    setMethodDropdownOpen(false);
                                  }}
                                  className={`px-3 py-2 text-[15px] cursor-pointer hover:bg-[#F6F7F8] flex items-center justify-between ${
                                    selectedMethod === m ? 'font-semibold text-[#2CA01C]' : 'text-[#393A3D]'
                                  }`}
                                >
                                  <span>{m}</span>
                                  {selectedMethod === m && <Check size={16} className="text-[#2CA01C]" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <span 
                          className="w-[20px] h-[20px] rounded-full border-[1.5px] border-[#6B6C72] text-[#6B6C72] text-[12px] font-bold flex items-center justify-center cursor-pointer hover:border-[#393A3D] hover:text-[#393A3D]" 
                          title="Choose Accrual or Cash accounting"
                        >
                          ⓘ
                        </span>
                      </div>

                      <div className="border-t border-[#E3E5E8] pt-5 flex items-center space-x-6">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdvancedCard(null);
                            setMethodDropdownOpen(false);
                            setSelectedMethod(accountingMethod);
                          }}
                          className="text-[15px] font-semibold text-[#2CA01C] hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveAccountingMethod}
                          className="w-[113px] h-[38px] rounded-[6px] bg-[#2CA01C] hover:bg-[#248817] text-white font-semibold text-[15px] transition shadow-xs cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-5 text-[15px] text-[#393A3D]">
                      {accountingMethod}
                    </div>
                  )}
                </div>

                {/* 2. Customer label Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Customer label</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="px-6 py-5 text-[15px] text-[#393A3D]">
                    Customers
                  </div>
                </div>

                {/* 3. Communications with Meso Card (NO Edit button) */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Communications with Meso</h3>
                  </div>
                  <div className="px-6 py-5">
                    <a href="#marketing-preferences" onClick={(e) => e.preventDefault()} className="text-[15px] text-[#0077C5] hover:underline cursor-pointer">
                      Marketing preferences
                    </a>
                  </div>
                </div>

                {/* 4. Accounting Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Accounting</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="divide-y divide-[#F0F1F3]">
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">First month of fiscal year</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">January</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">First month of tax year</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">Same as fiscal year</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Accounting method</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">{accountingMethod}</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Close the books</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">Off</span>
                    </div>
                  </div>
                </div>

                {/* 5. Chart of accounts Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Chart of accounts</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="px-6 py-5 text-[15px] text-[#6B6C72]">
                    Enable account numbers — Off
                  </div>
                </div>

                {/* 6. Automation Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Automation</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="divide-y divide-[#F0F1F3]">
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Automatically apply credits</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">On</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Automatically invoice unbilled activity</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">Off</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Automatically apply bill payments</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">On</span>
                    </div>
                  </div>
                </div>

                {/* 7. Projects Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Projects</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="h-[60px] px-6 flex items-center">
                    <span className="w-[380px] text-[15px] text-[#393A3D]">Organize all job-related activity in one place</span>
                    <span className="text-[15px] font-semibold text-[#393A3D]">Off</span>
                  </div>
                </div>

                {/* 8. Currency Card (Screenshots 1-3) */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Currency</h3>
                    {editingAdvancedCard !== 'currency' && (
                      <button
                        onClick={() => {
                          setTempMulticurrencyToggle(multicurrencyEnabled);
                          setTempMulticurrencyChecked(false);
                          setEditingAdvancedCard('currency');
                        }}
                        className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                  {editingAdvancedCard === 'currency' ? (
                    <div className="px-6 py-6 space-y-4 animate-in fade-in duration-100">
                      {/* Home Currency Row */}
                      <div className="flex items-center justify-between py-1">
                        <span className="text-[15px] text-[#393A3D]">Home Currency</span>
                        <div className="w-[213px] h-[38px] px-3 border border-[#D4D7DC] rounded-[4px] bg-white flex items-center justify-between text-[14px] text-[#393A3D]">
                          <span>{selectedHomeCurrency}</span>
                          <ChevronDown size={16} className="text-[#6B6C72]" />
                        </div>
                      </div>

                      {/* Multicurrency Toggle Row */}
                      <div className="flex items-center justify-between py-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-[15px] text-[#393A3D]">Multicurrency</span>
                          <span 
                            className="w-[18px] h-[18px] rounded-full border-[1.5px] border-[#6B6C72] text-[#6B6C72] text-[11px] font-bold flex items-center justify-center cursor-pointer" 
                            title="Manage multicurrency settings"
                          >
                            ⓘ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !tempMulticurrencyToggle;
                            setTempMulticurrencyToggle(next);
                            if (!next) setTempMulticurrencyChecked(false);
                          }}
                          className={`w-[44px] h-[24px] rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                            tempMulticurrencyToggle ? 'bg-[#2CA01C]' : 'bg-[#CDCFD3]'
                          }`}
                        >
                          <div className={`w-[20px] h-[20px] rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                            tempMulticurrencyToggle ? 'translate-x-[20px]' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Multicurrency Warning Disclosure (Screenshots 2 & 3) */}
                      {tempMulticurrencyToggle && (
                        <div className="pt-2 pb-2 space-y-3 text-[14px] text-[#393A3D] animate-in fade-in duration-150">
                          <p className="leading-relaxed">
                            Multicurrency may be right for you if you have financial transactions in more than one currency.
                          </p>
                          <a href="#multicurrency-help" onClick={(e) => e.preventDefault()} className="inline-block text-[#0077C5] hover:underline">
                            Need help deciding about multicurrency?
                          </a>
                          <div className="pt-1">
                            <p className="font-medium">Once you turn on Multicurrency:</p>
                            <ul className="list-disc pl-5 space-y-1 mt-1 text-[#393A3D]">
                              <li>You can't turn it off</li>
                              <li>You can't change your home currency</li>
                              <li>Extra fields, columns and more are added to Meso</li>
                              <li>Some features may no longer be available</li>
                            </ul>
                          </div>
                          <label className="flex items-center space-x-3 pt-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tempMulticurrencyChecked}
                              onChange={(e) => setTempMulticurrencyChecked(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#2CA01C] focus:ring-[#2CA01C] cursor-pointer"
                            />
                            <span className="text-[14px] text-[#393A3D]">I understand I can't undo Multicurrency</span>
                          </label>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="border-t border-[#E3E5E8] pt-5 flex items-center space-x-6">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAdvancedCard(null);
                            setTempMulticurrencyToggle(multicurrencyEnabled);
                            setTempMulticurrencyChecked(false);
                          }}
                          className="text-[15px] font-semibold text-[#2CA01C] hover:underline cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={tempMulticurrencyToggle && !tempMulticurrencyChecked}
                          onClick={handleSaveCurrency}
                          className={`w-[113px] h-[38px] rounded-[6px] text-white font-semibold text-[15px] transition shadow-xs ${
                            tempMulticurrencyToggle && !tempMulticurrencyChecked
                              ? 'bg-[#86D47B] cursor-not-allowed opacity-80'
                              : 'bg-[#2CA01C] hover:bg-[#248817] cursor-pointer'
                          }`}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F0F1F3]">
                      <div className="h-[60px] px-6 flex items-center">
                        <span className="w-[380px] text-[15px] text-[#393A3D]">Home Currency</span>
                        <span className="text-[15px] font-semibold text-[#393A3D]">{homeCurrency}</span>
                      </div>
                      <div className="h-[60px] px-6 flex items-center">
                        <span className="w-[380px] text-[15px] text-[#393A3D]">Multicurrency</span>
                        <span className="text-[15px] font-semibold text-[#393A3D]">{multicurrencyEnabled ? "On" : "Off"}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 9. Business Network Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Business Network</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="h-[60px] px-6 flex items-center">
                    <span className="w-[380px] text-[15px] font-semibold text-[#393A3D]">Allow members to find me</span>
                    <span className="text-[15px] text-[#393A3D]">On</span>
                  </div>
                </div>

                {/* 10. Other preferences Card */}
                <div className="w-full bg-white border border-[#E3E5E8] rounded-[8px] overflow-hidden shadow-2xs">
                  <div className="h-[70px] px-6 border-b border-[#E3E5E8] flex items-center justify-between">
                    <h3 className="text-[20px] font-semibold text-[#393A3D]">Other preferences</h3>
                    <button className="text-[15px] font-medium text-[#2CA01C] hover:underline cursor-pointer">
                      Edit
                    </button>
                  </div>
                  <div className="divide-y divide-[#F0F1F3]">
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Date format</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">mm/dd/yyyy</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Currency format</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">₹123,456.00</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Customer label</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">Customers</span>
                    </div>
                    <div className="h-[60px] px-6 flex items-center">
                      <span className="w-[380px] text-[15px] text-[#393A3D]">Warn me if duplicate check number is used</span>
                      <span className="text-[15px] font-semibold text-[#393A3D]">On</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <SettingsFooterLinks className="mt-[88px]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   4. KEYBOARD SHORTCUTS & COMPANY ID MODAL
   Matching frame_409
========================================================= */
export function AdditionalInfoModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText('9341 4555 6915 5216');
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const mainPageShortcuts = [
    { key: "i", action: "Invoice" },
    { key: "w", action: "Check" },
    { key: "e", action: "Estimate" },
    { key: "x", action: "Expense" },
    { key: "r", action: "Receive payment" },
    { key: "j", action: "Journal entry" },
    { key: "c", action: "Customers" },
    { key: "u", action: "Run payroll" },
    { key: "v", action: "Vendors" },
    { key: "a", action: "Chart of accounts" },
    { key: "l", action: "Lists" },
    { key: "h", action: "Help" },
    { key: "f", action: "Global search" },
    { key: "d", action: "Focus the left menu" },
    { key: "ctrl/cmd + .", action: "Toggle ZenMode" },
    { key: "? or /", action: "This dialog" }
  ];

  const transactionShortcuts = [
    { key: "x", action: "Exit transaction view" },
    { key: "c", action: "Cancel out" },
    { key: "s", action: "Save and new" },
    { key: "d", action: "Save and close" },
    { key: "m", action: "Save and send" },
    { key: "p", action: "Print" },
    { key: "? or /", action: "This dialog" }
  ];

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-[8px] shadow-[0_12px_44px_rgba(0,0,0,0.25)] border border-[#E3E5E8] w-[837px] max-h-[96vh] overflow-y-auto p-8 relative select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top-right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-[#6B6C72] hover:text-[#393A3D] transition text-[22px] leading-none cursor-pointer"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 className="text-[30px] font-bold text-[#1F2937] leading-tight">
          Additional information
        </h2>

        {/* Subtitle */}
        <p className="text-[14px] text-[#393A3D] mt-4">
          You&apos;re viewing Meso in <span className="font-semibold text-[#1F2937]">Accountant view</span>
        </p>

        {/* Company ID line + Copy Button */}
        <div className="flex items-center space-x-3 mt-3">
          <span className="text-[14px] text-[#393A3D]">
            Your Company ID is <span className="font-semibold text-[#1F2937]">9341 4555 6915 5216</span>
          </span>
          <button 
            onClick={handleCopy}
            className="h-[36px] px-3 rounded-[4px] border border-[#8D9096] bg-white hover:bg-[#F4F5F8] text-[13px] font-semibold text-[#393A3D] flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Copy size={13} className="text-[#6B6C72]" />
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Keyboard Shortcuts Section */}
        <div className="mt-7">
          <h3 className="text-[15px] font-bold text-[#1F2937]">
            Keyboard Shortcuts
          </h3>
          <p className="text-[13px] text-[#6B6C72] mt-1 leading-normal">
            To use a shortcut, press and hold <span className="font-semibold text-[#393A3D]">ctrl/control</span> and <span className="font-semibold text-[#393A3D]">alt/option</span> at the same time. Then press one of the keys below.
          </p>

          {/* Dual Tables side-by-side */}
          <div className="grid grid-cols-[385px_341px] gap-6 mt-4">
            
            {/* Table 1: Main Pages */}
            <div>
              <div className="text-[13px] font-semibold text-[#393A3D] mb-1.5">
                On main pages, like the dashboard or customers
              </div>
              <div className="border border-[#C9CDD2] rounded-[2px] overflow-hidden">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="h-[28px] bg-white border-b border-[#C9CDD2] text-[11px] font-semibold text-[#393A3D] uppercase tracking-wider">
                      <th className="w-[177px] px-2.5 border-r border-[#C9CDD2]">
                        SHORTCUT KEY
                      </th>
                      <th className="px-2.5">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#F4F5F8]">
                    {mainPageShortcuts.map((row, idx) => (
                      <tr 
                        key={idx}
                        className="h-[23px] border-b border-[#C9CDD2] last:border-b-0 text-[#393A3D]"
                      >
                        <td className="px-2.5 border-r border-[#C9CDD2] font-mono text-[12px]">
                          {row.key}
                        </td>
                        <td className="px-2.5">
                          {row.action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Transactions */}
            <div>
              <div className="text-[13px] font-semibold text-[#393A3D] mb-1.5">
                On transactions, like an invoice or expense
              </div>
              <div className="border border-[#C9CDD2] rounded-[2px] overflow-hidden">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="h-[28px] bg-white border-b border-[#C9CDD2] text-[11px] font-semibold text-[#393A3D] uppercase tracking-wider">
                      <th className="w-[150px] px-2.5 border-r border-[#C9CDD2]">
                        SHORTCUT KEY
                      </th>
                      <th className="px-2.5">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {transactionShortcuts.map((row, idx) => (
                      <tr 
                        key={idx}
                        className="h-[23px] border-b border-[#C9CDD2] last:border-b-0 text-[#393A3D]"
                      >
                        <td className="px-2.5 border-r border-[#C9CDD2] font-mono text-[12px]">
                          {row.key}
                        </td>
                        <td className="px-2.5">
                          {row.action}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-[1px] bg-[#E3E5E8] mt-8 mb-5" />

        {/* Centered OK Button */}
        <div className="flex justify-center">
          <button 
            onClick={onClose}
            className="w-[113px] h-[40px] rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white font-bold text-[15px] transition cursor-pointer shadow-xs"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   5. CUSTOMIZE APP MENUS MODAL
   Matching Screenshot 031713
========================================================= */
const DEFAULT_APPS = [
  { name: "Accounting", pinned: true },
  { name: "Expenses & Pay Bills", pinned: true },
  { name: "Sales & Get Paid", pinned: true },
  { name: "Customer Hub", pinned: false },
  { name: "Team", pinned: false },
  { name: "Time", pinned: false },
  { name: "Project Management", pinned: false },
  { name: "Inventory", pinned: false },
  { name: "Sales Tax", pinned: false },
  { name: "Business Tax", pinned: false },
  { name: "Lending", pinned: false }
];

export function CustomizeAppMenusModal({ isOpen, onClose }) {
  // Hooks run unconditionally; the closed-check sits below them. Previously the
  // check came first, which made this useState conditional.
  //
  // The parent mounts this component only while it is open, so the list reseeds
  // naturally on every open. That is why there is no "reset on open" effect:
  // writing state inside an effect during mount is a cascade of extra renders,
  // and a mount-when-open component gets the same behaviour for free.
  const [apps, setApps] = useState(DEFAULT_APPS);

  if (!isOpen) return null;

  const togglePin = (index) => {
    const updated = [...apps];
    updated[index].pinned = !updated[index].pinned;
    setApps(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Customize your app menus</h2>
            <p className="text-xs text-gray-500 mt-0.5">Drag and drop to reorder apps and pin your top 3 for easy access.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
          {apps.map((app, idx) => (
            <div 
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 border border-gray-100 text-xs"
            >
              <div className="flex items-center space-x-3">
                <GripVertical size={14} className="text-gray-400 cursor-grab" />
                <button 
                  onClick={() => togglePin(idx)}
                  className={`p-1 rounded hover:bg-gray-200 ${app.pinned ? 'text-gray-900' : 'text-gray-300'}`}
                >
                  <Pin size={14} className={app.pinned ? "fill-gray-900" : ""} />
                </button>
                <span className="font-semibold text-gray-800">{app.name}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button className="text-xs text-[#0077c5] hover:underline font-semibold">
            Reset to default
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-full hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={onClose}
              className="px-5 py-1.5 text-xs font-bold text-white bg-[#108000] rounded-full hover:bg-green-800 shadow-xs"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   6. JOURNAL ENTRY #1 MODAL
/* =========================================================
   6. JOURNAL ENTRY MODAL
   Matching reference screenshot
========================================================= */
export { default as JournalEntryModal } from './JournalEntryModal';

/* =========================================================
   7. SETUP / LAY THE GROUNDWORK DRAWER
   Matching Screenshot 025237
========================================================= */
export function SetupDrawer({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col pt-14 animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">Setup</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
          <X size={16} />
        </button>
      </div>

      <div className="p-5 flex-1 overflow-y-auto space-y-6">
        <div>
          <h4 className="text-sm font-bold text-gray-900">Let's lay the groundwork</h4>
          <p className="text-xs text-gray-500 mt-1">
            These steps will show you the ropes and help us get the info we need to take things off your plate.
          </p>
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="bg-[#2ca01c] h-full" style={{ width: '0%' }} />
            </div>
            <span className="text-[10px] font-bold text-gray-500">0%</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                <span className="text-xs font-bold text-gray-900">Business basics</span>
              </div>
              <button className="text-xs text-[#0077c5] hover:underline font-medium">See tasks</button>
            </div>
            <div className="text-[11px] text-gray-400 pl-6">0 of 3 completed</div>
          </div>

          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                <span className="text-xs font-bold text-gray-900">Sales & Get Paid</span>
              </div>
              <button className="text-xs text-[#0077c5] hover:underline font-medium">See tasks</button>
            </div>
            <div className="text-[11px] text-gray-400 pl-6">0 of 3 completed</div>
          </div>

          <div className="border border-gray-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                <span className="text-xs font-bold text-gray-900">Accounting</span>
              </div>
              <button className="text-xs text-[#0077c5] hover:underline font-medium">See tasks</button>
            </div>
            <div className="text-[11px] text-gray-400 pl-6">0 of 2 completed</div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 font-medium">
            <ChevronRight size={14} />
            <span>Completed tasks</span>
          </div>
          <div className="flex items-center space-x-1 cursor-pointer hover:text-gray-900 font-medium">
            <ChevronRight size={14} />
            <span>Hidden tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}
