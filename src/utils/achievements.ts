

import { StudentData, DoubtData } from '../types';
import { IconName } from '../components/Icon';

export interface Achievement {
    name: string;
    icon: IconName;
    description: string;
    unlocked: boolean;
}

export const calculateAchievements = (student: StudentData, allDoubts: DoubtData[]): Achievement[] => {
    const { SCHEDULE_ITEMS, RESULTS, STUDY_SESSIONS, CONFIG } = student;
    const achievements: Omit<Achievement, 'unlocked'>[] = [
        { name: 'High Scorer', icon: 'trophy', description: 'Score 200+ in a mock test.' },
        { name: 'Perfect Week', icon: 'star', description: 'Complete 100% of weekly study hours.' },
        { name: 'Problem Slayer', icon: 'fixed', description: 'Solve 100+ MCQs in timed sessions this week.' },
        { name: 'Streak Master', icon: 'streak', description: 'Study on 5 or more days this week.' },
        { name: 'Topic Conqueror', icon: 'check', description: 'Fix all mistakes from a mock test.' },
        { name: 'Early Bird', icon: 'play', description: 'Complete a study session before 7 AM.' },
        { name: 'Night Owl', icon: 'pause', description: 'Complete a study session after 11 PM.' },
        { name: 'Community Helper', icon: 'users', description: 'Provide a solution to another student\'s doubt.' },
    ];
    
    // --- Calculation Logic ---
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - (today.getDay() + 6) % 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const studyTaskTypes = ['DEEP_DIVE', 'HOMEWORK', 'ANALYSIS'];
    const assumedHoursPerTask = 2;
    const weeklyStudyTasks = SCHEDULE_ITEMS.filter(item => 
        (item.type === 'ACTION' && 'SUB_TYPE' in item && studyTaskTypes.includes(item.SUB_TYPE || '')) || item.type === 'HOMEWORK'
    );
    const totalScheduledHours = weeklyStudyTasks.length * assumedHoursPerTask;

    const timedSessionSeconds = STUDY_SESSIONS.reduce((total, session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startOfWeek ? total + session.duration : total;
    }, 0);
    const completedHours = (timedSessionSeconds / 3600);
    const totalWeeklyHours = totalScheduledHours + (timedSessionSeconds / 3600);
    const progressPercentage = totalWeeklyHours > 0 ? Math.min((completedHours / totalWeeklyHours) * 100, 100) : 0;
    
    const questionsThisWeek = STUDY_SESSIONS.reduce((total, session) => {
       const sessionDate = new Date(session.date);
       return sessionDate >= startOfWeek ? total + session.questions_solved : total;
    }, 0);

    const studyDaysThisWeek = new Set(
        SCHEDULE_ITEMS.filter(item => {
            const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
            const itemDayIndex = daysOfWeek.indexOf(item.DAY.EN.toUpperCase());
            if(itemDayIndex === -1) return false;
            const taskDate = new Date(startOfWeek);
            taskDate.setDate(startOfWeek.getDate() + itemDayIndex);
            return taskDate <= today;
        }).map(t => t.DAY.EN.toUpperCase())
    );

    const hasSolvedDoubt = allDoubts.some(doubt => 
        doubt.solutions.some(sol => sol.user_sid === student.sid && doubt.user_sid !== student.sid)
    );
    
    // --- Unlocking Logic ---
    return achievements.map(ach => {
        let unlocked = false;
        switch(ach.name) {
            case 'High Scorer':
                unlocked = RESULTS.some(r => parseInt(r.SCORE.split('/')[0]) >= 200);
                break;
            case 'Perfect Week':
                unlocked = progressPercentage >= 100 && totalWeeklyHours > 0;
                break;
            case 'Problem Slayer':
                unlocked = questionsThisWeek >= 100;
                break;
            case 'Streak Master':
                unlocked = studyDaysThisWeek.size >= 5;
                break;
            case 'Topic Conqueror':
                unlocked = RESULTS.some(r => r.MISTAKES.length > 0 && r.MISTAKES.every(m => r.FIXED_MISTAKES?.includes(m)));
                break;
            case 'Early Bird':
                unlocked = SCHEDULE_ITEMS.some(item => 'TIME' in item && item.TIME < '07:00');
                break;
            case 'Night Owl':
                unlocked = SCHEDULE_ITEMS.some(item => 'TIME' in item && item.TIME > '23:00');
                break;
            case 'Community Helper':
                unlocked = hasSolvedDoubt;
                break;
        }
        return { ...ach, unlocked };
    });
};