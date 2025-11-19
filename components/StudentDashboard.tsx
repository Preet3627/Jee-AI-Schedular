import React, { useState, useEffect, useMemo, useCallback, SetStateAction } from 'react';
import { StudentData, ScheduleItem, ActivityData, Config, StudySession, HomeworkData, ExamData, ResultData, DoubtData, FlashcardDeck, Flashcard, StudyMaterialItem, ScheduleCardData, PracticeQuestion, ActiveTab, DashboardWidgetItem, CustomWidget as CustomWidgetType } from '../types';
import ScheduleList from './ScheduleList';
import Icon, { IconName } from './Icon';
import CommunityDashboard from './CommunityDashboard';
import PlannerView from './PlannerView';
import MistakeManager from './MistakeManager';
import TodaysAgendaWidget from './widgets/TodaysAgendaWidget';
import ReadingHoursWidget from './widgets/ReadingHoursWidget';
import ScoreTrendWidget from './widgets/MarksAnalysisWidget';
import CustomPracticeModal from './CustomPracticeModal';
import HomeworkWidget from './widgets/HomeworkWidget';
import ActivityTracker from './ActivityTracker'; 
import PerformanceMetrics from './PerformanceMetrics';
import SettingsModal from './SettingsModal';
import CreateEditTaskModal from './CreateEditTaskModal';
import ExamsView from './ExamsView';
import CreateEditExamModal from './CreateEditExamModal';
import LogResultModal from './LogResultModal';
import EditWeaknessesModal from './EditWeaknessesModal';
import AchievementsWidget from './widgets/AchievementsWidget';
import AIMistakeAnalysisModal from './AIMistakeAnalysisModal';
// FIX: Changed to default import for AIParserModal
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
import StudyMaterialView from './StudyMaterialView';
import FileViewerModal from './FileViewerModal';
import AIGenerateFlashcardsModal from './flashcards/AIGenerateFlashcardsModal';
import EditResultModal from './EditResultModal';
import MusicVisualizerWidget from './widgets/MusicVisualizerWidget';
import GoogleAssistantGuideModal from './GoogleAssistantGuideModal';
import DeepLinkConfirmationModal from './DeepLinkConfirmationModal';
import AIGuideModal from './AIGuideModal';
import { useAuth } from '../context/AuthContext';
import MoveTasksModal from './MoveTasksModal';
import TodayPlanner from './TodayPlanner';
import CountdownWidget from './widgets/CountdownWidget';
import InteractiveFlashcardWidget from './widgets/InteractiveFlashcardWidget';
import MotivationalQuoteWidget from './widgets/MotivationalQuoteWidget';
import MusicPlayerWidget from './widgets/MusicPlayerWidget';
import MusicLibraryModal from './MusicLibraryModal';
import CustomWidgetComponent from './widgets/CustomWidget';
import { motivationalQuotes } from '../data/motivationalQuotes';
import { useMusicPlayer } from '../context/MusicPlayerContext'; 
import BottomToolbar from './BottomToolbar';


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
    onGoogleSignIn: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    // FIX: Added onGoogleSignOut to props interface
    onGoogleSignOut: (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void; 
    onBackupToDrive: () => void;
    onRestoreFromDrive: () => void;
    allDoubts: DoubtData[];
    onPostDoubt: (question: string, image?: string) => void;
    onPostSolution: (doubtId: string, solution: string, image?: string) => void;
    deepLinkAction: { action: string; data: any } | null;
    animationOrigin?: { x: string, y: string };
    setAnimationOrigin: React.Dispatch<React.SetStateAction<{ x: string, y: string } | undefined>>;
}

const StudentDashboard: React.FC<StudentDashboardProps> = (props) => {
    const { student, onSaveTask, onSaveBatchTasks, onDeleteTask, onToggleMistakeFixed, onUpdateConfig, onLogStudySession, onUpdateWeaknesses, onLogResult, onAddExam, onUpdateExam, onDeleteExam, onExportToIcs, onBatchImport, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, allDoubts, onPostDoubt, onPostSolution, deepLinkAction, animationOrigin, setAnimationOrigin } = props;
    const { refreshUser } = useAuth();
    const { currentTrack } = useMusicPlayer();
    const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
    const [scheduleView, setScheduleView] = useState<'upcoming' | 'past'>('upcoming');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAiParserModalOpen, setisAiParserModalOpen] = useState(false);
    const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<ScheduleItem | null>(null);
    const [viewingTask, setViewingTask] = useState<ScheduleItem | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [practiceTask, setPracticeTask] = useState<HomeworkData | null>(null);
    const [isEditWeaknessesModalOpen, setIsEditWeaknessesModalOpen] = useState(false);
    const [isLogResultModalOpen, setIsLogResultModalOpen] = useState(false);
    const [initialScoreForModal, setInitialScoreForModal] = useState<string | undefined>();
    const [initialMistakesForModal, setInitialMistakesForModal] = useState<string | undefined>();
    const [isEditResultModalOpen, setIsEditResultModalOpen] = useState(false);
    const [editingResult, setEditingResult] = useState<ResultData | null>(null);
    const [isExamModalOpen, setIsExamModalOpen] = useState(false);
    const [editingExam, setEditingExam] = useState<ExamData | null>(null);
    const [isAiMistakeModalOpen, setIsAiMistakeModalOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<ResultData | null>(null);
    const [isAssistantGuideOpen, setIsAssistantGuideOpen] = useState(false);
    const [isAiGuideModalOpen, setIsAiGuideModalOpen] = useState(false);
    const [deepLinkData, setDeepLinkData] = useState<any | null>(null);
    
    // Schedule management state
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

    
    // AI Chat State
    const [isAiChatOpen, setIsAiChatOpen] = useState(false);
    const [aiChatHistory, setAiChatHistory] = useState<{ role: string; parts: { text: string }[] }[]>([]);
    const [showAiChatFab, setShowAiChatFab] = useState(student.CONFIG.settings.showAiChatAssistant !== false && !!student.CONFIG.settings.hasGeminiKey);
    const [isAiChatLoading, setIsAiChatLoading] = useState(false);
    const [aiPracticeTest, setAiPracticeTest] = useState<{ questions: PracticeQuestion[], answers: Record<string, string> } | null>(null);

    // AI Doubt Solver State
    const [isAiDoubtSolverOpen, setIsAiDoubtSolverOpen] = useState(false);

    // Flashcard State
    const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
    const [isAiFlashcardModalOpen, setIsAiFlashcardModalOpen] = useState(false);
    const [editingDeck, setEditingDeck] = useState<FlashcardDeck | null>(null);
    const [viewingDeck, setViewingDeck] = useState<FlashcardDeck | null>(null);
    const [isCreateCardModalOpen, setIsCreateCardModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
    const [reviewingDeck, setReviewingDeck] = useState<FlashcardDeck | null>(null);

    // Study Material State
    const [viewingFile, setViewingFile] = useState<StudyMaterialItem | null>(null);
    const [isMusicLibraryOpen, setIsMusicLibraryOpen] = useState(false);
    
    // Genie Animation State
    // FIX: Removed `animationOrigin` and `setAnimationOrigin` from local state, now they are passed as props from App.tsx.


    // FIX: Simplified handleModalOpenWithAnimation, to accept a generic setter.
    const handleModalOpenWithAnimation = useCallback(<T,>(setter: React.Dispatch<SetStateAction<T | null | boolean>>, event: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent> | null, data?: T) => {
        if (event) {
            const rect = event.currentTarget.getBoundingClientRect();
            setAnimationOrigin({
                x: `${rect.left + rect.width / 2}px`,
                y: `${rect.top + rect.height / 2}px`
            });
        } else {
            setAnimationOrigin(undefined); // Clear animation origin if no event
        }

        if (data !== undefined) {
            setter(data as SetStateAction<T | null>); // Cast for cases like setViewingDeck(deck)
        } else {
            setter(true as SetStateAction<boolean>); // Default for simple boolean setters
        }
    }, [setAnimationOrigin]);

    // History management for tabs
    useEffect(() => {
        const getTabFromHash = () => {
            const hash = window.location.hash.replace('#/', '');
            const validTabs: ActiveTab[] = ['dashboard', 'schedule', 'today', 'planner', 'exams', 'performance', 'doubts', 'flashcards', 'material'];
            if (validTabs.includes(hash as ActiveTab)) {
                return hash as ActiveTab;
            }
            return null;
        };

        // On component mount, sync state with URL hash
        const initialTab = getTabFromHash();
        if (initialTab) {
            setActiveTab(initialTab);
        } else {
            // Set default hash without creating a history entry
            window.history.replaceState({ tab: 'dashboard' }, '', '#/dashboard');
        }

        const handlePopState = (event: PopStateEvent) => {
            const newTab = event.state?.tab || getTabFromHash() || 'dashboard';
            setActiveTab(newTab);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []); // Empty dependency array means this runs once on mount

    useEffect(() => {
        // This effect syncs the URL when the user clicks a tab button
        const currentHash = window.location.hash.replace('#/', '');
        if (activeTab !== currentHash) {
            window.history.pushState({ tab: activeTab }, '', `/#/${activeTab}`);
        }
    }, [activeTab]);

    useEffect(() => {
        if (!deepLinkAction) return;

        const { action, data } = deepLinkAction;

        if (action === 'batch_import') {
            setDeepLinkData(data);
            return;
        }

        if (action === 'view_task') {
            const task = student.SCHEDULE_ITEMS.find(t => t.ID === data.id);
            if (task) {
                setViewingTask(task);
                setIsCreateModalOpen(true);
            }
            return;
        }
        
        const getDayFromDate = (dateStr: string) => {
            if (!dateStr) return new Date().toLocaleString('en-us', {weekday: 'long'}).toUpperCase();
            const d = new Date(`${dateStr}T12:00:00.000Z`); // Use UTC to avoid timezone issues with just date
            return d.toLocaleString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase();
        };
        const createLocalizedString = (text: string) => ({ EN: text || '', GU: '' });

        if (action === 'new_schedule' || action === 'create_homework' || action === 'flashcard_review') {
            const taskToEdit = {
                ID: '', // will be generated on save
                type: action === 'create_homework' ? 'HOMEWORK' : 'ACTION',
                CARD_TITLE: createLocalizedString(data.topic),
                FOCUS_DETAIL: createLocalizedString(data.details || (action === 'new_schedule' ? `Deep dive into ${data.topic}` : `Homework for ${data.topic}`)),
                SUBJECT_TAG: createLocalizedString(data.subject?.toUpperCase()),
                DAY: createLocalizedString(getDayFromDate(data.date)),
                date: data.date,
                isUserCreated: true,
            };
            
            if (action === 'new_schedule') {
                (taskToEdit as any).SUB_TYPE = 'DEEP_DIVE';
                (taskToEdit as any).TIME = data.time || '09:00';
            } else if (action === 'create_homework') { // homework
                (taskToEdit as any).Q_RANGES = data.details || '';
                (taskToEdit as any).TIME = data.time || ''; // Homework time is optional
            } else if (action === 'flashcard_review') {
                (taskToEdit as any).SUB_TYPE = 'FLASHCARD_REVIEW';
                (taskToEdit as any).TIME = data.time || '10:00';
                (taskToEdit as any).deckId = data.deckId; // If provided via deep link
            }
            
            setEditingTask(taskToEdit as ScheduleItem);
            setIsCreateModalOpen(true);

        } else if (action === 'log_score') {
            setInitialScoreForModal(`${data.score}/${data.max_score}`);
            setInitialMistakesForModal(data.details);
            setIsLogResultModalOpen(true);
        }


    }, [deepLinkAction, student.SCHEDULE_ITEMS]);

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

    // This computed value determines if the mobile-optimized toolbar layout should be used.
    const useToolbarLayout = student.CONFIG.settings.mobileLayout === 'toolbar' && isMobile;

    const taskItems = student.SCHEDULE_ITEMS.filter(item => item.type !== 'ACTIVITY');
    const activityItems = student.SCHEDULE_ITEMS.filter(item => item.type === 'ACTIVITY') as ActivityData[];
    
    const handleEditClick = useCallback((item: ScheduleItem, event?: React.MouseEvent<HTMLButtonElement | HTMLDivElement, MouseEvent>) => {
        setEditingTask(item);
        if (event) handleModalOpenWithAnimation(setIsCreateModalOpen, event, item); // Pass item as data
        else setIsCreateModalOpen(true);
    }, [handleModalOpenWithAnimation]);

    const handleDataImport = (structuredData: any) => {
        try {
             // Flashcard Deck handling
            if (structuredData.flashcard_deck) {
                const newDeckData = structuredData.flashcard_deck;
                if (!newDeckData.name || !newDeckData.subject || !Array.isArray(newDeckData.cards)) {
                    throw new Error("Flashcard deck data is malformed.");
                }
                const newDeck: FlashcardDeck = {
                    id: `deck_${Date.now()}`,
                    name: newDeckData.name,
                    subject: newDeckData.subject.toUpperCase(),
                    chapter: newDeckData.chapter,
                    isLocked: false,
                    cards: newDeckData.cards.map((card: any, index: number) => {
                        if (!card.front || !card.back) {
                            throw new Error(`Card at index ${index} is missing front or back content.`);
                        }
                        return {
                            id: `card_${Date.now()}_${index}`,
                            front: card.front,
                            back: card.back
                        };
                    })
                };
                handleSaveDeck(newDeck); // This will call onUpdateConfig
                alert(`New flashcard deck "${newDeck.name}" created with ${newDeck.cards.length} cards!`);
            }
            
            // Custom Widget handling
            if (structuredData.custom_widget) {
                const newWidgetData = structuredData.custom_widget;
                if (!newWidgetData.title || !newWidgetData.content) {
                    throw new Error("Custom widget data is malformed.");
                }
                const newWidget: CustomWidgetType = { // FIX: Use CustomWidgetType
                    id: `custom_widget_${Date.now()}`,
                    title: newWidgetData.title,
                    content: newWidgetData.content,
                };
                handleSaveCustomWidget(newWidget); // This will call onUpdateConfig
                alert(`New custom widget "${newWidget.title}" created! You can add it to your dashboard from settings.`);
            }

            const createLocalizedString = (text: string) => ({ EN: text || '', GU: '' });
            
            const schedules: ScheduleItem[] = (structuredData.schedules || [])
                .map((s: any): ScheduleItem | null => {
                    if (s.type === 'HOMEWORK') {
                        let parsedAnswers = s.answers;
                        if (typeof parsedAnswers === 'string' && parsedAnswers.trim().startsWith('{')) {
                            try {
                                parsedAnswers = JSON.parse(parsedAnswers);
                            } catch (e) {
                                console.warn("Could not parse homework answers string, treating as empty.");
                                parsedAnswers = {};
                            }
                        } else if (typeof parsedAnswers !== 'object') {
                            parsedAnswers = {};
                        }

                        return {
                            ID: s.id, type: 'HOMEWORK', isUserCreated: true, DAY: createLocalizedString(s.day),
                            CARD_TITLE: createLocalizedString(s.title), FOCUS_DETAIL: createLocalizedString(s.detail),
                            SUBJECT_TAG: createLocalizedString(s.subject?.toUpperCase()), Q_RANGES: s.q_ranges || '', TIME: s.time || undefined,
                            answers: parsedAnswers, solutions: s.solutions
                        } as HomeworkData;
                    }
                    if (s.type === 'ACTION') {
                        return {
                            ID: s.id, type: 'ACTION', SUB_TYPE: s.sub_type || 'DEEP_DIVE', isUserCreated: true,
                            DAY: createLocalizedString(s.day), TIME: s.time, CARD_TITLE: createLocalizedString(s.title),
                            FOCUS_DETAIL: createLocalizedString(s.detail), SUBJECT_TAG: createLocalizedString(s.subject?.toUpperCase())
                        } as ScheduleCardData;
                    }
                    console.warn("Skipping unknown schedule type from AI parser:", s.type);
                    return null;
                })
                .filter((item): item is ScheduleItem => item !== null);


            const exams: ExamData[] = (structuredData.exams || []).map((e: any) => ({
                ID: e.id, subject: e.subject.toUpperCase(), title: e.title, date: e.date,
                time: e.time, syllabus: e.syllabus
            }));
            
            let results: ResultData[] = [];
            let weaknesses: string[] = [];
            (structuredData.metrics || []).forEach((m: any) => {
                if (m.type === 'RESULT' && m.score && m.mistakes) {
                    results.push({
                        ID: `R${Date.now()}${Math.random().toString(36).substring(2, 7)}`,
                        DATE: new Date().toISOString().split('T')[0],
                        SCORE: m.score,
                        MISTAKES: m.mistakes.split(';').map((s: string) => s.trim()).filter(Boolean)
                    });
                } else if (m.type === 'WEAKNESS' && m.weaknesses) {
                    weaknesses.push(...m.weaknesses.split(';').map((s: string) => s.trim()).filter(Boolean));
                }
            });

            const importData = { schedules, exams, results, weaknesses };
            const totalItems = schedules.length + exams.length + results.length + (weaknesses.length > 0 ? 1 : 0);

            if (totalItems > 0) {
                onBatchImport(importData);
                const messages = [
                    schedules.length > 0 && `${schedules.length} schedule item(s)`,
                    exams.length > 0 && `${exams.length} exam(s)`,
                    results.length > 0 && `${results.length} result(s)`,
                    weaknesses.length > 0 && `weakness entries`
                ].filter(Boolean).join(', ');
                alert(`Import successful! Added: ${messages}.`);
            } else if (!structuredData.flashcard_deck && !structuredData.custom_widget) {
                 alert("No valid data was found to import. Please check the JSON format or use the AI Guide.");
            }

            setisAiParserModalOpen(false);
        } catch (error: any) {
            alert(`Error processing data: ${error.message}`);
        }
    };
    
    const handleAiPracticeTest = (data: { questions: PracticeQuestion[], answers: Record<string, string> }) => {
        setAiPracticeTest(data);
        setisAiParserModalOpen(false); // Close parser
        setTimeout(() => handleModalOpenWithAnimation(setIsPracticeModalOpen, null, true), 300); // Open practice modal after transition
    };

    const handleCompleteTask = (task: ScheduleCardData) => {
        onDeleteTask(task.ID);
    };

    const handleStarTask = (taskId: string) => {
        const task = student.SCHEDULE_ITEMS.find(t => t.ID === taskId);
        if (task) onSaveTask({ ...task, isStarred: !task.isStarred });
    };

    const handleStartPractice = useCallback((homework: HomeworkData, event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        setPracticeTask(homework);
        if (event) handleModalOpenWithAnimation(setIsPracticeModalOpen, event, homework); // Pass homework as data
        else setIsPracticeModalOpen(true);
    }, [handleModalOpenWithAnimation]);

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

    const handleUpdateSettings = async (settings: Partial<Config['settings'] & { geminiApiKey?: string; customDjDropFile?: File }>, newCustomWidgets: CustomWidgetType[]) => {
        const configUpdate: Partial<Config> = {};
        if (settings.geminiApiKey) {
            configUpdate.geminiApiKey = settings.geminiApiKey;
            delete settings.geminiApiKey;
        }

        if (settings.customDjDropFile) {
            // Read file as base64 and update
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = (reader.result as string);
                // The backend endpoint /config handles this by updating customDjDropUrl
                await onUpdateConfig({ settings: { ...student.CONFIG.settings, ...settings, customDjDropUrl: base64String } });
                delete settings.customDjDropFile;
            };
            reader.readAsDataURL(settings.customDjDropFile);
        } else {
            // Normal settings update
            configUpdate.settings = { ...student.CONFIG.settings, ...settings };
            await onUpdateConfig(configUpdate);
        }
        
        // Update custom widgets separately if there are changes
        if (JSON.stringify(newCustomWidgets) !== JSON.stringify(student.CONFIG.customWidgets)) {
            await onUpdateConfig({ customWidgets: newCustomWidgets });
        }


        if (settings.showAiChatAssistant !== undefined) {
            setShowAiChatFab(settings.showAiChatAssistant);
        }
    };

    const handleSaveCustomWidget = (widget: CustomWidgetType) => {
        const customWidgets = student.CONFIG.customWidgets || [];
        const existingIndex = customWidgets.findIndex(w => w.id === widget.id);
        if (existingIndex > -1) {
            customWidgets[existingIndex] = widget;
        } else {
            customWidgets.push(widget);
        }
        onUpdateConfig({ customWidgets: customWidgets });
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
            // Refresh user data in case the AI modified it
            if (!result.response.toLowerCase().includes("sorry")) {
                await refreshUser();
            }
        } catch (error: any) {
            const errorMessage = error.error || error.message || "An unknown error occurred.";
            setAiChatHistory([...newHistory, { role: 'model', parts: [{ text: `Sorry, I encountered an error: ${errorMessage}` }] }]);
        } finally {
            setIsAiChatLoading(false);
        }
    };
    
    // --- Schedule Management Handlers ---
    const handleToggleSelectMode = () => {
        setIsSelectMode(prev => !prev);
        setSelectedTaskIds([]); // Clear selection when toggling mode
    };

    const handleTaskSelect = (taskId: string) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId)
                ? prev.filter(id => id !== taskId)
                : [...prev, taskId]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedTaskIds.length === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedTaskIds.length} items?`)) {
            await api.deleteBatchTasks(selectedTaskIds);
            await refreshUser();
            setIsSelectMode(false);
            setSelectedTaskIds([]);
        }
    };

    const handleMoveSelected = async (newDate: string) => {
        if (selectedTaskIds.length === 0 || !newDate) return;
        await api.moveBatchTasks(selectedTaskIds, newDate);
        await refreshUser();
        setIsMoveModalOpen(false);
        setIsSelectMode(false);
        setSelectedTaskIds([]);
    };
    
    const handleClearAllSchedule = async () => {
        if (window.confirm("DANGER: This will permanently delete ALL schedule items. Are you absolutely sure?")) {
            await api.clearAllSchedule();
            await refreshUser();
            setIsSettingsModalOpen(false); // Close settings after action
        }
    };


    // --- Result Handlers ---
    const handleEditResult = (result: ResultData, event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        setEditingResult(result);
        if (event) handleModalOpenWithAnimation(setIsEditResultModalOpen, event, result);
        else setIsEditResultModalOpen(true);
    };
    
    const onUpdateResult = async (result: ResultData) => {
        await api.updateResult(result);
        refreshUser();
    };

    const onDeleteResult = async (resultId: string) => {
        await api.deleteResult(resultId);
        refreshUser();
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

    const handleStartReviewSession = useCallback((deckId: string, event?: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const deck = student.CONFIG.flashcardDecks?.find(d => d.id === deckId);
        if (deck) {
            if (event) handleModalOpenWithAnimation(setReviewingDeck, event, deck); // Pass deck as data
            else setReviewingDeck(deck);
        }
    }, [student.CONFIG.flashcardDecks, handleModalOpenWithAnimation]);
    
    const TabButton: React.FC<{ tabId: ActiveTab; icon: IconName; children: React.ReactNode; }> = ({ tabId, icon, children }) => (
        <button onClick={() => setActiveTab(tabId)} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-[var(--accent-color)] border-[var(--accent-color)]' : 'text-gray-400 border-transparent hover:text-white'}`}>
            <Icon name={icon} className="w-4 h-4" /> {children}
        </button>
    );

    const TopTabBar = () => (
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[var(--glass-border)] mb-6 gap-4">
        <div className="flex items-center flex-wrap">
          <TabButton tabId="dashboard" icon="dashboard">Dashboard</TabButton>
          <TabButton tabId="today" icon="star">Today</TabButton>
          <TabButton tabId="schedule" icon="schedule">Schedule</TabButton>
          <TabButton tabId="material" icon="book-open">Study Material</TabButton>
          <TabButton tabId="flashcards" icon="cards">Flashcards</TabButton>
          <TabButton tabId="exams" icon="trophy">Exams</TabButton>
          <TabButton tabId="performance" icon="performance">Performance</TabButton>
          <TabButton tabId="doubts" icon="community">Doubts</TabButton>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <button onClick={(e) => handleModalOpenWithAnimation(setisAiParserModalOpen, e)} className="p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 flex items-center gap-2 text-sm font-semibold" title="AI Import">
            <Icon name="gemini" className="w-4 h-4" /> AI Import
          </button>
          <button onClick={(e) => handleModalOpenWithAnimation(setIsPracticeModalOpen, e, true)} className="p-2.5 rounded-lg bg-purple-600/50 hover:bg-purple-600" title="Custom Practice"><Icon name="stopwatch" /></button>
          <button onClick={(e) => handleModalOpenWithAnimation(setIsSettingsModalOpen, e, true)} className="p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700"><Icon name="settings" /></button>
          <button onClick={(e) => handleModalOpenWithAnimation(setIsCreateModalOpen, e, true)} className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
            <Icon name="plus" /> Create
          </button>
        </div>
      </div>
    );
    
    const renderDashboardContent = () => {
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        const allAvailableWidgets: Record<string, React.ReactNode> = {
            'countdown': <CountdownWidget items={student.SCHEDULE_ITEMS} onClick={(e) => handleModalOpenWithAnimation(setIsCreateModalOpen, e, true)} />,
            'dailyInsight': <DailyInsightWidget weaknesses={student.CONFIG.WEAK} exams={student.EXAMS} />,
            'quote': <MotivationalQuoteWidget quote={randomQuote} />,
            'music': <MusicPlayerWidget onOpenLibrary={(event) => handleModalOpenWithAnimation(setIsMusicLibraryOpen, event, true)} />,
            'subjectAllocation': <SubjectAllocationWidget items={student.SCHEDULE_ITEMS} />,
            'scoreTrend': <ScoreTrendWidget results={student.RESULTS} />,
            'flashcards': <InteractiveFlashcardWidget student={student} onUpdateConfig={onUpdateConfig} />,
            'readingHours': <ReadingHoursWidget student={student} />,
            'todaysAgenda': <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} onStar={handleStarTask} />,
            'upcomingExams': <UpcomingExamsWidget exams={student.EXAMS} />,
            'homework': <HomeworkWidget items={student.SCHEDULE_ITEMS} onStartPractice={handleStartPractice} />,
            'visualizer': <MusicVisualizerWidget />,
        };

        (student.CONFIG.customWidgets || []).forEach(widget => {
            allAvailableWidgets[`custom-${widget.id}`] = <CustomWidgetComponent key={`custom-${widget.id}`} title={widget.title} content={widget.content} />;
        });


        const layout: DashboardWidgetItem[] = student.CONFIG.settings.dashboardLayout || [];

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {layout.map(widgetItem => {
                    const widget = allAvailableWidgets[widgetItem.id];
                    if (!widget) return null;
                    
                    const isTranslucent = widgetItem.translucent;
                    const isWide = widgetItem.wide;
                    const widgetClass = `
                        ${isTranslucent ? 'widget-translucent' : ''}
                        ${isWide ? 'md:col-span-2' : ''}
                        ${(widgetItem.id === 'countdown' || widgetItem.id === 'dailyInsight' || widgetItem.id === 'quote' || widgetItem.id === 'flashcards' || widgetItem.id === 'music') && !isWide ? 'md:col-span-1' : ''}
                        ${(widgetItem.id === 'countdown') && isWide ? 'lg:col-span-2 xl:col-span-2' : ''}
                    `;

                    return (
                        <div key={widgetItem.id} className={widgetClass}>
                            {widget}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return renderDashboardContent();
            case 'today':
                return <TodayPlanner items={taskItems} onEdit={handleEditClick} />;
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
                                onCompleteTask={handleCompleteTask}
                                view={scheduleView}
                                onViewChange={setScheduleView}
                                isSelectMode={isSelectMode}
                                selectedTaskIds={selectedTaskIds}
                                onTaskSelect={handleTaskSelect}
                                onToggleSelectMode={handleToggleSelectMode}
                                onDeleteSelected={handleDeleteSelected}
                                onMoveSelected={(e) => handleModalOpenWithAnimation(setIsMoveModalOpen, e, true)}
                            />
                        </div>
                        <div className="space-y-8">
                             <TodaysAgendaWidget items={student.SCHEDULE_ITEMS} onStar={handleStarTask} />
                             <HomeworkWidget items={student.SCHEDULE_ITEMS} onStartPractice={handleStartPractice} />
                        </div>
                    </div>
                 );
             case 'planner':
                return <PlannerView items={taskItems} onEdit={handleEditClick} />;
            case 'material':
                return <StudyMaterialView student={student} onUpdateConfig={onUpdateConfig} onViewFile={(file) => handleModalOpenWithAnimation(setViewingFile, null, file)} />;
            case 'flashcards':
                return <FlashcardManager 
                            decks={student.CONFIG.flashcardDecks || []}
                            onAddDeck={(e) => handleModalOpenWithAnimation(setIsCreateDeckModalOpen, e, true)}
                            onEditDeck={(deck, e) => { setEditingDeck(deck); handleModalOpenWithAnimation(setIsCreateDeckModalOpen, e, deck); }}
                            onDeleteDeck={handleDeleteDeck}
                            onViewDeck={(deck, e) => { setViewingDeck(deck); handleModalOpenWithAnimation(setViewingDeck, e, deck); }}
                            onStartReview={(deckId, e) => handleStartReviewSession(deckId, e)}
                            onGenerateWithAI={(e) => handleModalOpenWithAnimation(setIsAiFlashcardModalOpen, e, true)}
                        />;
            case 'exams':
                return <ExamsView 
                          exams={student.EXAMS} 
                          onAdd={(e) => { setEditingExam(null); handleModalOpenWithAnimation(setIsExamModalOpen, e, true); }}
                          onEdit={(exam, e) => { setEditingExam(exam); handleModalOpenWithAnimation(setIsExamModalOpen, e, exam); }}
                          onDelete={onDeleteExam} 
                        />;
            case 'performance':
                 return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="flex justify-end gap-4">
                                <button onClick={(e) => handleModalOpenWithAnimation(setIsAiMistakeModalOpen, e, true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600"><Icon name="book-open" /> Analyze Mistake with AI</button>
                                <button onClick={(e) => handleModalOpenWithAnimation(setIsLogResultModalOpen, e, true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]"><Icon name="plus" /> Log Mock Result</button>
                            </div>
                            {student.RESULTS.length > 0 ? [...student.RESULTS].reverse().map(result => (<MistakeManager key={result.ID} result={result} onToggleMistakeFixed={onToggleMistakeFixed} onViewAnalysis={(r, e) => {setViewingReport(r); handleModalOpenWithAnimation(setViewingReport, e, r);}} onEdit={(r, e) => {setEditingResult(r); handleModalOpenWithAnimation(setIsEditResultModalOpen, e, r);}} onDelete={onDeleteResult} />)) : <p className="text-gray-500 text-center py-10">No results recorded.</p>}
                        </div>
                        <div className="space-y-8">
                             <PerformanceMetrics score={student.CONFIG.SCORE} weaknesses={student.CONFIG.WEAK} onEditWeaknesses={(e) => handleModalOpenWithAnimation(setIsEditWeaknessesModalOpen, e, true)} />
                             <AchievementsWidget student={student} allDoubts={allDoubts} />
                        </div>
                    </div>
                );
            case 'doubts':
                return <CommunityDashboard student={student} allDoubts={allDoubts} onPostDoubt={onPostDoubt} onPostSolution={onPostSolution} onAskAi={(e) => handleModalOpenWithAnimation(setIsAiDoubtSolverOpen, e, true)} />;
            default:
                return null;
        }
    };

    return (
        <main className={`mt-8 ${useToolbarLayout || currentTrack ? 'pb-24' : ''}`}>
            
            {showAiChatFab && !isAiChatOpen && (
                <button 
                    onClick={(e) => handleModalOpenWithAnimation(setIsAiChatOpen, e, true)}
                    className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-transform hover:scale-110 active:scale-95"
                    title="Open AI Assistant"
                >
                    <Icon name="gemini" className="w-8 h-8"/>
                </button>
            )}
            
            {/* The main layout switcher: renders a simplified header for mobile toolbar view, or the full tab bar for desktop. */}
            {useToolbarLayout ? (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold capitalize text-white">{activeTab}</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => handleModalOpenWithAnimation(setIsPracticeModalOpen, e, true)} className="p-2.5 rounded-lg bg-purple-600/50 hover:bg-purple-600" title="Custom Practice"><Icon name="stopwatch" /></button>
                        <button onClick={(e) => handleModalOpenWithAnimation(setIsSettingsModalOpen, e, true)} className="p-2.5 rounded-lg bg-gray-700/50 hover:bg-gray-700" title="Settings"><Icon name="settings" /></button>
                    </div>
                </div>
            ) : <TopTabBar />}

            <div key={activeTab} className="tab-content-enter">
              {renderContent()}
            </div>

            {isCreateModalOpen && <CreateEditTaskModal animationOrigin={animationOrigin} task={editingTask || viewingTask} viewOnly={!!viewingTask} onClose={() => { setIsCreateModalOpen(false); setEditingTask(null); setViewingTask(null); }} onSave={onSaveTask} decks={student.CONFIG.flashcardDecks || []} />}
            {isAiParserModalOpen && <AIParserModal animationOrigin={animationOrigin} onClose={() => setisAiParserModalOpen(false)} onDataReady={handleDataImport} onPracticeTestReady={handleAiPracticeTest} onOpenGuide={(e) => handleModalOpenWithAnimation(setIsAiGuideModalOpen, e, true)} examType={student.CONFIG.settings.examType} />}
            {isPracticeModalOpen && <CustomPracticeModal animationOrigin={animationOrigin} initialTask={practiceTask} aiPracticeTest={aiPracticeTest} onClose={() => { setIsPracticeModalOpen(false); setPracticeTask(null); setAiPracticeTest(null); }} onSessionComplete={(duration, solved, skipped) => onLogStudySession({ duration, questions_solved: solved, questions_skipped: skipped })} defaultPerQuestionTime={student.CONFIG.settings.perQuestionTime || 180} onLogResult={onLogResult} student={student} onUpdateWeaknesses={onUpdateWeaknesses} onSaveTask={onSaveTask} />}
            {isSettingsModalOpen && <SettingsModal animationOrigin={animationOrigin} settings={student.CONFIG.settings} decks={student.CONFIG.flashcardDecks || []} driveLastSync={student.CONFIG.driveLastSync} isCalendarSyncEnabled={student.CONFIG.isCalendarSyncEnabled} calendarLastSync={student.CONFIG.calendarLastSync} onClose={() => setIsSettingsModalOpen(false)} onSave={handleUpdateSettings} onApiKeySet={handleApiKeySet} googleAuthStatus={googleAuthStatus} onGoogleSignIn={onGoogleSignIn} onGoogleSignOut={onGoogleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} onExportToIcs={onExportToIcs} onOpenAssistantGuide={(e) => handleModalOpenWithAnimation(setIsAssistantGuideOpen, e, true)} onOpenAiGuide={(e) => handleModalOpenWithAnimation(setIsAiGuideModalOpen, e, true)} onClearAllSchedule={handleClearAllSchedule} studentCustomWidgets={student.CONFIG.customWidgets || []} onSaveCustomWidgets={handleSaveCustomWidget} />}
            {isEditWeaknessesModalOpen && <EditWeaknessesModal animationOrigin={animationOrigin} onClose={() => setIsEditWeaknessesModalOpen(false)} onSave={onUpdateWeaknesses} currentWeaknesses={student.CONFIG.WEAK} />}
            {isLogResultModalOpen && <LogResultModal animationOrigin={animationOrigin} onClose={() => {setIsLogResultModalOpen(false); setInitialScoreForModal(undefined); setInitialMistakesForModal(undefined);}} onSave={onLogResult} initialScore={initialScoreForModal} initialMistakes={initialMistakesForModal} />}
            {isEditResultModalOpen && editingResult && <EditResultModal animationOrigin={animationOrigin} result={editingResult} onClose={() => { setIsEditResultModalOpen(false); setEditingResult(null); }} onSave={onUpdateResult} />}
            {isExamModalOpen && <CreateEditExamModal animationOrigin={animationOrigin} exam={editingExam} onClose={() => { setIsExamModalOpen(false); setEditingExam(null); }} onSave={(exam) => editingExam ? onUpdateExam(exam) : onAddExam(exam)} />}
            {isAiMistakeModalOpen && <AIMistakeAnalysisModal animationOrigin={animationOrigin} onClose={() => setIsAiMistakeModalOpen(false)} onSaveWeakness={handleSaveWeakness} />}
            {isAiDoubtSolverOpen && <AIDoubtSolverModal animationOrigin={animationOrigin} onClose={() => setIsAiDoubtSolverOpen(false)} />}
            {isAiChatOpen && <AIChatPopup animationOrigin={animationOrigin} history={aiChatHistory} onSendMessage={handleAiChatMessage} onClose={() => setIsAiChatOpen(false)} isLoading={isAiChatLoading} />}
            {viewingReport && <TestReportModal animationOrigin={animationOrigin} result={viewingReport} onClose={() => setViewingReport(null)} onUpdateWeaknesses={onUpdateWeaknesses} student={student} onSaveDeck={handleSaveDeck} />}
            {isMoveModalOpen && <MoveTasksModal animationOrigin={animationOrigin} onClose={() => setIsMoveModalOpen(false)} onConfirm={handleMoveSelected} selectedCount={selectedTaskIds.length} />}
            {isMusicLibraryOpen && <MusicLibraryModal animationOrigin={animationOrigin} onClose={() => setIsMusicLibraryOpen(false)} />}
            {deepLinkData && (
                <DeepLinkConfirmationModal
                    animationOrigin={animationOrigin} 
                    data={deepLinkData}
                    onClose={() => setDeepLinkData(null)}
                    onConfirm={() => {
                        const importData = {
                            schedules: deepLinkData.schedules || [],
                            exams: deepLinkData.exams || [],
                            results: deepLinkData.results || [],
                            weaknesses: deepLinkData.weaknesses || [],
                        };
                        onBatchImport(importData);
                    }}
                />
            )}

            {/* Flashcard Modals */}
            {isCreateDeckModalOpen && <CreateEditDeckModal animationOrigin={animationOrigin} deck={editingDeck} onClose={() => { setIsCreateDeckModalOpen(false); setEditingDeck(null); }} onSave={handleSaveDeck} />}
            {isAiFlashcardModalOpen && <AIGenerateFlashcardsModal animationOrigin={animationOrigin} student={student} onClose={() => setIsAiFlashcardModalOpen(false)} onSaveDeck={handleSaveDeck} />}
            {viewingDeck && <DeckViewModal animationOrigin={animationOrigin} deck={viewingDeck} onClose={() => setViewingDeck(null)} onAddCard={(e) => { setEditingCard(null); handleModalOpenWithAnimation(setIsCreateCardModalOpen, e, true); }} onEditCard={(card, e) => { setEditingCard(card); handleModalOpenWithAnimation(setIsCreateCardModalOpen, e, card); }} onDeleteCard={(cardId) => handleDeleteCard(viewingDeck.id, cardId)} onStartReview={(e) => { setReviewingDeck(viewingDeck); setViewingDeck(null); handleModalOpenWithAnimation(setReviewingDeck, e, reviewingDeck); }} />}
            {isCreateCardModalOpen && viewingDeck && <CreateEditFlashcardModal animationOrigin={animationOrigin} card={editingCard} deckId={viewingDeck.id} onClose={() => { setIsCreateCardModalOpen(false); setEditingCard(null); }} onSave={handleSaveCard} />}
            {reviewingDeck && <FlashcardReviewModal animationOrigin={animationOrigin} deck={reviewingDeck} onClose={() => setReviewingDeck(null)} />}
            
            {/* Study Material Modal */}
            {viewingFile && <FileViewerModal animationOrigin={animationOrigin} file={viewingFile} onClose={() => handleModalOpenWithAnimation(setViewingFile, null, null)} />}

            {/* Assistant & AI Guide Modals */}
            {isAssistantGuideOpen && <GoogleAssistantGuideModal animationOrigin={animationOrigin} onClose={() => setIsAssistantGuideOpen(false)} />}
            {isAiGuideModalOpen && <AIGuideModal animationOrigin={animationOrigin} onClose={() => setIsAiGuideModalOpen(false)} examType={student.CONFIG.settings.examType} />}
            
            {/* Renders the bottom toolbar only if the mobile layout is active. */}
            {useToolbarLayout && <BottomToolbar activeTab={activeTab} setActiveTab={setActiveTab} onFabClick={(e) => handleModalOpenWithAnimation(setIsCreateModalOpen, e, true)} />}
        </main>
    );
};

export default StudentDashboard;