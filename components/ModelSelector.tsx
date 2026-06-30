import React from 'react';

interface ModelSelectorProps {
    value?: string;
    onChange?: (value: any) => void;
    selectedModel?: string;
    onModelChange?: (value: any) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange, selectedModel, onModelChange }) => {
    const activeValue = value !== undefined ? value : selectedModel;
    const activeOnChange = onChange || onModelChange;

    // Normalise backward-compatible values for selection highlight
    const normalizedValue = activeValue === 'flash' ? 'gemini-2.5-flash-image' : activeValue === 'pro' ? 'gemini-3-pro-image' : activeValue;

    return (
        <div>
            <label htmlFor="model-type" className="block text-sm font-medium text-gray-300">Mô hình</label>
            <select 
                id="model-type" 
                value={normalizedValue || 'auto'} 
                onChange={(e) => activeOnChange && activeOnChange(e.target.value)} 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md text-white"
            >
                <option value="auto">Tự động (Mô hình mới nhất - Khuyên dùng)</option>
                <option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image (Khuyên dùng - Cực nét)</option>
                <option value="gemini-3-pro-image">Gemini 3 Pro Image (Chất lượng cao nhất)</option>
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Tốc độ cao)</option>
            </select>
        </div>
    );
};

export default ModelSelector;
