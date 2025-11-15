import React, { useState } from 'react';
import { ResultData } from '../types';

interface LogResultModalProps {
  onClose: () => void;
  onSave: (result: ResultData) => void;
}

const LogResultModal: React.FC<LogResultModalProps> = ({ onClose, onSave }) => {
  const [score, setScore] = useState('');
  const [total, setTotal] = useState('300');
  const [mistakes, setMistakes] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!score || !total || !mistakes) {
        alert("Please fill out all fields.");
        return;
    }
    
    const result: ResultData = {
        ID: `result_${Date.now()}`,
        DATE: new Date().toISOString().split('T')[0],
        SCORE: `${score}/${total}`,
        MISTAKES: mistakes.split(',').map(m => m.trim()).filter(Boolean),
        FIXED_MISTAKES: [],
    };

    onSave(result);
    handleClose();
  };
  
  const inputClass = "w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">Log New Mock Test Result</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
                <label className="text-sm font-bold text-gray-400">Score</label>
                <input type="number" required value={score} onChange={e => setScore(e.target.value)} className={inputClass} placeholder="e.g., 185" />
            </div>
            <span className="text-2xl text-gray-400 pb-2">/</span>
            <div className="w-24">
                 <label className="text-sm font-bold text-gray-400">Total</label>
                <input type="number" required value={total} onChange={e => setTotal(e.target.value)} className={inputClass} placeholder="300" />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-400">Mistakes</label>
            <textarea required value={mistakes} onChange={e => setMistakes(e.target.value)} className={inputClass} placeholder="Comma-separated topics, e.g., Integration by Parts, FBD..."></textarea>
          </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">Save Result</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogResultModal;
