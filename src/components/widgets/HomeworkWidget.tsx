import React from 'react';
import { ScheduleItem, HomeworkData } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import Icon from '../Icon';

interface HomeworkWidgetProps {
    items: ScheduleItem[];
    onStartPractice: (homework: HomeworkData) => void;
}

const HomeworkWidget: React.FC<HomeworkWidgetProps> = ({ items, onStartPractice }) => {
    const { t } = useLocalization();

    const homeworkItems = items.filter(item => item.type === 'HOMEWORK') as HomeworkData[];

    if (homeworkItems.length === 0) {
        return null; // Don't render the widget if there's no homework
    }

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm h-full flex flex-col">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-4 flex-shrink-0">
                {t({ EN: "Pending Homework", GU: "બાકી 호મવર્ક" })}
            </h2>
            <div className="overflow-y-auto max-h-80 pr-2 space-y-3">
                {homeworkItems.map(item => (
                    <div key={item.ID} className="bg-gray-900/70 p-3 rounded-lg border-l-4 border-purple-500">
                         <div className="flex justify-between items-center">
                            <p className="text-sm font-bold text-white">{t(item.CARD_TITLE)}</p>
                            <span className="text-xs font-mono text-gray-400">{t(item.DAY)}</span>
                         </div>
                         <p className="text-xs text-gray-400 mb-2">{t(item.FOCUS_DETAIL)}</p>
                         <div className="flex justify-between items-end">
                            <p className="text-xs font-mono text-cyan-300 bg-gray-900/50 inline-block px-2 py-1 rounded">Q's: {item.Q_RANGES}</p>
                            <button onClick={() => onStartPractice(item)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-purple-600/80 hover:bg-purple-500/80 transition-colors">
                                <Icon name="stopwatch" className="w-3 h-3" /> Practice
                            </button>
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HomeworkWidget;
