import React from 'react';

interface ModelSelectorProps {
    value: 'flash' | 'pro';
    onChange: (value: 'flash' | 'pro') => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ value, onChange }) => {
    return (
        <div>
            <label htmlFor="model-type" className="block text-sm font-medium text-gray-300">Mô hình</label>
            <select 
                id="model-type" 
                value={value} 
                onChange={(e) => onChange(e.target.value as 'flash' | 'pro')} 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-slate-700 border-slate-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
            >
                <option value="flash">Flash (Nhanh)</option>
                <option value="pro">Pro (Nano Banana Pro - Chất lượng cao)</option>
            </select>
            {value === 'pro' && <p className="mt-1 text-[10px] text-purple-400">Yêu cầu tài khoản có API Key trả phí.</p>}
        </div>
    );
};

export default ModelSelector;
