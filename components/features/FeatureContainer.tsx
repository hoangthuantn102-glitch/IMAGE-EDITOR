
import React from 'react';

interface FeatureContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
}

const FeatureContainer: React.FC<FeatureContainerProps> = ({ title, description, children, onSubmit, isLoading, canSubmit }) => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500">{title}</h2>
        <p className="text-gray-400 mt-2">{description}</p>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 md:p-8 space-y-6">
        {children}
        <button
          onClick={onSubmit}
          disabled={isLoading || !canSubmit}
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Đang xử lý...' : 'Tạo ảnh'}
        </button>
      </div>
    </div>
  );
};

export default FeatureContainer;
