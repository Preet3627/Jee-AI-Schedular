

import React from 'react';
import Icon, { IconName } from './Icon';

type ActiveTab = 'dashboard' | 'schedule' | 'planner' | 'performance' | 'doubts' | 'exams' | 'flashcards' | 'material';

interface BottomToolbarProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    onFabClick: () => void;
}

const BottomToolbar: React.FC<BottomToolbarProps> = ({ activeTab, setActiveTab, onFabClick }) => {
    const navItems: {id: ActiveTab, icon: IconName, label: string}[] = [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'schedule', icon: 'schedule', label: 'Schedule' },
        { id: 'planner', icon: 'planner', label: 'Planner' },
        { id: 'material', icon: 'book-open', label: 'Material' },
        { id: 'flashcards', icon: 'cards', label: 'Flashcards' },
        { id: 'exams', icon: 'trophy', label: 'Exams' },
        { id: 'performance', icon: 'performance', label: 'Stats' },
        { id: 'doubts', icon: 'community', label: 'Doubts' },
    ];

    return (
        <>
            <div 
              className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900/70 border-t border-[var(--glass-border)] backdrop-blur-lg z-40 md:hidden"
              style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
            >
                <div className="flex items-center h-full max-w-7xl mx-auto px-2 overflow-x-auto flex-nowrap" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center w-20 h-16 flex-shrink-0 transition-colors ${activeTab === item.id ? 'text-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Icon name={item.icon} className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
             {/* Floating Action Button */}
            <div 
                className="fixed left-1/2 -translate-x-1/2 z-50 md:hidden"
                style={{ bottom: `calc(env(safe-area-inset-bottom, 0) + 1rem)` }}
            >
                 <button 
                    onClick={onFabClick}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-100"
                >
                    <Icon name="plus" className="w-7 h-7" />
                </button>
            </div>
        </>
    );
};

export default BottomToolbar;