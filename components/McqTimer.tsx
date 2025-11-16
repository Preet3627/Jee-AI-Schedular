
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './Icon';
import { playNextSound, playStopSound, playMarkSound, vibrate } from '../utils/sounds';
import { api } from '../api/apiService';
import AnswerKeyUploadModal from './AnswerKeyUploadModal';
// FIX: Added StudentData to types import.
import { ResultData, StudentData } from '../types';
import TestAnalysisReport from './TestAnalysisReport';
import SpecificMistakeAnalysisModal from './SpecificMistakeAnalysisModal';

type PracticeMode = 'custom' | 'jeeMains';

interface McqTimerProps {
  questionNumbers: number[];
  perQuestionTime: number;
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
  onLogResult?: (result: ResultData) => void;
  onUpdateWeaknesses?: (weaknesses: string[]) => void;
  practiceMode: PracticeMode;
  subject: string;
  category: string;
  syllabus: string;
  // FIX: Added missing student prop.
  student: StudentData;
}

const McqTimer: React.FC<McqTimerProps> = (props) => {
    const { questionNumbers, perQuestionTime, onClose, onSessionComplete, onLogResult, onUpdateWeaknesses, practiceMode, subject, category, syllabus, student } = props;
    const [isActive, setIsActive] = useState(false);
    const [totalSeconds, setTotalSeconds] = useState(practiceMode === 'jeeMains' ? 180 * 60 : perQuestionTime * questionNumbers.length);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [timings, setTimings] = useState<Record<number, number>>({});
    const [markedForReview, setMarkedForReview] = useState<number[]>([]);
    const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
    const [isFinished, setIsFinished] = useState(false);
    const [isPaletteOpen, setIsPaletteOpen] = useState(false);
    const [isUploadingKey, setIsUploadingKey] = useState(false);
    const [testResult, setTestResult] = useState<ResultData | null>(null);
    const [gradingError, setGradingError] = useState('');
    const [isGrading, setIsGrading] = useState(false);
    
    const [analyzingMistake, setAnalyzingMistake] = useState<number | null>(null);

    const questionStartTimeRef = useRef<number | null>(null);
    const totalQuestions = questionNumbers.length;
    const currentQuestionNumber = questionNumbers[currentQuestionIndex];

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    useEffect(() => {
        let interval: ReturnType<typeof setTimeout> | null = null;
        if (isActive && !isFinished && totalSeconds > 0) {
            interval = setInterval(() => setTotalSeconds(s => s - 1), 1000);
        } else if (isActive && !isFinished && totalSeconds <= 0) {
            finishSession();
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isActive, isFinished, totalSeconds]);

    const handleStart = () => {
        vibrate('click');
        setSessionStartTime(Date.now());
        questionStartTimeRef.current = Date.now();
        setIsActive(true);
    };

    const finishSession = () => {
        if (isFinished) return;
        playStopSound(); vibrate('finish');
        setIsActive(false);
        setIsFinished(true);
        const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
        const solved = Object.keys(answers).filter(k => answers[parseInt(k)] !== '');
        const skipped = questionNumbers.filter(q => !solved.includes(q.toString()));
        onSessionComplete(duration, solved.length, skipped);
    };

    const handleAnswerSelect = (answer: string) => {
        setAnswers(prev => ({ ...prev, [currentQuestionNumber]: answer }));
    };

    const navigate = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < totalQuestions) {
            // Log time for the question we are leaving
            if (questionStartTimeRef.current) {
                const timeSpent = Math.round((Date.now() - questionStartTimeRef.current) / 1000);
                setTimings(prev => ({...prev, [currentQuestionNumber]: (prev[currentQuestionNumber] || 0) + timeSpent}));
            }
            questionStartTimeRef.current = Date.now(); // Reset timer for new question
            setCurrentQuestionIndex(newIndex);
            setIsPaletteOpen(false);
        }
    };

    const handleSaveAndNext = () => {
        playNextSound();
        navigate(currentQuestionIndex + 1);
    };
    
    const handleMarkForReview = () => {
        playMarkSound();
        setMarkedForReview(prev => 
            prev.includes(currentQuestionNumber) 
                ? prev.filter(q => q !== currentQuestionNumber) 
                : [...prev, currentQuestionNumber]
        );
        handleSaveAndNext();
    };

    const handleGradeWithAI = async (imageBase64: string) => {
        setIsGrading(true);
        setGradingError('');
        try {
            const resultAnalysis = await api.analyzeTestResults({ imageBase64, userAnswers: answers, timings, syllabus });
            
            const newResult: ResultData = {
              ID: `R${Date.now()}`,
              DATE: new Date().toISOString().split('T')[0],
              SCORE: `${resultAnalysis.score}/${resultAnalysis.totalMarks}`,
              MISTAKES: resultAnalysis.incorrectQuestionNumbers.map(String),
              syllabus: syllabus,
              timings: timings,
              analysis: {
                  subjectTimings: resultAnalysis.subjectTimings,
                  chapterScores: resultAnalysis.chapterScores,
                  aiSuggestions: resultAnalysis.aiSuggestions,
                  incorrectQuestionNumbers: resultAnalysis.incorrectQuestionNumbers,
              },
            };
            setTestResult(newResult);
            if (onLogResult) onLogResult(newResult);

        } catch (error: any) {
            setGradingError(error.error || "Failed to grade answers. Please try again.");
        } finally {
            setIsGrading(false);
            setIsUploadingKey(false);
        }
    };

    const getQuestionInfo = (index: number) => {
        if (practiceMode !== 'jeeMains') {
            return { subject, type: 'MCQ' as 'MCQ' | 'NUM' };
        }
        if (index < 20) return { subject: 'Physics', type: 'MCQ' as const };
        if (index < 25) return { subject: 'Physics', type: 'NUM' as const };
        if (index < 45) return { subject: 'Chemistry', type: 'MCQ' as const };
        if (index < 50) return { subject: 'Chemistry', type: 'NUM' as const };
        if (index < 70) return { subject: 'Maths', type: 'MCQ' as const };
        return { subject: 'Maths', type: 'NUM' as const };
    };

    const { subject: currentSubject, type: currentQuestionType } = getQuestionInfo(currentQuestionIndex);
    
    if (!isActive) {
      return (
          <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-4">Ready to Practice?</h3>
              <p className="text-gray-400 mb-2">Total Questions: <span className="font-bold text-white">{totalQuestions}</span></p>
              <p className="text-gray-400 mb-6">Total Time: <span className="font-bold text-white">{formatTime(totalSeconds)}</span></p>
              <button onClick={handleStart} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
                  <Icon name="play" /> Start Practice
              </button>
          </div>
      )
    }

    if (isFinished) {
        return (
            <div className="text-center space-y-4 max-h-[75vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-white">Test Finished!</h3>
                {testResult && testResult.analysis ? (
                    <TestAnalysisReport 
                      result={testResult} 
                      onAnalyzeMistake={(qNum) => setAnalyzingMistake(qNum)}
                    />
                ) : (
                    <>
                        <p className="text-sm text-gray-400">Upload the answer key to get your score and detailed analysis instantly.</p>
                        <button onClick={() => setIsUploadingKey(true)} disabled={isGrading} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-base font-semibold text-white rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50">
                           {isGrading ? 'Analyzing...' : <><Icon name="upload" /> Grade with AI</>}
                        </button>
                        {gradingError && <p className="text-sm text-red-400">{gradingError}</p>}
                    </>
                )}
                <button onClick={onClose} className="w-full px-4 py-2 mt-4 text-base font-semibold text-white rounded-lg bg-gray-700 hover:bg-gray-600">Close</button>
                {isUploadingKey && <AnswerKeyUploadModal onClose={() => setIsUploadingKey(false)} onGrade={handleGradeWithAI} />}
                {analyzingMistake !== null && onUpdateWeaknesses && (
                    <SpecificMistakeAnalysisModal 
                        questionNumber={analyzingMistake}
                        onClose={() => setAnalyzingMistake(null)}
                        onSaveWeakness={(topic) => onUpdateWeaknesses([...new Set([...(student.CONFIG.WEAK || []), topic])])}
                    />
                )}
            </div>
        );
    }
  
    return (
        <div className="flex flex-col h-[70vh] max-h-[600px]">
            {/* Header */}
            <div className="flex-shrink-0 flex justify-between items-center pb-3 border-b border-gray-700">
                <div>
                    <h4 className="text-lg font-bold text-white">{category}</h4>
                    <p className="text-sm text-cyan-400">{currentSubject}</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-xl font-bold tracking-wider">{formatTime(totalSeconds)}</p>
                    <button onClick={() => setIsPaletteOpen(true)} className="text-xs text-gray-400 hover:text-white">
                        Question {currentQuestionIndex + 1} / {totalQuestions}
                    </button>
                </div>
            </div>

            {/* Question Area */}
            <div className="flex-grow flex flex-col items-center justify-center p-4">
                 <h2 className="text-2xl font-bold mb-6">Question {currentQuestionNumber.toString().padStart(3,'0')}</h2>
                 {currentQuestionType === 'MCQ' ? (
                     <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                         {(['A', 'B', 'C', 'D'] as const).map(option => (
                             <button key={option} onClick={() => handleAnswerSelect(option)} className={`py-3 px-6 rounded-lg font-semibold border-2 transition-colors ${answers[currentQuestionNumber] === option ? 'bg-cyan-500 border-cyan-400 text-white' : 'bg-gray-800 border-gray-700 hover:border-cyan-500'}`}>
                                 {option}
                             </button>
                         ))}
                     </div>
                 ) : (
                     <input type="text" value={answers[currentQuestionNumber] || ''} onChange={(e) => handleAnswerSelect(e.target.value)} className="w-full max-w-xs text-center text-2xl font-mono bg-gray-900 border border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="Numerical Answer" />
                 )}
            </div>
            
            {/* Navigation */}
            <div className="flex-shrink-0 space-y-2">
                 <div className="flex gap-2">
                    <button onClick={() => navigate(currentQuestionIndex - 1)} disabled={currentQuestionIndex === 0} className="flex-1 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600 disabled:opacity-50">Back</button>
                    <button onClick={() => setAnswers(prev => ({...prev, [currentQuestionNumber]: ''}))} className="flex-1 py-2 text-sm font-semibold rounded-md bg-gray-700 hover:bg-gray-600">Clear</button>
                    <button onClick={handleMarkForReview} className="flex-1 py-2 text-sm font-semibold rounded-md bg-yellow-600/80 hover:bg-yellow-500/80 flex items-center justify-center gap-1">
                        <Icon name="marker" className="w-4 h-4"/> Review & Next
                    </button>
                    <button onClick={handleSaveAndNext} disabled={currentQuestionIndex === totalQuestions - 1} className="flex-1 py-2 text-sm font-semibold rounded-md bg-green-600/80 hover:bg-green-500/80 disabled:opacity-50">Save & Next</button>
                 </div>
                 <button onClick={finishSession} className="w-full py-2 text-sm font-semibold rounded-md bg-red-800/80 hover:bg-red-700/80">
                    Finish Test
                 </button>
            </div>
            
            {/* Question Palette */}
            {isPaletteOpen && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10" onClick={() => setIsPaletteOpen(false)}>
                    <div className="bg-gray-800 p-4 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h4 className="font-bold text-lg mb-4">Question Palette</h4>
                        <div className="grid grid-cols-5 gap-2">
                            {questionNumbers.map((qNum, index) => {
                                const isAnswered = qNum in answers && answers[qNum] !== '';
                                const isMarked = markedForReview.includes(qNum);
                                const isCurrent = index === currentQuestionIndex;

                                let statusClass = 'bg-gray-700 hover:bg-gray-600';
                                if(isCurrent) statusClass = 'ring-2 ring-white';
                                else if(isAnswered && isMarked) statusClass = 'bg-purple-600';
                                else if(isAnswered) statusClass = 'bg-green-600';
                                else if(isMarked) statusClass = 'bg-yellow-600';

                                return (
                                    <button key={qNum} onClick={() => navigate(index)} className={`w-12 h-12 rounded-md font-semibold transition-colors ${statusClass}`}>
                                        {qNum}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default McqTimer;
