import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';
import { playNextSound, playSkipSound, playStopSound, playTimesUpSound, vibrate } from '../utils/sounds';

interface McqTimerProps {
  questionNumbers: number[];
  perQuestionTime: number;
  onClose: () => void;
  onSessionComplete: (duration: number, questions_solved: number, questions_skipped: number[]) => void;
}

const McqTimer: React.FC<McqTimerProps> = ({ questionNumbers, perQuestionTime, onClose, onSessionComplete }) => {
  const [isActive, setIsActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(perQuestionTime);
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [solvedQuestions, setSolvedQuestions] = useState<number[]>([]);
  const [skippedQuestions, setSkippedQuestions] = useState<number[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const notificationRef = useRef<Notification | null>(null);
  const notificationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const totalQuestions = questionNumbers.length;
  const currentQuestionNumber = questionNumbers[currentQuestionIndex];

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateNotification = () => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const timeStr = isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(secondsRemaining);
      const title = `Q# ${currentQuestionNumber} | ${timeStr}`;
      const body = `Practice in progress... (${currentQuestionIndex + 1}/${totalQuestions})`;

      // Close previous notification before creating a new one
      notificationRef.current?.close();

      // FIX: Removed non-standard 'renotify' property from Notification options.
      notificationRef.current = new Notification(title, {
        body: body,
        tag: 'mcq-timer-notification',
        silent: true,
      });
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive && !isFinished) {
        if (Notification.permission !== 'granted') {
          Notification.requestPermission();
        }
        updateNotification(); // Initial notification
        notificationIntervalRef.current = setInterval(updateNotification, 5000); // Update every 5s
      } else {
        if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
        notificationRef.current?.close();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
      notificationRef.current?.close();
    };
  }, [isActive, isFinished, secondsRemaining, isOvertime, currentQuestionIndex]);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null = null;
    if (isActive && !isFinished) {
      if (secondsRemaining > 0) {
        interval = setInterval(() => setSecondsRemaining(s => s - 1), 1000);
      } else {
        if (!isOvertime) {
          playTimesUpSound();
          vibrate('error');
          setIsOvertime(true);
        }
        interval = setInterval(() => setOvertimeSeconds(s => s + 1), 1000);
      }
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isActive, isFinished, secondsRemaining, isOvertime]);

  const handleStart = () => {
    vibrate('click');
    setSessionStartTime(Date.now());
    setIsActive(true);
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }
  };
  
  const handleNext = (isSkip = false) => {
    if (isSkip) {
        playSkipSound(); vibrate('click');
        setSkippedQuestions(prev => [...prev, currentQuestionNumber]);
    } else {
        playNextSound(); vibrate('click');
        setSolvedQuestions(prev => [...prev, currentQuestionNumber]);
    }
    
    if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSecondsRemaining(perQuestionTime);
        setIsOvertime(false);
        setOvertimeSeconds(0);
    } else {
        finishSession(isSkip);
    }
  };

  const finishSession = (wasLastActionSkip = false) => {
    if (isFinished) return;
    playStopSound(); vibrate('finish');
    setIsActive(false);
    
    let finalSolved = solvedQuestions;
    let finalSkipped = skippedQuestions;
    
    if (wasLastActionSkip && !skippedQuestions.includes(currentQuestionNumber)) {
        finalSkipped = [...skippedQuestions, currentQuestionNumber];
    } else if (!wasLastActionSkip && !solvedQuestions.includes(currentQuestionNumber)) {
        finalSolved = [...solvedQuestions, currentQuestionNumber];
    }
    
    const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
    onSessionComplete(duration, finalSolved.length, finalSkipped);
    setIsFinished(true);
    notificationRef.current?.close();
    if (notificationIntervalRef.current) clearInterval(notificationIntervalRef.current);
  };
  

  if (isFinished) {
    const duration = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
    return (
        <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-white">Session Complete!</h3>
            <p>Total time: {formatTime(duration)}</p>
            <p className="text-green-400 font-semibold">Questions Solved: {solvedQuestions.length + (skippedQuestions.includes(currentQuestionNumber) ? 0 : 1)}</p>
            <p className="text-yellow-400 font-semibold">Questions Skipped: {skippedQuestions.length + (skippedQuestions.includes(currentQuestionNumber) ? 1 : 0) -1}</p>
            <button onClick={onClose} className="w-full px-4 py-2 mt-4 text-base font-semibold text-white rounded-lg bg-gray-700 hover:bg-gray-600">Close</button>
        </div>
    );
  }

  if (!isActive) { /* ... UI remains the same ... */ }

  return (
    <div className="flex flex-col items-center">
        {/* ... Active timer UI remains largely the same ... */}
        <div className="w-full flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
                <Icon name="stopwatch" className="w-5 h-5 text-cyan-400" />
                <h4 className="text-sm font-semibold">Question {currentQuestionIndex + 1} / {totalQuestions}</h4>
            </div>
            <p className="text-xs text-gray-400">Q# {currentQuestionNumber}</p>
        </div>

        <div className="relative w-full text-center">
            <div className={`font-mono text-5xl font-bold tracking-widest my-4 transition-colors ${isOvertime ? 'text-red-500' : 'text-white'}`}>
                {isOvertime ? `+${formatTime(overtimeSeconds)}` : formatTime(secondsRemaining)}
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-700 rounded-full">
                {isOvertime ? (
                    <div className="h-full bg-red-500 rounded-full" style={{width: `100%`}}></div>
                ) : (
                    <div 
                        className="h-full bg-cyan-400 rounded-full transition-all duration-1000 linear" 
                        style={{width: `${(secondsRemaining / perQuestionTime) * 100}%`}}>
                    </div>
                )}
            </div>
        </div>


        <div className="w-full flex gap-2 mt-8">
            <button onClick={() => handleNext(true)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md bg-yellow-600/80 hover:bg-yellow-500/80">
                <Icon name="forward" /> Skip
            </button>
            <button onClick={() => handleNext(false)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md bg-green-600/80 hover:bg-green-500/80">
                Next <Icon name="forward" />
            </button>
        </div>
        <button onClick={() => finishSession(true)} className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md bg-red-800/80 hover:bg-red-700/80">
            <Icon name="stop" /> Stop & Finish Session
        </button>
    </div>
  );
};

export default McqTimer;