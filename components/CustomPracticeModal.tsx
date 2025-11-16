import React, { useState, useMemo, useRef } from 'react';
import McqTimer from './McqTimer';
import Icon from './Icon';
import { getQuestionNumbersFromRanges } from '../utils/qRangesParser';
import { HomeworkData, ResultData, StudentData, ScheduleItem, PracticeQuestion } from '../types';
import AIGenerateAnswerKeyModal from './AIGenerateAnswerKeyModal';
import { api } from '../api/apiService';

interface CustomPracticeModalProps {
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
  initialTask?: HomeworkData | null;
  defaultPerQuestionTime: number;
  onLogResult: (result: ResultData) => void;
  onUpdateWeaknesses: (weaknesses: string[]) => void;
  student: StudentData;
  onSaveTask: (task: ScheduleItem) => void;
}

const parseAnswers = (text: string): Record<string, string> => {
    const answers: Record<string, string> = {};
    if (!text) return answers;

    if (/[:=,;\n]/.test(text)) {
        const entries = text.split(/[,;\n]/);
        entries.forEach(entry => {
            const parts = entry.split(/[:=]/);
            if (parts.length === 2) {
                const qNum = parts[0].trim();
                const answer = parts[1].trim();
                if (qNum && answer) {
                    answers[qNum] = answer;
                }
            }
        });
    } else {
        const answerList = text.trim().split(/\s+/);
        answerList.forEach((answer, index) => {
            if (answer) {
                answers[(index + 1).toString()] = answer;
            }
        });
    }
    return answers;
};


const CustomPracticeModal: React.FC<CustomPracticeModalProps> = (props) => {
  const { onClose, onSessionComplete, initialTask, defaultPerQuestionTime, onLogResult, student, onUpdateWeaknesses, onSaveTask } = props;
  const [activeTab, setActiveTab] = useState<'manual' | 'ai'>(initialTask ? 'manual' : 'ai');
  const [qRanges, setQRanges] = useState(initialTask?.Q_RANGES || '');
  const [subject, setSubject] = useState(initialTask?.SUBJECT_TAG.EN || 'PHYSICS');
  const [category, setCategory] = useState(initialTask ? 'Homework Practice' : 'AI Generated');
  const [perQuestionTime, setPerQuestionTime] = useState(defaultPerQuestionTime);
  const [syllabus, setSyllabus] = useState('');
  const [correctAnswersText, setCorrectAnswersText] = useState('');
  
  // AI State
  const [aiTopic, setAiTopic] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('Medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Session State
  const [isTimerStarted, setIsTimerStarted] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<PracticeQuestion[] | null>(null);
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string> | null>(null);

  const [isExiting, setIsExiting] = useState(false);
  const [isAiKeyModalOpen, setIsAiKeyModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionNumbers = useMemo(() => getQuestionNumbersFromRanges(qRanges), [qRanges]);
  const totalQuestions = questionNumbers.length;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleStart = async () => {
    setError('');
    if (activeTab === 'manual') {
        if (totalQuestions > 0) {
            setIsTimerStarted(true);
        } else {
            alert('Please enter valid question ranges (e.g., "1-25; 30-35").');
        }
    } else { // AI mode
        if (!aiTopic.trim()) {
            setError('Please enter a topic for the AI to generate questions.');
            return;
        }
        setIsGenerating(true);
        try {
            const result = await api.generatePracticeTest({ topic: aiTopic, numQuestions: aiNumQuestions, difficulty: aiDifficulty });
            if (result.questions && result.answers) {
                setPracticeQuestions(result.questions);
                setPracticeAnswers(result.answers);
                setIsTimerStarted(true);
            } else {
                throw new Error("AI returned an invalid test format.");
            }
        } catch (err: any) {
            setError(err.error || 'Failed to generate practice test.');
        } finally {
            setIsGenerating(false);
        }
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const json = JSON.parse(text);
                const formattedKey = Object.entries(json).map(([q, a]) => `${q}:${a}`).join('\n');
                setCorrectAnswersText(formattedKey);
            } catch (err) {
                alert("Failed to parse JSON file. Please ensure it's a valid JSON object of answers.");
            }
        };
        reader.readAsText(file);
    }
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';
  
  const presetCategories = ["Level-1", "Level-2", "PYQ", "Classroom Discussion 1", "Classroom Discussion 2", "Classroom Discussion 3"];
  
  const correctAnswers = useMemo(() => {
    if (initialTask && initialTask.answers) return initialTask.answers;
    return parseAnswers(correctAnswersText);
  }, [correctAnswersText, initialTask]);

  return (
    <>
      <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
        <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
          
          {isTimerStarted ? (
            <McqTimer 
              questionNumbers={practiceQuestions ? practiceQuestions.map(q => q.number) : questionNumbers}
              questions={practiceQuestions || undefined}
              perQuestionTime={perQuestionTime}
              onClose={handleClose} 
              onSessionComplete={onSessionComplete}
              practiceMode={'custom'} // Both modes are handled as custom for grading
              subject={subject}
              category={category}
              syllabus={syllabus}
              onLogResult={onLogResult}
              onUpdateWeaknesses={onUpdateWeaknesses}
              student={student}
              correctAnswers={practiceAnswers || correctAnswers}
              onSaveTask={onSaveTask}
              initialTask={initialTask}
            />
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Practice Session</h2>
              
              <div className="flex items-center gap-2 p-1 rounded-full bg-gray-900/50 mb-4">
                <button onClick={() => setActiveTab('ai')} disabled={!!initialTask} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-full disabled:opacity-50 ${activeTab === 'ai' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>AI Quick Practice</button>
                <button onClick={() => setActiveTab('manual')} className={`flex-1 text-center text-sm font-semibold py-1.5 rounded-full ${activeTab === 'manual' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>From Homework/Ranges</button>
              </div>
              
              {activeTab === 'manual' ? (
                  <>
                    <div className="mt-4">
                      <label className="text-sm font-bold text-gray-400">Question Ranges (e.g., 1-15; 20-25)</label>
                      <textarea value={qRanges} onChange={(e) => setQRanges(e.target.value)} className="w-full h-20 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1" placeholder="e.g., 1-25; 30-35;" />
                    </div>
                     {!initialTask && (
                          <div className="mt-4">
                              <div className="flex justify-between items-center">
                                  <label className="text-sm font-bold text-gray-400">Correct Answers (Optional)</label>
                                  <div className="flex gap-2">
                                     <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                     <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-semibold text-cyan-400 hover:underline">Upload JSON</button>
                                     <button type="button" onClick={() => setIsAiKeyModalOpen(true)} className="text-xs font-semibold text-cyan-400 hover:underline flex items-center gap-1"><Icon name="gemini" className="w-3 h-3" /> AI Gen</button>
                                  </div>
                              </div>
                              <textarea value={correctAnswersText} onChange={(e) => setCorrectAnswersText(e.target.value)} className="w-full h-20 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1" placeholder="1:A, 2:C, 3:12.5 OR A C 12.5" />
                          </div>
                     )}
                  </>
              ) : (
                  <div className="space-y-4">
                     <div>
                        <label className="text-sm font-bold text-gray-400">Topic</label>
                         <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="e.g., Rotational Motion" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-bold text-gray-400"># of Questions</label>
                            <input type="number" value={aiNumQuestions} onChange={(e) => setAiNumQuestions(parseInt(e.target.value))} className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-gray-400">Difficulty</label>
                            <select value={aiDifficulty} onChange={e => setAiDifficulty(e.target.value)} className="w-full px-3 py-2 mt-1 text-gray-200 bg-gray-900/70 border border-[var(--glass-border)] rounded-lg">
                                <option>Easy</option>
                                <option>Medium</option>
                                <option>Hard</option>
                            </select>
                        </div>
                    </div>
                  </div>
              )}

              {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
              
              <div className="mt-4 pt-4 border-t border-[var(--glass-border)] text-center">
                  <p className="text-gray-400">Total Questions: <span className="font-bold text-white">{activeTab === 'manual' ? totalQuestions : aiNumQuestions}</span></p>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
                <button onClick={handleStart} disabled={isGenerating || (activeTab === 'manual' && totalQuestions === 0)} className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                  {isGenerating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Generating...</> : <><Icon name="play" className="w-4 h-4" /> Start</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {isAiKeyModalOpen && (
          <AIGenerateAnswerKeyModal
              onClose={() => setIsAiKeyModalOpen(false)}
              onKeyGenerated={(keyText) => {
                  setCorrectAnswersText(keyText);
              }}
          />
      )}
    </>
  );
};

export default CustomPracticeModal;
