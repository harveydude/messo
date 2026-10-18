import React, { useState, useMemo, useEffect } from 'react';
import { 
  RefreshCw, ChevronDown, ChevronRight, Printer, Share2, Settings, 
  Paperclip, Check, X, Building, CreditCard, Edit2, Search, Calendar, 
  Sliders, PlayCircle, Compass, Maximize2, Sparkles, Diamond, ArrowLeft
} from 'lucide-react';
import ConnectAccountModal from './ConnectAccountModal';
import api from '../api/client';

export default function BankTransactionsView({ onNavigate, isEmbedded = false, tableRef = null }) {
  const [selectedAccount, setSelectedAccount] = useState('checking'); // 'checking', 'savings', 'mastercard'
  const [activeTab, setActiveTab] = useState('review'); // 'review', 'categorized', 'excluded'
  const [updating, setUpdating] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);


  // Modals & drawers
  const [connectAccountOpen, setConnectAccountOpen] = useState(false);
  const [matchModalTxn, setMatchModalTxn] = useState(null);
  const [editAccountModalOpen, setEditAccountModalOpen] = useState(false);
  const [accountNameEdit, setAccountNameEdit] = useState('Current Account (SBI)');
  const [tourOpen, setTourOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initial bank transactions matching Screenshot 3 exactly with Rupee forex conversion (1 USD = ₹83.50)
  const [txList, setTxList] = useState([
    { 
      id: 'tx-1', 
      date: '11/24/2025', 
      desc: 'Bessie Bookkeeping Solutions', 
      payee: '', 
      category: 'Uncategorized Income', 
      spent: null, 
      received: '₹4,592.50', 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-2', 
      date: '10/25/2025', 
      desc: 'Apex Equipment Rentals', 
      payee: '', 
      category: 'Uncategorized Income', 
      spent: null, 
      received: '₹16,700.00', 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-3', 
      date: '10/25/2025', 
      desc: 'Apex Equipment Rentals', 
      payee: '', 
      category: 'Uncategorized Expense', 
      spent: '₹1,00,200.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-4', 
      date: '10/02/2025', 
      desc: 'Apex Equipment Rentals', 
      payee: '', 
      category: 'Uncategorized Expense', 
      spent: '₹66,800.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-5', 
      date: '09/29/2025', 
      desc: 'Pooja Sharma', 
      payee: 'Pooja Sharma', 
      category: '2 matches found', 
      spent: '₹6,262.50', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 2, 
      state: 'review', 
      actionType: 'view' 
    },
    { 
      id: 'tx-6', 
      date: '09/29/2025', 
      desc: 'Hind Hardware Stores', 
      payee: 'Hind Hardware', 
      category: 'Check 75 \n 09/29/2025 -₹19,100.63 Hind Hardware', 
      spent: '₹19,100.63', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-7', 
      date: '09/28/2025', 
      desc: 'Tata Power', 
      payee: 'Tata Power', 
      category: 'Bill Payment 6 \n 09/28/2025 -₹9,526.52 Tata Power', 
      spent: '₹9,526.52', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-8', 
      date: '09/28/2025', 
      desc: '', 
      payee: '', 
      category: 'Deposit \n 09/28/2025 ₹34,068.00', 
      spent: null, 
      received: '₹34,068.00', 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-9', 
      date: '09/27/2025', 
      desc: 'Tarun Verma', 
      payee: 'Tarun Verma', 
      category: 'Payment 2064 \n 09/27/2025 ₹8,646.43 Tarun Verma', 
      spent: null, 
      received: '₹8,646.43', 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-10', 
      date: '09/27/2025', 
      desc: "Pooja's Confectionery", 
      payee: "Pooja's Confectionery", 
      category: "Refund Receipt \n 09/27/2025 -₹7,306.25 Pooja's Confectionery", 
      spent: '₹7,306.25', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-11', 
      date: '09/27/2025', 
      desc: '', 
      payee: '55 Twin Lane, Indiranagar', 
      category: 'Payment \n 09/27/2025 ₹4,175.00 55 Twin Lane', 
      spent: null, 
      received: '₹4,175.00', 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-12', 
      date: '09/27/2025', 
      desc: 'Speedy Clean Car Care', 
      payee: 'Speedy Clean Car Care', 
      category: '2 matches found', 
      spent: '₹1,669.17', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 2, 
      state: 'review', 
      actionType: 'view' 
    },
    { 
      id: 'tx-13', 
      date: '09/27/2025', 
      desc: '', 
      payee: '', 
      category: 'Deposit \n 09/27/2025 ₹18,265.63', 
      spent: null, 
      received: '₹18,265.63', 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-14', 
      date: '09/27/2025', 
      desc: 'Bessie Bookkeeping Solutions', 
      payee: 'Bessie Bookkeeping Solutions', 
      category: '2 matches found', 
      spent: null, 
      received: '₹6,262.50', 
      hasMatchPill: true, 
      matchCount: 2, 
      state: 'review', 
      actionType: 'view' 
    },
    { 
      id: 'tx-15', 
      date: '09/26/2025', 
      desc: 'Bajaj Allianz Insurance Agency', 
      payee: 'Bajaj Allianz Insurance Agency', 
      category: 'Bill Payment 1 \n 09/26/2025 -₹1,67,000.00 Bajaj Allianz', 
      spent: '₹1,67,000.00', 
      received: null, 
      hasMatchPill: true, 
      matchCount: 1, 
      state: 'review', 
      actionType: 'match' 
    },
    { 
      id: 'tx-16', 
      date: '09/25/2025', 
      desc: 'Bharat Petroleum fuel pump', 
      payee: 'Bharat Petroleum', 
      category: 'Automobile: Fuel', 
      spent: '₹3,757.50', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-17', 
      date: '09/24/2025', 
      desc: 'Airtel Broadband Solutions', 
      payee: 'Airtel Broadband', 
      category: 'Utilities: Internet & Telephone', 
      spent: '₹5,678.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-18', 
      date: '09/22/2025', 
      desc: 'BESCOM Electric Supply', 
      payee: 'BESCOM', 
      category: 'Utilities: Electricity', 
      spent: '₹9,529.86', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-19', 
      date: '09/18/2025', 
      desc: 'Mysore Pottery & Ceramics', 
      payee: 'Mysore Ceramics', 
      category: 'Job Materials: Plants and Soil', 
      spent: '₹12,525.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-20', 
      date: '09/15/2025', 
      desc: 'Navrang Timber & Building', 
      payee: 'Navrang Timber', 
      category: 'Job Materials: Decks and Patios', 
      spent: '₹19,567.39', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-21', 
      date: '09/10/2025', 
      desc: 'Haldiram Restaurant & Sweets', 
      payee: 'Haldiram', 
      category: 'Meals and Entertainment', 
      spent: '₹3,548.75', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-22', 
      date: '09/05/2025', 
      desc: 'Radhika & Associates Legal', 
      payee: 'Radhika Legal', 
      category: 'Legal & Professional Fees: Advocate', 
      spent: '₹8,350.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-23', 
      date: '09/02/2025', 
      desc: 'Trivedi Construction & Masonry', 
      payee: 'Trivedi Construction', 
      category: 'Job Materials: Sprinklers', 
      spent: '₹11,523.00', 
      received: null, 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-24', 
      date: '08/28/2025', 
      desc: 'Tanvi Naik', 
      payee: 'Tanvi Naik', 
      category: 'Uncategorized Income', 
      spent: null, 
      received: '₹41,750.00', 
      state: 'review', 
      actionType: 'add' 
    },
    { 
      id: 'tx-25', 
      date: '07/30/2025', 
      desc: 'Lakshmi Garden Services', 
      payee: 'Lakshmi Garden', 
      category: 'Services', 
      spent: null, 
      received: '₹42,046.43', 
      state: 'review', 
      actionType: 'add' 
    },
  ]);

  const [connections, setConnections] = useState([]);

  const loadBankFeed = () => {
    api.getBankFeed().then(res => {
      if (res?.success && (res.feed || res.transactions)) {
        const rows = res.feed || res.transactions;
        if (rows.length > 0) {
          setTxList(rows.map(t => ({
            id: t.id,
            date: t.date,
            desc: t.description || 'Transaction',
            payee: t.payee || '',
            category: t.match_detail || (t.spent_inr ? 'Uncategorized Expense' : 'Uncategorized Income'),
            spent: t.spent_inr ? `₹${Number(t.spent_inr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
            received: t.received_inr ? `₹${Number(t.received_inr).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null,
            state: (t.status === 'MATCHED' || t.status === 'CATEGORIZED') ? 'categorized' : 'review',
            actionType: t.action ? t.action.toLowerCase() : (t.match_status ? 'match' : 'add'),
            hasMatchPill: !!t.match_detail || !!t.match_status,
            matchCount: (t.match_detail || t.match_status) ? 1 : 0
          })));
        }
      }
    }).catch(err => console.warn('Failed to load live bank feed:', err));

    api.getBankConnections().then(res => {
      if (res?.success && res.connections) {
        setConnections(res.connections);
      }
    }).catch(() => {});
  };

  useEffect(() => {
    loadBankFeed();
    const handleMutation = () => loadBankFeed();
    window.addEventListener('qbo:data-mutated', handleMutation);
    return () => window.removeEventListener('qbo:data-mutated', handleMutation);
  }, []);

  const handleUpdate = () => {
    setUpdating(true);
    loadBankFeed();
    setTimeout(() => {
      setUpdating(false);
    }, 600);
  };

  const handleAdd = async (id) => {
    setTxList(prev => prev.map(t => t.id === id ? { ...t, state: 'categorized' } : t));
    try {
      await api.categorizeBankTransaction(id);
    } catch (err) {
      console.warn('Categorize bank txn note:', err);
    }
  };

  const handleMatch = async (id) => {
    setTxList(prev => prev.map(t => t.id === id ? { ...t, state: 'categorized' } : t));
    try {
      await api.matchBankTransaction(id);
    } catch (err) {
      console.warn('Match bank txn note:', err);
    }
  };

  const handleConfirmMatchModal = async () => {
    if (matchModalTxn) {
      const id = matchModalTxn.id;
      setTxList(prev => prev.map(t => t.id === id ? { ...t, state: 'categorized' } : t));
      setMatchModalTxn(null);
      try {
        await api.matchBankTransaction(id);
      } catch (err) {
        console.warn('Match confirm note:', err);
      }
    }
  };

  const reviewTxns = useMemo(() => {
    return txList.filter(t => t.state === activeTab);
  }, [txList, activeTab]);

  const filteredTxns = useMemo(() => {
    if (!searchFilter.trim()) return reviewTxns;
    const q = searchFilter.toLowerCase();
    return reviewTxns.filter(t => 
      t.desc.toLowerCase().includes(q) || 
      t.payee.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  }, [reviewTxns, searchFilter]);

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
      setSelectAll(false);
    } else {
      setSelectedRows(filteredTxns.map(t => t.id));
      setSelectAll(true);
    }
  };

  const toggleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const reviewCount = txList.filter(t => t.state === 'review').length;

  return (
    <div className={`flex w-full min-h-screen bg-[#f4f5f8] text-gray-900 ${isEmbedded ? 'pb-12' : ''}`}>


      {/* Main Bank Transactions View */}
      <div className="flex-1 p-6 max-w-7xl overflow-y-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <img src="/app-icons/accounting.png" alt="Accounting" className="w-full h-full object-contain block" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bank transactions</h1>
              <p className="text-xs text-gray-500 mt-0.5">Automated bank feed, reconciliation and AI transaction categorization</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <button 
              onClick={() => alert("Opening modern banking experience...")}
              className="px-3.5 py-1.5 font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition cursor-pointer"
            >
              Try new banking page
            </button>
            <button 
              onClick={() => setConnectAccountOpen(true)}
              className="px-3.5 py-1.5 font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 flex items-center space-x-1 cursor-pointer"
            >
              <span>Link account</span>
              <ChevronDown size={13} />
            </button>
            <button 
              onClick={handleUpdate}
              className="px-3.5 py-1.5 font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 flex items-center space-x-1.5 cursor-pointer"
            >
              <RefreshCw size={13} className={updating ? "animate-spin text-[#2ca01c]" : ""} />
              <span>Update</span>
            </button>
            <button 
              onClick={() => alert("Explore integrations")}
              className="px-3.5 py-1.5 font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50 flex items-center space-x-1 cursor-pointer"
            >
              <Sparkles size={13} className="text-[#0077c5]" />
              <span>Explore</span>
            </button>
          </div>
        </div>

        {/* Account Selector & Cards Carousel matching Screenshot 1 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-gray-800">
            <CreditCard size={18} className="text-[#0077c5]" />
            <span>Checking</span>
            <ChevronDown size={14} className="text-gray-500 cursor-pointer" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Checking (Selected Blue Card) */}
            <div 
              onClick={() => setSelectedAccount('checking')}
              className={`rounded-lg cursor-pointer transition overflow-hidden shadow-sm ${
                selectedAccount === 'checking' 
                  ? 'ring-2 ring-[#0077c5]' 
                  : 'border border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Header */}
              <div className="bg-[#0077c5] text-white p-3.5 relative">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 font-bold text-sm">
                    <span>{accountNameEdit}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditAccountModalOpen(true); }}
                      className="p-1 hover:text-white/80 cursor-pointer"
                      title="Edit account details"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <Building size={15} className="text-white/80" />
                </div>
                <div className="text-2xl font-bold tracking-tight">-₹3,02,431.16</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-white/85">
                  <span className="font-semibold uppercase tracking-wider">BANK BALANCE</span>
                  <span>Updated moments ago</span>
                </div>
              </div>

              {/* Body */}
              <div className="bg-white border-t border-[#0077c5] p-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-gray-900">₹1,00,283.50</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">IN MESO</div>
                </div>
                <div className="text-2xl font-bold text-orange-500">
                  {reviewCount}
                </div>
              </div>
            </div>

            {/* Card 2: Savings (Gray Card) */}
            <div 
              onClick={() => setSelectedAccount('savings')}
              className={`rounded-lg cursor-pointer transition overflow-hidden shadow-sm ${
                selectedAccount === 'savings' 
                  ? 'ring-2 ring-[#0077c5]' 
                  : 'border border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="bg-gray-100 p-3.5 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">Savings Account (HDFC)</span>
                  <Building size={15} className="text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 tracking-tight">₹16,700.00</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                  <span className="font-semibold uppercase tracking-wider">BANK BALANCE</span>
                  <span>Updated moments ago</span>
                </div>
              </div>

              <div className="bg-white p-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-gray-900">₹66,800.00</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">IN MESO</div>
                </div>
                <div className="text-xl font-bold text-gray-600">
                  1
                </div>
              </div>
            </div>

            {/* Card 3: Mastercard / Corporate Card (Gray Card) */}
            <div 
              onClick={() => setSelectedAccount('mastercard')}
              className={`rounded-lg cursor-pointer transition overflow-hidden shadow-sm ${
                selectedAccount === 'mastercard' 
                  ? 'ring-2 ring-[#0077c5]' 
                  : 'border border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="bg-gray-100 p-3.5 border-b border-gray-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-800">Corporate Credit Card (ICICI)</span>
                  <Building size={15} className="text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900 tracking-tight">₹25,464.16</div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-500">
                  <span className="font-semibold uppercase tracking-wider">BANK BALANCE</span>
                  <span>Updated moments ago</span>
                </div>
              </div>

              <div className="bg-white p-3 flex items-center justify-between">
                <div>
                  <div className="text-base font-bold text-gray-900">₹13,169.62</div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">IN MESO</div>
                </div>
                <div className="text-xl font-bold text-gray-600">
                  7
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Links & Review Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-1">
          {/* Tabs */}
          <div className="inline-flex rounded-full border border-gray-300 p-0.5 bg-white shadow-xs">
            <button 
              onClick={() => setActiveTab('review')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'review' 
                  ? 'bg-[#393a3d] text-white' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              For review ({reviewCount})
            </button>
            <button 
              onClick={() => setActiveTab('categorized')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === 'categorized' 
                  ? 'bg-[#393a3d] text-white font-bold' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Categorized
            </button>
            <button 
              onClick={() => setActiveTab('excluded')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === 'excluded' 
                  ? 'bg-[#393a3d] text-white font-bold' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Excluded
            </button>
          </div>

          {/* Right helper links */}
          <div className="flex items-center space-x-4 text-xs font-semibold text-[#0077c5]">
            <button 
              onClick={() => setTourOpen(true)}
              className="flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <PlayCircle size={14} />
              <span>Video tutorials</span>
            </button>
            <button 
              onClick={() => alert("Take a guided tour of Meso banking feeds.")}
              className="flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <Compass size={14} />
              <span>Take a tour</span>
            </button>
            <button 
              onClick={() => setConnectAccountOpen(true)}
              className="flex items-center space-x-1 hover:underline cursor-pointer"
            >
              <span>Go to bank register</span>
            </button>
          </div>
        </div>

        {/* Filters Bar & Pagination (Screenshot 3 Table Anchor) */}
        <div ref={tableRef} id="transactions-table-section" className="bg-white border border-gray-200 rounded-t-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs scroll-mt-20">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => alert("Filter dates: All, This month, Last 30 days, Custom")}
              className="flex items-center space-x-1 px-2.5 py-1.5 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Calendar size={13} />
              <span>All dates</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>

            <button 
              onClick={() => alert("Filter transactions: All transactions, Recognized, Rule applied")}
              className="flex items-center space-x-1 px-2.5 py-1.5 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              <Sliders size={13} />
              <span>All transactions (...)</span>
              <ChevronDown size={12} className="text-gray-500" />
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by description, check number, or amount"
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-3 text-gray-600">
            <span>1-{filteredTxns.length} of {filteredTxns.length}</span>
            <div className="flex items-center space-x-1">
              <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40" disabled>
                &lt;
              </button>
              <span className="px-2 py-1 bg-gray-200 font-bold rounded">1</span>
              <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-40" disabled>
                &gt;
              </button>
            </div>

            <button onClick={() => window.print()} title="Print table" className="p-1 hover:text-gray-900 cursor-pointer">
              <Printer size={15} />
            </button>
            <button onClick={() => alert("Export table to Excel")} title="Export table" className="p-1 hover:text-gray-900 cursor-pointer">
              <Share2 size={15} />
            </button>
            <button onClick={() => setSettingsOpen(!settingsOpen)} title="Grid settings" className="p-1 hover:text-gray-900 cursor-pointer">
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Scrolled Transactions Table matching Screenshot 3 exactly */}
        <div className="bg-white border border-t-0 border-gray-200 rounded-b-lg overflow-x-auto shadow-xs">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-[#f4f5f8] border-b border-gray-200 font-bold text-gray-700">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <input 
                    type="checkbox" 
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="rounded text-[#2ca01c] focus:ring-[#2ca01c] cursor-pointer" 
                  />
                </th>
                <th className="py-2.5 px-3 cursor-pointer hover:text-black">DATE ▼</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
                <th className="py-2.5 px-3">PAYEE</th>
                <th className="py-2.5 px-3">CATEGORIZE OR MATCH</th>
                <th className="py-2.5 px-3 text-right">SPENT</th>
                <th className="py-2.5 px-3 text-right">RECEIVED</th>
                <th className="py-2.5 px-3 text-center">
                  <Paperclip size={13} className="text-gray-400 inline" />
                </th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTxns.map((tx) => {
                const isSelected = selectedRows.includes(tx.id);
                return (
                  <tr 
                    key={tx.id}
                    className={`hover:bg-blue-50/40 transition ${isSelected ? 'bg-blue-50/60' : ''}`}
                  >
                    <td className="py-2.5 px-3">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => toggleSelectRow(tx.id)}
                        className="rounded text-[#2ca01c] focus:ring-[#2ca01c] cursor-pointer" 
                      />
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{tx.date}</td>
                    <td className="py-2.5 px-3 font-medium text-gray-900">{tx.desc || ''}</td>
                    <td className="py-2.5 px-3 text-gray-700">{tx.payee || ''}</td>
                    
                    {/* CATEGORIZE OR MATCH CELL with green badges matching Screenshot 3 */}
                    <td className="py-2.5 px-3">
                      {tx.hasMatchPill ? (
                        <div className="space-y-0.5">
                          {tx.matchCount === 2 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-[#107c41] border border-[#107c41] bg-white">
                              2 matches found
                            </span>
                          ) : (
                            <div>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-[#107c41] mr-1.5">
                                1 match found
                              </span>
                              <span className="text-[11px] text-gray-700 font-medium">
                                {tx.category.split('\n')[0]}
                              </span>
                              {tx.category.includes('\n') && (
                                <div className="text-[10px] text-gray-500 font-normal">
                                  {tx.category.split('\n')[1]}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-700">{tx.category}</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right font-medium text-gray-900 tabular-nums">
                      {tx.spent || ''}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-green-700 tabular-nums">
                      {tx.received || ''}
                    </td>
                    <td className="py-2.5 px-3 text-center text-gray-400"></td>

                    {/* ACTION CELL */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {tx.actionType === 'view' ? (
                        <button
                          onClick={() => setMatchModalTxn(tx)}
                          className="px-3 py-1 font-bold text-[#0077c5] hover:underline cursor-pointer"
                        >
                          View
                        </button>
                      ) : tx.actionType === 'match' ? (
                        <button
                          onClick={() => handleMatch(tx.id)}
                          className="px-3 py-1 font-bold text-[#0077c5] hover:underline cursor-pointer"
                        >
                          Match
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAdd(tx.id)}
                          className="px-3 py-1 font-bold text-[#0077c5] hover:underline cursor-pointer"
                        >
                          Add
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredTxns.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-500">
                    No transactions to show in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match Details Modal (Pooja Sharma / Bessie: 2 matches found) */}
      {matchModalTxn && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">
                Match transaction: {matchModalTxn.desc || matchModalTxn.payee} ({matchModalTxn.spent || matchModalTxn.received})
              </h3>
              <button onClick={() => setMatchModalTxn(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-gray-600">
              We found 2 existing transactions in Meso that match this bank transaction:
            </p>

            <div className="space-y-2 border border-gray-200 rounded p-3 bg-gray-50">
              <label className="flex items-start space-x-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                <input type="radio" name="matchChoice" defaultChecked className="mt-0.5 text-green-600" />
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Expense #1082 - {matchModalTxn.desc || matchModalTxn.payee} ({matchModalTxn.spent || matchModalTxn.received})</div>
                  <div className="text-[11px] text-gray-500">Date: {matchModalTxn.date} · Account: Current Account (SBI) · Category: Professional Fees</div>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-2 bg-white rounded border border-gray-200 cursor-pointer">
                <input type="radio" name="matchChoice" className="mt-0.5 text-green-600" />
                <div className="flex-1">
                  <div className="font-bold text-gray-900">Bill Payment #2041 - {matchModalTxn.desc || matchModalTxn.payee} ({matchModalTxn.spent || matchModalTxn.received})</div>
                  <div className="text-[11px] text-gray-500">Date: {matchModalTxn.date} · Account: Current Account (SBI)</div>
                </div>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setMatchModalTxn(null)}
                className="px-4 py-1.5 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmMatchModal}
                className="px-4 py-1.5 bg-[#2ca01c] hover:bg-green-700 text-white rounded font-bold"
              >
                Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {editAccountModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-gray-900">Edit account info</h3>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Account name</label>
              <input 
                type="text" 
                value={accountNameEdit}
                onChange={(e) => setAccountNameEdit(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 focus:ring-1 focus:ring-green-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">Bank institution</label>
              <input 
                type="text" 
                defaultValue="State Bank of India (Current Account)"
                className="w-full border border-gray-300 rounded px-3 py-1.5 bg-gray-50"
                readOnly
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button 
                onClick={() => setEditAccountModalOpen(false)}
                className="px-4 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => setEditAccountModalOpen(false)}
                className="px-4 py-1.5 bg-[#2ca01c] text-white rounded font-bold hover:bg-green-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indian Bank Registration Modal (Screenshot 2) */}
      <ConnectAccountModal
        isOpen={connectAccountOpen}
        onClose={() => setConnectAccountOpen(false)}
        onAccountConnected={(bank) => {
          setAccountNameEdit(`${bank.shortName} Account`);
        }}
      />
    </div>
  );
}
