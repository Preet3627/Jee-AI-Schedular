import React from 'react';
import { ScheduleItem } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import Icon from '../Icon';

interface TodaysAgendaWidgetProps {
    items: ScheduleItem[];
    onStar: (taskId: string) => void;
}

const TodaysAgendaWidget: React.FC<TodaysAgendaWidgetProps> = ({ items, onStar }) => {
    const { t } = useLocalization();

    const now = new Date();
    const todayDay = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
    
    const sortTasksByTime = (a: ScheduleItem, b: ScheduleItem) => {
        const timeA = 'TIME' in a ? a.TIME : '23:59';
        const timeB = 'TIME' in b ? b.TIME : '23:59';
        return timeA.localeCompare(timeB);
    };

    const todaysTasks = items.filter(item => item.DAY.EN.toUpperCase() === todayDay).sort(sortTasksByTime);
    const focusTasks = todaysTasks.filter(item => item.isStarred);
    const otherTasks = todaysTasks.filter(item => !item.isStarred);

    const AgendaItem: React.FC<{item: ScheduleItem}> = ({ item }) => (
        <div className="bg-gray-900/70 p-3 rounded-lg border-l-4 border-cyan-600 group relative">
             <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-white pr-8">{t(item.CARD_TITLE)}</p>
                <span className="text-xs font-mono text-gray-400">{'TIME' in item && item.TIME}</span>
             </div>
             <p className="text-xs text-gray-400">{t(item.FOCUS_DETAIL)}</p>
             <button onClick={() => onStar(item.ID)} className="absolute top-2 right-2 p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-yellow-400 transition-all">
                <Icon name="star" className={`w-5 h-5 ${item.isStarred ? 'text-yellow-400 fill-current' : ''}`} />
             </button>
        </div>
    );

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm h-full flex flex-col">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-4 flex-shrink-0">
                {t({ EN: "Today's Agenda", GU: "આજનો એજન્ડા" })}
            </h2>
            <div className="overflow-y-auto max-h-96 pr-2 space-y-4">
                {focusTasks.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-yellow-400 mb-2">★ Focus</h3>
                        <div className="space-y-3">
                            {focusTasks.map(item => <AgendaItem key={item.ID} item={item} />)}
                        </div>
                    </div>
                )}
                {otherTasks.length > 0 && (
                     <div>
                        {focusTasks.length > 0 && <div className="border-t border-gray-700 my-4"></div>}
                        <h3 className="text-sm font-bold text-gray-400 mb-2">Upcoming</h3>
                        <div className="space-y-3">
                            {otherTasks.map(item => <AgendaItem key={item.ID} item={item} />)}
                        </div>
                    </div>
                )}
                {todaysTasks.length === 0 && (
                    <div className="text-center text-gray-500 pt-12">
                        <p className="font-semibold">Nothing scheduled for today.</p>
                        <p className="text-sm">Enjoy your break or add a new task!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodaysAgendaWidget;
