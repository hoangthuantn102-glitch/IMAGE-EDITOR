
import React, { useState } from 'react';
import ApiKeyModal from './ApiKeyModal';

interface HeaderProps {
  onHomeClick: () => void;
  onHistoryClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick, onHistoryClick }) => {
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  return (
    <header className="bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-700">
      <nav className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={onHomeClick}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104l-2.286 9.144a3.75 3.75 0 003.75 4.498h3.393a3.75 3.75 0 003.75-4.498L14.25 3.104M3 13.5h18" />
          </svg>
          <span className="text-xl font-bold text-white">AI Image Editor Pro</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 transition-colors"
            aria-label="Cài đặt API Key"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            API Key
          </button>
          <button
            onClick={onHistoryClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 transition-colors"
            aria-label="Xem lịch sử chỉnh sửa"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Lịch sử
          </button>
        </div>
      </nav>
      <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setIsApiKeyModalOpen(false)} />
    </header>
  );
};

export default Header;
