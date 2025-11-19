import React, { useState } from 'react';
import { ResultData } from '../types';
import { useAuth } from '../context/AuthContext';

interface LogResultModalProps {
  onClose: () => void;
  onSave: (result: ResultData) => void;
  initialScore?: string;
  initialMistakes?: string;
  animationOrigin?: { x: string, y: string };
}

const LogResultModal: React.FC<LogResultModalProps> = ({ onClose, onSave, initialScore, initialMistakes, animationOrigin }) => {
  const { currentUser } = useAuth();
  const theme = currentUser?.CONFIG.settings.theme;
  const [score, setScore] = useState(initialScore || '');
  const [mistakesText, setMistakesText] = useState(initialMistakes || '');
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, theme === 'liquid-glass' ? 500 : 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d+\/\d+$/.test(score)) {
        alert('Please enter the score in the format "marks/total", e.g., "185/300".');
        return;
    }

    const mistakesArray = mistakesText.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
    if (mistakesArray.length === 0) {
        alert("Please list at least one mistake topic.");
        return;
    }
    
    const newResult: ResultData = {
        ID: `R${Date.now()}`,
        DATE: new Date().toISOString().split('T')[0],
        SCORE: score,
        MISTAKES: mistakesArray,
    };

    onSave(newResult);
    handleClose();
  };
  
  const inputClass = "w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
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
            <h2 className="text-sm font-semibold text-white text-center flex-grow -ml-12">Log New Result</h2>
          </div>
        )}
        <div className="p-6 overflow-y-auto">
          {theme !== 'liquid-glass' && <h2 className="text-2xl font-bold text-white mb-4">Log New Result</h2>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-400">Date</label>
              <input 
                type="date"
                required 
                value={new Date().toISOString().split('T')[0]} 
                disabled 
                className={`${inputClass} opacity-50`}
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-400">Score (e.g., 185/300)</label>
              <input 
                required 
                value={score} 
                onChange={e => setScore(e.target.value)} 
                className={inputClass}
                placeholder="185/300"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-400">Mistake Topics</label>
              <textarea 
                required 
                value={mistakesText} 
                onChange={e => setMistakesText(e.target.value)} 
                className={`${inputClass} h-32`}
                placeholder="List each mistake topic on a new line, or separate with commas/semicolons..."
              ></textarea>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Cancel</button>
              <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90">Save Result</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LogResultModal;