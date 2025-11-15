import React from 'react';
import { ScheduleItem } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';

interface TodaysAgendaWidgetProps {
    items: ScheduleItem[];
}

const TodaysAgendaWidget: React.FC<TodaysAgendaWidgetProps> = ({ items }) => {
    const { t } = useLocalization();

    const now = new Date();
    const todayDay = now.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowDay = tomorrow.toLocaleString('en-US', { weekday: 'long' }).toUpperCase();

    const isToday = (item: ScheduleItem) => item.DAY.EN.toUpperCase() === todayDay;
    const isTomorrow = (item: ScheduleItem) => item.DAY.EN.toUpperCase() === tomorrowDay;

    const sortTasksByTime = (a: ScheduleItem, b: ScheduleItem) => {
        const timeA = 'TIME' in a ? a.TIME : '23:59';
        const timeB = 'TIME' in b ? b.TIME : '23:59';
        return timeA.localeCompare(timeB);
    };

    const todaysTasks = items.filter(isToday).sort(sortTasksByTime);
    const tomorrowsTasks = items.filter(isTomorrow).sort(sortTasksByTime);
    
    const allAgendaTasks = [
        ...todaysTasks.map(task => ({...task, dayLabel: "Today"})),
        ...tomorrowsTasks.map(task => ({...task, dayLabel: "Tomorrow"}))
    ];

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm h-full flex flex-col">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-4 flex-shrink-0">
                {t({ EN: "Today's Agenda", GU: "આજનો એજન્ડા" })}
            </h2>
            <div className="overflow-y-auto max-h-96 pr-2 space-y-4">
                {allAgendaTasks.length > 0 ? (
                    allAgendaTasks.map((item, index) => (
                        <div key={`${item.ID}-${index}`} className="bg-gray-900/70 p-3 rounded-lg border-l-4 border-cyan-600">
                             <div className="flex justify-between items-center">
                                <p className="text-sm font-bold text-white">{t(item.CARD_TITLE)}</p>
                                <span className="text-xs font-mono text-gray-400">{'TIME' in item && item.TIME}</span>
                             </div>
                             <p className="text-xs text-gray-400">{t(item.FOCUS_DETAIL)}</p>
                             <span className="text-xs font-semibold text-cyan-400">{item.dayLabel}</span>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 pt-12">
                        <p className="font-semibold">Nothing scheduled for today or tomorrow.</p>
                        <p className="text-sm">Enjoy your break or add a new task!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TodaysAgendaWidget;