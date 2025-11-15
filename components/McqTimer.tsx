import React, { useState, useEffect, useMemo } from 'react';
import Icon from './Icon';
import { playBeep } from '../utils/audio';

interface McqTimerProps {
  qRanges?: string;
  customQuestionCount?: number;
  onClose?: () => void; // For custom timer modal
  onSessionComplete?: (duration: number, questions_solved: number) => void;
}

const parseQRanges = (qRanges: string): number => {
  try {
    return qRanges
      .split(';')
      .reduce((total, part) => {
        const mainPart = part.replace(/@p\d+/, ''); // Remove page number for counting
        const rangeStr = mainPart.split(':').pop() || '';
        
        const parts = rangeStr.split('-');
        if (parts && parts.length === 2) {
          const start = parseInt(parts[0], 10);
          const end = parseInt(parts[1], 10);
          if (!isNaN(start) && !isNaN(end)) {
            return total + (end - start + 1);
          }
        } else if (parts && parts.length === 1) {
           const count = parseInt(parts[0], 10);
           if (!isNaN(count)) return total + count;
        }
        return total;
      }, 0);
  } catch (error) {
    console.error("Error parsing Q_RANGES:", error);
    return 0;
  }
};


const McqTimer: React.FC<McqTimerProps> = ({ qRanges, customQuestionCount, onClose, onSessionComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const totalQuestions = useMemo(() => {
    if (qRanges) {
      return parseQRanges(qRanges);
    }
    return customQuestionCount || 0;
  }, [qRanges, customQuestionCount]);
  
  const totalTimeInSeconds = useMemo(() => totalQuestions * 3 * 60, [totalQuestions]); // 3 minutes per question

  const [secondsRemaining, setSecondsRemaining] = useState(totalTimeInSeconds);
  
  useEffect(() => {
    setSecondsRemaining(totalTimeInSeconds);
  }, [totalTimeInSeconds]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null = null;
    if (isActive && !isPaused && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(seconds => seconds - 1);
      }, 1000);
    } else if (secondsRemaining === 0 && isActive) {
      setIsActive(false);
      playBeep();
      alert("Time's up!");
      if (onSessionComplete) {
        onSessionComplete(totalTimeInSeconds, totalQuestions);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, secondsRemaining, totalTimeInSeconds, totalQuestions, onSessionComplete]);

  const handleStart = () => {
    if (totalTimeInSeconds <= 0) {
      alert("Please set a valid number of questions.");
      return;
    }
    playBeep();
    setSecondsRemaining(totalTimeInSeconds);
    setIsPaused(false);
    setIsActive(true);
  };
  
  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    if(confirm("Are you sure you want to stop and log this session?")) {
        if (onSessionComplete) {
            const duration = totalTimeInSeconds - secondsRemaining;
            onSessionComplete(duration, totalQuestions);
        }
        setIsActive(false);
        setIsPaused(false);
        setSecondsRemaining(totalTimeInSeconds);
        if(onClose) onClose();
    }
  };

  if (totalQuestions === 0 && !customQuestionCount) {
    return null; // Don't render if there's nothing to time
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return totalTimeInSeconds >= 3600 ? `${h}:${m}:${s}` : `${m}:${s}`;
  };

  return (
    <div className="bg-gray-900/70 p-3 rounded-lg flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <Icon name="stopwatch" className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold">MCQ Timer</h4>
            </div>
            <p className="text-xs text-gray-400">{totalQuestions} Questions</p>
        </div>

        <div className="font-mono text-4xl font-bold text-white tracking-widest mb-4">
            {formatTime(secondsRemaining)}
        </div>

        {!isActive ? (
            <button onClick={handleStart} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
                <Icon name="play" /> Start Timer
            </button>
        ) : (
            <div className="w-full flex gap-2">
                <button onClick={handlePauseResume} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md bg-yellow-600/80 hover:bg-yellow-500/80">
                   {isPaused ? <Icon name="play" /> : <Icon name="pause" />} {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button onClick={handleStop} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md bg-red-800/80 hover:bg-red-700/80">
                    <Icon name="stop" /> Stop & Log
                </button>
            </div>
        )}
    </div>
  );
};

export default McqTimer;