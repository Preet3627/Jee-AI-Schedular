

import React, { useState, useEffect, useMemo } from 'react';
import { StudentData, ScheduleItem, ActivityData, Config, StudySession, HomeworkData, ExamData, ResultData, DoubtData, FlashcardDeck, Flashcard } from '../types';
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
// FIX: Renamed component import for clarity
import ScoreTrendWidget from './widgets/MarksAnalysisWidget';
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
import DailyInsightWidget from './widgets/DailyInsightWidget';
import AIChatPopup from './AIChatPopup';
import AIDoubtSolverModal from './AIDoubtSolverModal';
import { api } from '../api/apiService';
import SubjectAllocationWidget from './widgets/SubjectAllocationWidget';
import UpcomingExamsWidget from './widgets/UpcomingExamsWidget';
import TestReportModal from './TestReportModal';
import FlashcardManager from './flashcards/FlashcardManager';
import CreateEditDeckModal from './flashcards/CreateEditDeckModal';
import DeckViewModal from './flashcards/DeckViewModal';
import CreateEditFlashcardModal from './flashcards/CreateEditFlashcardModal';
import FlashcardReviewModal from './flashcards/FlashcardReviewModal';

type ActiveTab = 'dashboard' | 'schedule' | 'planner' | 'exams' | 'performance' | 'doubts' | 'flashcards';

interface StudentDashboardProps {
    student: StudentData;
    onSaveTask: (task: ScheduleItem) => void;
    onSaveBatchTasks: (tasks: ScheduleItem[]) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleMistakeFixed: (resultId: string, mistake: string) => void;
    onUpdateConfig: (config: Partial<Config>) => void;
    onLogStudySession: (session: Omit<StudySession, 'date'>) => void;
    onUpdateWeaknesses: (weaknesses: string[]) => void;
    onLogResult: (result: ResultData) => void;
    onAddExam: (exam: ExamData) => void;
    onUpdateExam: (exam: ExamData) => void;
    onDeleteExam: (examId: string) => void;
    onExportToIcs: () => void;
    onBatchImport: (data: { schedules: ScheduleItem[], exams: ExamData[], results: ResultData[], weaknesses: string[] }) => void;
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
    const { student, onSaveTask, onSaveBatchTasks, onDeleteTask, onToggleMistakeFixed, onUpdateConfig, onLogStudySession, onUpdateWeaknesses, onLogResult, onAddExam, onUpdateExam, onDeleteExam, onExportToIcs, onBatchImport, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, allDoubts, onPostDoubt, onPostSolution } = props;
    const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
    const [scheduleView, setScheduleView] = useState<'upcoming' | 'past'>('upcoming');
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
    const [viewingReport, setViewingReport] = useState<ResultData | null>(null);
    
    // AI Chat State
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [aiChatHistory, setAiChatHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
    const [showAiChatFab, setShowAiChatFab] = useState(student.CONFIG.settings.showAiChatAssistant !== false && !!student.CONFIG.settings.hasGeminiKey);
    const [isAiChatLoading, setIsAiChatLoading] = useState(false);

    // AI Doubt Solver State
    const [isAiDoubtSolverOpen, setIsAiDoubtSolverOpen] = useState(false);

    // Flashcard State
    const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
    const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
    const [viewingDeck, setViewingDeck] = useState<FlashcardDeck | null>(null);
    const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [reviewingDeck, setReviewingDeck] = useState<FlashcardDeck | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    useEffect(() => {
        // Request notification permission on first load if not already granted or denied
        if ('Notification' in window && Notification.permission === 'default') {
            const hasRequested = localStorage.getItem('notificationPermissionRequested');
            if (!hasRequested) {
                // Use a small timeout to not bombard the user immediately
                setTimeout(() => {
                    Notification.requestPermission().then(permission => {
                        if (permission === 'granted') {
                            new Notification("Notifications Enabled!", {
                                body: "You'll receive important updates and reminders.",
                                icon: 'https://ponsrischool.in/wp-content/uploads/2025/11/Gemini_Generated_Image_ujvnj5ujvnj5ujvn.png'
                            });
                        }
                    });
                    localStorage.setItem('notificationPermissionRequested', 'true');
                }, 3000); // 3-second delay
            }
        }
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
            const newSchedules = parsedData.schedules.map(s => s.item);
            const newExams = parsedData.exams.map(e => e.item);
            
            const newResults: ResultData[] = [];
            const newWeaknesses: string[] = [];
            
            parsedData.metrics.forEach(metric => {
                if (metric.item.type === 'RESULT' && metric.item.score && metric.item.mistakes) {
                    newResults.push({
                        ID: `R${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
                        DATE: new Date().toISOString().split('T')[0], // Default to today for imported results
                        SCORE: metric.item.score,
                        MISTAKES: metric.item.mistakes,
                    });
                } else if (metric.item.type === 'WEAKNESS' && metric.item.weaknesses) {
                    newWeaknesses.push(...metric.item.weaknesses);
                }
            });
            
            const importData = {
                schedules: newSchedules,
                exams: newExams,
                results: newResults,
                weaknesses: newWeaknesses
            };
            
            const totalItems = newSchedules.length + newExams.length + newResults.length + (newWeaknesses.length > 0 ? 1 : 0);
            
            if (totalItems > 0) {
                onBatchImport(importData); // Use the new efficient batch handler
                
                // Build and show a detailed confirmation message
                const messages = [];
                if (newSchedules.length > 0) messages.push(`${newSchedules.length} schedule item(s)`);
                if (newExams.length > 0) messages.push(`${newExams.length} exam(s)`);
                if (newResults.length > 0) messages.push(`${newResults.length} result(s)`);
                if (newWeaknesses.length > 0) messages.push(`weakness entries`);
                
                alert(`Import successful! Added: ${messages.join(', ')}.`);
            } else {
                alert("No valid data was found in the text provided. Please check the format or use the AI Guide.");
            }
            
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

    const handleUpdateSettings = async (settings: Partial<Config['settings'] & { geminiApiKey?: string; isCalendarSyncEnabled?: boolean }>) => {
        const configUpdate: Partial<Config> = {};
        if (settings.geminiApiKey) {
            configUpdate.geminiApiKey = settings.geminiApiKey;
            delete settings.geminiApiKey;
        }
        if (typeof settings.isCalendarSyncEnabled === 'boolean') {
            configUpdate.isCalendarSyncEnabled = settings.isCalendarSyncEnabled;
            delete settings.isCalendarSyncEnabled;
        }
        
        configUpdate.settings = { ...student.CONFIG.settings, ...settings };
        
        await onUpdateConfig(configUpdate);

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

    // --- Flashcard Handlers ---
    const handleSaveDeck = (deck: FlashcardDeck) => {
        const decks = student.CONFIG.flashcardDecks || [];
        const existingIndex = decks.findIndex(d => d.id === deck.id);
        if (existingIndex > -1) {
            decks[existingIndex] = deck;
        } else {
            decks.push(deck);
        }
        onUpdateConfig({ flashcardDecks: decks });
    };

    const handleDeleteDeck = (deckId: string) => {
        if (!window.confirm("Are you sure you want to delete this deck and all its cards?")) return;
        const decks = (student.CONFIG.flashcardDecks || []).filter(d => d.id !== deckId);
        onUpdateConfig({ flashcardDecks: decks });
        setViewingDeck(null); // Close view if it was open
    };

    const handleSaveCard = (deckId: string, card: Flashcard) => {
        const decks = student.CONFIG.flashcardDecks || [];
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        
        const cardIndex = deck.cards.findIndex(c => c.id === card.id);
        if (cardIndex > -1) {
            deck.cards[cardIndex] = card;
        } else {
            deck.cards.push(card);
        }
        handleSaveDeck(deck);
        setViewingDeck({...deck}); // Re-render the deck view
    };

    const handleDeleteCard = (deckId: string, cardId: string) => {
        const decks = student.CONFIG.flashcardDecks || [];
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        deck.cards = deck.cards.filter(c => c.id !== cardId);
        handleSaveDeck(deck);
        setViewingDeck({...deck}); // Re-render the deck view
    };

    const handleStartReviewSession = (deckId: string) => {
        const deck = student.CONFIG.flashcardDecks?.find(d => d.id === deckId);
        if (deck) {
            setReviewingDeck(deck);
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
          <TabButton tabId="dashboard" icon="dashboard">Dashboard</TabButton>
          <TabButton tabId="schedule" icon="schedule">Schedule</TabButton>
          <TabButton tabId="flashcards" icon="cards">Flashcards</TabButton>
          <TabButton tabId="exams" icon="trophy">Exams</TabButton>
          <TabButton tabId="performance" icon="performance">Performance</TabButton>
          <TabButton tabId="doubts" icon="community">Doubts</TabButton>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <button onClick={() => setisAiParserModalOpen(true)} className="p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center gap-2 text-sm font-semibold" title="AI Import">
            <Icon name="gemini" className="w-4 h-4" /> AI Import
          </button>
          <button onClick={() => setIsPracticeModalOpen(true)} className="p-2.5 rounded-lg bg-purple-600/50 hover:bg-purple-600" title="Custom Practice"><Icon name="stopwatch" /></button>
          <button onClick={() => setIsSettingsModalOpen(true)} className="p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700"><Icon name="settings" /></button>
          <button onClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
            <Icon name="plus" /> Create
          </button>
        </div>
      </div>
    );
    
    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <DailyInsightWidget weaknesses={student.CONFIG.WEAK} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <SubjectAllocationWidget items={student.SCHEDULE_ITEMS} />
                                <ScoreTrendWidget results={student.RESULTS} />
                            </div>
                            <ReadingHoursWidget student={student} />
                        </div>
                        <div className="space-y-8">
                             <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} onStar={handleStarTask} />
                             <UpcomingExamsWidget exams={student.EXAMS} />
                             <HomeworkWidget items={student.SCHEDULE_ITEMS} onStartPractice={handleStartPractice} />
                        </div>
                    </div>
                );
            case 'schedule':
                 return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <ActivityTracker activities={activityItems} />
                            <ScheduleList 
                                items={taskItems} 
                                onDelete={onDeleteTask} 
                                onEdit={handleEditClick} 
                                onMoveToNextDay={()=>{}} 
                                onStar={handleStarTask} 
                                onStartPractice={handleStartPractice} 
                                isSubscribed={student.CONFIG.UNACADEMY_SUB} 
                                onStartReviewSession={handleStartReviewSession}
                                view={scheduleView}
                                onViewChange={setScheduleView}
                            />
                        </div>
                        <div className="space-y-8">
                             <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} onStar={handleStarTask} />
                             <HomeworkWidget items={student.SCHEDULE_ITEMS} onStartPractice={handleStartPractice} />
                        </div>
                    </div>
                 );
            case 'flashcards':
                return <FlashcardManager 
                            decks={student.CONFIG.flashcardDecks || []}
                            onAddDeck={() => { setEditingDeck(null); setIsCreateDeckModalOpen(true); }}
                            onEditDeck={(deck) => { setEditingDeck(deck); setIsCreateDeckModalOpen(true); }}
                            onDeleteDeck={handleDeleteDeck}
                            onViewDeck={setViewingDeck}
                            onStartReview={handleStartReviewSession}
                        />;
            case 'exams':
                return <ExamsView exams={student.EXAMS} onAdd={() => { setEditingExam(null); setIsExamModalOpen(true); }} onEdit={(exam) => { setEditingExam(exam); setIsExamModalOpen(true); }} onDelete={onDeleteExam} />;
            case 'performance':
                 return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setIsAiMistakeModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600"><Icon name="book-open" /> Analyze Mistake with AI</button>
                                <button onClick={() => setIsLogResultModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]"><Icon name="plus" /> Log Mock Result</button>
                            </div>
                            {student.RESULTS.length > 0 ? [...student.RESULTS].reverse().map(result => (<MistakeManager key={result.ID} result={result} onToggleMistakeFixed={onToggleMistakeFixed} onViewAnalysis={setViewingReport} />)) : <p className="text-gray-500 text-center py-10">No results recorded.</p>}
                        </div>
                        <div className="space-y-8">
                             <PerformanceMetrics score={student.CONFIG.SCORE} weaknesses={student.CONFIG.WEAK} onEditWeaknesses={() => setIsEditWeaknessesModalOpen(true)} />
                             <AchievementsWidget student={student} allDoubts={allDoubts} />
                        </div>
                    </div>
                );
            case 'doubts':
                return <CommunityDashboard student={student} allDoubts={allDoubts} onPostDoubt={onPostDoubt} onPostSolution={onPostSolution} onAskAi={() => setIsAiDoubtSolverOpen(true)} />;
            default:
                return null;
        }
    };

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

            {renderContent()}

            {isCreateModalOpen && <CreateEditTaskModal task={editingTask} onClose={() => { setIsCreateModalOpen(false); setEditingTask(null); }} onSave={onSaveTask} decks={student.CONFIG.flashcardDecks || []} />}
            {isAiParserModalOpen && <AIParserModal onClose={() => setisAiParserModalOpen(false)} onSave={handleCsvSave} />}
            {isImageModalOpen && <ImageToTimetableModal onClose={() => setIsImageModalOpen(false)} onSave={handleCsvSave} />}
            {isPracticeModalOpen && <CustomPracticeModal initialTask={practiceTask} onClose={() => { setIsPracticeModalOpen(false); setPracticeTask(null); }} onSessionComplete={(duration, solved, skipped) => onLogStudySession({ duration, questions_solved: solved, questions_skipped: skipped })} defaultPerQuestionTime={student.CONFIG.settings.perQuestionTime || 180} onLogResult={onLogResult} student={student} onUpdateWeaknesses={onUpdateWeaknesses} />}
            {isSettingsModalOpen && <SettingsModal settings={student.CONFIG.settings} driveLastSync={student.CONFIG.driveLastSync} isCalendarSyncEnabled={student.CONFIG.isCalendarSyncEnabled} calendarLastSync={student.CONFIG.calendarLastSync} onClose={() => setIsSettingsModalOpen(false)} onSave={handleUpdateSettings} onApiKeySet={handleApiKeySet} googleAuthStatus={googleAuthStatus} onGoogleSignIn={onGoogleSignIn} onGoogleSignOut={onGoogleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} onExportToIcs={onExportToIcs} />}
            {isEditWeaknessesModalOpen && <EditWeaknessesModal currentWeaknesses={student.CONFIG.WEAK} onClose={() => setIsEditWeaknessesModalOpen(false)} onSave={onUpdateWeaknesses} />}
            {isLogResultModalOpen && <LogResultModal onClose={() => setIsLogResultModalOpen(false)} onSave={onLogResult} />}
            {isExamModalOpen && <CreateEditExamModal exam={editingExam} onClose={() => { setIsExamModalOpen(false); setEditingExam(null); }} onSave={(exam) => editingExam ? onUpdateExam(exam) : onAddExam(exam)} />}
            {isAiMistakeModalOpen && <AIMistakeAnalysisModal onClose={() => setIsAiMistakeModalOpen(false)} onSaveWeakness={handleSaveWeakness} />}
            {isAiDoubtSolverOpen && <AIDoubtSolverModal onClose={() => setIsAiDoubtSolverOpen(false)} />}
            {isAiChatOpen && <AIChatPopup history={aiChatHistory} onSendMessage={handleAiChatMessage} onClose={() => setIsAiChatOpen(false)} isLoading={isAiChatLoading} />}
            {viewingReport && <TestReportModal result={viewingReport} onClose={() => setViewingReport(null)} onUpdateWeaknesses={onUpdateWeaknesses} student={student} />}
            
            {/* Flashcard Modals */}
            {isCreateDeckModalOpen && <CreateEditDeckModal deck={editingDeck} onClose={() => { setIsCreateDeckModalOpen(false); setEditingDeck(null); }} onSave={handleSaveDeck} />}
            {viewingDeck && <DeckViewModal deck={viewingDeck} onClose={() => setViewingDeck(null)} onAddCard={() => { setEditingCard(null); setIsCreateCardModalOpen(true); }} onEditCard={(card) => { setEditingCard(card); setIsCreateCardModalOpen(true); }} onDeleteCard={(cardId) => handleDeleteCard(viewingDeck.id, cardId)} onStartReview={() => { setReviewingDeck(viewingDeck); setViewingDeck(null); }} />}
            {isCreateCardModalOpen && viewingDeck && <CreateEditFlashcardModal card={editingCard} deckId={viewingDeck.id} onClose={() => { setIsCreateCardModalOpen(false); setEditingCard(null); }} onSave={handleSaveCard} />}
            {reviewingDeck && <FlashcardReviewModal deck={reviewingDeck} onClose={() => setReviewingDeck(null)} />}

            {useToolbarLayout && <BottomToolbar activeTab={activeTab} setActiveTab={setActiveTab} onFabClick={() => { setEditingTask(null); setIsCreateModalOpen(true); }} />}
        </main>
    );
};

export default StudentDashboard;