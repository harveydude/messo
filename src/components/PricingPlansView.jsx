import React from 'react';
import { Sparkles, Check } from 'lucide-react';

export default function PricingPlansView() {
  const plans = [
    {
      name: "Simple Start",
      subtitle: "Build your financial foundation",
      originalPrice: "₹3,173",
      price: "₹1,586.50",
      users: "1 user",
      tag: null,
      features: [
        { label: "Smart expense organization", isAgent: false },
        { label: "Automated bookkeeping", isAgent: false },
        { label: "5 free UPI/IMPS bank transfers/mo for bills", isAgent: false }
      ]
    },
    {
      name: "Essentials",
      subtitle: "Save time and focus on growth",
      originalPrice: "₹6,262.50",
      price: "₹3,131.25",
      users: "3 users",
      tag: null,
      features: [
        { label: "Accounting Agent NEW", isAgent: true, desc: "Posts transactions quickly—with explanations and predictions" },
        { label: "Payments Agent NEW", isAgent: true, desc: "Helps create tailored strategies to get paid faster" },
        { label: "Recurring invoices", isAgent: false }
      ]
    },
    {
      name: "Plus",
      subtitle: "Scale with greater clarity",
      originalPrice: "₹9,602.50",
      price: "₹4,801.25",
      users: "5 users",
      tag: "CUSTOMER FAVORITE",
      features: [
        { label: "AI-powered reconciliation BETA", isAgent: true, desc: "Identifies potential issues and suggests solutions" },
        { label: "Customer Agent BETA", isAgent: true, desc: "Prioritizes leads from your inbox and personalizes email followups" },
        { label: "AI-powered profit & loss insights", isAgent: false },
        { label: "Anomaly detection and resolution", isAgent: false },
        { label: "Budgeting", isAgent: false }
      ]
    },
    {
      name: "Advanced",
      subtitle: "Boost efficiency and profitability",
      originalPrice: "₹22,962.50",
      price: "₹11,481.25",
      users: "25 users",
      tag: null,
      features: [
        { label: "Finance Agent NEW", isAgent: true, desc: "Goes beyond P&L with financial planning and KPI analysis" },
        { label: "Project Management Agent BETA", isAgent: true, desc: "Helps win bids and allocate costs to keep projects on time" },
        { label: "Custom user management and permissions", isAgent: false },
        { label: "Custom report builder", isAgent: false },
        { label: "Data sync with Excel", isAgent: false },
        { label: "Revenue recognition & Forecasting", isAgent: false }
      ]
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-gray-900">Choose the right Meso plan</h1>
        <p className="text-sm text-gray-600">Save 50% for 3 months on all plans with Meso Assist AI</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {plans.map((p, idx) => (
          <div 
            key={idx}
            className={`bg-white rounded-2xl border ${p.tag ? 'border-2 border-black shadow-xl relative' : 'border-gray-200 shadow-sm'} p-6 flex flex-col justify-between`}
          >
            {p.tag && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {p.tag}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{p.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{p.subtitle}</p>
              </div>

              <div>
                <span className="text-xs text-gray-400 line-through mr-1">{p.originalPrice}</span>
                <span className="text-2xl font-extrabold text-gray-900">{p.price}</span>
                <span className="text-xs text-gray-500">/mo</span>
                <div className="text-[11px] text-gray-500 mt-0.5">Save 50% for 3 months*</div>
              </div>

              <button className="w-full py-2.5 bg-[#2ca01c] hover:bg-green-700 text-white rounded-lg font-bold text-xs shadow-xs transition">
                Choose plan
              </button>

              <div className="text-xs font-semibold text-gray-900 pt-2 border-t border-gray-100">
                {p.users}
                <div className="text-[11px] font-normal text-gray-500">Includes access for your accountant</div>
              </div>

              {/* Feature Box */}
              <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-gray-900">
                  <Sparkles size={13} className="text-[#0077c5]" />
                  <span>Meso Assist</span>
                </div>

                <div className="space-y-2">
                  {p.features.map((feat, fIdx) => (
                    <div key={fIdx} className="text-xs">
                      <div className="font-semibold text-gray-900 flex items-center space-x-1">
                        <Check size={12} className="text-[#2ca01c] shrink-0" />
                        <span>{feat.label}</span>
                      </div>
                      {feat.desc && (
                        <p className="text-[11px] text-gray-500 ml-4 mt-0.5 leading-snug">{feat.desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
