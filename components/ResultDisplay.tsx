import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface ResultDisplayProps {
  originalImage: string | null;
  newImage: string | null;
  children?: React.ReactNode;
  customActions?: React.ReactNode;
  isEditing?: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ originalImage, newImage, children, customActions, isEditing }) => {
  if (!originalImage || !newImage) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-2xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">Kết quả</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h4 className="text-lg font-semibold text-center mb-2 text-gray-300">Ảnh gốc</h4>
          <div className="bg-slate-800 p-2 rounded-lg">
            <img src={originalImage} alt="Original" className="w-full h-auto object-contain rounded-md" />
          </div>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-center mb-2 text-gray-300">Ảnh đã chỉnh sửa</h4>
          {children}
          <div className="bg-slate-800 p-2 rounded-lg relative">
            {isEditing && (
                <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg z-10">
                    <LoadingSpinner />
                </div>
            )}
            <img 
              src={newImage} 
              alt="Generated" 
              className="w-full h-auto object-contain rounded-md cursor-zoom-in"
              onClick={() => window.dispatchEvent(new CustomEvent('imageZoomRequest', { detail: newImage }))}
            />
          </div>
           <div className="mt-4 flex flex-col gap-2">
                <a
                    href={newImage}
                    download="edited-image.png"
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                    Tải ảnh xuống
                </a>
                {customActions}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;
