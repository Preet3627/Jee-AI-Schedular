import React, { useState, useEffect } from 'react';
import { StudentData, ScheduleItem, ActivityData, Config, StudySession, HomeworkData, ExamData, ResultData, DoubtData } from '../types';
import ScheduleList from './ScheduleList';
import Icon from './Icon';
import AIParserModal from './AIParserModal';
import CommunityDashboard from './CommunityDashboard';
import PlannerView from './PlannerView';
import MistakeManager from './MistakeManager';
import TodaysAgendaWidget from './widgets/TodaysAgendaWidget';
import ReadingHoursWidget from './widgets/ReadingHoursWidget';
import MarksAnalysisWidget from './widgets/MarksAnalysisWidget';
import { parseCSVData } from '../utils/csvParser';
import CustomPracticeModal from './CustomPracticeModal';
import HomeworkWidget from './widgets/HomeworkWidget';
import ActivityTracker from './ActivityTracker';
import PerformanceMetrics from './PerformanceMetrics';
import SettingsModal from './SettingsModal';
import BottomToolbar from './BottomToolbar';
import CreateEditTaskModal from './CreateEditTaskModal';
import ExamsView from './ExamsView';
import CreateEditExamModal from './CreateEditExamModal';
import LogResultModal from './LogResultModal';
import EditWeaknessesModal from './EditWeaknessesModal';
import AchievementsWidget from './widgets/AchievementsWidget';
import ImageToTimetableModal from './ImageToTimetableModal';

type ActiveTab = 'schedule' | 'planner' | 'exams' | 'performance' | 'community';

interface StudentDashboardProps {
    student: StudentData;
    onSaveTask: (task: ScheduleItem) => void;
    onSaveBatchTasks: (tasks: ScheduleItem[]) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleMistakeFixed: (resultId: string, mistake: string) => void;
    onUpdateSettings: (settings: Partial<Config['settings']>) => void;
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
}

const StudentDashboard: React.FC<StudentDashboardProps> = (props) => {
    const { student, onSaveTask, onSaveBatchTasks, onDeleteTask, onToggleMistakeFixed, onUpdateSettings, onLogStudySession, onUpdateWeaknesses, onLogResult, onAddExam, onUpdateExam, onDeleteExam, onExportToIcs, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, allDoubts } = props;
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

    const handleCslSave = (csl: string) => {
        try {
            const parsedData = parseCSVData(csl, student.CONFIG.SID);
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
    
    const TabButton: React.FC<{ tabId: ActiveTab; children: React.ReactNode; }> = ({ tabId, children }) => (
        <button onClick={() => setActiveTab(tabId)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-cyan-400 border-[var(--accent-color)]' : 'text-gray-400 border-transparent hover:text-white'}`}>
            {children}
        </button>
    );

    const TopTabBar = () => (
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--glass-border)] mb-6 gap-4">
        <div className="flex items-center flex-wrap">
          <TabButton tabId="schedule">Schedule</TabButton>
          <TabButton tabId="planner">Planner</TabButton>
          <TabButton tabId="exams">Exams</TabButton>
          <TabButton tabId="performance">Performance</TabButton>
          <TabButton tabId="community">Community</TabButton>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <button onClick={() => setIsImageModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Import from Image"><Icon name="image" /></button>
          <button onClick={() => setisAiParserModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Import from Text/CSL"><Icon name="upload" /></button>
          <button onClick={() => setIsPracticeModalOpen(true)} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500" title="Custom Practice"><Icon name="stopwatch" /></button>
          <button onClick={() => onExportToIcs()} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600" title="Export Week to .ics"><Icon name="calendar" /></button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"><Icon name="settings" /></button>
          <button onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
            <Icon name="plus" /> Create
          </button>
        </div>
      </div>
    );
    
    return (
        <main className={`mt-8 ${useToolbarLayout ? 'pb-24' : ''}`}>
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
                        <ActivityTracker activities={activityItems} />
                        <ScheduleList items={taskItems} onDelete={onDeleteTask} onEdit={handleEditClick} onMoveToNextDay={(id) => {/* Logic for this is in App.tsx now */}} onStar={handleStarTask} onStartPractice={handleStartPractice} isSubscribed={student.CONFIG.UNACADEMY_SUB} />
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
                        <div className="flex justify-end"><button onClick={() => setIsLogResultModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]"><Icon name="plus" /> Log Mock Result</button></div>
                        {student.RESULTS.length > 0 ? [...student.RESULTS].reverse().map(result => (<MistakeManager key={result.ID} result={result} onToggleMistakeFixed={onToggleMistakeFixed} />)) : <p className="text-gray-500 text-center py-10">No results recorded.</p>}
                    </div>
                    <div className="space-y-8">
                         <PerformanceMetrics score={student.CONFIG.SCORE} weaknesses={student.CONFIG.WEAK} onEditWeaknesses={() => setIsEditWeaknessesModalOpen(true)} />
                         <AchievementsWidget student={student} allDoubts={allDoubts} />
                    </div>
                </div>
            )}
            {activeTab === 'community' && <CommunityDashboard student={student} allDoubts={allDoubts} onPostDoubt={()=>{}} onPostSolution={()=>{}} />}

            {isCreateModalOpen && <CreateEditTaskModal task={editingTask} onClose={() => { setIsCreateModalOpen(false); setEditingTask(null); }} onSave={onSaveTask} />}
            {isAiParserModalOpen && <AIParserModal onClose={() => setisAiParserModalOpen(false)} onSave={handleCslSave} geminiApiKey={student.CONFIG.settings.geminiApiKey} />}
            {isImageModalOpen && <ImageToTimetableModal onClose={() => setIsImageModalOpen(false)} onSave={handleCslSave} geminiApiKey={student.CONFIG.settings.geminiApiKey} />}
            {isPracticeModalOpen && <CustomPracticeModal initialQRanges={practiceTask?.Q_RANGES} onClose={() => { setIsPracticeModalOpen(false); setPracticeTask(null); }} onSessionComplete={(duration, solved, skipped) => onLogStudySession({ duration, questions_solved: solved, questions_skipped: skipped })} defaultPerQuestionTime={student.CONFIG.settings.perQuestionTime || 180} />}
            {/* FIX: Pass onExportToIcs prop to SettingsModal to satisfy its required props. */}
            {isSettingsModalOpen && <SettingsModal settings={student.CONFIG.settings} driveLastSync={student.CONFIG.driveLastSync} onClose={() => setIsSettingsModalOpen(false)} onSave={onUpdateSettings} googleAuthStatus={googleAuthStatus} onGoogleSignIn={onGoogleSignIn} onGoogleSignOut={onGoogleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} onExportToIcs={onExportToIcs} />}
            {isEditWeaknessesModalOpen && <EditWeaknessesModal currentWeaknesses={student.CONFIG.WEAK} onClose={() => setIsEditWeaknessesModalOpen(false)} onSave={onUpdateWeaknesses} />}
            {isLogResultModalOpen && <LogResultModal onClose={() => setIsLogResultModalOpen(false)} onSave={onLogResult} />}
            {isExamModalOpen && <CreateEditExamModal exam={editingExam} onClose={() => { setIsExamModalOpen(false); setEditingExam(null); }} onSave={(exam) => editingExam ? onUpdateExam(exam) : onAddExam(exam)} />}

            {useToolbarLayout && <BottomToolbar activeTab={activeTab} setActiveTab={setActiveTab} onFabClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} />}
        </main>
    );
};

export default StudentDashboard;