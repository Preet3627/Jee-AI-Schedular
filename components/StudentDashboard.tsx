
import React, { useState, useEffect, useMemo } from 'react';
import { StudentData, ScheduleItem, ActivityData, Config, StudySession, HomeworkData, ExamData, ResultData, DoubtData } from '../types';
import ScheduleList from './ScheduleList';
import Icon, { IconName } from './Icon';
// FIX: Corrected import path for component.
import CommunityDashboard from './CommunityDashboard';
import PlannerView from './PlannerView';
import MistakeManager from './MistakeManager';
// FIX: Corrected import path for component.
import TodaysAgendaWidget from './widgets/TodaysAgendaWidget';
// FIX: Corrected import path for component.
import ReadingHoursWidget from './widgets/ReadingHoursWidget';
// FIX: Corrected import path for component.
import MarksAnalysisWidget from './widgets/MarksAnalysisWidget';
// FIX: Corrected import path for utility.
import { parseCSVData } from '../utils/cslParser';
import CustomPracticeModal from './CustomPracticeModal';
// FIX: Corrected import path for component.
import HomeworkWidget from './widgets/HomeworkWidget';
import ActivityTracker from './ActivityTracker';
import PerformanceMetrics from './PerformanceMetrics';
import SettingsModal from './SettingsModal';
import BottomToolbar from './BottomToolbar';
import CreateEditTaskModal from './CreateEditTaskModal';
// FIX: Corrected import path for component.
import ExamsView from './ExamsView';
// FIX: Corrected import path for component.
import CreateEditExamModal from './CreateEditExamModal';
// FIX: Corrected import path for component.
import LogResultModal from './LogResultModal';
// FIX: Corrected import path for component.
import EditWeaknessesModal from './EditWeaknessesModal';
// FIX: Corrected import path for component.
import AchievementsWidget from './widgets/AchievementsWidget';
// FIX: Corrected import path for component.
import ImageToTimetableModal from './ImageToTimetableModal';
// FIX: Corrected import path for component.
import AIMistakeAnalysisModal from './AIMistakeAnalysisModal';
import AIParserModal from './AIParserModal';
import MotivationalQuoteWidget from './widgets/MotivationalQuoteWidget';
import { motivationalQuotes } from '../data/motivationalQuotes';
import AIChatPopup from './AIChatPopup';
import AIDoubtSolverModal from './AIDoubtSolverModal';
import { api } from '../api/apiService';

type ActiveTab = 'schedule' | 'planner' | 'exams' | 'performance' | 'doubts';

interface StudentDashboardProps {
    student: StudentData;
    onSaveTask: (task: ScheduleItem) => void;
    onSaveBatchTasks: (tasks: ScheduleItem[]) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleMistakeFixed: (resultId: string, mistake: string) => void;
    onUpdateSettings: (settings: Partial<Config['settings'] & { geminiApiKey?: string }>) => void;
    onLogStudySession: (session: Omit<StudySession, 'date'>) => void;
    onUpdateWeaknesses: (weaknesses: string[]) => void;
    onLogResult: (result: ResultData) => void;
    onAddExam: (exam: ExamData) => void;
    onUpdateExam: (exam: ExamData) => void;
    onDeleteExam: (examId: string) => void;
    onExportToIcs: () => void;
    googleAuthStatus: 'signed_in' | 'signed_out' | 'loading' | 'unconfigured';
    onGoogleSignIn: () => void;
    onGoogleSignOut: () => void;
    onBackupToDrive: () => void;
    onRestoreFromDrive: () => void;
    allDoubts: DoubtData[];
    onPostDoubt: (question: string, image?: string) => void;
    onPostSolution: (doubtId: string, solution: string, image?: string) => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = (props) => {
    const { student, onSaveTask, onSaveBatchTasks, onDeleteTask, onToggleMistakeFixed, onUpdateSettings, onLogStudySession, onUpdateWeaknesses, onLogResult, onAddExam, onUpdateExam, onDeleteExam, onExportToIcs, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, allDoubts, onPostDoubt, onPostSolution } = props;
    const [activeTab, setActiveTab] = useState<ActiveTab>('schedule');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAiParserModalOpen, setisAiParserModalOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ScheduleItem | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [practiceTask, setPracticeTask] = useState<HomeworkData | null>(null);
    const [isEditWeaknessesModalOpen, setIsEditWeaknessesModalOpen] = useState(false);
    const [isLogResultModalOpen, setIsLogResultModalOpen] = useState(false);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<ExamData | null>(null);
    const [isAiMistakeModalOpen, setIsAiMistakeModalOpen] = useState(false);
    
    // AI Chat State
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [aiChatHistory, setAiChatHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
    const [showAiChatFab, setShowAiChatFab] = useState(student.CONFIG.settings.showAiChatAssistant !== false && !!student.CONFIG.settings.hasGeminiKey);
    const [isAiChatLoading, setIsAiChatLoading] = useState(false);

    // AI Doubt Solver State
    const [isAiDoubtSolverOpen, setIsAiDoubtSolverOpen] = useState(false);

    const quote = useMemo(() => motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)], []);

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

    const handleCsvSave = (csv: string) => {
        try {
            const parsedData = parseCSVData(csv, student.sid);
            if (parsedData.schedules.length > 0) onSaveBatchTasks(parsedData.schedules.map(s => s.item));
            if (parsedData.exams.length > 0) parsedData.exams.forEach(e => onAddExam(e.item));
            alert(`Successfully processed data!`);
            setisAiParserModalOpen(false);
            setIsImageModalOpen(false);
        } catch (error: any) {
            alert(`Error parsing data: ${error.message}`);
        }
    };
    
    const handleStarTask = (taskId: string) => {
        const task = student.SCHEDULE_ITEMS.find(t => t.ID === taskId);
        if (task) onSaveTask({ ...task, isStarred: !task.isStarred });
    };

    const handleStartPractice = (homework: HomeworkData) => {
        setPracticeTask(homework);
        setIsPracticeModalOpen(true);
    };

    const handleSaveWeakness = (newWeakness: string) => {
        const updatedWeaknesses = [...new Set([...student.CONFIG.WEAK, newWeakness])];
        onUpdateWeaknesses(updatedWeaknesses);
    };

    const handleApiKeySet = () => {
        // Only show for the very first time user sets a key
        if (!student.CONFIG.settings.hasGeminiKey) {
            setIsAiChatOpen(true);
        }
        setShowAiChatFab(true); // Always show the button after a key is set
    };

    const handleUpdateSettings = async (settings: Partial<Config['settings'] & { geminiApiKey?: string }>) => {
        await onUpdateSettings(settings);
        if (settings.showAiChatAssistant !== undefined) {
            setShowAiChatFab(settings.showAiChatAssistant);
        }
    };

    const handleAiChatMessage = async (prompt: string, imageBase64?: string) => {
        const userMessage = { role: 'user', parts: [{ text: prompt }] };
        const newHistory = [...aiChatHistory, userMessage];
        setAiChatHistory(newHistory);
        setIsAiChatLoading(true);
        try {
            const result = await api.aiChat({
                history: aiChatHistory, // Send previous history for context
                prompt,
                imageBase64,
            });
            setAiChatHistory([...newHistory, { role: 'model', parts: [{ text: result.response }] }]);
        } catch (error: any) {
            const errorMessage = error.error || error.message || "An unknown error occurred.";
            setAiChatHistory([...newHistory, { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${errorMessage}` }] }]);
        } finally {
            setIsAiChatLoading(false);
        }
    };
    
    const TabButton: React.FC<{ tabId: ActiveTab; icon: IconName; children: React.ReactNode; }> = ({ tabId, icon, children }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-[var(--accent-color)] border-[var(--accent-color)]' : 'text-gray-400 border-transparent hover:text-white'}`}>
            <Icon name={icon} className="w-4 h-4" /> {children}
        </button>
    );

    const TopTabBar = () => (
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--glass-border)] mb-6 gap-4">
        <div className="flex items-center flex-wrap">
          <TabButton tabId="schedule" icon="schedule">Schedule</TabButton>
          <TabButton tabId="planner" icon="planner">Planner</TabButton>
          <TabButton tabId="exams" icon="trophy">Exams</TabButton>
          <TabButton tabId="performance" icon="performance">Performance</TabButton>
          <TabButton tabId="doubts" icon="community">Doubts</TabButton>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <button onClick={() => setIsImageModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Import from Image"><Icon name="image" /></button>
          <button onClick={() => setisAiParserModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Import from Text/CSL"><Icon name="upload" /></button>
          <button onClick={() => setIsPracticeModalOpen(true)} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500" title="Custom Practice"><Icon name="stopwatch" /></button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"><Icon name="settings" /></button>
          <button onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
            <Icon name="plus" /> Create
          </button>
        </div>
      </div>
    );
    
    return (
        <main className={`mt-8 ${useToolbarLayout ? 'pb-24' : ''}`}>
            
            {showAiChatFab && !isAiChatOpen && (
                <button 
                    onClick={() => setIsAiChatOpen(true)}
                    className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-95"
                    title="Open AI Assistant"
                >
                    <Icon name="gemini" className="w-8 h-8"/>
                </button>
            )}
            
            {useToolbarLayout ? (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold capitalize text-white">{activeTab}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsPracticeModalOpen(true)} className="p-2 rounded-lg bg-purple-600"><Icon name="stopwatch" /></button>
                        <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg bg-gray-700"><Icon name="settings" /></button>
                    </div>
                </div>
            ) : <TopTabBar />}
            
            {activeTab === 'schedule' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <MotivationalQuoteWidget quote={quote} />
                        <ActivityTracker activities={activityItems} />
                        <ScheduleList items={taskItems} onDelete={onDeleteTask} onEdit={handleEditClick} onMoveToNextDay={()=>{}} onStar={handleStarTask} onStartPractice={handleStartPractice} isSubscribed={student.CONFIG.UNACADEMY_SUB} />
                    </div>
                    <div className="space-y-8">
                         <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} onStar={handleStarTask} />
                         <HomeworkWidget items={student.SCHEDULE_ITEMS} onStartPractice={handleStartPractice} />
                         <ReadingHoursWidget student={student} />
                         <MarksAnalysisWidget results={student.RESULTS} />
                    </div>
                </div>
            )}
            {activeTab === 'planner' && <PlannerView items={taskItems} onEdit={handleEditClick} />}
            {activeTab === 'exams' && <ExamsView exams={student.EXAMS} onAdd={() => { setEditingExam(null); setIsExamModalOpen(true); }} onEdit={(exam) => { setEditingExam(exam); setIsExamModalOpen(true); }} onDelete={onDeleteExam} />}
            {activeTab === 'performance' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setIsAiMistakeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600"><Icon name="book-open" /> Analyze Mistake with AI</button>
                            <button onClick={() => setIsLogResultModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]"><Icon name="plus" /> Log Mock Result</button>
                        </div>
                        {student.RESULTS.length > 0 ? [...student.RESULTS].reverse().map(result => (<MistakeManager key={result.ID} result={result} onToggleMistakeFixed={onToggleMistakeFixed} />)) : <p className="text-gray-500 text-center py-10">No results recorded.</p>}
                    </div>
                    <div className="space-y-8">
                         <PerformanceMetrics score={student.CONFIG.SCORE} weaknesses={student.CONFIG.WEAK} onEditWeaknesses={() => setIsEditWeaknessesModalOpen(true)} />
                         <AchievementsWidget student={student} allDoubts={allDoubts} />
                    </div>
                </div>
            )}
            {activeTab === 'doubts' && <CommunityDashboard student={student} allDoubts={allDoubts} onPostDoubt={onPostDoubt} onPostSolution={onPostSolution} onAskAi={() => setIsAiDoubtSolverOpen(true)} />}

            {isCreateModalOpen && <CreateEditTaskModal task={editingTask} onClose={() => { setIsCreateModalOpen(false); setEditingTask(null); }} onSave={onSaveTask} />}
            {isAiParserModalOpen && <AIParserModal onClose={() => setisAiParserModalOpen(false)} onSave={handleCsvSave} />}
            {isImageModalOpen && <ImageToTimetableModal onClose={() => setIsImageModalOpen(false)} onSave={handleCsvSave} />}
            {isPracticeModalOpen && <CustomPracticeModal initialQRanges={practiceTask?.Q_RANGES} onClose={() => { setIsPracticeModalOpen(false); setPracticeTask(null); }} onSessionComplete={(duration, solved, skipped) => onLogStudySession({ duration, questions_solved: solved, questions_skipped: skipped })} defaultPerQuestionTime={student.CONFIG.settings.perQuestionTime || 180} />}
            {isSettingsModalOpen && <SettingsModal settings={student.CONFIG.settings} driveLastSync={student.CONFIG.driveLastSync} onClose={() => setIsSettingsModalOpen(false)} onSave={handleUpdateSettings} onApiKeySet={handleApiKeySet} googleAuthStatus={googleAuthStatus} onGoogleSignIn={onGoogleSignIn} onGoogleSignOut={onGoogleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} onExportToIcs={onExportToIcs} />}
            {isEditWeaknessesModalOpen && <EditWeaknessesModal currentWeaknesses={student.CONFIG.WEAK} onClose={() => setIsEditWeaknessesModalOpen(false)} onSave={onUpdateWeaknesses} />}
            {isLogResultModalOpen && <LogResultModal onClose={() => setIsLogResultModalOpen(false)} onSave={onLogResult} />}
            {isExamModalOpen && <CreateEditExamModal exam={editingExam} onClose={() => { setIsExamModalOpen(false); setEditingExam(null); }} onSave={(exam) => editingExam ? onUpdateExam(exam) : onAddExam(exam)} />}
            {isAiMistakeModalOpen && <AIMistakeAnalysisModal onClose={() => setIsAiMistakeModalOpen(false)} onSaveWeakness={handleSaveWeakness} />}
            {isAiDoubtSolverOpen && <AIDoubtSolverModal onClose={() => setIsAiDoubtSolverOpen(false)} />}
            {isAiChatOpen && <AIChatPopup history={aiChatHistory} onSendMessage={handleAiChatMessage} onClose={() => setIsAiChatOpen(false)} isLoading={isAiChatLoading} />}
            
            {useToolbarLayout && <BottomToolbar activeTab={activeTab} setActiveTab={setActiveTab} onFabClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} />}
        </main>
    );
};

export default StudentDashboard;
