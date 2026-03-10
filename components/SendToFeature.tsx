import React, { useState, useRef, useEffect } from 'react';
import { Feature } from '../types';
import { FEATURES } from '../constants';

interface SendToFeatureProps {
  image: string;
  currentFeatureId: Feature;
  onSend: (image: string, featureId: Feature) => void;
  className?: string;
}

const SendToFeature: React.FC<SendToFeatureProps> = ({ image, currentFeatureId, onSend, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleSend = (featureId: Feature) => {
      onSend(image, featureId);
      setIsOpen(false);
  }

  const buttonClasses = `w-full inline-flex justify-center items-center px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-gray-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-colors ${className}`;

  return (
    <div className={`relative inline-block text-left w-full`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClasses.replace('px-6 py-3', 'px-4 py-2').replace('text-base', 'text-sm')} // Adjust padding for multi-image cards
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          Gửi tới...
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-bottom-right absolute right-0 bottom-full mb-2 w-72 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none max-h-60 overflow-y-auto z-10"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
        >
          <div className="py-1" role="none">
            {FEATURES.filter(f => f.id !== currentFeatureId).map(feature => (
              <a
                key={feature.id}
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    handleSend(feature.id);
                }}
                className="text-gray-200 block px-4 py-2 text-sm hover:bg-slate-700"
                role="menuitem"
              >
                {feature.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SendToFeature;
