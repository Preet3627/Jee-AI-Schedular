import React, { useState } from 'react';
import { ScheduleItem } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Icon from './Icon';

interface PlannerViewProps {
    items: ScheduleItem[];
    onEdit: (item: ScheduleItem) => void;
}

const PlannerView: React.FC<PlannerViewProps> = ({ items, onEdit }) => {
    const { t } = useLocalization();
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
    
    const renderWeeklyView = () => {
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

    const renderMonthlyView = () => {
        const now = new Date();
        const monthlySchedule: { [key: string]: ScheduleItem[] } = {};

        for (let i = 0; i < 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            const dayName = date.toLocaleString('en-us', { weekday: 'long' }).toUpperCase();
            
            const tasksForDay = items
                .filter(item => item.DAY.EN.toUpperCase() === dayName)
                .sort((a, b) => ('TIME' in a ? a.TIME : '23:59').localeCompare('TIME' in b ? b.TIME : '23:59'));
            
            if (tasksForDay.length > 0) {
                const dateString = date.toISOString().split('T')[0];
                monthlySchedule[dateString] = tasksForDay;
            }
        }
        
        return (
            <div className="space-y-6">
                {Object.keys(monthlySchedule).map(dateString => (
                     <div key={dateString}>
                        <h3 className="text-lg font-bold text-cyan-400 tracking-wider mb-2 border-b-2 border-cyan-500/30 pb-1">
                           {new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                             {monthlySchedule[dateString].map(item => (
                                 <div key={item.ID} className="bg-gray-900/70 p-3 rounded-lg text-sm group relative">
                                     <p className="font-bold text-white">{t(item.CARD_TITLE)}</p>
                                     {'TIME' in item && <p className="text-xs text-gray-400">{item.TIME}</p>}
                                      {(item.type === 'ACTION' || item.type === 'HOMEWORK') && (
                                        <button onClick={() => onEdit(item)} className="absolute top-1 right-1 p-1 text-gray-500 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Icon name="edit" className="w-4 h-4"/>
                                        </button>
                                    )}
                                 </div>
                             ))}
                        </div>
                     </div>
                ))}
                 {Object.keys(monthlySchedule).length === 0 && <p className="text-center text-gray-500 py-10">No tasks found in the next 30 days based on your weekly template.</p>}
            </div>
        )
    };

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <div className="flex justify-end mb-4">
                 <div className="flex items-center gap-1.5 p-1 rounded-full bg-gray-900/50">
                    <button onClick={() => setViewMode('weekly')} className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${viewMode === 'weekly' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Weekly</button>
                    <button onClick={() => setViewMode('monthly')} className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${viewMode === 'monthly' ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Monthly</button>
                </div>
            </div>
            {viewMode === 'weekly' ? renderWeeklyView() : renderMonthlyView()}
        </div>
    );
};

export default PlannerView;
