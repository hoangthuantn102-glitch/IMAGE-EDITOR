import React from 'react';

interface UndoRedoControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({ onUndo, onRedo, canUndo, canRedo }) => {
  return (
    <div className="flex justify-center items-center gap-4 my-4">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        aria-label="Hoàn tác hành động cuối"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8a5 5 0 010 10H9" />
        </svg>
        Hoàn tác
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
        aria-label="Làm lại hành động cuối"
      >
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H8a5 5 0 000 10h1" />
        </svg>
        Làm lại
      </button>
    </div>
  );
};

export default UndoRedoControls;
