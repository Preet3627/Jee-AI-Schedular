import React, { useState, useMemo } from 'react';
import McqTimer from './McqTimer';
import Icon from './Icon';
import { getQuestionNumbersFromRanges } from '../utils/qRangesParser';
import { HomeworkData, ResultData, StudentData } from '../types';

interface CustomPracticeModalProps {
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
  initialTask?: HomeworkData | null;
  defaultPerQuestionTime: number;
  onLogResult: (result: ResultData) => void;
  onUpdateWeaknesses: (weaknesses: string[]) => void;
  student: StudentData;
}

type PracticeMode = 'custom' | 'jeeMains';

const CustomPracticeModal: React.FC<CustomPracticeModalProps> = ({ onClose, onSessionComplete, initialTask, defaultPerQuestionTime, onLogResult, student, onUpdateWeaknesses }) => {
  const [mode, setMode] = useState<PracticeMode>('custom');
  const [qRanges, setQRanges] = useState(initialTask?.Q_RANGES || '');
  const [subject, setSubject] = useState(initialTask?.SUBJECT_TAG.EN || 'PHYSICS');
  const [category, setCategory] = useState('Custom');
  const [perQuestionTime, setPerQuestionTime] = useState(defaultPerQuestionTime);
  const [syllabus, setSyllabus] = useState('');
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const questionNumbers = useMemo(() => {
      if (mode === 'jeeMains') {
          return Array.from({ length: 75 }, (_, i) => i + 1);
      }
      return getQuestionNumbersFromRanges(qRanges);
  }, [qRanges, mode]);

  const totalQuestions = questionNumbers.length;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleStart = () => {
    if (mode === 'jeeMains' && !syllabus.trim()) {
        alert('Please enter the syllabus for the test to enable detailed analysis.');
        return;
    }
    if (totalQuestions > 0) {
      setIsTimerStarted(true);
    } else {
      alert('Please enter a valid number of questions or ranges (e.g., "1-25; 30-35").');
    }
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';
  
  const presetCategories = ["Level-1", "Level-2", "PYQ", "Classroom Discussion 1", "Classroom Discussion 2", "Classroom Discussion 3"];

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        
        {isTimerStarted && totalQuestions > 0 ? (
          <McqTimer 
            questionNumbers={questionNumbers}
            perQuestionTime={perQuestionTime}
            onClose={handleClose} 
            onSessionComplete={onSessionComplete}
            practiceMode={mode}
            subject={subject}
            category={mode === 'jeeMains' ? "JEE Mains Full Test" : category}
            syllabus={syllabus}
            onLogResult={onLogResult}
            onUpdateWeaknesses={onUpdateWeaknesses}
            student={student}
          />
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Practice Session</h2>
            
            <div className="flex items-center gap-2 p-1 rounded-full bg-gray-900/50 mb-4">
              <button onClick={() => setMode('custom')} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-full ${mode === 'custom' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>Custom Range</button>
              <button onClick={() => setMode('jeeMains')} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-full ${mode === 'jeeMains' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>JEE Mains Full Test</button>
            </div>
            
            {mode === 'custom' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-sm font-bold text-gray-400">Subject</label>
                        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                           <option>PHYSICS</option>
                           <option>CHEMISTRY</option>
                           <option>MATHS</option>
                        </select>
                     </div>
                     <div>
                        <label className="text-sm font-bold text-gray-400">Category</label>
                        <input list="categories" value={category} onChange={e => setCategory(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                        <datalist id="categories">
                          {presetCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                     </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-bold text-gray-400">Question Ranges (e.g., 1-15; 20-25 @p45)</label>
                    <textarea value={qRanges} onChange={(e) => setQRanges(e.target.value)} className="w-full h-24 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1" placeholder="e.g., 1-25; 30-35; 40 @p50" />
                  </div>
                </>
            ) : (
                <div className="space-y-4">
                  <div className="text-center bg-gray-900/50 p-4 rounded-lg">
                      <p className="font-semibold text-white">JEE Mains Full Test</p>
                      <p className="text-sm text-gray-400">A 75-question mock test simulating the official pattern.</p>
                  </div>
                   <div>
                      <label className="text-sm font-bold text-gray-400">Syllabus (Required for Analysis)</label>
                       <textarea value={syllabus} onChange={(e) => setSyllabus(e.target.value)} className="w-full h-24 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1" placeholder="Enter comma-separated chapter names, e.g., Rotational Motion, Thermodynamics, P-Block Elements..." />
                  </div>
                </div>
            )}


            <div className="mt-4 pt-4 border-t border-[var(--glass-border)] text-center">
                <p className="text-gray-400">Total Questions: <span className="font-bold text-white">{totalQuestions}</span></p>
                <p className="text-gray-400">Total Estimated Time: <span className="font-bold text-white">{(totalQuestions * perQuestionTime / 60).toFixed(1)} minutes</span></p>
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
              <button onClick={handleStart} disabled={totalQuestions === 0} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
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