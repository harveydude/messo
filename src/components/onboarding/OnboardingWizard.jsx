import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  ChevronDown, 
  HelpCircle, 
  Search, 
  QrCode, 
  Smartphone, 
  CreditCard, 
  Building2, 
  FileText, 
  BarChart2, 
  Users, 
  Clock, 
  PieChart, 
  Percent, 
  ArrowRight, 
  Info, 
  X,
  Lock,
  Landmark,
  Calendar,
  Calculator,
  Package,
  Tag,
  Car,
  Mail,
  Smile,
  Meh,
  Frown,
  AlertCircle,
  Sparkles
} from 'lucide-react';

// Comprehensive Indian Industries Catalog (NIC Classifications)
const INDIAN_INDUSTRIES = [
  'Information Technology & Software Services (IT/ITeS)',
  'Advertising, Media & Digital Marketing Agency',
  'Retail, FMCG & Supermarket Wholesale',
  'E-Commerce & Online Direct-to-Consumer (D2C)',
  'Manufacturing, Engineering & Industrial Goods',
  'Healthcare, Pharmaceuticals, Hospitals & Clinics',
  'Construction, Real Estate & Civil Infrastructure',
  'Logistics, Warehousing & Supply Chain Fleet',
  'Chartered Accountancy, Legal, Tax & Financial Advisory',
  'Food & Beverage, Restaurants, Cafes & Cloud Kitchens',
  'Hospitality, Hotels & Travel Tourism',
  'Banking, Financial Services & Fintech (BFSI)',
  'Education, Coaching Institutes & EdTech',
  'Textiles, Garments & Fashion Apparel',
  'Agriculture, Organic Farming & Agri-Commodities',
  'Automotive Sales, Dealerships & Service Stations',
  'Renewable Energy, Solar Power & CleanTech',
  'Export & Import Trading (EXIM / Merchant)',
  'Telecommunications, ISP & Cable Networks',
  'Entertainment, Film Production & Event Management',
  'Gems, Jewellery & Precious Metals',
  'Chemicals, Petrochemicals & Polymers',
  'Security, Facility Management & Staffing Services',
  'Other Specialized Professional Services'
];

/**
 * MESO ONBOARDING WIZARD
 * 100% Meso Indian Cloud localized setup flow.
 * No QuickBooks / Intuit references. Pure ₹ INR currency.
 * Zero pre-filled defaults, mandatory step validation, non-overlapping floating cloud,
 * and Frame 094 animated cyan underline.
 */
export default function OnboardingWizard({ onComplete, onExit }) {
  // Wizard steps: 0 to 12
  const [currentStep, setCurrentStep] = useState(0);

  // Form Data State - ALL EMPTY BY DEFAULT
  const [formData, setFormData] = useState({
    businessName: '',
    priorSoftware: '',
    website: '',
    industry: '',
    taxType: '',
    annualRevenue: '',
    role: '',
    employeeCount: '',
    phoneNumber: '',
    selectedFeatures: [],
  });

  // UI & Validation States
  const [stepError, setStepError] = useState('');
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExpertTooltip, setShowExpertTooltip] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDisclaimerPopover, setShowDisclaimerPopover] = useState(false);
  const [isDiscoveringData, setIsDiscoveringData] = useState(false);
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);

  const updateField = (field, value) => {
    setStepError('');
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFeature = (id) => {
    setFormData((prev) => {
      const exists = prev.selectedFeatures.includes(id);
      return {
        ...prev,
        selectedFeatures: exists 
          ? prev.selectedFeatures.filter(f => f !== id) 
          : [...prev.selectedFeatures, id]
      };
    });
  };

  // Step Validation & Forward Progress
  const validateAndProceed = (targetStep) => {
    setStepError('');

    // Step 1: Legal Business Name must not be empty
    if (currentStep === 1) {
      if (!formData.businessName || !formData.businessName.trim()) {
        setStepError('Please enter your legal business name to proceed.');
        return;
      }
    }

    // Step 2: Prior Software must be chosen
    if (currentStep === 2) {
      if (!formData.priorSoftware) {
        setStepError('Please select an option or choose "Nothing, I\'m new to this".');
        return;
      }
    }

    // Step 3: Website auto-discovery simulation
    if (currentStep === 3) {
      if (formData.website && formData.website.trim()) {
        setIsDiscoveringData(true);
        setTimeout(() => {
          setIsDiscoveringData(false);
          // Auto-suggest industry if not yet filled
          if (!formData.industry) {
            updateField('industry', 'Information Technology & Software Services (IT/ITeS)');
          }
          if (!formData.taxType) {
            updateField('taxType', 'pvt_ltd');
          }
          setCurrentStep(targetStep !== undefined ? targetStep : currentStep + 1);
        }, 1100);
        return;
      }
    }

    // Step 4: Company Profile (Tax Type & Revenue mandatory)
    if (currentStep === 4) {
      if (!formData.taxType) {
        setStepError('Please select your business tax type.');
        return;
      }
      if (!formData.annualRevenue) {
        setStepError('Please select your annual revenue bracket.');
        return;
      }
    }

    // Step 5: Role & Team Size mandatory
    if (currentStep === 5) {
      if (!formData.role) {
        setStepError('Please select your role in the business.');
        return;
      }
      if (!formData.employeeCount) {
        setStepError('Please select your team size.');
        return;
      }
    }

    if (targetStep !== undefined) {
      setCurrentStep(targetStep);
    } else if (currentStep < 12) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (onComplete) onComplete(formData);
    }
  };

  const handleBack = () => {
    setStepError('');
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else if (onExit) {
      onExit();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && currentStep > 0 && currentStep < 12 && e.target.tagName !== 'TEXTAREA') {
        validateAndProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData]);

  // Compute progress percentage
  const getProgressPercentage = () => {
    switch (currentStep) {
      case 1: return 8;
      case 2: return 16;
      case 3: return 24;
      case 4: return 32;
      case 5: return 40;
      case 6: return 48;
      case 7: return 56;
      case 8: return 64;
      case 9: return 72;
      case 10: return 80;
      case 11: return 88;
      case 12: return 100;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-[#2c2e30] flex flex-col justify-between font-sans relative selection:bg-[#007755] selection:text-white overflow-x-hidden">
      
      {/* 1. TOP HEADER & PROGRESS BAR (Screens 1 to 11) */}
      {currentStep > 0 && currentStep < 12 && (
        <header className="w-full pt-3 pb-2 px-6 sm:px-10 flex flex-col z-20">
          <div className="flex items-center justify-between w-full h-[40px] mb-2">
            {/* Meso Brand Cluster */}
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setCurrentStep(0)}>
              <div className="w-[30px] h-[30px] rounded-full bg-[#007755] flex items-center justify-center text-white font-black text-[15px] shadow-sm tracking-tight">
                M
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-widest text-[#007755] uppercase">
                  MESO
                </span>
                <span className="text-[16px] font-bold text-[#1f2937] tracking-tight -mt-1">
                  cloud
                </span>
              </div>
            </div>

            {/* Center 'Get started' title */}
            <div className="text-[13px] font-medium text-[#6b7280]">
              Get started
            </div>

            {/* Right side 'Contact CA Experts' */}
            {currentStep >= 6 ? (
              <div className="flex items-center space-x-2">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=60" 
                  alt="CA Specialist" 
                  className="w-7 h-7 rounded-full object-cover border border-[#c7d1d9]"
                />
                <button 
                  onClick={() => alert('Connecting you with an Indian Chartered Accountant specialist...')}
                  className="text-[13px] font-medium text-[#1f2937] hover:text-[#007755] cursor-pointer"
                >
                  Contact CA experts
                </button>
              </div>
            ) : (
              <div className="w-[120px]" />
            )}
          </div>

          {/* Full-width Thin Progress Track */}
          <div className="w-full h-[6px] bg-[#eef2f5] border border-[#d2d9df] rounded-full overflow-hidden p-[1px]">
            <div 
              className="h-full bg-[#007755] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </header>
      )}

      {/* 2. DYNAMIC MAIN BODY VIEWPORTS */}
      <main className="flex-1 w-full flex items-center justify-center px-4 sm:px-8 py-6">
        {currentStep === 0 && (
          <Screen0Welcome onStart={() => setCurrentStep(1)} />
        )}

        {currentStep === 1 && (
          <Screen1BusinessName 
            businessName={formData.businessName}
            onChange={(val) => updateField('businessName', val)}
            showDisclaimer={showDisclaimerPopover}
            setShowDisclaimer={setShowDisclaimerPopover}
            stepError={stepError}
            onBack={handleBack}
            onNext={() => validateAndProceed()}
          />
        )}

        {currentStep === 2 && (
          <Screen2PriorSoftware 
            selected={formData.priorSoftware}
            onSelect={(val) => updateField('priorSoftware', val)}
            stepError={stepError}
            onBack={handleBack}
            onNext={() => validateAndProceed()}
          />
        )}

        {currentStep === 3 && (
          <Screen3Website 
            website={formData.website}
            onChange={(val) => updateField('website', val)}
            isDiscovering={isDiscoveringData}
            stepError={stepError}
            onBack={handleBack}
            onNext={() => validateAndProceed()}
            onSkip={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <Screen4CompanyProfile 
            businessName={formData.businessName}
            industry={formData.industry}
            taxType={formData.taxType}
            annualRevenue={formData.annualRevenue}
            stepError={stepError}
            onUpdate={updateField}
            onBack={handleBack}
            onNext={() => validateAndProceed()}
          />
        )}

        {currentStep === 5 && (
          <Screen5RoleAndTeam 
            role={formData.role}
            employeeCount={formData.employeeCount}
            stepError={stepError}
            onUpdate={updateField}
            onBack={handleBack}
            onNext={() => validateAndProceed()}
          />
        )}

        {currentStep === 6 && (
          <Screen6ExpertCall 
            onBack={handleBack}
            onSchedule={() => setShowScheduleModal(true)}
            onSkip={() => setCurrentStep(7)}
          />
        )}

        {currentStep === 7 && (
          <Screen7ChoosePath 
            showExpertTooltip={showExpertTooltip}
            onCloseTooltip={() => setShowExpertTooltip(false)}
            onSelectInvoicePath={() => setCurrentStep(8)}
            onSelectBankPath={() => setCurrentStep(10)}
            onBack={handleBack}
          />
        )}

        {currentStep === 8 && (
          <Screen8Payments 
            businessName={formData.businessName}
            onBack={handleBack}
            onSetUpPayments={() => setCurrentStep(9)}
            onSkip={() => setCurrentStep(9)}
          />
        )}

        {currentStep === 9 && (
          <Screen9MobileTapToPay 
            phoneNumber={formData.phoneNumber}
            phoneSubmitted={phoneSubmitted}
            onChangePhone={(val) => updateField('phoneNumber', val)}
            onSubmitPhone={() => {
              if (!formData.phoneNumber) {
                setStepError('Please enter a phone number to receive the link.');
                return;
              }
              setPhoneSubmitted(true);
            }}
            stepError={stepError}
            onBack={handleBack}
            onNext={() => setCurrentStep(10)}
            onSkip={() => setCurrentStep(10)}
          />
        )}

        {currentStep === 10 && (
          <Screen10BankConnect 
            onBack={handleBack}
            onLinkAccounts={() => {
              alert('Redirecting to RBI/NPCI Account Aggregator gateway (HDFC, ICICI, SBI)...');
              setCurrentStep(11);
            }}
            onSkip={() => setCurrentStep(11)}
          />
        )}

        {currentStep === 11 && (
          <Screen11FeaturesChecklist 
            selectedFeatures={formData.selectedFeatures}
            onToggleFeature={toggleFeature}
            onBack={handleBack}
            onNext={() => setCurrentStep(12)}
            onSkip={() => setCurrentStep(12)}
          />
        )}

        {currentStep === 12 && (
          <Screen12Frame094Loading 
            onComplete={() => {
              if (onComplete) onComplete(formData);
            }}
          />
        )}
      </main>

      {/* 3. SCHEDULE MODAL: 'This feature will be soon available' */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-[440px] w-full p-6 shadow-2xl border border-gray-200 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-[#e6f4ea] text-[#007755] flex items-center justify-center mx-auto mb-4">
              <Clock size={24} />
            </div>
            <h3 className="text-[20px] font-bold text-[#1f2937] mb-2">
              This feature will be soon available
            </h3>
            <p className="text-[13.5px] text-[#6b7280] leading-relaxed mb-6">
              Our 1-to-1 Chartered Accountant consultation scheduler is currently in private preview for Indian businesses. You will receive an invitation email once available.
            </p>
            <button
              onClick={() => {
                setShowScheduleModal(false);
                setCurrentStep(7);
              }}
              className="w-full h-[40px] bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[14px] rounded-[6px] shadow-sm cursor-pointer transition"
            >
              Got it, continue setup
            </button>
          </div>
        </div>
      )}

      {/* 4. PERSISTENT 'How\'s setup going?' TAB */}
      {currentStep < 12 && (
        <div className="fixed bottom-0 right-8 z-30">
          <button
            onClick={() => setShowHelpModal(!showHelpModal)}
            className="bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-[#d1d5db] border-b-0 text-[#374151] text-[12px] font-medium py-1.5 px-3.5 rounded-t-[4px] shadow-xs cursor-pointer flex items-center space-x-2 transition"
          >
            <span>How's setup going?</span>
            <div className="flex items-center space-x-0.5 text-gray-500">
              <Frown size={12} />
              <Meh size={12} />
              <Smile size={12} />
            </div>
          </button>

          {showHelpModal && (
            <div className="absolute right-0 bottom-full mb-1 w-80 bg-white border border-[#d1d5db] rounded-[8px] shadow-xl p-4 text-[#2c2e30]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[13px]">How is setup going?</span>
                <button onClick={() => setShowHelpModal(false)} className="text-[#6b7280] hover:text-black">
                  <X size={15} />
                </button>
              </div>
              <p className="text-[12px] text-[#6b7280] mb-3">
                We're tailoring Meso to your exact business workflow. Let us know how it's going:
              </p>
              <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-md border border-gray-200 mb-3">
                <button 
                  onClick={() => { alert('Glad setup is going great!'); setShowHelpModal(false); }}
                  className="flex flex-col items-center hover:scale-110 transition text-green-600"
                >
                  <Smile size={24} />
                  <span className="text-[10px] mt-1 text-gray-600">Great</span>
                </button>
                <button 
                  onClick={() => { alert('Thank you for letting us know.'); setShowHelpModal(false); }}
                  className="flex flex-col items-center hover:scale-110 transition text-amber-500"
                >
                  <Meh size={24} />
                  <span className="text-[10px] mt-1 text-gray-600">Okay</span>
                </button>
                <button 
                  onClick={() => { alert('Our CA support desk is ready to help.'); setShowHelpModal(false); }}
                  className="flex flex-col items-center hover:scale-110 transition text-red-500"
                >
                  <Frown size={24} />
                  <span className="text-[10px] mt-1 text-gray-600">Need help</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// =========================================================================
// SCREEN 0: WELCOME & NON-OVERLAPPING FLOATING PILLS CLOUD
// =========================================================================
function Screen0Welcome({ onStart }) {
  const pills = [
    { label: 'Sales & GST Invoicing', icon: BarChart2, bg: '#003366', tag: 'Billing' },
    { label: 'Customer Hub (CRM)', icon: Users, bg: '#00a3bf', tag: 'Clients' },
    { label: 'Business Tax & TDS', icon: PieChart, bg: '#332a7c', tag: 'Direct Tax' },
    { label: 'Payroll (EPF & ESI)', icon: ArrowRight, bg: '#0077c5', tag: 'Staff' },
    { label: 'General Ledger Accounting', icon: Building2, bg: '#005f43', tag: 'Ledger' },
    { label: 'GST (CGST / SGST / IGST)', icon: Percent, bg: '#0d2b45', tag: 'Indirect Tax' },
    { label: 'Expenses & Vendor Bills', icon: ArrowRight, bg: '#005f43', tag: 'AP' },
    { label: 'Team & Access Control', icon: Users, bg: '#0052cc', tag: 'Security' },
    { label: 'Banking & Auto-Reconcile', icon: CreditCard, bg: '#00875a', tag: 'Bank Feeds' },
  ];

  return (
    <div className="w-full max-w-[1400px] min-h-[580px] flex flex-col lg:flex-row items-center justify-between px-8 py-4 relative">
      {/* Left Column: Headline, Brand & Action */}
      <div className="max-w-[560px] flex flex-col items-start z-10">
        <div className="flex items-center space-x-2.5 mb-10">
          <div className="w-[36px] h-[36px] rounded-full bg-[#007755] flex items-center justify-center text-white font-black text-[18px] shadow-sm tracking-tight">
            M
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-widest text-[#007755] uppercase">
              MESO
            </span>
            <span className="text-[20px] font-bold text-[#1f2937] tracking-tight -mt-1">
              cloud
            </span>
          </div>
        </div>

        <h1 className="text-[44px] font-bold text-[#1f2937] leading-[1.18] tracking-tight mb-8">
          Get set up fast with AI and expert guidance
        </h1>

        <button
          onClick={onStart}
          className="h-[46px] px-8 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[15px] rounded-[4px] shadow-sm cursor-pointer transition transform active:scale-[0.98]"
        >
          Let's get started
        </button>
      </div>

      {/* Right Column: Clean Non-Overlapping Structured Grid of 9 Pills */}
      <div className="w-full lg:w-[640px] mt-10 lg:mt-0 p-6 bg-gradient-to-br from-[#f8fafc] to-[#eef7f4] rounded-3xl border border-[#dfe6e4] shadow-xs">
        <div className="text-[11px] font-bold text-[#007755] uppercase tracking-wider mb-4 px-1">
          Connected Modules in Your Suite
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5">
          {pills.map((p, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-3 shadow-sm border border-[#e5e7eb] flex items-center space-x-3 transition-all duration-200 hover:shadow-md hover:border-[#007755] cursor-default select-none"
            >
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[12px] shadow-2xs shrink-0"
                style={{ backgroundColor: p.bg }}
              >
                <p.icon size={16} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-[13px] font-semibold text-[#1f2937] truncate">
                  {p.label}
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                  {p.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 1: BUSINESS NAME (STARTS EMPTY + DISCLAIMER)
// =========================================================================
function Screen1BusinessName({ businessName, onChange, showDisclaimer, setShowDisclaimer, stepError, onBack, onNext }) {
  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        For starters, what's your business called?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        With this, we'll make sure your legal business name shows up in the right places.
      </p>

      <div className="mb-6 relative">
        <div className="flex items-center space-x-1.5 text-[12.5px] text-[#595959] mb-2 font-normal">
          <span>Your legal business name</span>
          <button 
            type="button" 
            onClick={() => setShowDisclaimer(!showDisclaimer)}
            className="text-[#6b7280] hover:text-[#007755] cursor-pointer"
            title="Legal Name Disclaimer"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Disclaimer Popover */}
        {showDisclaimer && (
          <div className="absolute left-0 top-10 w-[380px] bg-[#1e293b] text-white p-4 rounded-[8px] shadow-xl text-[12px] z-50 leading-relaxed border border-gray-700 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[12.5px] text-[#38bdf8] flex items-center gap-1.5">
                <Sparkles size={14} />
                MCA &amp; GSTIN Legal Entity Name
              </span>
              <button onClick={() => setShowDisclaimer(false)} className="text-gray-400 hover:text-white">
                <X size={14} />
              </button>
            </div>
            <p className="text-gray-200 text-[11.5px]">
              Enter the exact name registered with the Ministry of Corporate Affairs (MCA) or on your GST Registration Certificate. This name will appear on all statutory GST tax invoices, GSTR-1 &amp; GSTR-3B filings, audit trails, and official bank reconciliation logs.
            </p>
          </div>
        )}

        <input
          type="text"
          value={businessName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter legal business or company name..."
          autoFocus
          className={`w-full h-[44px] px-3.5 text-[14.5px] text-[#1f2937] border rounded-[4px] outline-none transition ${
            stepError ? 'border-red-500 focus:ring-1 focus:ring-red-500' : 'border-[#c7d1d9] focus:border-[#007755] focus:ring-1 focus:ring-[#007755]'
          }`}
        />

        {stepError && (
          <div className="flex items-center space-x-1.5 text-red-600 text-[12px] mt-2">
            <AlertCircle size={14} />
            <span>{stepError}</span>
          </div>
        )}
      </div>

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center space-x-3.5">
        <button
          onClick={onBack}
          className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 2: WHAT WERE YOU USING BEFORE (INDIAN ERPs & UNSELECTED BY DEFAULT)
// =========================================================================
function Screen2PriorSoftware({ selected, onSelect, stepError, onBack, onNext }) {
  const options = [
    { id: 'nothing', title: "Nothing, I'm new to this", icon: HelpCircle },
    { id: 'tally', title: 'Tally Prime / Tally ERP 9', icon: Building2 },
    { id: 'zoho', title: 'Zoho Books', icon: FileText },
    { id: 'busy', title: 'Busy Accounting Software', icon: Smartphone },
    { id: 'spreadsheets', title: 'Spreadsheets / Excel', icon: BarChart2 },
    { id: 'pen_paper', title: 'Something else (like pen & paper)', icon: FileText },
  ];

  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        What were you using before Meso?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        We'll bring over any master ledgers, vouchers, and contacts to give you a head start.
      </p>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
        {options.map((opt) => {
          const isSelected = selected === opt.id;
          const Icon = opt.icon;
          return (
            <div
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              className={`h-[68px] px-4 rounded-[6px] border flex items-center space-x-3.5 cursor-pointer transition select-none ${
                isSelected 
                  ? 'border-[#007755] bg-[#f0fdf4] shadow-xs' 
                  : 'border-[#e5e7eb] hover:border-[#9ca3af] bg-white'
              }`}
            >
              <div className={`${isSelected ? 'text-[#007755]' : 'text-gray-500'}`}>
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <span className="text-[13.5px] font-medium text-[#1f2937]">
                {opt.title}
              </span>
            </div>
          );
        })}
      </div>

      {stepError && (
        <div className="flex items-center space-x-1.5 text-red-600 text-[12px] mb-4">
          <AlertCircle size={14} />
          <span>{stepError}</span>
        </div>
      )}

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center space-x-3.5">
        <button
          onClick={onBack}
          className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 3: WEBSITE AUTOMATION (STARTS EMPTY + AUTO-DISCOVERY)
// =========================================================================
function Screen3Website({ website, onChange, isDiscovering, stepError, onBack, onNext, onSkip }) {
  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <div className="mb-2">
        <span className="inline-block bg-[#006677] text-white font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-[3px]">
          BETA
        </span>
      </div>

      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        Let's automate the basics. What's your website?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        We'll discover details like your registered office, industry classification, and size so you don't have to enter them yourself.
      </p>

      <div className="mb-8">
        <label className="block text-[12.5px] text-[#595959] mb-2 font-normal">
          Business website
        </label>
        <input
          type="text"
          value={website}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. https://mybusiness.in"
          autoFocus
          className="w-full h-[42px] px-3.5 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] focus:ring-1 focus:ring-[#007755] transition"
        />

        {isDiscovering && (
          <div className="flex items-center space-x-2 text-[#007755] text-[12px] font-medium mt-2.5 animate-pulse">
            <Sparkles size={14} />
            <span>Discovering MCA registry data, GSTIN jurisdiction &amp; business classifications...</span>
          </div>
        )}
      </div>

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onBack}
            className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={isDiscovering}
            className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition disabled:opacity-50"
          >
            {isDiscovering ? 'Analyzing...' : 'Next'}
          </button>
        </div>

        <button
          onClick={onSkip}
          className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
        >
          Skip and enter manually
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 4: COMPANY PROFILE (DYNAMIC NAME + FULL INDIAN INDUSTRIES + START EMPTY)
// =========================================================================
function Screen4CompanyProfile({ businessName, industry, taxType, annualRevenue, stepError, onUpdate, onBack, onNext }) {
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [industrySearch, setIndustrySearch] = useState(industry || '');

  const filteredIndustries = INDIAN_INDUSTRIES.filter(item => 
    item.toLowerCase().includes(industrySearch.toLowerCase())
  );

  return (
    <div className="w-full max-w-[700px] flex flex-col pt-4">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        Tell us more about {businessName || 'your business'}
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-6">
        This info will help us tailor Indian GST calculation, Chart of Accounts, and compliance schedules.
      </p>

      {/* Field 1: Industry with Search & Dropdown */}
      <div className="mb-5 relative">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          Industry (optional)
        </label>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            value={industrySearch}
            onFocus={() => setShowIndustryDropdown(true)}
            onChange={(e) => {
              setIndustrySearch(e.target.value);
              onUpdate('industry', e.target.value);
              setShowIndustryDropdown(true);
            }}
            placeholder="Search Indian industry classification (e.g. IT, Retail, Healthcare)..."
            className="w-full h-[42px] pl-10 pr-3.5 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] focus:ring-1 focus:ring-[#007755] transition"
          />
        </div>
        <span className="block text-[11.5px] text-[#6b7280] mt-1">
          Begin entering your industry and select the option that fits best.
        </span>

        {/* Industry Suggestions Menu */}
        {showIndustryDropdown && filteredIndustries.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-full max-h-56 overflow-y-auto bg-white border border-[#c7d1d9] rounded-md shadow-xl z-50 py-1">
            {filteredIndustries.map((ind, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setIndustrySearch(ind);
                  onUpdate('industry', ind);
                  setShowIndustryDropdown(false);
                }}
                className="w-full text-left px-3.5 py-2 text-[13px] text-[#1f2937] hover:bg-[#e6f4ea] hover:text-[#007755] transition"
              >
                {ind}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Field 2: Business Tax Type (Starts Empty) */}
      <div className="mb-5">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          Business tax type <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={taxType}
            onChange={(e) => onUpdate('taxType', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select tax type...</option>
            <option value="sole_proprietor">Sole Proprietorship (Individual PAN)</option>
            <option value="partnership">Partnership Firm (Deed Registered)</option>
            <option value="pvt_ltd">Private Limited Company (Pvt Ltd / MCA Registered)</option>
            <option value="llp">Limited Liability Partnership (LLP / Form 3)</option>
            <option value="public_ltd">Public Limited Company</option>
            <option value="huf">Hindu Undivided Family (HUF)</option>
            <option value="trust_ngo">Trust / NGO / Society (Section 8)</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
        <span className="block text-[11.5px] text-[#6b7280] mt-1">
          Entity constitution determines PAN entity classification (4th character validation) and tax filing requirements.
        </span>
      </div>

      {/* Field 3: Annual Revenue Bracket (Starts Empty) */}
      <div className="mb-6">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          What was your company's annual revenue last year? <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={annualRevenue}
            onChange={(e) => onUpdate('annualRevenue', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select annual turnover...</option>
            <option value="revenue_under_10l">Under ₹10 Lakhs (Below GST Threshold)</option>
            <option value="revenue_10l_50l">₹10 Lakhs - ₹50 Lakhs (Micro Enterprise)</option>
            <option value="revenue_50l_1_5cr">₹50 Lakhs - ₹1.5 Crores (Small Enterprise / Composition Scheme)</option>
            <option value="revenue_1_5cr_5cr">₹1.5 Crores - ₹5 Crores (Regular GST)</option>
            <option value="revenue_over_5cr">Over ₹5 Crores (Mandatory e-Invoicing &amp; e-Way Bill)</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
      </div>

      {stepError && (
        <div className="flex items-center space-x-1.5 text-red-600 text-[12px] mb-4">
          <AlertCircle size={14} />
          <span>{stepError}</span>
        </div>
      )}

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center space-x-3.5">
        <button
          onClick={onBack}
          className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 5: ROLE & EMPLOYEES (STARTS EMPTY + VALIDATION)
// =========================================================================
function Screen5RoleAndTeam({ role, employeeCount, stepError, onUpdate, onBack, onNext }) {
  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        Now, let's talk about your role in the business
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        This will help us tailor your experience to your business.
      </p>

      {/* Field 1: Role */}
      <div className="mb-6">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          What's your role? <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={role}
            onChange={(e) => onUpdate('role', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select your role...</option>
            <option value="owner">Business Owner / Managing Director</option>
            <option value="accountant">Designated Accountant / In-House Bookkeeper</option>
            <option value="cfo">Chief Financial Officer (CFO) / Finance Head</option>
            <option value="consultant">Practicing CA / External Auditor</option>
            <option value="manager">Operations &amp; Billing Manager</option>
            <option value="other">Other Role</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
      </div>

      {/* Field 2: Employee Count */}
      <div className="mb-6">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          How many employees? <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            value={employeeCount}
            onChange={(e) => onUpdate('employeeCount', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select number of employees...</option>
            <option value="just_me">Just me (Solo entrepreneur)</option>
            <option value="1_5">1-5 employees (Micro team)</option>
            <option value="6_15">6-15 employees (Small team)</option>
            <option value="16_50">16-50 employees (EPF applicability threshold)</option>
            <option value="50_plus">50+ employees (Full statutory payroll)</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
      </div>

      {stepError && (
        <div className="flex items-center space-x-1.5 text-red-600 text-[12px] mb-4">
          <AlertCircle size={14} />
          <span>{stepError}</span>
        </div>
      )}

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center space-x-3.5">
        <button
          onClick={onBack}
          className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 6: EXPERT 1-TO-1 CA CALL
// =========================================================================
function Screen6ExpertCall({ onBack, onSchedule, onSkip }) {
  return (
    <div className="w-full max-w-[840px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          An expert can get you up and running fast
        </h2>
        <p className="text-[14px] text-[#595959] leading-relaxed mb-6">
          Your Meso subscription includes a 1-to-1 personalized setup call with a qualified Chartered Accountant. They will help customize your Chart of Accounts, set up GSTIN branches, and configure TDS withholding.
        </p>

        <div className="mb-8">
          <div className="text-[14px] font-bold text-[#1f2937] mb-2">Learn how to:</div>
          <ul className="space-y-1.5 text-[13.5px] text-[#374151]">
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Keep your books organized under MCA audit trail rules</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Automate GST reconciliation with Meso Assist AI</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Track vendor TDS thresholds under Section 194C &amp; 194J</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Discover automated features tailored to your industry</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={onBack}
              className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
            >
              Back
            </button>
            <button
              onClick={onSchedule}
              className="h-[38px] px-6 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
            >
              Schedule a call
            </button>
          </div>

          <button
            onClick={onSkip}
            className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Right Graphic: 3 Friendly Experts with 'hi' bubble */}
      <div className="relative mt-8 md:mt-0 flex items-center justify-center">
        <div className="relative w-[280px] h-[200px] bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden">
          <div className="flex items-end space-x-2">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80"
              alt="CA Expert 1"
              className="w-16 h-20 rounded-t-full object-cover border-2 border-white shadow-xs"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&auto=format&fit=crop&q=80"
              alt="CA Expert 2"
              className="w-20 h-24 rounded-t-full object-cover border-2 border-white shadow-md z-10 -mx-1"
            />
            <img
              src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
              alt="CA Expert 3"
              className="w-16 h-20 rounded-t-full object-cover border-2 border-white shadow-xs"
            />
          </div>
          <div className="absolute top-4 right-6 w-9 h-9 rounded-full bg-[#0052cc] text-white font-bold text-[13px] flex items-center justify-center shadow-md animate-bounce">
            hi
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 7: CHOOSE FIRST AUTOMATION PATH (₹ RUPEES ONLY + WORKING TARGETS)
// =========================================================================
function Screen7ChoosePath({ showExpertTooltip, onCloseTooltip, onSelectInvoicePath, onSelectBankPath, onBack }) {
  return (
    <div className="w-full max-w-[880px] flex flex-col pt-4 relative">
      {/* Top Floating Dark Tooltip */}
      {showExpertTooltip && (
        <div className="absolute -top-12 right-0 bg-[#2b2f38] text-white p-3.5 rounded-[6px] shadow-lg w-[260px] text-[12px] z-30 leading-snug">
          <div className="flex items-start justify-between">
            <span className="font-bold text-[12.5px] text-white mb-1">We're here when you need us</span>
            <button onClick={onCloseTooltip} className="text-gray-400 hover:text-white -mt-1 ml-2">
              <X size={14} />
            </button>
          </div>
          <p className="text-gray-300 text-[11px]">
            Set up with confidence. Our team of CA specialists is here to guide your setup every step of the way.
          </p>
        </div>
      )}

      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        That's the basics. Let's keep going!
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        Set these up now to get more work automated for you later. Choose one to start.
      </p>

      {/* 2 Big Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Card 1: Invoice Customization (Suggested) */}
        <div className="border border-[#c7d1d9] rounded-[8px] p-6 bg-white shadow-xs flex flex-col justify-between hover:border-[#007755] transition">
          <div>
            <div className="w-full h-[180px] bg-[#eef7f9] rounded-[6px] p-4 flex flex-col items-center justify-center relative mb-5 overflow-hidden border border-[#d9ebf0]">
              <div className="absolute top-2.5 left-3">
                <span className="bg-[#0077c5] text-white text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[3px]">
                  SUGGESTED
                </span>
              </div>
              <div className="w-[190px] bg-white rounded-[6px] p-3 shadow-md border border-[#e5e7eb] flex flex-col">
                <div className="flex justify-between items-center mb-1 text-[10px] text-gray-400 font-semibold uppercase">
                  <span>TAX INVOICE</span>
                  <div className="flex space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
                  </div>
                </div>
                {/* ₹ RUPEES */}
                <div className="text-[18px] font-bold text-[#1f2937] mb-2">₹1,25,000</div>
                <div className="w-full h-2 bg-[#f3f4f6] rounded-sm mb-1.5" />
                <div className="w-3/4 h-2 bg-[#f3f4f6] rounded-sm mb-3" />
                <div className="flex items-center space-x-1.5 text-[8px] text-gray-500 font-medium">
                  <span className="border border-gray-300 rounded px-1">UPI</span>
                  <span className="border border-gray-300 rounded px-1">RuPay</span>
                  <span className="border border-gray-300 rounded px-1">NEFT</span>
                </div>
              </div>
            </div>

            <p className="text-[15px] font-semibold text-[#1f2937] text-center mb-5">
              Personalize your GST invoices and collect instant UPI payments
            </p>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={onSelectInvoicePath}
              className="w-full h-[40px] bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition mb-2"
            >
              Do this first
            </button>
            <button
              onClick={onSelectInvoicePath}
              className="text-[12.5px] font-medium text-[#007755] hover:underline"
            >
              Find out more
            </button>
          </div>
        </div>

        {/* Card 2: Link Bank / Card */}
        <div className="border border-[#c7d1d9] rounded-[8px] p-6 bg-white shadow-xs flex flex-col justify-between hover:border-[#007755] transition">
          <div>
            <div className="w-full h-[180px] bg-[#eef7f9] rounded-[6px] p-4 flex flex-col items-center justify-center relative mb-5 overflow-hidden border border-[#d9ebf0]">
              <div className="w-[190px] bg-white rounded-[6px] p-3 shadow-md border border-[#e5e7eb] flex flex-col">
                <span className="text-[10px] text-gray-400 font-semibold uppercase mb-1">
                  PROFIT &amp; LOSS:
                </span>
                {/* ₹ RUPEES */}
                <div className="text-[18px] font-bold text-[#1f2937] mb-3">₹2,50,000</div>
                <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden mb-2">
                  <div className="w-3/4 h-full bg-[#108000]" />
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden">
                  <div className="w-1/2 h-full bg-[#0077c5]" />
                </div>
              </div>
            </div>

            <p className="text-[15px] font-semibold text-[#1f2937] text-center mb-5">
              Link an Indian bank or corporate card to automate accounting
            </p>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={onSelectBankPath}
              className="w-full h-[40px] bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition mb-2"
            >
              Do this first
            </button>
            <button
              onClick={onSelectBankPath}
              className="text-[12.5px] font-medium text-[#007755] hover:underline"
            >
              Find out more
            </button>
          </div>
        </div>
      </div>

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center">
        <button
          onClick={onBack}
          className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
        >
          Back
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 8: STREAMLINE YOUR PAYMENTS (₹ RUPEES ONLY)
// =========================================================================
function Screen8Payments({ businessName, onBack, onSetUpPayments, onSkip }) {
  return (
    <div className="w-full max-w-[860px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          Now, let's streamline your payments in Meso
        </h2>
        <p className="text-[14.5px] text-[#595959] leading-relaxed mb-8">
          Set up custom GST invoices and automated UPI payment links that reconcile directly into your ledger upon receipt.
        </p>

        <div className="border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={onBack}
              className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
            >
              Back
            </button>
            <button
              onClick={onSetUpPayments}
              className="h-[38px] px-6 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
            >
              Set up payments
            </button>
          </div>

          <button
            onClick={onSkip}
            className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Right Graphic: Dynamic Invoice Preview Card with ₹ RUPEES */}
      <div className="relative mt-8 md:mt-0 flex items-center justify-center">
        <div className="w-[280px] h-[280px] rounded-full bg-[#dcf3f8] flex items-center justify-center p-6 shadow-xs">
          <div className="w-[230px] bg-white rounded-[12px] p-5 shadow-lg border-2 border-[#007755] flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase mb-1">
              TAX INVOICE #1001
            </span>
            <div className="text-[24px] font-black text-[#1f2937] mb-4">
              ₹1,25,000.00
            </div>
            <button 
              onClick={onSetUpPayments}
              className="w-full py-2 bg-[#007755] text-white font-bold text-[12.5px] rounded-[4px] mb-4 shadow-sm"
            >
              Pay via UPI / Card
            </button>
            <div className="flex items-center space-x-1.5 text-[8.5px] text-gray-500 font-semibold">
              <span>UPI</span>
              <span>•</span>
              <span>RuPay</span>
              <span>•</span>
              <span>NetBanking</span>
              <span>•</span>
              <span>NEFT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 9: MOBILE APP & TAP TO PAY (₹ RUPEES ONLY)
// =========================================================================
function Screen9MobileTapToPay({ phoneNumber, phoneSubmitted, onChangePhone, onSubmitPhone, stepError, onBack, onNext, onSkip }) {
  return (
    <div className="w-full max-w-[860px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          Accept in-person payment and get updates on invoices
        </h2>
        <p className="text-[14px] text-[#595959] leading-relaxed mb-6">
          With the Meso mobile companion, accept UPI QR payments, soundbox confirmations, and card taps. Get instantaneous mobile push notifications when customers view or settle invoices.
        </p>

        <div className="mb-6">
          <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
            Your mobile number
          </label>
          <div className="relative max-w-[280px]">
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full h-[40px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] transition"
            />
            <div className="absolute right-3 top-2.5 w-5 h-4 bg-[#007755] rounded-[2px] flex items-center justify-center text-white text-[8px] font-bold">
              IND
            </div>
          </div>
          <span className="block text-[11px] text-[#6b7280] mt-1 mb-3">
            *SMS download link provided at zero charge.
          </span>

          <button
            onClick={onSubmitPhone}
            disabled={phoneSubmitted}
            className={`h-[34px] px-4 rounded-[4px] font-semibold text-[12.5px] border transition cursor-pointer ${
              phoneSubmitted 
                ? 'bg-[#e6f4ea] text-[#007755] border-[#007755]' 
                : 'bg-white border-[#007755] text-[#007755] hover:bg-[#f0f7f4]'
            }`}
          >
            {phoneSubmitted ? '✓ Download link sent to mobile!' : 'Text me a download link'}
          </button>
        </div>

        <div className="border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={onBack}
              className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
            >
              Back
            </button>
            <button
              onClick={onNext}
              className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
            >
              Next
            </button>
          </div>

          <button
            onClick={onSkip}
            className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
          >
            Skip for now
          </button>
        </div>

        <p className="text-[10.5px] text-[#9ca3af] mt-4">
          *Tap to Pay &amp; Bharat QR available on Android and iOS devices.
        </p>
      </div>

      {/* Right Graphic: Tap to Pay with ₹1,725.00 + QR Code */}
      <div className="relative mt-8 md:mt-0 flex flex-col items-center">
        <div className="relative w-[240px] h-[240px] rounded-full bg-[#f3f4f6] flex items-center justify-center overflow-hidden border border-[#e5e7eb] shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=320&auto=format&fit=crop&q=80"
            alt="Tap to Pay on Mobile"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#007755] text-white font-black text-[14px] flex items-center justify-center shadow-md">
            M
          </div>
          <div className="absolute bottom-4 bg-white/95 px-3 py-1 rounded-full shadow-md text-[11px] font-bold text-[#1f2937]">
            ₹1,725.00 Settled
          </div>
        </div>

        <div className="mt-4 p-2 bg-white rounded-[6px] border border-[#d1d5db] shadow-xs flex flex-col items-center">
          <div className="w-[84px] h-[84px] bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-center justify-center">
            <QrCode size={70} className="text-[#1f2937]" />
          </div>
          <span className="text-[10px] text-[#6b7280] font-medium mt-1">
            Scan for Meso mobile app
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 10: CONNECT BANK ACCOUNTS (₹ RUPEES ONLY)
// =========================================================================
function Screen10BankConnect({ onBack, onLinkAccounts, onSkip }) {
  return (
    <div className="w-full max-w-[860px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          Connect your accounts for a true all-in-one experience
        </h2>
        <p className="text-[14.5px] text-[#595959] leading-relaxed mb-8">
          Bring your HDFC, ICICI, SBI or corporate credit card transactions directly into Meso using RBI-regulated Account Aggregators to eliminate manual entry.
        </p>

        <div className="border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <button
              onClick={onBack}
              className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
            >
              Back
            </button>
            <button
              onClick={onLinkAccounts}
              className="h-[38px] px-6 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition flex items-center space-x-2"
            >
              <Lock size={14} className="text-white" />
              <span>Link accounts</span>
            </button>
          </div>

          <button
            onClick={onSkip}
            className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Right Graphic: Profit & Loss Preview Card (₹ RUPEES) */}
      <div className="relative mt-8 md:mt-0 flex items-center justify-center">
        <div className="w-[280px] h-[280px] rounded-full bg-[#dcf3f8] flex items-center justify-center p-6 shadow-xs">
          <div className="w-[230px] bg-white rounded-[10px] p-5 shadow-lg border border-[#00b894] flex flex-col">
            <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase mb-1">
              PROFIT &amp; LOSS
            </span>
            <div className="text-[24px] font-bold text-[#1f2937]">
              ₹2,50,000
            </div>
            <span className="text-[10.5px] text-gray-500 mb-4">
              Net profit for last 30 days
            </span>

            {/* Income Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                <span>₹ Income</span>
                <span className="font-semibold text-green-700">₹4,20,000</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden flex">
                <div className="w-[65%] h-full bg-[#108000]" />
              </div>
            </div>

            {/* Expenses Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                <span>₹ Expenses</span>
                <span className="font-semibold text-blue-700">₹1,70,000</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden flex">
                <div className="w-[45%] h-full bg-[#0077c5]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 11: WHAT DO YOU WANT TO DO IN MESO (UNCHECKED BY DEFAULT)
// =========================================================================
function Screen11FeaturesChecklist({ selectedFeatures, onToggleFeature, onBack, onNext, onSkip }) {
  const features = [
    { id: 'customers', label: 'Get and manage customers', icon: Users },
    { id: 'invoices', label: 'Send & track GST tax invoices', icon: FileText },
    { id: 'banking', label: 'Connect Indian bank feeds (HDFC, ICICI, SBI)', icon: Landmark },
    { id: 'bills', label: 'Manage & pay vendor bills (AP)', icon: Calendar },
    { id: 'estimates', label: 'Create estimates, quotations or proformas', icon: Calculator },
    { id: 'time', label: "Track employee & contractor time", icon: Clock },
    { id: 'inventory', label: 'Manage item stock & inventory', icon: Package },
    { id: 'sales', label: 'Track sales & revenue channels', icon: Tag },
    { id: 'tax', label: 'Manage GST returns (GSTR-1, 3B) & TDS', icon: Percent },
    { id: 'mileage', label: 'Track business mileage & travel vouchers', icon: Car },
    { id: 'marketing', label: 'Send client campaigns & payment reminders', icon: Mail },
  ];

  return (
    <div className="w-full max-w-[760px] flex flex-col pt-4">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        What do you want to do in Meso?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        We'll enable these workspaces so you are ready immediately. Pick any you need:
      </p>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
        {features.map((item) => {
          const isChecked = selectedFeatures.includes(item.id);
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => onToggleFeature(item.id)}
              className={`h-[64px] px-4 rounded-[6px] border flex items-center space-x-3.5 cursor-pointer transition select-none ${
                isChecked
                  ? 'border-[#007755] bg-[#f0fdf4] shadow-xs ring-1 ring-[#007755]'
                  : 'border-[#e5e7eb] hover:border-[#9ca3af] bg-white'
              }`}
            >
              <div className={`${isChecked ? 'text-[#007755]' : 'text-[#007788]'}`}>
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-medium text-[#1f2937] flex-1">
                {item.label}
              </span>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                isChecked ? 'bg-[#007755] border-[#007755] text-white' : 'border-gray-300 bg-white'
              }`}>
                {isChecked && <Check size={13} strokeWidth={3} />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="w-full border-t border-[#e5e7eb] pt-6 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <button
            onClick={onBack}
            className="h-[38px] px-6 bg-white border border-[#007755] text-[#007755] font-semibold text-[13.5px] rounded-[4px] hover:bg-[#f0f7f4] cursor-pointer transition"
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="h-[38px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[13.5px] rounded-[4px] shadow-sm cursor-pointer transition"
          >
            Next
          </button>
        </div>

        <button
          onClick={onSkip}
          className="text-[13.5px] font-semibold text-[#007755] hover:underline cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 12: FRAME 094 LOADING CANVAS WITH ANIMATED CYAN UNDERLINE
// =========================================================================
function Screen12Frame094Loading({ onComplete }) {
  const [lineWidth, setLineWidth] = useState(0);

  useEffect(() => {
    // Smooth drawing animation for the cyan underline
    const timer = setTimeout(() => {
      setLineWidth(100);
    }, 300);

    // Auto complete after 3.2 seconds
    const finishTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3200);

    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div 
      onClick={onComplete}
      className="fixed inset-0 bg-white z-50 flex items-center justify-center cursor-pointer select-none"
    >
      <div className="text-center">
        <h1 className="text-[34px] sm:text-[38px] font-medium text-[#1f2937] tracking-normal">
          <span>Getting your </span>
          <span className="relative inline-block px-1">
            <span className="font-semibold">all-in-one</span>
            {/* Animated Cyan / Teal Underline */}
            <span 
              className="absolute left-0 bottom-[-2px] h-[3px] bg-[#00a3bf] rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,163,191,0.5)]"
              style={{
                width: `${lineWidth}%`,
              }}
            />
          </span>
          <span> platform</span>
        </h1>
        <p className="text-[13px] text-gray-400 mt-6 tracking-wide animate-pulse">
          Provisioning Indian Chart of Accounts, GST engine &amp; double-entry ledger...
        </p>
      </div>
    </div>
  );
}
