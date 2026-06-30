import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('GEMINI_API_KEY') || '';
      setApiKey(storedKey);
      setShowConfirmReset(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      // Sanitize: Remove any non-ASCII characters
      const sanitizedKey = apiKey.replace(/[^\x00-\x7F]/g, "").trim();
      localStorage.setItem('GEMINI_API_KEY', sanitizedKey);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
    }
    onClose();
    window.location.reload(); // Reload to pick up new key
  };

  if (!isOpen) return null;

  const isUsingSystemKey = !localStorage.getItem('GEMINI_API_KEY');

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Cài đặt API Key</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 mb-4">
          <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">Nguồn API Key hiện tại:</p>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isUsingSystemKey ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]'}`}></div>
            <span className="text-sm font-medium text-gray-200">
              {isUsingSystemKey ? 'Hệ thống (Mặc định của Project)' : 'Cá nhân (Bạn đã nhập thủ công)'}
            </span>
          </div>
          {isUsingSystemKey && (
            <p className="text-[10px] text-gray-500 mt-2 italic">
              * Khi dùng Key hệ thống, hạn mức được chia sẻ và có thể nhanh hết.
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
            Gemini API Key (Tùy chọn)
          </label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="AIzaSy..."
          />
          <p className="mt-2 text-[11px] text-gray-400 leading-relaxed">
            Nếu gặp lỗi <b>Quota Exceeded</b>, hãy xóa trắng ô này để dùng Key của Project mới, hoặc dán Key mới từ <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Google AI Studio</a>.
          </p>
          {apiKey && !isUsingSystemKey && (
            <p className="text-[10px] text-gray-500 mt-1">
              Đang sử dụng: {apiKey.substring(0, 6)}...{apiKey.substring(apiKey.length - 4)}
            </p>
          )}
        </div>
        <div className="flex justify-between items-end">
          {showConfirmReset ? (
            <div className="flex flex-col gap-2 bg-red-900/20 p-2 rounded border border-red-500/30">
              <p className="text-[10px] text-red-400 font-medium">Xác nhận xóa tất cả?</p>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    localStorage.clear();
                    try {
                      const localforage = (await import('localforage')).default;
                      await localforage.clear();
                    } catch (e) {
                      console.error("Failed to clear localforage", e);
                    }
                    window.location.reload();
                  }}
                  className="text-[10px] bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Xóa ngay
                </button>
                <button 
                  onClick={() => setShowConfirmReset(false)}
                  className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors"
                >
                  Hủy
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="text-[10px] text-red-500 hover:underline mb-1"
            >
              Xóa toàn bộ dữ liệu & Reset
            </button>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Lưu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
