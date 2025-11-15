import React from 'react';
import { StudentData } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import Icon from '../Icon';

interface ReadingHoursWidgetProps {
    student: StudentData;
}

const ReadingHoursWidget: React.FC<ReadingHoursWidgetProps> = ({ student }) => {
    const { t } = useLocalization();
    const { SCHEDULE_ITEMS, STUDY_SESSIONS } = student;

    const studyTaskTypes = ['DEEP_DIVE', 'HOMEWORK', 'ANALYSIS'];
    const assumedHoursPerTask = 2;
    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() + 6) % 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklyStudyTasks = SCHEDULE_ITEMS.filter(item => 
        (item.type === 'ACTION' && 'SUB_TYPE' in item && studyTaskTypes.includes(item.SUB_TYPE || '')) || item.type === 'HOMEWORK'
    );
    const totalScheduledHours = weeklyStudyTasks.length * assumedHoursPerTask;

    const completedScheduledHours = weeklyStudyTasks.filter(item => {
        const itemDayIndex = daysOfWeek.indexOf(item.DAY.EN.toUpperCase());
        const taskDate = new Date(startOfWeek);
        taskDate.setDate(startOfWeek.getDate() + itemDayIndex);
        return taskDate < today;
    }).length * assumedHoursPerTask;

    const timedSessionSeconds = STUDY_SESSIONS.reduce((total, session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startOfWeek ? total + session.duration : total;
    }, 0);
    const timedSessionHours = timedSessionSeconds / 3600;

    const totalWeeklyHours = totalScheduledHours + timedSessionHours;
    const completedHours = completedScheduledHours + timedSessionHours;
    
    const progressPercentage = totalWeeklyHours > 0 ? Math.min((completedHours / totalWeeklyHours) * 100, 100) : 0;

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-[var(--accent-color)] tracking-widest uppercase mb-4">
                {t({ EN: "Weekly Study Goal", GU: "સાપ્તાહિક અભ્યાસ લક્ષ્ય" })}
            </h2>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Icon name="stopwatch" className="w-10 h-10 text-purple-400" />
                    <div>
                        <p className="text-3xl font-bold text-white">{totalWeeklyHours.toFixed(1)} <span className="text-lg">hrs</span></p>
                        <p className="text-sm text-gray-400">Total this week</p>
                    </div>
                </div>
                <div className="text-right">
                     <p className="text-xl font-bold text-white">{completedHours.toFixed(1)} <span className="text-base">hrs</span></p>
                     <p className="text-sm text-gray-400">Completed</p>
                </div>
            </div>
            <div className="mt-4">
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div 
                        className="bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] h-2.5 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default ReadingHoursWidget;
