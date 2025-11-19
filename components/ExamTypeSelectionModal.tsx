
import React, { useState } from 'react';
import Icon from './Icon';
import { ExamTypeSelectionModalProps } from '../types'; // FIX: Imported ExamTypeSelectionModalProps
import { useAuth } from '../context/AuthContext';

const ExamTypeSelectionModal: React.FC<ExamTypeSelectionModalProps> = ({ onSelect, onClose, animationOrigin }) => { // FIX: Added onClose prop
  const { currentUser } = useAuth();
  const theme = currentUser?.CONFIG.settings.theme;
  const [isExiting, setIsExiting] = useState(false);

  const handleSelect = (examType: 'JEE' | 'NEET') => {
    setIsExiting(true);
    setTimeout(() => {
        onSelect(examType);
        onClose(); // FIX: Call onClose after selection
    }, theme === 'liquid-glass' ? 500 : 300);
  };
  
  const handleClose = () => { // FIX: Added handleClose function
    setIsExiting(true);
    setTimeout(onClose, theme === 'liquid-glass' ? 500 : 300);
  };

  const animationClasses = theme === 'liquid-glass' ? (isExiting ? 'genie-out' : 'genie-in') : (isExiting ? 'modal-exit' : 'modal-enter');
  const contentAnimationClasses = theme === 'liquid-glass' ? '' : (isExiting ? 'modal-content-exit' : 'modal-content-enter');

  return (
    <div
      className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${animationClasses}`}
      style={{ '--clip-origin-x': animationOrigin?.x, '--clip-origin-y': animationOrigin?.y } as React.CSSProperties}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-md bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--modal-border-radius)] shadow-[var(--modal-shadow)] p-6 text-center ${contentAnimationClasses} overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {theme === 'liquid-glass' && (
          <div className="flex-shrink-0 flex items-center p-3 border-b border-[var(--glass-border)]">
            <div className="flex gap-2">
              <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500"></button>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <h2 className="text-sm font-semibold text-white text-center flex-grow -ml-12">Welcome!</h2>
          </div>
        )}
        <div className="p-6">
            {theme !== 'liquid-glass' && <h2 className="text-2xl font-bold text-white mb-2">Welcome!</h2>}
            <p className="text-gray-300 mb-6">Please select your primary exam to personalize your experience.</p>
            
            <div className="space-y-4">
                <button 
                    onClick={() => handleSelect('JEE')}
                    className="w-full text-left p-4 rounded-lg bg-gray-800/50 border-2 border-transparent hover:border-cyan-500 transition-colors"
                >
                    <h3 className="font-bold text-lg text-white">JEE (Engineering)</h3>
                    <p className="text-sm text-gray-400">Physics, Chemistry & Mathematics</p>
                </button>
                <button 
                    onClick={() => handleSelect('NEET')}
                    className="w-full text-left p-4 rounded-lg bg-gray-800/50 border-2 border-transparent hover:border-green-500 transition-colors"
                >
                    <h3 className="font-bold text-lg text-white">NEET (Medical)</h3>
                    <p className="text-sm text-gray-400">Physics, Chemistry & Biology</p>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ExamTypeSelectionModal;
