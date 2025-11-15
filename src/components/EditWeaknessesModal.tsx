import React, { useState } from 'react';

interface EditWeaknessesModalProps {
  currentWeaknesses: string[];
  onClose: () => void;
  onSave: (weaknesses: string[]) => void;
}

const EditWeaknessesModal: React.FC<EditWeaknessesModalProps> = ({ currentWeaknesses, onClose, onSave }) => {
  const [text, setText] = useState(currentWeaknesses.join(', '));
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const weaknesses = text.split(',').map(w => w.trim()).filter(Boolean);
    onSave(weaknesses);
    handleClose();
  };
  
  const inputClass = "w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 h-32";
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">Edit Priority Weaknesses</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400">Weaknesses</label>
            <p className="text-xs text-gray-500 mb-2">Enter topics separated by commas.</p>
            <textarea value={text} onChange={e => setText(e.target.value)} className={inputClass} placeholder="e.g., Rotational Motion, P-Block Reactions..."></textarea>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">Save Weaknesses</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditWeaknessesModal;
