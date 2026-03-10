import React, { useState } from 'react';

interface ResultEditorProps {
  onEdit: (prompt: string) => Promise<void>;
  isEditing: boolean;
}

const ResultEditor: React.FC<ResultEditorProps> = ({ onEdit, isEditing }) => {
  const [prompt, setPrompt] = useState('');

  const handleEdit = () => {
    if (prompt.trim()) {
      onEdit(prompt.trim());
      setPrompt(''); // Clear prompt after submitting
    }
  };

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Nhập mô tả để chỉnh sửa ảnh..."
        rows={2}
        className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-sm text-white focus:ring-purple-500 focus:border-purple-500"
        disabled={isEditing}
      />
      <button
        onClick={handleEdit}
        disabled={isEditing || !prompt.trim()}
        className="w-full text-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed transition-colors"
      >
        {isEditing ? 'Đang sửa...' : 'Chỉnh sửa'}
      </button>
    </div>
  );
};

export default ResultEditor;
