import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import { StudentData, ScheduleItem, StudySession, Config, ResultData, ExamData, DoubtData, ScheduleCardData, HomeworkData } from './types';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import RegistrationScreen from './components/RegistrationScreen';
import DemoModeSelector from './components/DemoModeSelector';
import ConfigurationErrorScreen from './components/ConfigurationErrorScreen'; // Import the new screen
import { studentDatabase } from './data/mockData';
import * as gcal from './utils/googleCalendar';
import * as gdrive from './utils/googleDrive';
import { exportWeekCalendar } from './utils/calendar';
import { initClient } from './utils/googleAuth';
import { generateAvatar } from './utils/generateAvatar';

const API_URL = '/api';

type SyncQueueItem = {
    url: string;
    options: Omit<RequestInit, 'headers'> & { headers?: string };
    timestamp: number;
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<StudentData | null>(null);
    const [allStudents, setAllStudents] = useState<StudentData[]>([]);
    const [allDoubts, setAllDoubts] = useState<DoubtData[]>([]);
    const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
    const [isLoading, setIsLoading] = useState(true);
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline' | 'misconfigured'>('checking');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const [googleAuthStatus, setGoogleAuthStatus] = useState<'unconfigured' | 'loading' | 'signed_in' | 'signed_out'>('loading');

    const navigateTo = useCallback((newView: 'login' | 'register' | 'dashboard') => {
        setView(newView);
        if (window.location.pathname !== `/${newView}`) {
            window.history.pushState({ view: newView }, '', `/${newView}`);
        }
    }, []);

    const handleLogout = useCallback(() => {
        if(googleAuthStatus === 'signed_in') gcal.handleSignOut();
        setCurrentUser(null);
        setUserRole(null);
        setToken(null);
        setIsDemoMode(false);
        localStorage.clear();
        navigateTo('login');
    }, [navigateTo, googleAuthStatus]);
    
    const processSyncQueue = useCallback(async () => {
        // ... implementation remains the same
    }, [isSyncing, token]);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        // ... implementation remains the same
    }, [handleLogout, backendStatus, isDemoMode]);

    useEffect(() => {
        const checkBackend = async () => {
            const forceOffline = JSON.parse(localStorage.getItem('cachedUser') || '{}')?.CONFIG?.settings?.forceOfflineMode;
            if (forceOffline) {
                setBackendStatus('offline');
                return;
            }
            try {
                const res = await fetch(`${API_URL}/status`, { signal: AbortSignal.timeout(3000) });
                const data = await res.json();
                
                if (!res.ok) {
                    if (res.status === 503 && data.status === 'misconfigured') {
                        setBackendStatus('misconfigured');
                    } else {
                        throw new Error('Offline');
                    }
                } else {
                    const wasOffline = backendStatus === 'offline';
                    setBackendStatus('online');
                    if(wasOffline) {
                        processSyncQueue();
                    }
                }
            } catch (error) {
                setBackendStatus('offline');
            }
        };
        checkBackend();
        const interval = setInterval(checkBackend, 15000);
        return () => clearInterval(interval);
    }, [processSyncQueue, backendStatus]);
    
    // Auth & Data Loading
    useEffect(() => {
        const loadData = async () => {
            if (isDemoMode) {
                setIsLoading(false);
                return;
            }
            // ... implementation remains the same
        };
        if(backendStatus !== 'checking' && backendStatus !== 'misconfigured') loadData();
        else if (backendStatus === 'misconfigured') setIsLoading(false);
    }, [backendStatus, token, isDemoMode, handleLogout, navigateTo]);

    // ... other useEffects and handlers remain the same ...
    const handleLoginSuccess = async (data: { token: string; user: { userData: StudentData, role: 'student' | 'admin' }}) => {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setBackendStatus('checking');
    };
    const handleLogin = async (sid: string, password: string) => { /* ... */ };
    const handleGoogleLogin = async (credential: string) => { /* ... */ };
    const handleRegister = async (userData: any) => { /* ... */ };
    const optimisticUpdate = (updateFn: (user: StudentData) => StudentData) => { /* ... */ };
    const handleSaveTask = async (task: ScheduleItem) => { /* ... */ };
    const handleDeleteTask = async (taskId: string) => { /* ... */ };
    const handleUpdateSettings = async (settings: Partial<Config['settings']>) => { /* ... */ };
    const handleSaveBatchTasks = (tasks: ScheduleItem[]) => { /* ... */ };
    const onToggleMistakeFixed = (resultId: string, mistake: string) => { /* ... */ };
    const onLogStudySession = (session: Omit<StudySession, 'date'>) => { /* ... */ };
    const onUpdateWeaknesses = (weaknesses: string[]) => { /* ... */ };
    const onLogResult = (result: ResultData) => { /* ... */ };
    const onAddExam = (exam: ExamData) => { /* ... */ };
    const onUpdateExam = (exam: ExamData) => { /* ... */ };
    const onDeleteExam = (examId: string) => { /* ... */ };
    const onExportToIcs = () => currentUser && exportWeekCalendar(currentUser.SCHEDULE_ITEMS, currentUser.CONFIG.fullName);
    const onBackupToDrive = async () => { /* ... */ };
    const onRestoreFromDrive = async () => { /* ... */ };
    const handleSelectDemoUser = (role: 'student' | 'admin') => { /* ... */ };
    
    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl animate-pulse">Initializing Interface...</div></div>;
        
        // New: Handle misconfigured state first
        if (backendStatus === 'misconfigured') {
            return <ConfigurationErrorScreen />;
        }
        
        if (backendStatus === 'offline' && !token && !isDemoMode) return <DemoModeSelector onSelectDemoUser={handleSelectDemoUser} />;

        if (view === 'dashboard' && (currentUser || (userRole === 'admin' && (allStudents.length > 0 || isDemoMode)))) {
            return (
                <div style={{'--accent-color': currentUser?.CONFIG.settings.accentColor} as React.CSSProperties} className={currentUser?.CONFIG.settings.blurEnabled === false ? 'no-blur' : ''}>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <Header user={{ name: currentUser?.CONFIG.fullName || 'Admin', id: currentUser?.CONFIG.SID || 'ADMIN', profilePhoto: currentUser?.CONFIG.profilePhoto || generateAvatar('Admin') }} onLogout={handleLogout} backendStatus={backendStatus} isSyncing={isSyncing} />
                        {userRole === 'admin' ? (
                            <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={()=>{}} onBatchImport={()=>{}} onBroadcastTask={()=>{}} />
                        ) : currentUser && (
                            <StudentDashboard student={currentUser} onSaveTask={handleSaveTask} onSaveBatchTasks={handleSaveBatchTasks} onDeleteTask={handleDeleteTask} onToggleMistakeFixed={onToggleMistakeFixed} onUpdateSettings={handleUpdateSettings} onLogStudySession={onLogStudySession} onUpdateWeaknesses={onUpdateWeaknesses} onLogResult={onLogResult} onAddExam={onAddExam} onUpdateExam={onUpdateExam} onDeleteExam={onDeleteExam} onExportToIcs={onExportToIcs} googleAuthStatus={googleAuthStatus} onGoogleSignIn={gcal.handleSignIn} onGoogleSignOut={gcal.handleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} allDoubts={allDoubts} />
                        )}
                    </div>
                </div>
            );
        }
        if (view === 'register') return <RegistrationScreen onRegister={handleRegister} onSwitchToLogin={() => navigateTo('login')} onGoogleLogin={handleGoogleLogin} backendStatus={backendStatus} />;
        return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onSwitchToRegister={() => navigateTo('register')} backendStatus={backendStatus} />;
    };
    
    return <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">{renderContent()}</div>;
};

export default App;
