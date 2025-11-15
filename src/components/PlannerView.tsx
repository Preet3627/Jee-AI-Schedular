import React from 'react';
import { ScheduleItem } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Icon from './Icon';

interface PlannerViewProps {
    items: ScheduleItem[];
    onEdit: (item: ScheduleItem) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ items, onEdit }) => {
    const { t } = useLocalization();
    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    
    // A simple grouping logic. A real app might use dates.
    const scheduleByDay: { [key: string]: ScheduleItem[] } = daysOfWeek.reduce((acc, day) => {
        acc[day] = items.filter(item => item.DAY.EN.toUpperCase() === day);
        return acc;
    }, {} as { [key: string]: ScheduleItem[] });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {daysOfWeek.map(day => (
                <div key={day} className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-4 backdrop-blur-sm min-h-[200px]">
                    <h3 className="text-lg font-bold text-cyan-400 tracking-wider text-center mb-4">{t({ EN: day, GU: day })}</h3>
                    <div className="space-y-3">
                        {scheduleByDay[day] && scheduleByDay[day].length > 0 ? (
                            scheduleByDay[day].sort((a,b) => ('TIME' in a ? a.TIME : '23:59').localeCompare('TIME' in b ? b.TIME : '23:59')).map(item => (
                                <div key={item.ID} className="bg-gray-900/70 p-3 rounded-lg text-sm group relative">
                                    <p className="font-bold text-white">{t(item.CARD_TITLE)}</p>
                                    {'TIME' in item && <p className="text-xs text-gray-400">{item.TIME}</p>}
                                    {(item.type === 'ACTION' || item.type === 'HOMEWORK') && (
                                        <button onClick={() => onEdit(item)} className="absolute top-1 right-1 p-1 text-gray-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon name="edit" className="w-4 h-4"/>
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-xs text-gray-600 pt-8">No tasks scheduled.</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PlannerView;
