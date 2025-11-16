
import React from 'react';
import Icon from './Icon';

type ActiveTab = 'dashboard' | 'schedule' | 'planner' | 'performance' | 'doubts' | 'exams';

interface BottomToolbarProps {
    activeTab: ActiveTab;
    setActiveTab: (tab: ActiveTab) => void;
    onFabClick: () => void;
}

const BottomToolbar: React.FC<BottomToolbarProps> = ({ activeTab, setActiveTab, onFabClick }) => {
    const navItems = [
        { id: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { id: 'schedule', icon: 'schedule', label: 'Schedule' },
        { id: 'performance', icon: 'performance', label: 'Stats' },
        { id: 'doubts', icon: 'community', label: 'Doubts' },
    ] as const;

    return (
        <div 
          className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900/70 border-t border-[var(--glass-border)] backdrop-blur-lg z-40 md:hidden"
          style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
        >
            <div className="flex justify-around items-center h-full max-w-7xl mx-auto px-2">
                {navItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {/* Add space for FAB */}
                        {index === 2 && (
                             <div className="w-16 h-16"></div>
                        )}
                        <button
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center justify-center w-16 h-16 transition-colors ${activeTab === item.id ? 'text-[var(--accent-color)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            <Icon name={item.icon} className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-bold">{item.label}</span>
                        </button>
                    </React.Fragment>
                ))}
            </div>
            
            {/* Floating Action Button */}
            <div className="absolute top-[-28px] left-1/2 -translate-x-1/2">
                 <button 
                    onClick={onFabClick}
                    className="w-14 h-14 rounded-full bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-100"
                >
                    <Icon name="plus" className="w-7 h-7" />
                </button>
            </div>
        </div>
    );
};

export default BottomToolbar;