
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';
import ScheduleCard from './ScheduleCard';
import { ScheduleItem, HomeworkData } from '../types';

interface ScheduleListProps {
    items: ScheduleItem[];
    onDelete: (id: string) => void;
    onEdit: (item: ScheduleItem) => void;
    onMoveToNextDay: (id: string) => void;
    onStar: (id: string) => void;
    onStartPractice: (homework: HomeworkData) => void;
    onStartReviewSession: (deckId: string) => void;
    onMarkDoubt?: (topic: string, q_id: string) => void; // Optional for now
    isSubscribed: boolean;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ items, onDelete, onEdit, onMoveToNextDay, onStar, onStartPractice, onStartReviewSession, onMarkDoubt, isSubscribed }) => {
    const { t } = useLocalization();

    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    const todayIndex = (new Date().getDay() + 6) % 7; // Monday is 0, Sunday is 6

    const sortedItems = [...items].sort((a, b) => {
        const aDayIndex = daysOfWeek.indexOf(a.DAY.EN.toUpperCase());
        const bDayIndex = daysOfWeek.indexOf(b.DAY.EN.toUpperCase());

        const aIsPast = aDayIndex < todayIndex;
        const bIsPast = bDayIndex < todayIndex;

        if (aIsPast && !bIsPast) return 1; // a is past, b is not -> a goes to the bottom
        if (!aIsPast && bIsPast) return -1; // b is past, a is not -> b goes to the bottom

        // If both are past or both are upcoming/today, sort by day index first
        if (aDayIndex !== bDayIndex) return aDayIndex - bDayIndex;

        // If on the same day, sort by time
        const aTime = 'TIME' in a && a.TIME ? a.TIME : '23:59';
        const bTime = 'TIME' in b && b.TIME ? b.TIME : '23:59';
        return aTime.localeCompare(bTime);
    });


    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-6">
                {t({ EN: "Weekly Schedule", GU: "સાપ્ताહિક શેડ્યૂલ" })}
            </h2>
            <div className="space-y-4">
                {sortedItems.length > 0 ? (
                    sortedItems.map(card => {
                        const cardDayIndex = daysOfWeek.indexOf(card.DAY.EN.toUpperCase());
                        const isPast = cardDayIndex < todayIndex;
                        return (
                            <ScheduleCard 
                                key={card.ID} 
                                cardData={card} 
                                onDelete={onDelete}
                                onEdit={onEdit}
                                onMoveToNextDay={onMoveToNextDay}
                                onStar={onStar}
                                onStartPractice={onStartPractice}
                                onStartReviewSession={onStartReviewSession}
                                onMarkDoubt={onMarkDoubt}
                                isSubscribed={isSubscribed}
                                isPast={isPast}
                             />
                        )
                    })
                ) : (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-700 rounded-lg">
                        <p className="font-semibold">No schedule items for this week.</p>
                        <p className="text-sm">Click "Create Task" to add a new study session.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ScheduleList;
