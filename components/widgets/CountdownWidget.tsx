import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem } from '../../types';
import Icon from '../Icon';

const getNextTask = (items: ScheduleItem[]): (ScheduleItem & { scheduledTime: Date }) | null => {
    const now = new Date();
    const today = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
    
    const upcomingTasks = items
        .map(item => {
            if (!('TIME' in item) || !item.TIME) return null;

            const [hours, minutes] = item.TIME.split(':').map(Number);
            let taskDate = new Date();

            if ('date' in item && item.date) {
                // One-off event
                taskDate = new Date(`${item.date}T00:00:00`);
            } else {
                // Repeating weekly event
                const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
                const taskDayIndex = days.indexOf(item.DAY.EN.toUpperCase());
                if (taskDayIndex === -1) return null;

                let dayDifference = taskDayIndex - today;
                // If the day is today but time has passed, schedule for next week
                if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() >= minutes)))) {
                    dayDifference += 7;
                }
                taskDate.setDate(now.getDate() + dayDifference);
            }
            
            taskDate.setHours(hours, minutes, 0, 0);

            // Ensure we are only looking at future tasks
            if (taskDate < now) return null;

            return { ...item, scheduledTime: taskDate };
        })
        // FIX: The type predicate was too broad, causing a TS error.
        // It was asserting a type that included `ActivityData`, but items of this type
        // are filtered out earlier because they lack a 'TIME' property.
        // `Extract` correctly narrows `ScheduleItem` to only types that have a `TIME` property.
        .filter((item): item is Extract<ScheduleItem, { TIME?: any }> & { scheduledTime: Date } => !!item)
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return upcomingTasks[0] || null;
};


const CountdownWidget: React.FC<{ items: ScheduleItem[] }> = ({ items }) => {
    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
    const nextTask = useMemo(() => getNextTask(items), [items]);

    const TOTAL_COUNTDOWN_SECONDS = 8 * 60 * 60; // Countdown ring visualization starts 8 hours before

    useEffect(() => {
        if (!nextTask) {
            setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            const scheduledTime = new Date(nextTask.scheduledTime);
            const totalSecondsLeft = Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / 1000));

            if (totalSecondsLeft === 0) {
                clearInterval(interval);
            }
            
            setTimeRemaining({
                days: Math.floor(totalSecondsLeft / 86400),
                hours: Math.floor((totalSecondsLeft % 86400) / 3600),
                minutes: Math.floor((totalSecondsLeft % 3600) / 60),
                seconds: totalSecondsLeft % 60,
                totalSeconds: totalSecondsLeft,
            });
        }, 1000);

        return () => clearInterval(interval);

    }, [nextTask]);
    
    if (!nextTask) {
        return (
             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm text-center">
                <Icon name="check" className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-white">All Clear!</h3>
                <p className="text-sm text-gray-400">No upcoming tasks scheduled.</p>
            </div>
        )
    }

    const { days, hours, minutes, seconds, totalSeconds } = timeRemaining;
    const progress = Math.max(0, Math.min(1, totalSeconds / TOTAL_COUNTDOWN_SECONDS));
    const activeSegments = Math.ceil(progress * 24);

    const timeDisplay = totalSeconds > 86400 // More than a day
        ? `${days}d ${hours}h`
        : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
        <div className="relative aspect-square w-full max-w-sm mx-auto flex items-center justify-center group transition-transform duration-300 hover:scale-[1.03] active:scale-100 cursor-pointer" title={`Next: ${nextTask.CARD_TITLE.EN}`}>
            {/* Segments */}
            <div className="absolute inset-0 animate-[spin_60s_linear_infinite]">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-full h-full"
                        style={{ transform: `rotate(${i * 15}deg)` }}
                    >
                        <div
                            className={`absolute top-0 left-1/2 -translate-x-1/2 w-3 h-6 rounded-sm transition-all duration-500 ${i < activeSegments ? 'segment-active' : 'segment-inactive'}`}
                        />
                    </div>
                ))}
            </div>

            {/* Glass Ring */}
            <div className="absolute inset-[10%] border-2 border-white/5 rounded-full backdrop-blur-sm shadow-inner"></div>

            {/* Main Body */}
            <div className="relative w-[80%] aspect-square bg-gradient-to-br from-gray-600 to-gray-900 rounded-full shadow-2xl flex items-center justify-center overflow-hidden">
                {/* Brushed metal effect */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.1)_0%,_rgba(0,0,0,0.3)_100%)]"></div>
                
                {/* Aperture lines SVG */}
                <svg viewBox="0 0 200 200" className="absolute w-[95%] h-[95%] text-gray-500/30 group-hover:text-gray-400/50 transition-colors duration-300">
                    {[0, 40, 80, 120, 160, 200, 240, 280, 320].map(angle => (
                         <path 
                            key={angle}
                            d="M 100 100 C 150 50, 150 150, 100 100" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1" 
                            transform={`rotate(${angle} 100 100)`}
                         />
                    ))}
                </svg>

                {/* Digital Display */}
                <div className="relative z-10 text-center bg-black/40 backdrop-blur-sm p-3 rounded-lg border border-white/5 shadow-inner">
                    <div
                        className="font-mono text-3xl md:text-4xl font-bold text-cyan-300 tracking-wider"
                        style={{ textShadow: '0 0 4px #0891b2, 0 0 8px #0891b2' }}
                    >
                        {timeDisplay}
                    </div>
                    <div className="text-xs text-gray-300 uppercase tracking-[0.15em] mt-1">
                        Next Schedule
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CountdownWidget;