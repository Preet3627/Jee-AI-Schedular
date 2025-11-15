import React from 'react';
import { useLocalization } from '../context/LocalizationContext';
import ScheduleCard from './ScheduleCard';
import { ScheduleItem } from '../types';

interface ScheduleListProps {
    items: ScheduleItem[];
    onDelete: (id: string) => void;
    onEdit: (item: ScheduleItem) => void;
    onMoveToNextDay: (id: string) => void;
    onMarkDoubt?: (topic: string, q_id: string) => void; // Optional for now
    isSubscribed: boolean;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ items, onDelete, onEdit, onMoveToNextDay, onMarkDoubt, isSubscribed }) => {
    const { t } = useLocalization();

    // Sort items to show user-created tasks first, then by time if available
    const sortedItems = [...items].sort((a, b) => {
        const aTime = 'TIME' in a ? a.TIME : '23:59';
        const bTime = 'TIME' in b ? b.TIME : '23:59';
        if (aTime < bTime) return -1;
        if (aTime > bTime) return 1;
        return 0;
    });

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-6">
                {t({ EN: "Weekly Schedule", GU: "સાપ્ताહિક શેડ્યૂલ" })}
            </h2>
            <div className="space-y-4">
                {sortedItems.length > 0 ? (
                    sortedItems.map(card => (
                        <ScheduleCard 
                            key={card.ID} 
                            cardData={card} 
                            onDelete={onDelete}
                            onEdit={onEdit}
                            onMoveToNextDay={onMoveToNextDay}
                            onMarkDoubt={onMarkDoubt}
                            isSubscribed={isSubscribed}
                         />
                    ))
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