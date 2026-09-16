import React from 'react';
import type { Session } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  onLoadSession: (session: Session) => void;
  onDeleteSession: (sessionId: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, sessions, onLoadSession, onDeleteSession }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-800 shadow-xl z-50 transform transition-transform translate-x-0"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Lịch sử chỉnh sửa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close history panel">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-65px)]">
          {sessions.length === 0 ? (
            <p className="text-center text-gray-400 p-8">Chưa có lịch sử nào.</p>
          ) : (
            <ul className="divide-y divide-slate-700">
              {sessions.map(session => (
                <li key={session.id} className="p-4 hover:bg-slate-700/50">
                  <div className="flex items-start gap-4">
                    <img 
                      src={Array.isArray(session.originalImage) ? session.originalImage[0] : session.originalImage} 
                      alt="Original" 
                      className="w-16 h-16 object-cover rounded-md bg-slate-700" 
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-white">{session.featureTitle}</p>
                      <p className="text-sm text-gray-400">{new Date(session.timestamp).toLocaleString('vi-VN')}</p>
                      <div className="mt-2 flex gap-2">
                        <button 
                          onClick={() => onLoadSession(session)}
                          className="px-3 py-1 text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                        >
                          Tải lại
                        </button>
                        <button 
                          onClick={() => onDeleteSession(session.id)}
                          className="px-3 py-1 text-sm font-medium rounded-md text-gray-300 bg-slate-600 hover:bg-slate-500"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
