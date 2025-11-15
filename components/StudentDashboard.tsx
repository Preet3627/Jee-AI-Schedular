

import React, { useState, useEffect } from 'react';
import { StudentData, ScheduleItem, ActivityData, Config, StudySession } from '../types';
import ScheduleList from './ScheduleList';
import Icon from './Icon';
import StudentCSLInput from './StudentCSLInput';
import CommunityDashboard from './CommunityDashboard';
import PlannerView from './PlannerView';
import MistakeManager from './MistakeManager';
import TodaysAgendaWidget from './widgets/TodaysAgendaWidget';
import ReadingHoursWidget from './widgets/ReadingHoursWidget';
import MarksAnalysisWidget from './widgets/MarksAnalysisWidget';
// FIX: Correct import path to use the populated `cslParser.ts` file, resolving a critical build error.
import { parseCSVData } from '../utils/cslParser';
import CustomPracticeModal from './CustomPracticeModal';
import HomeworkWidget from './widgets/HomeworkWidget';
import ActivityTracker from './ActivityTracker';
import PerformanceMetrics from './PerformanceMetrics';
import SettingsModal from './SettingsModal';
import BottomToolbar from './BottomToolbar';
import CreateEditTaskModal from './CreateEditTaskModal';

type ActiveTab = 'schedule' | 'planner' | 'performance' | 'community';

interface StudentDashboardProps {
    student: StudentData;
    onSaveTask: (task: ScheduleItem) => void;
    onSaveBatchTasks: (tasks: ScheduleItem[]) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleMistakeFixed: (resultId: string, mistake: string) => void;
    onUpdateSettings: (settings: Partial<Config['settings']>) => void;
    onLogStudySession: (session: Omit<StudySession, 'date'>) => void;
    isDemoMode: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onSaveTask, onSaveBatchTasks, onDeleteTask, onToggleMistakeFixed, onUpdateSettings, onLogStudySession, isDemoMode }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCslModalOpen, setIsCslModalOpen] = useState(false);
    const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ScheduleItem | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const useToolbarLayout = student.CONFIG.settings.mobileLayout === 'toolbar' && isMobile;

    const taskItems = student.SCHEDULE_ITEMS.filter(item => item.type !== 'ACTIVITY');
    const activityItems = student.SCHEDULE_ITEMS.filter(item => item.type === 'ACTIVITY') as ActivityData[];
    
    const handleEditClick = (item: ScheduleItem) => {
        setEditingTask(item);
        setIsCreateModalOpen(true);
    };

    const handleCreateModalClose = () => {
        setIsCreateModalOpen(false);
        setEditingTask(null);
    };

    const handleModalSave = (task: ScheduleItem) => {
        onSaveTask(task);
        handleCreateModalClose();
    };
    
    const handleMoveTaskToNextDay = (taskId: string) => {
        const taskToMove = student.SCHEDULE_ITEMS.find(item => item.ID === taskId);
        if (!taskToMove || !('DAY' in taskToMove)) return;

        const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
        const currentDayIndex = daysOfWeek.indexOf(taskToMove.DAY.EN.toUpperCase());
        if (currentDayIndex === -1) return;

        const nextDayIndex = (currentDayIndex + 1) % 7;
        const nextDay = daysOfWeek[nextDayIndex];

        const updatedTask = {
            ...taskToMove,
            DAY: { EN: nextDay, GU: "" } 
        };

        onSaveTask(updatedTask);
    };

    const handleCslSave = (csl: string) => {
        try {
            const parsedData = parseCSVData(csl, student.CONFIG.SID);
            const newItems = parsedData.schedules.map(r => r.item);
            if (newItems.length > 0) {
                onSaveBatchTasks(newItems);
                alert(`Successfully added ${newItems.length} task(s) from CSL!`);
                setIsCslModalOpen(false);
            } else {
                alert("Could not parse any valid tasks from the provided CSL.");
            }
        } catch (error: any) {
            alert(`Error parsing CSL: ${error.message}`);
        }
    };

    const TopTabBar = () => (
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--glass-border)] mb-6 gap-4">
        <div className="flex items-center">
          <TabButton tabId="schedule">Schedule</TabButton>
          <TabButton tabId="planner">Planner</TabButton>
          <TabButton tabId="performance">Performance</TabButton>
          <TabButton tabId="community">Community</TabButton>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          {(activeTab === 'schedule' || activeTab === 'planner') && (
            <>
              <button onClick={() => setIsCslModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gray-700 hover:bg-gray-600">
                <Icon name="upload" /> CSL
              </button>
              <button onClick={() => setIsPracticeModalOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-purple-600 hover:bg-purple-500">
                <Icon name="stopwatch" /> Practice
              </button>
              <button onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
                <Icon name="plus" /> Create Task
              </button>
            </>
          )}
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
            <Icon name="settings" className="w-5 h-5"/>
          </button>
        </div>
      </div>
    );

    const TabButton: React.FC<{ tabId: ActiveTab; children: React.ReactNode; }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-cyan-400 border-[var(--accent-color)]' : 'text-gray-400 border-transparent hover:text-white'}`}
        >
            {children}
        </button>
    );

    return (
        <main className={`mt-8 ${useToolbarLayout ? 'pb-24' : ''}`}>
            {useToolbarLayout ? (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold capitalize text-white">{activeTab}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsPracticeModalOpen(true)} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors"><Icon name="stopwatch" /></button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"><Icon name="settings" /></button>
                    </div>
                </div>
            ) : <TopTabBar />}
            
            {activeTab === 'schedule' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <ActivityTracker activities={activityItems} />
                        <ScheduleList 
                            items={taskItems}
                            onDelete={onDeleteTask}
                            onEdit={handleEditClick}
                            onMoveToNextDay={handleMoveTaskToNextDay}
                            isSubscribed={student.CONFIG.UNACADEMY_SUB}
                        />
                    </div>
                    <div className="space-y-8">
                         <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} />
                         <HomeworkWidget items={student.SCHEDULE_ITEMS} />
                         <ReadingHoursWidget student={student} />
                         <MarksAnalysisWidget results={student.RESULTS} />
                    </div>
                </div>
            )}
            {activeTab === 'planner' && (
                <PlannerView items={taskItems} onEdit={handleEditClick} />
            )}
             {activeTab === 'performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {student.RESULTS.length > 0 ? student.RESULTS.map(result => (
                          <MistakeManager 
                            key={result.ID} 
                            result={result} 
                            onToggleMistakeFixed={onToggleMistakeFixed}
                          />
                        )) : <p className="text-gray-500 text-center py-10">No mock test results have been recorded yet.</p>}
                    </div>
                     <div className="space-y-8">
                         <PerformanceMetrics 
                            score={student.CONFIG.SCORE}
                            weaknesses={student.CONFIG.WEAK}
                            results={student.RESULTS}
                            onToggleMistakeFixed={onToggleMistakeFixed}
                         />
                    </div>
                </div>
            )}
            {activeTab === 'community' && <CommunityDashboard student={student} isDemoMode={isDemoMode} />}

            {isCreateModalOpen && (
                <CreateEditTaskModal 
                    task={editingTask}
                    onClose={handleCreateModalClose}
                    onSave={handleModalSave}
                />
            )}
            
            {isCslModalOpen && (
                <StudentCSLInput
                    onClose={() => setIsCslModalOpen(false)}
                    onSave={handleCslSave}
                />
            )}

            {isPracticeModalOpen && (
                <CustomPracticeModal
                    onClose={() => setIsPracticeModalOpen(false)}
                    onSessionComplete={(duration, questions_solved) => onLogStudySession({ duration, questions_solved })}
                />
            )}
            
            {isSettingsModalOpen && (
                <SettingsModal 
                    settings={student.CONFIG.settings}
                    onClose={() => setIsSettingsModalOpen(false)}
                    onSave={onUpdateSettings}
                />
            )}

            {useToolbarLayout && (
                <BottomToolbar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onFabClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }}
                />
            )}
        </main>
    );
};

export default StudentDashboard;