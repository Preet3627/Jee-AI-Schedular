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
    
    // Split items for centered FAB
    const leftItems = navItems.slice(0, 4);
    const rightItems = navItems.slice(4);

    return (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-gray-900/70 border-t border-[var(--glass-border)] backdrop-blur-lg z-40 md:hidden h-16"
          style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
        >
            <div className="flex justify-between items-center h-full max-w-7xl mx-auto px-2 relative">
                <div className="flex justify-around flex-1">
                    {leftItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center w-16 h-16 flex-shrink-0 transition-colors ${activeTab === item.id ? 'text-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Icon name={item.icon} className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>

                {/* Centered FAB */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+8px)] z-50">
                     <button 
                        onClick={onFabClick}
                        className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-100 border-4 border-gray-900"
                    >
                        <Icon name="plus" className="w-8 h-8" />
                    </button>
                </div>

                <div className="flex justify-around flex-1">
                     {rightItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center w-16 h-16 flex-shrink-0 transition-colors ${activeTab === item.id ? 'text-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Icon name={item.icon} className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BottomToolbar;