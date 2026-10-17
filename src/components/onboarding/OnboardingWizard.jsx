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
  Frown
} from 'lucide-react';

/**
 * MESO / QUICKBOOKS ONBOARDING WIZARD
 * Exact 1:1 pixel-coordinate replication of the 13 reference screens:
 * - Screen 0: Welcome Screen (9 Floating Pills)
 * - Screen 1: Business Name
 * - Screen 2: Prior Software
 * - Screen 3: Website Automation (BETA)
 * - Screen 4: Company Profile Details
 * - Screen 5: Role & Team Size
 * - Screen 6: Expert 1-on-1 Setup Call
 * - Screen 7: Choose Automation Path (Invoices vs Banking)
 * - Screen 8: Streamline Customer Payments
 * - Screen 9: In-Person Tap to Pay & Mobile App
 * - Screen 10: Bank & Credit Card Connect (All-in-one experience)
 * - Screen 11: Feature Selection Checklist (11 Cards)
 * - Screen 12: Frame 094 ("Getting your all-in-one platform" with animated cyan underline)
 */
export default function OnboardingWizard({ onComplete, onExit }) {
  // Wizard steps: 0 to 12
  const [currentStep, setCurrentStep] = useState(0);

  // Form Data State
  const [formData, setFormData] = useState({
    businessName: 'Pallet Town Creative Co.',
    priorSoftware: 'peachtree',
    website: 'https://pallettowncreative.in',
    industry: 'Advertising, Marketing & Brand Strategy',
    taxType: 'sole_proprietor',
    annualRevenue: 'revenue_50l_1_5cr',
    role: 'owner',
    employeeCount: '1_5',
    phoneNumber: '(555) 019-2834',
    selectedFeatures: [
      'customers',
      'invoices',
      'banking',
      'bills',
      'estimates',
      'sales'
    ],
  });

  // UI state
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showExpertTooltip, setShowExpertTooltip] = useState(true);
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);

  const updateField = (field, value) => {
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

  const handleNext = () => {
    if (currentStep < 12) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (onComplete) onComplete(formData);
    }
  };

  const handleBack = () => {
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
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formData]);

  // Compute progress bar fill percentage
  const getProgressPercentage = () => {
    switch (currentStep) {
      case 1: return 6;
      case 2: return 14;
      case 3: return 22;
      case 4: return 30;
      case 5: return 38;
      case 6: return 46;
      case 7: return 54;
      case 8: return 62;
      case 9: return 70;
      case 10: return 78;
      case 11: return 86;
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
            {/* Logo Cluster */}
            <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setCurrentStep(0)}>
              <div className="w-[30px] h-[30px] rounded-full bg-[#007755] flex items-center justify-center text-white font-bold text-[15px] shadow-sm tracking-tighter">
                qb
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold tracking-widest text-[#4b5563] uppercase">
                  INTUIT
                </span>
                <span className="text-[16px] font-bold text-[#1f2937] tracking-tight -mt-1">
                  quickbooks
                </span>
              </div>
            </div>

            {/* Center 'Get started' title */}
            <div className="text-[13px] font-medium text-[#6b7280]">
              Get started
            </div>

            {/* Right side 'Contact experts' for screens 6-11 */}
            {currentStep >= 6 ? (
              <div className="flex items-center space-x-2">
                <img 
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=60" 
                  alt="Expert" 
                  className="w-7 h-7 rounded-full object-cover border border-[#c7d1d9]"
                />
                <button 
                  onClick={() => alert('Connecting you with a verified setup expert...')}
                  className="text-[13px] font-medium text-[#1f2937] hover:text-[#007755] cursor-pointer"
                >
                  Contact experts
                </button>
              </div>
            ) : (
              <div className="w-[120px]" />
            )}
          </div>

          {/* Full-width Progress Bar */}
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
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <Screen2PriorSoftware 
            selected={formData.priorSoftware}
            onSelect={(val) => updateField('priorSoftware', val)}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 3 && (
          <Screen3Website 
            website={formData.website}
            onChange={(val) => updateField('website', val)}
            onBack={handleBack}
            onNext={handleNext}
            onSkip={handleNext}
          />
        )}

        {currentStep === 4 && (
          <Screen4CompanyProfile 
            businessName={formData.businessName}
            industry={formData.industry}
            taxType={formData.taxType}
            annualRevenue={formData.annualRevenue}
            onUpdate={updateField}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 5 && (
          <Screen5RoleAndTeam 
            role={formData.role}
            employeeCount={formData.employeeCount}
            onUpdate={updateField}
            onBack={handleBack}
            onNext={handleNext}
          />
        )}

        {currentStep === 6 && (
          <Screen6ExpertCall 
            onBack={handleBack}
            onSchedule={() => {
              alert('Setup consultation scheduled for ' + formData.businessName + '!');
              handleNext();
            }}
            onSkip={handleNext}
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
            onSubmitPhone={() => setPhoneSubmitted(true)}
            onBack={handleBack}
            onNext={() => setCurrentStep(10)}
            onSkip={() => setCurrentStep(10)}
          />
        )}

        {currentStep === 10 && (
          <Screen10BankConnect 
            onBack={handleBack}
            onLinkAccounts={() => {
              alert('Account link initialized. Proceeding to feature customization.');
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

      {/* 3. PERSISTENT 'How\'s setup going?' TAB */}
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
                We're tailoring the experience to your business. How are things feeling?
              </p>
              <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-md border border-gray-200 mb-3">
                <button 
                  onClick={() => { alert('Glad it is going great!'); setShowHelpModal(false); }}
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
                  onClick={() => { alert('Our support team is ready to help.'); setShowHelpModal(false); }}
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
// SCREEN 0: WELCOME & FLOATING PILLS CLUSTER
// =========================================================================
function Screen0Welcome({ onStart }) {
  const pills = [
    { label: 'Sales & Get Paid', icon: BarChart2, bg: '#003366', text: '#fff', x: '58%', y: '34%' },
    { label: 'Customer Hub', icon: Users, bg: '#00a3bf', text: '#fff', x: '52%', y: '43%' },
    { label: 'Business Tax', icon: PieChart, bg: '#332a7c', text: '#fff', x: '67%', y: '43%' },
    { label: 'Payroll', icon: ArrowRight, bg: '#0077c5', text: '#fff', x: '49%', y: '51%' },
    { label: 'Accounting', icon: Building2, bg: '#005f43', text: '#fff', x: '60%', y: '51%' },
    { label: 'Sales Tax', icon: Percent, bg: '#0d2b45', text: '#fff', x: '71%', y: '51%' },
    { label: 'Expenses & Pay Bills', icon: ArrowRight, bg: '#005f43', text: '#fff', x: '55%', y: '58%' },
    { label: 'Team', icon: Users, bg: '#0052cc', text: '#fff', x: '69%', y: '58%' },
    { label: 'Lending', icon: CreditCard, bg: '#00875a', text: '#fff', x: '62%', y: '65%' },
  ];

  return (
    <div className="w-full max-w-[1400px] min-h-[580px] flex flex-col lg:flex-row items-center justify-between px-8 relative">
      {/* Left Column: Headline, Brand & Action */}
      <div className="max-w-[560px] flex flex-col items-start z-10">
        <div className="flex items-center space-x-2.5 mb-12">
          <div className="w-[34px] h-[34px] rounded-full bg-[#007755] flex items-center justify-center text-white font-bold text-[17px] shadow-sm tracking-tighter">
            qb
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[11px] font-bold tracking-widest text-[#4b5563] uppercase">
              INTUIT
            </span>
            <span className="text-[19px] font-bold text-[#1f2937] tracking-tight -mt-1">
              quickbooks
            </span>
          </div>
        </div>

        <h1 className="text-[44px] font-bold text-[#1f2937] leading-[1.18] tracking-tight mb-8">
          Get set up fast with AI and expert guidance
        </h1>

        <button
          onClick={onStart}
          className="h-[44px] px-7 bg-[#007755] hover:bg-[#005f43] text-white font-semibold text-[14.5px] rounded-[4px] shadow-sm cursor-pointer transition transform active:scale-[0.98]"
        >
          Let's get started
        </button>
      </div>

      {/* Right Column: Floating Cloud of 9 Pills */}
      <div className="w-full lg:w-[680px] h-[460px] relative mt-10 lg:mt-0 flex items-center justify-center">
        {pills.map((p, idx) => (
          <div
            key={idx}
            className="absolute bg-white rounded-full px-3.5 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.08)] border border-[#f0f2f5] flex items-center space-x-2.5 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-default select-none animate-pulse"
            style={{
              left: p.x,
              top: p.y,
              transform: 'translate(-50%, -50%)',
              animationDuration: `${3 + (idx % 3)}s`
            }}
          >
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] shadow-2xs"
              style={{ backgroundColor: p.bg }}
            >
              <p.icon size={13} strokeWidth={2.5} />
            </div>
            <span className="text-[13px] font-medium text-[#1f2937] pr-1">
              {p.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 1: BUSINESS NAME
// =========================================================================
function Screen1BusinessName({ businessName, onChange, onBack, onNext }) {
  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        For starters, what's your business called?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        With this, we'll make sure your legal business name shows up in the right places.
      </p>

      <div className="mb-8">
        <label className="flex items-center space-x-1.5 text-[12.5px] text-[#595959] mb-2 font-normal">
          <span>Your legal business name</span>
          <Info size={13} className="text-[#6b7280] cursor-pointer" />
        </label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => onChange(e.target.value)}
          placeholder="No company name"
          autoFocus
          className="w-full h-[42px] px-3.5 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] focus:ring-1 focus:ring-[#007755] transition"
        />
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
// SCREEN 2: WHAT WERE YOU USING BEFORE
// =========================================================================
function Screen2PriorSoftware({ selected, onSelect, onBack, onNext }) {
  const options = [
    { id: 'nothing', title: "Nothing, I'm new to this", icon: HelpCircle },
    { id: 'desktop', title: 'QuickBooks Desktop™', icon: Smartphone },
    { id: 'peachtree', title: 'Sage 50 or Peachtree', icon: FileText },
    { id: 'another', title: 'Another bookkeeping software', icon: Smartphone },
    { id: 'spreadsheets', title: 'Spreadsheets', icon: BarChart2 },
    { id: 'pen_paper', title: 'Something else (like pen & paper)', icon: FileText },
  ];

  return (
    <div className="w-full max-w-[700px] flex flex-col pt-6">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        What were you using before QuickBooks?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        We'll bring over any data we can find to give you a head start.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
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
              <div className="text-[#007755]">
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <span className="text-[13.5px] font-medium text-[#1f2937]">
                {opt.title}
              </span>
            </div>
          );
        })}
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
// SCREEN 3: WEBSITE AUTOMATION (BETA)
// =========================================================================
function Screen3Website({ website, onChange, onBack, onNext, onSkip }) {
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
        We'll find details like your business name, industry, and size so you don't have to enter them yourself.
      </p>

      <div className="mb-8">
        <label className="block text-[12.5px] text-[#595959] mb-2 font-normal">
          Business website
        </label>
        <input
          type="text"
          value={website}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          autoFocus
          className="w-full h-[42px] px-3.5 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] focus:ring-1 focus:ring-[#007755] transition"
        />
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
          Skip and enter manually
        </button>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 4: TELL US MORE ABOUT YOUR BUSINESS
// =========================================================================
function Screen4CompanyProfile({ businessName, industry, taxType, annualRevenue, onUpdate, onBack, onNext }) {
  return (
    <div className="w-full max-w-[700px] flex flex-col pt-4">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        Tell us more about {businessName || 'Pallet Town Creative Co.'}
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-6">
        This info will help us make better suggestions for your business.
      </p>

      {/* Field 1: Industry */}
      <div className="mb-5">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          Industry (optional)
        </label>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-3 text-[#9ca3af]" />
          <input
            type="text"
            value={industry}
            onChange={(e) => onUpdate('industry', e.target.value)}
            placeholder="Construction, retail, salon, etc."
            className="w-full h-[42px] pl-10 pr-3.5 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] focus:ring-1 focus:ring-[#007755] transition"
          />
        </div>
        <span className="block text-[11.5px] text-[#6b7280] mt-1">
          Begin entering your industry and select the option that fits best.
        </span>
      </div>

      {/* Field 2: Business Tax Type */}
      <div className="mb-5">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          Business tax type
        </label>
        <div className="relative">
          <select
            value={taxType}
            onChange={(e) => onUpdate('taxType', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="sole_proprietor">Sole Proprietorship</option>
            <option value="partnership">Partnership Firm</option>
            <option value="pvt_ltd">Private Limited Company (Pvt Ltd)</option>
            <option value="llp">Limited Liability Partnership (LLP)</option>
            <option value="nonprofit">Nonprofit Organization</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
        <span className="block text-[11.5px] text-[#6b7280] mt-1">
          LLC isn't shown because an LLC can be created alongside another business type. For example: sole proprietor as a single member LLC.
        </span>
      </div>

      {/* Field 3: Annual Revenue */}
      <div className="mb-7">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          What was your company's annual revenue last year?
        </label>
        <div className="relative">
          <select
            value={annualRevenue}
            onChange={(e) => onUpdate('annualRevenue', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="revenue_under_10l">Under ₹10,00,000 (Under $15k)</option>
            <option value="revenue_10l_50l">₹10,00,000 - ₹50,00,000 ($15k - $75k)</option>
            <option value="revenue_50l_1_5cr">₹50,00,000 - ₹1,50,00,000 ($75k - $200k)</option>
            <option value="revenue_1_5cr_5cr">₹1,50,00,000 - ₹5,00,00,000 ($200k - $700k)</option>
            <option value="revenue_over_5cr">Over ₹5,00,00,000 (Over $700k)</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
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
// SCREEN 5: ROLE & EMPLOYEES
// =========================================================================
function Screen5RoleAndTeam({ role, employeeCount, onUpdate, onBack, onNext }) {
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
          What's your role?
        </label>
        <div className="relative">
          <select
            value={role}
            onChange={(e) => onUpdate('role', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="owner">Owner / Founder</option>
            <option value="accountant">Accountant / Bookkeeper</option>
            <option value="cfo">Finance Director / CFO</option>
            <option value="manager">Operations Manager</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
      </div>

      {/* Field 2: Employee Count */}
      <div className="mb-8">
        <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
          How many employees?
        </label>
        <div className="relative">
          <select
            value={employeeCount}
            onChange={(e) => onUpdate('employeeCount', e.target.value)}
            className="w-full h-[42px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] bg-white appearance-none outline-none focus:border-[#007755] transition cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="just_me">Just me</option>
            <option value="1_5">1-5 employees</option>
            <option value="6_15">6-15 employees</option>
            <option value="16_50">16-50 employees</option>
            <option value="50_plus">50+ employees</option>
          </select>
          <ChevronDown size={16} className="absolute right-3.5 top-3.5 text-[#6b7280] pointer-events-none" />
        </div>
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
// SCREEN 6: EXPERT 1-TO-1 CALL
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
          Your subscription comes with a 1-to-1 personalized setup call. A setup expert will customize your account, find the right tools for your business, and help you start using QuickBooks with confidence.
        </p>

        <div className="mb-8">
          <div className="text-[14px] font-bold text-[#1f2937] mb-2">Learn how to:</div>
          <ul className="space-y-1.5 text-[13.5px] text-[#374151]">
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Keep your business organized</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Automate your accounting with AI</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Track income and expenses</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="text-[#007755] font-bold">•</span>
              <span>Discover features that work for you</span>
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
              alt="Expert 1"
              className="w-16 h-20 rounded-t-full object-cover border-2 border-white shadow-xs"
            />
            <img
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=140&auto=format&fit=crop&q=80"
              alt="Expert 2"
              className="w-20 h-24 rounded-t-full object-cover border-2 border-white shadow-md z-10 -mx-1"
            />
            <img
              src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80"
              alt="Expert 3"
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
// SCREEN 7: CHOOSE FIRST AUTOMATION PATH
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
            Set up with confidence. Our team of experts is here to help every step of the way.
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
                  <span>INVOICE</span>
                  <div className="flex space-x-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" />
                  </div>
                </div>
                <div className="text-[18px] font-bold text-[#1f2937] mb-2">$1,250</div>
                <div className="w-full h-2 bg-[#f3f4f6] rounded-sm mb-1.5" />
                <div className="w-3/4 h-2 bg-[#f3f4f6] rounded-sm mb-3" />
                <div className="flex items-center space-x-1.5 text-[8px] text-gray-500 font-medium">
                  <span className="border border-gray-300 rounded px-1">Apple Pay</span>
                  <span className="border border-gray-300 rounded px-1">VISA</span>
                  <span className="border border-gray-300 rounded px-1">UPI</span>
                </div>
              </div>
            </div>

            <p className="text-[15px] font-semibold text-[#1f2937] text-center mb-5">
              Personalize your invoices and make them payable
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
                  PROFIT & LOSS:
                </span>
                <div className="text-[18px] font-bold text-[#1f2937] mb-3">$2,500</div>
                <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden mb-2">
                  <div className="w-3/4 h-full bg-[#108000]" />
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden">
                  <div className="w-1/2 h-full bg-[#0077c5]" />
                </div>
              </div>
            </div>

            <p className="text-[15px] font-semibold text-[#1f2937] text-center mb-5">
              Link a bank or credit card to automate accounting
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
// SCREEN 8: STREAMLINE YOUR CUSTOMER PAYMENTS
// =========================================================================
function Screen8Payments({ businessName, onBack, onSetUpPayments, onSkip }) {
  return (
    <div className="w-full max-w-[860px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          Now, let's streamline your payments in QuickBooks
        </h2>
        <p className="text-[14.5px] text-[#595959] leading-relaxed mb-8">
          Set up custom invoices and payments that flow right into your books, getting you ready for AI automation and organization.
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

      {/* Right Graphic: Dynamic Invoice Preview Card */}
      <div className="relative mt-8 md:mt-0 flex items-center justify-center">
        <div className="w-[280px] h-[280px] rounded-full bg-[#dcf3f8] flex items-center justify-center p-6 shadow-xs">
          <div className="w-[220px] bg-white rounded-[12px] p-5 shadow-lg border-2 border-[#007755] flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase mb-1">
              INVOICE 1001
            </span>
            <div className="text-[24px] font-black text-[#1f2937] mb-4">
              $1,250.00
            </div>
            <button 
              onClick={onSetUpPayments}
              className="w-full py-2 bg-[#007755] text-white font-bold text-[12.5px] rounded-[4px] mb-4 shadow-sm"
            >
              Pay online
            </button>
            <div className="flex items-center space-x-1.5 text-[8.5px] text-gray-500 font-semibold">
              <span>Apple Pay</span>
              <span>•</span>
              <span>VISA</span>
              <span>•</span>
              <span>Mastercard</span>
              <span>•</span>
              <span>UPI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 9: MOBILE APP & TAP TO PAY
// =========================================================================
function Screen9MobileTapToPay({ phoneNumber, phoneSubmitted, onChangePhone, onSubmitPhone, onBack, onNext, onSkip }) {
  return (
    <div className="w-full max-w-[860px] flex flex-col md:flex-row items-center justify-between pt-4">
      {/* Left Details */}
      <div className="max-w-[480px]">
        <h2 className="text-[32px] font-bold text-[#1f2937] leading-[1.2] mb-3">
          Accept in-person payment and get updates on invoices
        </h2>
        <p className="text-[14px] text-[#595959] leading-relaxed mb-6">
          With the mobile app, accept contactless payments with Tap to Pay on iPhone*, card reader, and more. And get real-time updates when invoices are viewed and paid.
        </p>

        <div className="mb-6">
          <label className="block text-[12.5px] text-[#595959] mb-1.5 font-normal">
            Your phone number
          </label>
          <div className="relative max-w-[280px]">
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => onChangePhone(e.target.value)}
              placeholder="(000) 000-0000"
              className="w-full h-[40px] px-3.5 pr-10 text-[14px] text-[#1f2937] border border-[#c7d1d9] rounded-[4px] outline-none focus:border-[#007755] transition"
            />
            <div className="absolute right-3 top-2.5 w-5 h-4 bg-red-600 rounded-[2px] flex items-center justify-center text-white text-[8px] font-bold">
              •••
            </div>
          </div>
          <span className="block text-[11px] text-[#6b7280] mt-1 mb-3">
            *Messaging and data rates may apply.
          </span>

          <button
            onClick={onSubmitPhone}
            disabled={phoneSubmitted}
            className={`h-[34px] px-4 rounded-[4px] font-semibold text-[12.5px] border transition ${
              phoneSubmitted 
                ? 'bg-[#e6f4ea] text-[#007755] border-[#007755]' 
                : 'bg-white border-[#007755] text-[#007755] hover:bg-[#f0f7f4]'
            }`}
          >
            {phoneSubmitted ? '✓ Download link sent!' : 'Text me a download link'}
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
          *Tap to Pay on iPhone available on eligible iPhones
        </p>
      </div>

      {/* Right Graphic: Tap to Pay on iPhone + QR Code */}
      <div className="relative mt-8 md:mt-0 flex flex-col items-center">
        <div className="relative w-[240px] h-[240px] rounded-full bg-[#f3f4f6] flex items-center justify-center overflow-hidden border border-[#e5e7eb] shadow-sm">
          <img
            src="https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=320&auto=format&fit=crop&q=80"
            alt="Tap to Pay on iPhone"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#007755] text-white font-black text-[14px] flex items-center justify-center shadow-md">
            qb
          </div>
        </div>

        <div className="mt-4 p-2 bg-white rounded-[6px] border border-[#d1d5db] shadow-xs flex flex-col items-center">
          <div className="w-[84px] h-[84px] bg-[#f8fafc] border border-[#e2e8f0] rounded flex items-center justify-center">
            <QrCode size={70} className="text-[#1f2937]" />
          </div>
          <span className="text-[10px] text-[#6b7280] font-medium mt-1">
            Scan to download app
          </span>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SCREEN 10: CONNECT YOUR ACCOUNTS (ALL-IN-ONE EXPERIENCE)
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
          Bring your business bank and credit card transactions into QuickBooks to get things organized and understand your business better.
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

      {/* Right Graphic: Profit & Loss Preview Card */}
      <div className="relative mt-8 md:mt-0 flex items-center justify-center">
        <div className="w-[280px] h-[280px] rounded-full bg-[#dcf3f8] flex items-center justify-center p-6 shadow-xs">
          <div className="w-[230px] bg-white rounded-[10px] p-5 shadow-lg border border-[#00b894] flex flex-col">
            <span className="text-[10px] font-bold text-[#6b7280] tracking-wider uppercase mb-1">
              PROFIT & LOSS
            </span>
            <div className="text-[24px] font-bold text-[#1f2937]">
              $2,500
            </div>
            <span className="text-[10.5px] text-gray-500 mb-4">
              Net profit for last 30 days
            </span>

            {/* Income Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                <span>$ Income</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-sm overflow-hidden flex">
                <div className="w-[65%] h-full bg-[#108000]" />
              </div>
            </div>

            {/* Expenses Bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-gray-600 mb-1">
                <span>$ Expenses</span>
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
// SCREEN 11: WHAT DO YOU WANT TO DO IN QUICKBOOKS (11 CARDS)
// =========================================================================
function Screen11FeaturesChecklist({ selectedFeatures, onToggleFeature, onBack, onNext, onSkip }) {
  const features = [
    { id: 'customers', label: 'Get and manage customers', icon: Users },
    { id: 'invoices', label: 'Send & track invoices', icon: FileText },
    { id: 'banking', label: 'Get business banking (3.00% APY eligible)', icon: Landmark },
    { id: 'bills', label: 'Manage & pay bills', icon: Calendar },
    { id: 'estimates', label: 'Create estimates or quotes', icon: Calculator },
    { id: 'time', label: "Track team's time", icon: Clock },
    { id: 'inventory', label: 'Manage inventory', icon: Package },
    { id: 'sales', label: 'Track sales', icon: Tag },
    { id: 'tax', label: 'Manage sales tax', icon: Percent },
    { id: 'mileage', label: 'Track mileage deductions', icon: Car },
    { id: 'marketing', label: 'Send marketing emails', icon: Mail },
  ];

  return (
    <div className="w-full max-w-[760px] flex flex-col pt-4">
      <h2 className="text-[32px] font-bold text-[#1f2937] leading-tight mb-2">
        What do you want to do in QuickBooks?
      </h2>
      <p className="text-[14.5px] text-[#595959] mb-8">
        We'll help you set it up when you're ready.
      </p>

      {/* 2-Column Grid for the 11 feature cards */}
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
                  ? 'border-[#007755] bg-[#f0fdf4] shadow-xs'
                  : 'border-[#e5e7eb] hover:border-[#9ca3af] bg-white'
              }`}
            >
              <div className={`${isChecked ? 'text-[#007755]' : 'text-[#007788]'}`}>
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-medium text-[#1f2937]">
                {item.label}
              </span>
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
    }, 250);

    // Auto complete after 3 seconds
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
          Setting up your chart of accounts, tax compliance & bank feeds...
        </p>
      </div>
    </div>
  );
}
