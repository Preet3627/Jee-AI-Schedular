


import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { StudentData, ScheduleItem, StudySession, Config, ResultData, ExamData, DoubtData } from './types';
import { studentDatabase } from './data/mockData';
import { api } from './api/apiService';

import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AuthScreen from './screens/AuthScreen';
import BackendOfflineScreen from './components/BackendOfflineScreen';
import ConfigurationErrorScreen from './components/ConfigurationErrorScreen';
import { exportWeekCalendar } from './utils/calendar';
import * as gcal from './utils/googleCalendar';
import * as gdrive from './utils/googleDrive';
import { initClient } from './utils/googleAuth';

const API_URL = '/api';

const App: React.FC = () => {
    const { currentUser, userRole, isLoading, isDemoMode, enterDemoMode, logout, refreshUser } = useAuth();
    
    const [allStudents, setAllStudents] = useState<StudentData[]>([]);
    const [allDoubts, setAllDoubts] = useState<DoubtData[]>([]);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline' | 'misconfigured'>('checking');
    const [isSyncing, setIsSyncing] = useState(false);
    const [googleAuthStatus, setGoogleAuthStatus] = useState<'unconfigured' | 'loading' | 'signed_in' | 'signed_out'>('loading');

    const handleSaveTask = async (task: ScheduleItem) => {
        await api.saveTask(task);
        refreshUser();
    };

    const handleDeleteTask = async (taskId: string) => {
        await api.deleteTask(taskId);
        refreshUser();
    };

    const handleUpdateSettings = async (settings: Partial<Config['settings']>) => {
        await api.updateConfig({ settings: { ...currentUser!.CONFIG.settings, ...settings } });
        refreshUser();
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
                }
            };
            const fileId = await gdrive.uploadData(JSON.stringify(backupData), currentUser.CONFIG.googleDriveFileId);
            const syncTime = new Date().toISOString();
            // We only update the sync time and fileId, not the whole config
            await api.updateConfig({ googleDriveFileId: fileId, driveLastSync: syncTime });
            refreshUser();
            alert('Backup successful!');
        } catch (error) {
            alert('Backup failed. Please try again.');
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
            alert('Restore failed. Please try again.');
        }
    };

    const checkBackend = useCallback(async () => {
        try {
            const res = await fetch(`/api/status`, { signal: AbortSignal.timeout(5000) });
            if (res.ok) {
                 const data = await res.json().catch(() => ({}));
                 setBackendStatus(data.status === 'misconfigured' ? 'misconfigured' : 'online');
            } else {
                 setBackendStatus('offline');
            }
        } catch (error) {
            setBackendStatus('offline');
        }
    }, []);

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
        if(currentUser?.CONFIG.settings.googleClientId) {
            initClient(
                currentUser.CONFIG.settings.googleClientId,
                (isSignedIn) => setGoogleAuthStatus(isSignedIn ? 'signed_in' : 'signed_out'),
                (error) => {
                    console.error("Google API Init Error", error);
                    setGoogleAuthStatus('unconfigured');
                }
            );
        } else if (currentUser) {
            setGoogleAuthStatus('unconfigured');
        }
    }, [currentUser]);

    const renderContent = () => {
        if (isLoading || backendStatus === 'checking') {
            return <div className="flex items-center justify-center min-h-screen"><div className="text-xl animate-pulse">Initializing Interface...</div></div>;
        }

        if (backendStatus === 'misconfigured') {
            return <ConfigurationErrorScreen onRetryConnection={checkBackend} backendStatus={backendStatus} />;
        }
        
        if (backendStatus === 'offline' && !currentUser && !isDemoMode) {
            return <BackendOfflineScreen onSelectDemoUser={enterDemoMode} onRetryConnection={checkBackend} backendStatus={backendStatus} />;
        }
        
        if (currentUser) {
            const dashboardUser = currentUser;
            return (
                 <div style={{'--accent-color': dashboardUser.CONFIG.settings.accentColor} as React.CSSProperties} className={dashboardUser.CONFIG.settings.blurEnabled === false ? 'no-blur' : ''}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <Header user={{ name: dashboardUser.fullName, id: dashboardUser.sid, profilePhoto: dashboardUser.profilePhoto }} onLogout={logout} backendStatus={backendStatus} isSyncing={isSyncing} />
                        {userRole === 'admin' ? (
                            <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={()=>{}} onBatchImport={()=>{}} onBroadcastTask={api.broadcastTask} />
                        ) : (
                            <StudentDashboard student={currentUser} onSaveTask={handleSaveTask} onSaveBatchTasks={()=>{}} onDeleteTask={handleDeleteTask} onToggleMistakeFixed={()=>{}} onUpdateSettings={handleUpdateSettings} onLogStudySession={onLogStudySession} onUpdateWeaknesses={onUpdateWeaknesses} onLogResult={onLogResult} onAddExam={onAddExam} onUpdateExam={onUpdateExam} onDeleteExam={onDeleteExam} onExportToIcs={() => exportWeekCalendar(currentUser.SCHEDULE_ITEMS, currentUser.fullName)} googleAuthStatus={googleAuthStatus} onGoogleSignIn={gcal.handleSignIn} onGoogleSignOut={gcal.handleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} allDoubts={allDoubts} onPostDoubt={onPostDoubt} onPostSolution={onPostSolution} />
                        )}
                    </div>
                </div>
            );
        }
        
        if (isDemoMode && userRole === 'admin') {
             return (
                 <div style={{'--accent-color': '#0891b2'} as React.CSSProperties}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <Header user={{ name: 'Admin', id: 'ADMIN_DEMO', profilePhoto: currentUser?.profilePhoto }} onLogout={logout} backendStatus={backendStatus} isSyncing={isSyncing} />
                        <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={()=>{}} onBatchImport={()=>{}} onBroadcastTask={() => alert("Broadcast disabled in demo mode")} />
                    </div>
                </div>
            );
        }

        return <AuthScreen backendStatus={backendStatus} />;
    };

    return <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">{renderContent()}</div>;
};

export default App;