import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface EditWeaknessesModalProps {
  currentWeaknesses: string[];
  onClose: () => void;
  onSave: (weaknesses: string[]) => void;
  animationOrigin?: { x: string, y: string };
}

const EditWeaknessesModal: React.FC<EditWeaknessesModalProps> = ({ currentWeaknesses, onClose, onSave, animationOrigin }) => {
  const { currentUser } = useAuth();
  const theme = currentUser?.CONFIG.settings.theme;
  const [weaknessesText, setWeaknessesText] = useState(currentWeaknesses.join('\n'));
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, theme === 'liquid-glass' ? 500 : 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weaknessesArray = weaknessesText.split('\n').map(w => w.trim()).filter(Boolean);
    onSave(weaknessesArray);
    handleClose();
  };

  const animationClasses = theme === 'liquid-glass' ? (isExiting ? 'genie-out' : 'genie-in') : (isExiting ? 'modal-exit' : 'modal-enter');
  const contentAnimationClasses = theme === 'liquid-glass' ? '' : (isExiting ? 'modal-content-exit' : 'modal-content-enter');

  return (
    <div
      className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`}
      style={{ '--clip-origin-x': animationOrigin?.x, '--clip-origin-y': animationOrigin?.y } as React.CSSProperties}
      onClick={handleClose}
    >
      <div
        className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--modal-border-radius)] shadow-[var(--modal-shadow)] p-6 ${contentAnimationClasses} overflow-hidden flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {theme === 'liquid-glass' && (
          <div className="flex-shrink-0 flex items-center p-3 border-b border-[var(--glass-border)]">
            <div className="flex gap-2">
              <button onClick={handleClose} className="w-3 h-3 rounded-full bg-red-500"></button>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <h2 className="text-sm font-semibold text-white text-center flex-grow -ml-12">Edit Priority Weaknesses</h2>
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {theme !== 'liquid-glass' && <h2 className="text-2xl font-bold text-white mb-2">Edit Priority Weaknesses</h2>}
          <p className="text-sm text-gray-400 mb-4">List your main areas for improvement, one per line. These will be prioritized in your schedule.</p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              value={weaknessesText}
              onChange={(e) => setWeaknessesText(e.target.value)}
              className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="e.g., Integration by Parts&#10;Wave Optics&#10;Mole Concept"
            />
            <div className="flex justify-end gap-4 pt-2">
              <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
              <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">Save Weaknesses</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditWeaknessesModal;