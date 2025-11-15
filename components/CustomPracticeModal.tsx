
import React, { useState, useMemo } from 'react';
import McqTimer from './McqTimer';
import Icon from './Icon';
import { getQuestionNumbersFromRanges } from '../utils/qRangesParser';

interface CustomPracticeModalProps {
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
  initialQRanges?: string;
  defaultPerQuestionTime: number;
}

const CustomPracticeModal: React.FC<CustomPracticeModalProps> = ({ onClose, onSessionComplete, initialQRanges = '', defaultPerQuestionTime }) => {
  const [qRanges, setQRanges] = useState(initialQRanges);
  const [perQuestionTime, setPerQuestionTime] = useState(defaultPerQuestionTime);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const questionNumbers = useMemo(() => getQuestionNumbersFromRanges(qRanges), [qRanges]);
  const totalQuestions = questionNumbers.length;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleStart = () => {
    if (totalQuestions > 0) {
      setIsTimerStarted(true);
    } else {
      alert('Please enter a valid number of questions or ranges (e.g., "1-25; 30-35").');
    }
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        
        {isTimerStarted && totalQuestions > 0 ? (
          <McqTimer 
            questionNumbers={questionNumbers}
            perQuestionTime={perQuestionTime}
            onClose={handleClose} 
            onSessionComplete={onSessionComplete}
          />
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Practice Session</h2>
            <p className="text-sm text-gray-400 mb-4">Enter question numbers or ranges. Loaded from homework or enter manually.</p>
            
            <label className="text-sm font-bold text-gray-400">Question Ranges</label>
            <textarea
                value={qRanges}
                onChange={(e) => setQRanges(e.target.value)}
                className="w-full h-24 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1"
                placeholder="e.g., 1-25; 30-35; 40"
            />

            <div className="mt-4">
              <label className="text-sm font-bold text-gray-400">Time per Question (seconds)</label>
              <input 
                type="number"
                value={perQuestionTime}
                onChange={e => setPerQuestionTime(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-[var(--glass-border)] text-center">
                <p className="text-gray-400">Total Questions: <span className="font-bold text-white">{totalQuestions}</span></p>
                <p className="text-gray-400">Total Estimated Time: <span className="font-bold text-white">{(totalQuestions * perQuestionTime / 60).toFixed(1)} minutes</span></p>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
              <button 
                onClick={handleStart}
                disabled={totalQuestions === 0}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon name="play" className="w-4 h-4" /> Start
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomPracticeModal;
