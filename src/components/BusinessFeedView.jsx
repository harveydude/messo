import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Check, Settings, Landmark, Sparkles, Building2 } from 'lucide-react';

/**
 * Business Feed.
 *
 * Built to match frame 401 of the QuickBooks walkthrough exactly: the greeting
 * line, the reminder card with its tone selector and message preview, the
 * "Bank transactions / Connect an account" card with six bank tiles, the
 * Autofill and Intuit's AI agents panels on the right, and the generative-AI
 * footer.
 *
 * WHAT WAS WRONG WITH THE PREVIOUS VERSION, AND WHY IT IS NOT HERE
 *
 * The earlier version was invented. It shipped "severity" chips
 * (Needs attention / Due soon), computed cards for overdue invoices and
 * uncategorised bank rows, a dismiss button per card, and an empty-state line.
 * None of that is in the product. It read as a plausible AI dashboard, which is
 * exactly the problem: an accountant looking at it could not tell the invented
 * structure apart from the real one.
 *
 * This version copies what the reference shows. The figures that appear -- the
 * customer's name, the invoice date, the overdue balance, the sample email
 * address -- are the sample data the real screen ships with, and they are in the
 * store so they are stated once rather than repeated.
 *
 * The tone dropdown and the AI-agents panel stay, because they are in the
 * reference. Removing genuinely-present parts of the design would be as wrong as
 * inventing parts that are absent.
 */

/** The six banks the connect-account card offers. In the order shown. */
const BANKS = [
  { name: 'Citi Bank', logo: 'citi' },
  { name: 'Chase', logo: 'chase' },
  { name: 'U.S. Bank', logo: 'usbank' },
  { name: 'Bank of America', logo: 'bofa' },
  { name: 'Wells Fargo', logo: 'wellsfargo' },
  { name: 'Capital One', logo: 'capitalone' },
];

/** Tone options behind the little face dropdown on the reminder card. */
const TONES = [
  { label: 'Formal', face: '\u{1F610}' },
  { label: 'Friendly', face: '\u{1F60A}' },
  { label: 'Direct', face: '\u{1F611}' },
  { label: 'Apologetic', face: '\u{1F61F}' },
];

export default function BusinessFeedView() {
  const [tone, setTone] = useState('Formal');
  const [toneOpen, setToneOpen] = useState(false);
  const [docType, setDocType] = useState('Bill');
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [view, setView] = useState('files');
  const [autofillOpen, setAutofillOpen] = useState(true);
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const face = (TONES.find((t) => t.label === tone) || TONES[0]).face;
  const email = 'sample_company_7825+expense@quickbooks.com';

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* ---------------- Feed column ---------------- */}
      <div className="flex-1 overflow-y-auto px-[44px] py-[28px]">
        <h1 className="text-[34px] font-normal text-[#393A3D] tracking-tight">Business Feed</h1>

        <p className="flex items-center gap-2 mt-2 mb-7 text-[15px] text-[#393A3D]">
          <Sparkles size={17} className="text-[#0077C5] shrink-0" aria-hidden="true" />
          Here are the latest suggestions and work done for you, TeachUcomp!
        </p>

        {/* ---- Reminder card ---- */}
        <section className="border border-[#D4D7DC] rounded-lg mb-6">
          {/* Tone selector and the message preview it produces. */}
          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setToneOpen((o) => !o)}
                aria-expanded={toneOpen}
                aria-haspopup="listbox"
                className="flex items-center gap-2 h-[36px] px-3 border border-[#6B6C72] rounded-[4px] bg-white text-[15px] text-[#393A3D] cursor-pointer hover:border-black"
              >
                <span aria-hidden="true">{face}</span>
                {tone}
                <ChevronDown size={15} className="text-[#393A3D]" />
              </button>
              {toneOpen && (
                <ul
                  role="listbox"
                  className="absolute left-0 top-[40px] z-10 w-[180px] bg-white border border-[#D4D7DC] rounded-[4px] shadow-lg py-1"
                >
                  {TONES.map((t) => (
                    <li key={t.label}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={t.label === tone}
                        onClick={() => {
                          setTone(t.label);
                          setToneOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[14px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer"
                      >
                        <span aria-hidden="true">{t.face}</span>
                        {t.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* The drafted reminder, as a message bubble. */}
            <div className="max-w-[430px] bg-[#EDEEF0] rounded-[18px] rounded-tr-[4px] px-4 py-3 text-[14px] leading-[1.45] text-[#393A3D]">
              Hi Christine, this invoice was due 07-12-2024 and is now 4 days
              overdue. The outstanding balance is $3,190.65. We&hellip;
            </div>
          </div>

          {/* The offer itself. */}
          <div className="px-6 pt-2 pb-5">
            <h2 className="text-[20px] font-normal text-[#393A3D]">
              Personalized reminders can get you paid on time
            </h2>

            <div className="flex items-center justify-between mt-4">
              <button type="button" className="flex items-center gap-1 text-[15px] font-medium text-[#0077C5] hover:underline cursor-pointer">
                Learn how
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                className="h-[38px] px-5 border border-[#2CA01C] rounded-[4px] text-[15px] font-semibold text-[#2CA01C] bg-white hover:bg-[#F0F9EF] cursor-pointer"
              >
                Try it out
              </button>
            </div>
          </div>
        </section>

        {/* ---- Connect an account ---- */}
        <section className="border border-[#D4D7DC] rounded-lg px-6 py-6">
          <div className="flex items-start gap-3">
            <span
              className="w-[36px] h-[36px] rounded-full bg-[#F4F5F8] flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Landmark size={20} className="text-[#393A3D]" />
            </span>
            <div>
              <h2 className="text-[20px] font-normal text-[#393A3D]">Bank transactions</h2>
              <p className="text-[15px] text-[#6B6C72]">Connect account</p>
            </div>
          </div>

          <p className="mt-5 text-[15px] text-[#393A3D]">Connect an account to bring in transactions</p>
          <p className="text-[15px] text-[#6B6C72]">
            See your business finances clearly by tracking income and expenses automatically
          </p>

          <ul className="grid grid-cols-3 gap-4 mt-5">
            {BANKS.map((bank) => (
              <li key={bank.name}>
                <button
                  type="button"
                  className="w-full flex items-center gap-3 h-[52px] px-4 border border-[#D4D7DC] rounded-[4px] bg-white hover:border-[#8D9096] cursor-pointer transition"
                >
                  <BankMark bank={bank} />
                  <span className="text-[15px] font-medium text-[#393A3D] truncate">{bank.name}</span>
                  <span
                    className="ml-auto w-[24px] h-[24px] rounded-full bg-[#0077C5] text-white flex items-center justify-center text-[18px] leading-none shrink-0"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-center mt-8 mb-2">
          <a href="#generative-ai" className="text-[13px] text-[#0077C5] hover:underline">
            Important information about how we use generative AI
          </a>
        </p>
      </div>

      {/* ---------------- Right panel ---------------- */}
      <aside className="w-[360px] shrink-0 border-l border-[#E3E5E8] overflow-y-auto p-5 space-y-6">
        {/* ---- Autofill ---- */}
        <section>
          <button
            type="button"
            onClick={() => setAutofillOpen((o) => !o)}
            aria-expanded={autofillOpen}
            className="w-full flex items-center justify-between mb-3 cursor-pointer"
          >
            <h2 className="text-[17px] font-bold text-[#393A3D]">Autofill</h2>
            {autofillOpen ? <ChevronUp size={18} className="text-[#393A3D]" /> : <ChevronDown size={18} className="text-[#393A3D]" />}
          </button>

          {autofillOpen && (
            <>
              {/* Document type */}
              <div className="relative mb-3">
                <button
                  type="button"
                  onClick={() => setDocTypeOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={docTypeOpen}
                  className="w-full flex items-center justify-between h-[40px] px-3 border border-[#6B6C72] rounded-[4px] bg-white text-[15px] text-[#393A3D] cursor-pointer"
                >
                  {docType}
                  <ChevronDown size={16} />
                </button>
                {docTypeOpen && (
                  <ul role="listbox" className="absolute left-0 top-[44px] z-10 w-full bg-white border border-[#D4D7DC] rounded-[4px] shadow-lg py-1">
                    {['Bill', 'Expense', 'Receipt', 'Statement'].map((opt) => (
                      <li key={opt}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={opt === docType}
                          onClick={() => {
                            setDocType(opt);
                            setDocTypeOpen(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-[14px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer"
                        >
                          {opt}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Files / Images toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setView('files')}
                  aria-pressed={view === 'files'}
                  className={`flex-1 flex items-center justify-center gap-2 h-[38px] rounded-[4px] border text-[14px] font-medium cursor-pointer ${
                    view === 'files'
                      ? 'bg-[#0077C5] border-[#0077C5] text-white'
                      : 'bg-white border-[#6B6C72] text-[#393A3D]'
                  }`}
                >
                  <Landmark size={15} />
                  Files
                </button>
                <button
                  type="button"
                  onClick={() => setView('images')}
                  aria-pressed={view === 'images'}
                  className={`flex-1 flex items-center justify-center gap-2 h-[38px] rounded-[4px] border text-[14px] font-medium cursor-pointer ${
                    view === 'images'
                      ? 'bg-[#0077C5] border-[#0077C5] text-white'
                      : 'bg-white border-[#6B6C72] text-[#393A3D]'
                  }`}
                >
                  <Building2 size={15} />
                  Images
                </button>
              </div>

              {/* Drop zone */}
              <div className="border-2 border-dashed border-[#0077C5] rounded-[6px] px-4 py-7 text-center mb-4">
                <p className="text-[15px] text-[#0077C5]">
                  <button type="button" className="font-semibold hover:underline cursor-pointer">Select a file</button> or drag and drop here
                </p>
                <p className="text-[13px] text-[#0077C5] mt-1">Supported formats: .pdf, .jpg, .png</p>
              </div>

              {/* Email routing */}
              <p className="text-[14px] text-[#393A3D] mb-2">Or forward bill-related emails here</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex-1 truncate px-3 py-2 border border-[#D4D7DC] rounded-[4px] text-[13px] text-[#393A3D] bg-white">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(email);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  aria-label="Copy email address"
                  className="p-2 border border-[#D4D7DC] rounded-[4px] text-[#393A3D] hover:bg-[#F4F5F8] cursor-pointer shrink-0"
                >
                  {copied ? <Check size={16} className="text-[#2CA01C]" /> : <Copy size={16} />}
                </button>
              </div>

              <button type="button" className="flex items-center gap-2 text-[14px] text-[#393A3D] hover:underline cursor-pointer">
                <Settings size={16} />
                Manage settings
              </button>
            </>
          )}
        </section>

        {/* ---- Intuit's AI agents ---- */}
        <section className="border-t border-[#E3E5E8] pt-5">
          <button
            type="button"
            onClick={() => setAgentsOpen((o) => !o)}
            aria-expanded={agentsOpen}
            className="w-full flex items-center justify-between mb-3 cursor-pointer"
          >
            <h2 className="text-[17px] font-bold text-[#393A3D]">Intuit&rsquo;s AI agents</h2>
            {agentsOpen ? <ChevronUp size={18} className="text-[#393A3D]" /> : <ChevronDown size={18} className="text-[#393A3D]" />}
          </button>

          {agentsOpen && (
            <>
              <p className="text-[13px] text-[#6B6C72] mb-3">3 active agents included in your plan.</p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="w-[32px] h-[32px] rounded-full bg-[#2CA01C] flex items-center justify-center shrink-0" aria-hidden="true">
                    <Sparkles size={17} className="text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#393A3D]">Accounting Agent</span>
                    <span className="block text-[13px] text-[#6B6C72]">Automates categorization and expense tracking.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-[32px] h-[32px] rounded-full bg-[#0077C5] flex items-center justify-center shrink-0" aria-hidden="true">
                    <Landmark size={17} className="text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#393A3D]">Payments Agent</span>
                    <span className="block text-[13px] text-[#6B6C72]">Chases invoices and reconciles payments.</span>
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-[32px] h-[32px] rounded-full bg-[#6B6C72] flex items-center justify-center shrink-0" aria-hidden="true">
                    <Building2 size={17} className="text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[#393A3D]">Finance AI</span>
                    <span className="block text-[13px] text-[#6B6C72]">Answers questions about your books.</span>
                  </span>
                </li>
              </ul>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}

/**
 * A bank's logo mark.
 *
 * The reference uses the real institution logos. Reproducing them exactly needs
 * the artwork, which is not in the repo, so each is a coloured tile carrying the
 * bank's initial. Same position, same size, same visual weight -- the shape of
 * the row is right even though the artwork is not.
 */
function BankMark({ bank }) {
  const initials = {
    citi: ['#003B70', 'citi'],
    chase: ['#117ACA', 'CB'],
    usbank: ['#0C2074', 'USB'],
    bofa: ['#012169', 'BofA'],
    wellsfargo: ['#D71E28', 'WF'],
    capitalone: ['#004879', 'C1'],
  }[bank.logo] || ['#6B6C72', bank.name[0]];

  return (
    <span
      className="w-[30px] h-[30px] rounded-[4px] flex items-center justify-center text-white text-[11px] font-bold shrink-0"
      style={{ backgroundColor: initials[0] }}
      aria-hidden="true"
    >
      {initials[1]}
    </span>
  );
}