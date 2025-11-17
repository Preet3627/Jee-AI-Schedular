import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { StudentData, ScheduleItem, StudySession, Config, ResultData, ExamData, DoubtData } from './types';
// FIX: Corrected import path for mockData.
import { studentDatabase } from './data/mockData';
// FIX: Corrected import path to point to apiService.
import { api } from './api/apiService';

import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AuthScreen from './screens/AuthScreen';
import BackendOfflineScreen from './components/BackendOfflineScreen';
import ConfigurationErrorScreen from './components/ConfigurationErrorScreen';
import { exportCalendar } from './utils/calendar';
import * as gcal from './utils/googleCalendar';
import * as gdrive from './utils/googleDrive';
import * as auth from './utils/googleAuth';

// FIX: Add global declarations for Google API objects to resolve TypeScript errors.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const API_URL = '/api';

const App: React.FC = () => {
    const { currentUser, userRole, isLoading, isDemoMode, enterDemoMode, logout, refreshUser } = useAuth();
    
    const [allStudents, setAllStudents] = useState<StudentData[]>([]);
    const [allDoubts, setAllDoubts] = useState<DoubtData[]>([]);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline' | 'misconfigured'>('checking');
    const [isSyncing, setIsSyncing] = useState(false);
    const [googleClientId, setGoogleClientId] = useState<string | null>(null);
    const [googleAuthStatus, setGoogleAuthStatus] = useState<'unconfigured' | 'loading' | 'signed_in' | 'signed_out'>('loading');
    const [resetToken, setResetToken] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [deepLinkAction, setDeepLinkAction] = useState<any>(null);


    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('reset-token');
        if (token) {
            setResetToken(token);
            // Clean the URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const action = params.get('action');
        const dataStr = params.get('data');

        if (action && dataStr) {
            const handleDeepLink = async (encodedData: string) => {
                let decodedData = '';
                try {
                    decodedData = decodeURIComponent(encodedData);
                    const data = JSON.parse(decodedData);
                    setDeepLinkAction({ action, data });
                } catch (e) {
                    console.error("Failed to parse deep link data, attempting AI correction:", e);
                    try {
                        const correctionResult = await api.correctJson(decodedData);
                        const correctedData = JSON.parse(correctionResult.correctedJson);
                        setDeepLinkAction({ action, data: correctedData });
                        console.log("AI correction successful!");
                    } catch (correctionError) {
                        console.error("AI correction failed:", correctionError);
                        alert("The data from the link is malformed and could not be automatically corrected. Please check the source.");
                    }
                } finally {
                     // Clean the URL so the action doesn't re-trigger on refresh
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            };
            handleDeepLink(dataStr);
        }
    }, []);
    
    // Prevent accidental page exit
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // For Chrome
            return ''; // For other browsers
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const handleGoogleSignOut = () => {
        auth.handleSignOut(() => {
            setGoogleAuthStatus('signed_out');
        });
    };

    const handleGapiError = (error: any, contextMessage?: string) => {
        console.error("Google API Error:", error);
        // Check for GAPI's error structure as well as general fetch error status
        const status = error.status || error.code || (error.result && error.result.error && error.result.error.code);
        if (status === 401 || status === 403) {
            alert("Your Google session has expired or permissions have changed. Please sign in again to use Google services.");
            handleGoogleSignOut();
        } else {
            alert(contextMessage || "An error occurred while communicating with Google services. Please check your connection and try again.");
        }
    };


    const handleSaveTask = async (task: ScheduleItem) => {
        let taskToSave = { ...task };
        if (currentUser?.CONFIG.isCalendarSyncEnabled && googleAuthStatus === 'signed_in' && 'TIME' in task && task.TIME) {
            setIsSyncing(true);
            try {
                let eventId;
                if ('googleEventId' in task && task.googleEventId) {
                    eventId = await gcal.updateEvent(task.googleEventId, task);
                } else {
                    eventId = await gcal.createEvent(task);
                }
                (taskToSave as any).googleEventId = eventId;
            } catch (syncError) {
                handleGapiError(syncError, "Failed to sync task with Google Calendar. Please check permissions and try again.");
                setIsSyncing(false);
                return; // Stop the save process if sync fails
            } finally {
                setIsSyncing(false);
            }
        }
        await api.saveTask(taskToSave);
        refreshUser();
    };

    const handleSaveBatchTasks = async (tasks: ScheduleItem[]) => {
        await api.saveBatchTasks(tasks);
        refreshUser();
    };

    const handleDeleteTask = async (taskId: string) => {
        const taskToDelete = currentUser?.SCHEDULE_ITEMS.find(t => t.ID === taskId);
        // FIX: Check if `taskToDelete` exists and has the `googleEventId` property before accessing it, as not all `ScheduleItem` types have it.
        if (currentUser?.CONFIG.isCalendarSyncEnabled && googleAuthStatus === 'signed_in' && taskToDelete && 'googleEventId' in taskToDelete && taskToDelete.googleEventId) {
            try {
                setIsSyncing(true);
                await gcal.deleteEvent(taskToDelete.googleEventId);
            } catch (syncError) {
                handleGapiError(syncError, "Failed to remove task from Google Calendar, but it will be deleted from the app. You may need to remove it manually from your calendar.");
            } finally {
                setIsSyncing(false);
            }
        }
        await api.deleteTask(taskId);
        refreshUser();
    };
    
    const handleFullCalendarSync = async () => {
        if (!currentUser || googleAuthStatus !== 'signed_in') return;
        setIsSyncing(true);
        try {
            const tasksToUpdate: ScheduleItem[] = [];
            const allTasks = currentUser.SCHEDULE_ITEMS;
            
            for (const task of allTasks) {
                // Only sync timed tasks that aren't already synced
                if (!('googleEventId' in task && task.googleEventId) && 'TIME' in task && task.TIME) {
                    try {
                        const eventId = await gcal.createEvent(task);
                        tasksToUpdate.push({ ...task, googleEventId: eventId });
                    } catch (error) {
                        console.warn(`Failed to sync task ${task.ID}:`, error);
                    }
                }
            }

            if (tasksToUpdate.length > 0) {
                await handleSaveBatchTasks(tasksToUpdate);
            }

            await api.updateConfig({ isCalendarSyncEnabled: true, calendarLastSync: new Date().toISOString() });
            await refreshUser();
            alert(`Successfully synced ${tasksToUpdate.length} new tasks to Google Calendar.`);

        } catch (error) {
            handleGapiError(error, "An error occurred during the full calendar sync.");
        } finally {
            setIsSyncing(false);
        }
    };


    const handleUpdateConfig = async (configUpdate: Partial<Config>) => {
        if (!currentUser) return;
        
        const wasSyncDisabled = !currentUser.CONFIG.isCalendarSyncEnabled;
        const isSyncBeingEnabled = configUpdate.isCalendarSyncEnabled === true;

        await api.updateConfig(configUpdate);
        await refreshUser();

        if (wasSyncDisabled && isSyncBeingEnabled) {
             setTimeout(() => {
                if (window.confirm("Enable Google Calendar Sync? This will add all your scheduled tasks (as repeating weekly events) to your primary Google Calendar.")) {
                    handleFullCalendarSync();
                }
            }, 100);
        }
    };
    
    const onLogStudySession = async (session: Omit<StudySession, 'date'>) => {
        // This logic should be on the backend, but for now we mimic it on the client
        if (!currentUser) return;
        const newSession = { ...session, date: new Date().toISOString().split('T')[0] };
        const updatedUser = {...currentUser, STUDY_SESSIONS: [...currentUser.STUDY_SESSIONS, newSession]};
        await api.fullSync(updatedUser);
        refreshUser();
    };
    
    const onLogResult = async (result: ResultData) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, RESULTS: [...currentUser.RESULTS, result], CONFIG: {...currentUser.CONFIG, SCORE: result.SCORE, WEAK: [...new Set([...currentUser.CONFIG.WEAK, ...result.MISTAKES])] } };
        await api.fullSync(updatedUser);
        refreshUser();
    };

    const onAddExam = async (exam: ExamData) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, EXAMS: [...currentUser.EXAMS, exam] };
        await api.fullSync(updatedUser);
        refreshUser();
    };

    const onUpdateExam = async (exam: ExamData) => {
         if (!currentUser) return;
        const updatedUser = { ...currentUser, EXAMS: currentUser.EXAMS.map(e => e.ID === exam.ID ? exam : e) };
        await api.fullSync(updatedUser);
        refreshUser();
    };

    const onDeleteExam = async (examId: string) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, EXAMS: currentUser.EXAMS.filter(e => e.ID !== examId) };
        await api.fullSync(updatedUser);
        refreshUser();
    };
    
    const onUpdateWeaknesses = async (weaknesses: string[]) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, CONFIG: { ...currentUser.CONFIG, WEAK: weaknesses } };
        await api.fullSync(updatedUser);
        refreshUser();
    };

    const handleBatchImport = async (data: { schedules: ScheduleItem[], exams: ExamData[], results: ResultData[], weaknesses: string[] }) => {
        if (!currentUser) return;
        
        // Deep clone to avoid mutation issues with React state
        const updatedUser = JSON.parse(JSON.stringify(currentUser));

        // Add new items
        updatedUser.SCHEDULE_ITEMS.push(...data.schedules);
        updatedUser.EXAMS.push(...data.exams);
        updatedUser.RESULTS.push(...data.results);

        // Update config with new weaknesses and latest score
        const newWeaknesses = new Set([...updatedUser.CONFIG.WEAK, ...data.weaknesses]);
        data.results.forEach(r => {
            r.MISTAKES.forEach(m => newWeaknesses.add(m));
        });
        updatedUser.CONFIG.WEAK = Array.from(newWeaknesses);

        if (data.results.length > 0) {
            // Find the result with the latest date to set as the current score
            const sortedResults = [...updatedUser.RESULTS].sort((a, b) => new Date(b.DATE).getTime() - new Date(a.DATE).getTime());
            updatedUser.CONFIG.SCORE = sortedResults[0].SCORE;
        }

        // A single sync with the backend for performance
        await api.fullSync(updatedUser);
        await refreshUser();

        if (currentUser.CONFIG.isCalendarSyncEnabled) {
            if (window.confirm("Batch import complete. Do you want to sync the newly added schedule items to your Google Calendar?")) {
                handleFullCalendarSync();
            }
        }
    };

    const onPostDoubt = async (question: string, image?: string) => {
        await api.postDoubt(question, image);
        const doubtsData = await api.getAllDoubts();
        setAllDoubts(doubtsData);
    };

    const onPostSolution = async (doubtId: string, solution: string, image?: string) => {
        await api.postSolution(doubtId, solution, image);
        const doubtsData = await api.getAllDoubts();
        setAllDoubts(doubtsData);
    };

    const onBackupToDrive = async () => {
        if (!currentUser || googleAuthStatus !== 'signed_in') return;
        try {
            // This syncs the non-sensitive parts of the user data
            const backupData = {
                SCHEDULE_ITEMS: currentUser.SCHEDULE_ITEMS,
                RESULTS: currentUser.RESULTS,
                EXAMS: currentUser.EXAMS,
                STUDY_SESSIONS: currentUser.STUDY_SESSIONS,
                // CONFIG excludes sensitive settings
                CONFIG: {
                    WEAK: currentUser.CONFIG.WEAK,
                    flashcardDecks: currentUser.CONFIG.flashcardDecks,
                }
            };
            const fileId = await gdrive.uploadData(JSON.stringify(backupData), currentUser.CONFIG.googleDriveFileId);
            const syncTime = new Date().toISOString();
            // We only update the sync time and fileId, not the whole config
            await api.updateConfig({ googleDriveFileId: fileId, driveLastSync: syncTime });
            refreshUser();
            alert('Backup successful!');
        } catch (error) {
            handleGapiError(error, 'Backup failed. Please try again.');
        }
    };
    
    const onRestoreFromDrive = async () => {
        if (!currentUser?.CONFIG.googleDriveFileId || googleAuthStatus !== 'signed_in') return;
        if (!window.confirm("This will overwrite your current local schedule and results data. Are you sure?")) return;
        try {
            const dataStr = await gdrive.downloadData(currentUser.CONFIG.googleDriveFileId);
            const restoredData = JSON.parse(dataStr);
            const updatedUser = { ...currentUser, ...restoredData };
            await api.fullSync(updatedUser);
            refreshUser();
            alert('Restore successful!');
        } catch (error) {
            handleGapiError(error, 'Restore failed. Please try again.');
        }
    };
    
    const onDeleteUser = async (sid: string) => {
        if (window.confirm(`Are you SURE you want to permanently delete user ${sid}? All their data will be lost forever.`)) {
            try {
                await api.deleteStudent(sid);
                setAllStudents(prev => prev.filter(s => s.sid !== sid));
                alert(`Student ${sid} deleted.`);
            } catch (error: any) {
                alert(`Failed to delete student: ${error.message}`);
            }
        }
    };


    const checkBackend = useCallback(async () => {
        try {
            const res = await fetch(`/api/status`, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                 const data = await res.json().catch(() => ({}));
                 if(data.status === 'misconfigured') {
                    setBackendStatus('misconfigured');
                 } else {
                    setBackendStatus('online');
                    // Fetch public config once we know backend is online
                    if (!googleClientId) {
                        api.getPublicConfig().then(config => setGoogleClientId(config.googleClientId)).catch(console.error);
                    }
                 }
            } else {
                 setBackendStatus('offline');
            }
        } catch (error) {
            setBackendStatus('offline');
        }
    }, [googleClientId]);

    useEffect(() => {
        checkBackend();
        const interval = setInterval(checkBackend, 30000);
        return () => clearInterval(interval);
    }, [checkBackend]);

    useEffect(() => {
        const loadExtraData = async () => {
            if (isDemoMode) {
                if (userRole === 'admin') setAllStudents(studentDatabase);
                return;
            }
            if (userRole === 'admin') {
                const students = await api.getStudents();
                setAllStudents(students);
            }
            if (currentUser || userRole === 'admin') {
                const doubts = await api.getAllDoubts();
                setAllDoubts(doubts);
            }
        };

        if (backendStatus === 'online' && !isLoading) {
            loadExtraData();
        }
    }, [backendStatus, isLoading, userRole, isDemoMode, currentUser]);
    
    // Google API Init
    useEffect(() => {
        const initializeGoogleApis = () => {
            if (googleClientId) {
                auth.initClient(
                    googleClientId,
                    (isSignedIn) => {
                        setGoogleAuthStatus(isSignedIn ? 'signed_in' : 'signed_out');
                    },
                    (error) => {
                        console.error("Google API Init Error", JSON.stringify(error, null, 2));
                        setGoogleAuthStatus('unconfigured');
                    }
                );
            }
        };

        const checkScripts = setInterval(() => {
            if (window.gapi && window.google) {
                clearInterval(checkScripts);
                initializeGoogleApis();
            }
        }, 100);

        return () => clearInterval(checkScripts);
    }, [googleClientId, backendStatus]);


    const renderContent = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center min-h-screen"><div className="text-xl animate-pulse">Initializing Interface...</div></div>;
        }

        if (backendStatus === 'misconfigured') {
            return <ConfigurationErrorScreen onRetryConnection={checkBackend} backendStatus={backendStatus} />;
        }
        
        // If user is loaded (from cache or fetch), show their dashboard.
        if (currentUser) {
            const dashboardUser = currentUser;
            const useToolbarLayout = isMobile && dashboardUser.CONFIG.settings.mobileLayout === 'toolbar';

            return (
                 <div style={{'--accent-color': dashboardUser.CONFIG.settings.accentColor} as React.CSSProperties} className={`${dashboardUser.CONFIG.settings.blurEnabled === false ? 'no-blur' : ''} safe-padding-left safe-padding-right safe-padding-top safe-padding-bottom`}>
                    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ${useToolbarLayout ? 'pb-24' : ''}`}>
                        <Header user={{ name: dashboardUser.fullName, id: dashboardUser.sid, profilePhoto: dashboardUser.profilePhoto }} onLogout={logout} backendStatus={backendStatus} isSyncing={isSyncing} />
                        {userRole === 'admin' ? (
                            <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={onDeleteUser} onBroadcastTask={api.broadcastTask} />
                        ) : (
                            <StudentDashboard student={currentUser} onSaveTask={handleSaveTask} onSaveBatchTasks={handleSaveBatchTasks} onDeleteTask={handleDeleteTask} onToggleMistakeFixed={()=>{}} onUpdateConfig={handleUpdateConfig} onLogStudySession={onLogStudySession} onUpdateWeaknesses={onUpdateWeaknesses} onLogResult={onLogResult} onAddExam={onAddExam} onUpdateExam={onUpdateExam} onDeleteExam={onDeleteExam} onExportToIcs={() => exportCalendar(currentUser.SCHEDULE_ITEMS, currentUser.EXAMS, currentUser.fullName)} onBatchImport={handleBatchImport} googleAuthStatus={googleAuthStatus} onGoogleSignIn={auth.handleSignIn} onGoogleSignOut={handleGoogleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} allDoubts={allDoubts} onPostDoubt={onPostDoubt} onPostSolution={onPostSolution} deepLinkAction={deepLinkAction} />
                        )}
                    </div>
                </div>
            );
        }
        
        // Show demo admin dashboard if in demo mode
        if (isDemoMode && userRole === 'admin') {
             return (
                 <div style={{'--accent-color': '#0891b2'} as React.CSSProperties} className="safe-padding-left safe-padding-right safe-padding-top safe-padding-bottom">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <Header user={{ name: 'Admin', id: 'ADMIN_DEMO', profilePhoto: currentUser?.profilePhoto }} onLogout={logout} backendStatus={backendStatus} isSyncing={isSyncing} />
                        <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={() => alert("Deletion disabled in demo mode")} onBroadcastTask={() => alert("Broadcast disabled in demo mode")} />
                    </div>
                </div>
            );
        }

        // If no user and offline, show the offline screen for first-time users.
        if (backendStatus === 'offline' && !isDemoMode) {
            return <BackendOfflineScreen onSelectDemoUser={enterDemoMode} onRetryConnection={checkBackend} backendStatus={backendStatus} />;
        }

        // Otherwise, show the authentication screen.
        return <AuthScreen backendStatus={backendStatus} googleClientId={googleClientId} resetToken={resetToken} />;
    };

    return <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">{renderContent()}</div>;
};

export default App;