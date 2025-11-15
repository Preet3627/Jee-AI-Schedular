import React, { useState, useMemo } from 'react';
import McqTimer from './McqTimer';
import Icon from './Icon';

interface CustomPracticeModalProps {
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number) => void;
}

interface QuestionSet {
  id: number;
  category: string;
  count: string;
  page: string;
}

const CustomPracticeModal: React.FC<CustomPracticeModalProps> = ({ onClose, onSessionComplete }) => {
  const [sets, setSets] = useState<QuestionSet[]>([{ id: 1, category: 'L1', count: '', page: '' }]);
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const totalQuestions = useMemo(() => {
    return sets.reduce((total, set) => total + (parseInt(set.count, 10) || 0), 0);
  }, [sets]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleStart = () => {
    if (totalQuestions > 0) {
      setIsTimerStarted(true);
    } else {
      alert('Please enter a valid number of questions.');
    }
  };

  const handleSetChange = (id: number, field: keyof Omit<QuestionSet, 'id'>, value: string) => {
    setSets(currentSets =>
      currentSets.map(set => (set.id === id ? { ...set, [field]: value } : set))
    );
  };

  const addSet = () => {
    setSets(currentSets => [
      ...currentSets,
      { id: Date.now(), category: 'L1', count: '', page: '' },
    ]);
  };

  const removeSet = (id: number) => {
    setSets(currentSets => currentSets.filter(set => set.id !== id));
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';
  const inputClass = "w-full px-3 py-2 text-sm text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";


  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">Custom Practice Session</h2>
        
        {isTimerStarted && totalQuestions > 0 ? (
          <McqTimer 
            customQuestionCount={totalQuestions} 
            onClose={handleClose} 
            onSessionComplete={onSessionComplete}
          />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {sets.map((set, index) => (
                    <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4">
                            <label className="text-xs font-bold text-gray-400">Category</label>
                            <input type="text" value={set.category} onChange={e => handleSetChange(set.id, 'category', e.target.value)} placeholder="e.g., PYQ" className={inputClass} />
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs font-bold text-gray-400"># Q's</label>
                            <input type="number" value={set.count} onChange={e => handleSetChange(set.id, 'count', e.target.value)} placeholder="e.g., 25" className={inputClass} />
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs font-bold text-gray-400">Page #</label>
                            <input type="text" value={set.page} onChange={e => handleSetChange(set.id, 'page', e.target.value)} placeholder="(Optional)" className={inputClass} />
                        </div>
                        <div className="col-span-2 flex justify-end pt-5">
                            {sets.length > 1 && (
                                <button onClick={() => removeSet(set.id)} className="p-2 text-red-400 hover:bg-red-900/50 rounded-full">
                                    <Icon name="trash" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addSet} className="w-full text-sm text-cyan-400 hover:bg-cyan-900/50 rounded-md py-2 transition-colors">+ Add Question Set</button>

            <div className="mt-4 pt-4 border-t border-[var(--glass-border)] text-center">
                <p className="text-gray-400">Total Questions: <span className="font-bold text-white">{totalQuestions}</span></p>
                <p className="text-gray-400">Estimated Time: <span className="font-bold text-white">{totalQuestions * 3} minutes</span></p>
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