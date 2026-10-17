import React, { useState } from 'react';
import { Search, X, HelpCircle, Lock } from 'lucide-react';

export default function ConnectAccountModal({ isOpen = true, onClose, onAccountConnected, isEmbedded = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [connectingBank, setConnectingBank] = useState(null);

  if (!isOpen && !isEmbedded) return null;

  const popularBanks = [
    { id: 'sbi', name: 'State Bank of India', shortName: 'SBI', color: '#280071', badge: 'SBI' },
    { id: 'hdfc', name: 'HDFC Bank', shortName: 'HDFC', color: '#004c8f', badge: 'HDFC' },
    { id: 'icici', name: 'ICICI Bank', shortName: 'ICICI', color: '#b02a30', badge: 'ICICI' },
    { id: 'axis', name: 'Axis Bank', shortName: 'Axis', color: '#97144d', badge: 'AXIS' },
    { id: 'kotak', name: 'Kotak Mahindra Bank', shortName: 'Kotak', color: '#ed1c24', badge: 'KOTAK' },
    { id: 'pnb', name: 'Punjab National Bank', shortName: 'PNB', color: '#a21d22', badge: 'PNB' },
    { id: 'bob', name: 'Bank of Baroda', shortName: 'Bank of Baroda', color: '#f26522', badge: 'BOB' },
    { id: 'canara', name: 'Canara Bank', shortName: 'Canara Bank', color: '#0091d0', badge: 'CANARA' },
  ];

  const additionalBanks = [
    { id: 'union', name: 'Union Bank of India', shortName: 'Union Bank', color: '#004d80', badge: 'UBI' },
    { id: 'indusind', name: 'IndusInd Bank', shortName: 'IndusInd', color: '#8b0000', badge: 'INDUS' },
    { id: 'yes', name: 'Yes Bank', shortName: 'Yes Bank', color: '#005a9c', badge: 'YES' },
    { id: 'idfc', name: 'IDFC FIRST Bank', shortName: 'IDFC FIRST', color: '#9d1d27', badge: 'IDFC' },
    { id: 'boi', name: 'Bank of India', shortName: 'Bank of India', color: '#00529b', badge: 'BOI' },
    { id: 'federal', name: 'Federal Bank', shortName: 'Federal Bank', color: '#00205b', badge: 'FED' }
  ];

  const allBanks = showMore ? [...popularBanks, ...additionalBanks] : popularBanks;

  const filteredBanks = allBanks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectBank = (bank) => {
    setConnectingBank(bank);
    setTimeout(() => {
      alert(`Successfully registered and linked ${bank.name} to Meso! Live transaction feeds are now connected.`);
      setConnectingBank(null);
      onAccountConnected?.(bank);
      if (onClose) onClose();
    }, 900);
  };

  const content = (
    <div className={`w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden ${isEmbedded ? 'border border-gray-300' : ''}`}>
      {/* Top Header Row matching Screenshot 2 */}
      <div className="w-full bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <h2 className="text-base font-bold text-gray-900">Connect an account</h2>
        <div className="flex items-center space-x-3 text-gray-500">
          <button className="hover:text-gray-800 cursor-pointer" title="Help">
            <HelpCircle size={18} />
          </button>
          {onClose && (
            <button onClick={onClose} className="hover:text-gray-800 cursor-pointer" title="Close">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Body Sheet */}
      <div className="w-full bg-white px-8 py-6 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Let's get a picture of your profits</h1>
          <p className="text-xs text-gray-600">Connect your bank or credit card to bring in your transactions.</p>
        </div>

        {/* Search Input Bar */}
        <div className="max-w-md mx-auto">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or sign-in URL"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
        </div>

        {/* Bank Tiles Grid (2 columns x 4 rows) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {filteredBanks.map((bank) => (
            <button
              key={bank.id}
              onClick={() => handleSelectBank(bank)}
              disabled={connectingBank !== null}
              className="flex items-center space-x-3 p-3.5 border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-xs transition bg-white text-left cursor-pointer group"
            >
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shadow-xs shrink-0"
                style={{ backgroundColor: bank.color }}
              >
                {bank.badge}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-gray-800 group-hover:text-black truncate block">
                  {bank.shortName}
                </span>
                <span className="text-[10px] text-gray-500 truncate block">
                  {bank.name}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Show more button */}
        {!showMore && (
          <div className="text-center pt-1">
            <button
              onClick={() => setShowMore(true)}
              className="px-5 py-1.5 border border-gray-400 hover:border-gray-600 rounded text-xs font-semibold text-gray-800 hover:bg-gray-50 transition cursor-pointer"
            >
              Show more
            </button>
          </div>
        )}

        {/* Security & Privacy Footer */}
        <div className="pt-6 border-t border-gray-100 text-center space-y-2">
          <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-600">
            <Lock size={12} className="text-gray-400" />
            <span>At Meso, the privacy and security of your information are top priorities.</span>
          </div>
          <div className="flex items-center justify-center space-x-3 text-[11px]">
            <span className="inline-block px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[9px] font-bold text-gray-600">
              TRUSTe Verified Privacy
            </span>
            <button onClick={() => alert("Meso Enterprise Banking Privacy Policy: All account connections use 256-bit bank-grade TLS encryption and read-only RBI-compliant Account Aggregator protocols.")} className="text-[#0077c5] hover:underline cursor-pointer">
              Privacy
            </button>
          </div>
        </div>

        {connectingBank && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-center text-xs text-blue-900 font-semibold animate-pulse">
            Connecting securely with {connectingBank.name} API...
          </div>
        )}
      </div>
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full flex justify-center py-6 px-4">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex flex-col items-center justify-center p-4 overflow-y-auto">
      {content}
    </div>
  );
}
