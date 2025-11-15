import React from 'react';
import { StudentData } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import Icon from '../Icon';

interface ReadingHoursWidgetProps {
    student: StudentData;
}

const AchievementBadge: React.FC<{ achievement: { name: string; icon: any; description: string; } }> = ({ achievement }) => (
    <div className="relative group">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500/50">
            <Icon name={achievement.icon} className="w-6 h-6 text-yellow-400" />
        </div>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            <p className="font-bold">{achievement.name}</p>
            <p>{achievement.description}</p>
        </div>
    </div>
);


const ReadingHoursWidget: React.FC<ReadingHoursWidgetProps> = ({ student }) => {
    const { t } = useLocalization();
    const { SCHEDULE_ITEMS, RESULTS, STUDY_SESSIONS } = student;

    const studyTaskTypes = ['DEEP_DIVE', 'HOMEWORK', 'ANALYSIS'];
    const assumedHoursPerTask = 2;
    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    
    // --- Calculate Total and Completed Hours ---
    const weeklyStudyTasks = SCHEDULE_ITEMS.filter(item => 
        (item.type === 'ACTION' && studyTaskTypes.includes(item.SUB_TYPE || '')) || item.type === 'HOMEWORK'
    );
    const totalScheduledHours = weeklyStudyTasks.length * assumedHoursPerTask;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() + 6) % 7); // Monday
    startOfWeek.setHours(0, 0, 0, 0);

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
    
    // --- Achievements Logic ---
    const achievements = [];
    if (progressPercentage >= 100 && totalWeeklyHours > 0) {
        achievements.push({ name: 'Perfect Week', icon: 'star', description: 'Completed 100% of weekly study hours.' });
    }
    if (RESULTS.some(r => parseInt(r.SCORE.split('/')[0]) >= 200)) {
         achievements.push({ name: 'High Scorer', icon: 'trophy', description: 'Scored 200+ in a mock test.' });
    }
    
    const questionsThisWeek = STUDY_SESSIONS.reduce((total, session) => {
       const sessionDate = new Date(session.date);
       return sessionDate >= startOfWeek ? total + session.questions_solved : total;
    }, 0);
    if(questionsThisWeek >= 100) {
        achievements.push({ name: 'Problem Slayer', icon: 'fixed', description: 'Solved 100+ MCQs in timed sessions this week.' });
    }

    const studyDaysThisWeek = new Set(
        SCHEDULE_ITEMS.map(t => daysOfWeek.indexOf(t.DAY.EN.toUpperCase()))
                      .filter(dayIndex => dayIndex !== -1)
    );
    if (studyDaysThisWeek.size >= 5) {
        achievements.push({ name: 'Streak Master', icon: 'streak', description: 'Studied on 5 or more days this week.' });
    }

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

            {achievements.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">Achievements</h3>
                    <div className="flex items-center gap-4">
                        {achievements.map(ach => <AchievementBadge key={ach.name} achievement={ach} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReadingHoursWidget;