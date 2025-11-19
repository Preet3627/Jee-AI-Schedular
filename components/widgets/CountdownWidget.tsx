import React, { useState, useEffect, useMemo } from 'react';
import { ScheduleItem } from '../../types';
import Icon from '../Icon';

// FIX: Added explicit return type to ensure type safety for consumers of this function.
const getNextTask = (items: ScheduleItem[]): (ScheduleItem & { scheduledTime: Date }) | null => {
    const now = new Date();
    const today = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const todayName = now.toLocaleString('en-us', { weekday: 'long' }).toUpperCase();
    const todayDateString = now.toISOString().split('T')[0];

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
        // FIX: Replaced incorrect type predicate with `Boolean` to correctly filter out nulls and satisfy TypeScript.
        .filter(Boolean)
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return upcomingTasks[0] || null;
};


const CountdownWidget: React.FC<CountdownWidgetProps> = ({ items }) => {
    const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const nextTask = useMemo(() => getNextTask(items), [items]);

    useEffect(() => {
        // FIX: Simplified check as getNextTask's return type now guarantees scheduledTime exists if nextTask is not null.
        if (!nextTask) {
            return;
        }

        const interval = setInterval(() => {
            const now = new Date();
            // FIX: Removed `as any` cast by using the strongly-typed `scheduledTime` property from the improved getNextTask function.
            const scheduledTime = new Date(nextTask.scheduledTime);
            const totalSeconds = Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / 1000));

            if (totalSeconds === 0) {
                clearInterval(interval);
            }

            setTimeRemaining({
                hours: Math.floor(totalSeconds / 3600),
                minutes: Math.floor((totalSeconds % 3600) / 60),
                seconds: totalSeconds % 60,
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

    const { hours, minutes, seconds } = timeRemaining;

    return (
        <div className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white tracking-wider uppercase mb-2">Next Up:</h2>
            <p className="text-xl font-bold text-cyan-300 truncate">{nextTask.CARD_TITLE.EN}</p>
            <div className="flex items-baseline justify-center gap-3 my-4">
                <div className="text-center">
                    <span className="text-5xl font-mono font-bold text-white">{hours.toString().padStart(2, '0')}</span>
                    <span className="text-xs text-gray-400 block">HRS</span>
                </div>
                 <span className="text-4xl font-mono font-bold text-white animate-pulse">:</span>
                 <div className="text-center">
                    <span className="text-5xl font-mono font-bold text-white">{minutes.toString().padStart(2, '0')}</span>
                    <span className="text-xs text-gray-400 block">MIN</span>
                </div>
                 <span className="text-4xl font-mono font-bold text-white animate-pulse">:</span>
                <div className="text-center">
                    <span className="text-5xl font-mono font-bold text-white">{seconds.toString().padStart(2, '0')}</span>
                    <span className="text-xs text-gray-400 block">SEC</span>
                </div>
            </div>
        </div>
    );
};

export default CountdownWidget;