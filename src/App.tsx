import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import { StudentData, ScheduleItem, StudySession, Config, ResultData, ExamData, DoubtData } from './types';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import RegistrationScreen from './components/RegistrationScreen';
import DemoModeSelector from './components/DemoModeSelector';
import ConfigurationErrorScreen from './components/ConfigurationErrorScreen';
import { studentDatabase } from './data/mockData';
import * as gcal from './utils/googleCalendar';
import * as gdrive from './utils/googleDrive';
import { exportWeekCalendar } from './utils/calendar';
import { initClient } from './utils/googleAuth';
import { generateAvatar } from './utils/generateAvatar';
import { parseCSVData } from './utils/csvParser';

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

    const currentUserRef = useRef(currentUser);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

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
        if (isSyncing || !token) return;
        let queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        if (queue.length === 0) return;

        setIsSyncing(true);
        let failed = false;

        for (const item of queue) {
            try {
                // FIX: Access headers from item.options, not item directly.
                const options = { ...item.options, headers: JSON.parse(item.options.headers || '{}') };
                const res = await fetch(item.url, options);
                if (!res.ok && res.status !== 409) throw new Error('Sync failed');
            } catch (error) {
                console.error('Sync error, stopping queue:', error);
                failed = true;
                break;
            }
        }
        
        setIsSyncing(false);
        if (!failed) {
            localStorage.removeItem('syncQueue');
            // Successful sync, force a full data refresh from server
            const res = await fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const { userData, role } = await res.json();
                setCurrentUser(userData);
                setUserRole(role);
            }
        }
    }, [isSyncing, token]);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        const fullUrl = `${API_URL}${url}`;
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const fetchOptions = { ...options, headers };

        if (backendStatus === 'online' && !isDemoMode) {
            try {
                const response = await fetch(fullUrl, fetchOptions);
                if (response.status === 401) {
                    handleLogout();
                    throw new Error('Unauthorized');
                }
                return response;
            } catch (error) {
                console.warn('API call failed, request might be queued.', error);
                if (options.method && options.method !== 'GET') {
                    const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
                    queue.push({ url: fullUrl, options: { ...options, headers: JSON.stringify(headers)}, timestamp: Date.now() });
                    localStorage.setItem('syncQueue', JSON.stringify(queue));
                }
                throw error;
            }
        } else if (isDemoMode || backendStatus === 'offline') {
            if (options.method === 'GET') {
                 // For offline GETs, we just rely on cached data, so this function would not be called.
                 // This part is a fallback.
                return new Response(JSON.stringify({}), { status: 200 });
            }
            // Queue mutations if offline/demo
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            queue.push({ url: fullUrl, options: { ...options, headers: JSON.stringify(headers)}, timestamp: Date.now() });
            localStorage.setItem('syncQueue', JSON.stringify(queue));
            return new Response(JSON.stringify({ queued: true }), { status: 202 });
        } else {
            throw new Error('Backend is not available.');
        }
    }, [token, handleLogout, backendStatus, isDemoMode]);
    
    // Check Backend Status & Sync
    useEffect(() => {
        const checkBackend = async () => {
            if (JSON.parse(currentUserRef.current?.CONFIG.settings.forceOfflineMode?.toString() || 'false')) {
                setBackendStatus('offline');
                return;
            }
            try {
                const res = await fetch(`${API_URL}/status`, { signal: AbortSignal.timeout(3000) });
                const data = await res.json();
                
                if (!res.ok) {
                    if (res.status === 503 && data.status === 'misconfigured') {
                        setBackendStatus('misconfigured');
                    } else { throw new Error('Offline'); }
                } else {
                    const wasOffline = backendStatus === 'offline';
                    setBackendStatus('online');
                    if(wasOffline) processSyncQueue();
                }
            } catch (error) { setBackendStatus('offline'); }
        };
        checkBackend();
        const interval = setInterval(checkBackend, 15000);
        return () => clearInterval(interval);
    }, [processSyncQueue, backendStatus]);

    // Auth & Data Loading
    useEffect(() => {
        const loadInitialData = async () => {
            if (isDemoMode || !token || backendStatus === 'offline') {
                const cachedUser = localStorage.getItem('cachedUser');
                if (cachedUser) {
                    const { userData, role } = JSON.parse(cachedUser);
                    setCurrentUser(userData);
                    setUserRole(role);
                    if (role === 'admin') {
                        setAllStudents(studentDatabase);
                    }
                }
                setIsLoading(false);
                return;
            }
            
            try {
                const res = await fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!res.ok) throw new Error('Auth failed');
                const { userData, role } = await res.json();

                if ('Notification' in window && Notification.permission === 'granted') {
                    const oldItems = currentUserRef.current?.SCHEDULE_ITEMS || [];
                    const newItems = userData.SCHEDULE_ITEMS || [];
                    const newBroadcasted = newItems.filter(newItem => !oldItems.some(oldItem => oldItem.ID === newItem.ID) && !newItem.isUserCreated);
                    if (newBroadcasted.length > 0) {
                        new Notification('New Task from Admin!', {
                            body: `Your schedule has been updated with ${newBroadcasted.length} new task(s).`,
                            tag: 'broadcast-notification'
                        });
                    }
                }
                
                setCurrentUser(userData);
                setUserRole(role);
                localStorage.setItem('cachedUser', JSON.stringify({ userData, role }));

                if (role === 'admin') {
                    const studentsRes = await fetch(`${API_URL}/admin/students`, { headers: { 'Authorization': `Bearer ${token}` } });
                    const studentsData = await studentsRes.json();
                    setAllStudents(studentsData);
                }
                const doubtsRes = await fetch(`${API_URL}/doubts/all`, { headers: { 'Authorization': `Bearer ${token}` } });
                const doubtsData = await doubtsRes.json();
                setAllDoubts(doubtsData);

                navigateTo('dashboard');
            } catch (error) {
                console.error("Failed to load initial data", error);
                handleLogout();
            } finally {
                setIsLoading(false);
            }
        };
        
        if(backendStatus !== 'checking' && backendStatus !== 'misconfigured') loadInitialData();
        else if (backendStatus === 'misconfigured') setIsLoading(false);
    }, [backendStatus, token, isDemoMode, handleLogout, navigateTo]);

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


    const handleLoginSuccess = async (data: { token: string; user: { userData: StudentData, role: 'student' | 'admin' }}) => {
        setIsLoading(true);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('cachedUser', JSON.stringify(data.user)); // Cache immediately
        setCurrentUser(data.user.userData);
        setUserRole(data.user.role);
        setBackendStatus('checking'); // Force re-check after login
        navigateTo('dashboard');
    };
    
    const handleLogin = async (sid: string, password: string) => {
        const res = await fetch(`${API_URL}/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ sid, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        await handleLoginSuccess(data);
    };

    const handleGoogleLogin = async (credential: string) => {
        const res = await fetch(`${API_URL}/auth/google`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ credential }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Google login failed');
        await handleLoginSuccess(data);
    };

    const handleRegister = async (userData: any) => {
        const res = await fetch(`${API_URL}/register`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(userData) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        await handleLoginSuccess(data);
    };

    const optimisticUpdate = (updateFn: (user: StudentData) => StudentData) => {
        if (!currentUser) return;
        const updatedUser = updateFn(currentUser);
        setCurrentUser(updatedUser);
        localStorage.setItem('cachedUser', JSON.stringify({ userData: updatedUser, role: userRole }));
    };

    const handleSaveTask = async (task: ScheduleItem) => {
        optimisticUpdate(user => ({
            ...user,
            SCHEDULE_ITEMS: user.SCHEDULE_ITEMS.some(t => t.ID === task.ID)
                ? user.SCHEDULE_ITEMS.map(t => t.ID === task.ID ? task : t)
                : [...user.SCHEDULE_ITEMS, task]
        }));
        await authFetch('/schedule-items', { method: 'POST', body: JSON.stringify({ task }) });
    };

    const handleDeleteTask = async (taskId: string) => {
        optimisticUpdate(user => ({ ...user, SCHEDULE_ITEMS: user.SCHEDULE_ITEMS.filter(t => t.ID !== taskId) }));
        await authFetch(`/schedule-items/${taskId}`, { method: 'DELETE' });
    };

    const handleUpdateSettings = async (settings: Partial<Config['settings']>) => {
        optimisticUpdate(user => ({ ...user, CONFIG: { ...user.CONFIG, settings: {...user.CONFIG.settings, ...settings} } }));
        await authFetch('/config', { method: 'POST', body: JSON.stringify({ settings }) });
    };

    const onLogStudySession = (session: Omit<StudySession, 'date'>) => {
        const newSession = { ...session, date: new Date().toISOString().split('T')[0] };
        optimisticUpdate(user => ({ ...user, STUDY_SESSIONS: [...user.STUDY_SESSIONS, newSession] }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, STUDY_SESSIONS: [...currentUser.STUDY_SESSIONS, newSession]} }) });
    };

    const onUpdateWeaknesses = (weaknesses: string[]) => {
        optimisticUpdate(user => ({ ...user, CONFIG: { ...user.CONFIG, WEAK: weaknesses } }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, CONFIG: {...currentUser.CONFIG, WEAK: weaknesses} } }) });
    };
    
    const onLogResult = (result: ResultData) => {
        optimisticUpdate(user => ({ ...user, RESULTS: [...user.RESULTS, result], CONFIG: {...user.CONFIG, SCORE: result.SCORE, WEAK: [...new Set([...user.CONFIG.WEAK, ...result.MISTAKES])] } }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, RESULTS: [...currentUser.RESULTS, result], CONFIG: {...currentUser.CONFIG, SCORE: result.SCORE, WEAK: [...new Set([...currentUser.CONFIG.WEAK, ...result.MISTAKES])]} } }) });
    };

    const onAddExam = (exam: ExamData) => {
        optimisticUpdate(user => ({ ...user, EXAMS: [...user.EXAMS, exam] }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, EXAMS: [...currentUser.EXAMS, exam]} }) });
    };

    const onUpdateExam = (exam: ExamData) => {
        optimisticUpdate(user => ({ ...user, EXAMS: user.EXAMS.map(e => e.ID === exam.ID ? exam : e) }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, EXAMS: currentUser.EXAMS.map(e => e.ID === exam.ID ? exam : e)} }) });
    };

    const onDeleteExam = (examId: string) => {
        optimisticUpdate(user => ({ ...user, EXAMS: user.EXAMS.filter(e => e.ID !== examId) }));
        authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, EXAMS: currentUser.EXAMS.filter(e => e.ID !== examId)} }) });
    };

    const onBackupToDrive = async () => {
        if (!currentUser || googleAuthStatus !== 'signed_in') return;
        try {
            const fileId = await gdrive.uploadData(JSON.stringify(currentUser), currentUser.CONFIG.googleDriveFileId);
            const syncTime = new Date().toISOString();
            optimisticUpdate(user => ({ ...user, CONFIG: { ...user.CONFIG, googleDriveFileId: fileId, driveLastSync: syncTime } }));
            await authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: {...currentUser, CONFIG: {...currentUser.CONFIG, googleDriveFileId: fileId, driveLastSync: syncTime} } }) });
            alert('Backup successful!');
        } catch (error) {
            alert('Backup failed. Please try again.');
        }
    };
    
    const onRestoreFromDrive = async () => {
        if (!currentUser?.CONFIG.googleDriveFileId || googleAuthStatus !== 'signed_in') return;
        if (!window.confirm("This will overwrite your current local data. Are you sure?")) return;
        try {
            const dataStr = await gdrive.downloadData(currentUser.CONFIG.googleDriveFileId);
            const restoredUser = JSON.parse(dataStr);
            await authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData: restoredUser }) });
            setCurrentUser(restoredUser);
            localStorage.setItem('cachedUser', JSON.stringify({ userData: restoredUser, role: userRole }));
            alert('Restore successful!');
        } catch (error) {
            alert('Restore failed. Please try again.');
        }
    };
    
    const handleSelectDemoUser = (role: 'student' | 'admin') => {
        setIsDemoMode(true);
        setUserRole(role);
        if (role === 'student') {
            setCurrentUser(studentDatabase[0]);
        } else {
            setAllStudents(studentDatabase);
        }
        navigateTo('dashboard');
        setIsLoading(false);
    };

    const handleBroadcastTask = async (task: ScheduleItem) => {
        if (isDemoMode) {
            alert("Broadcasting is disabled in demo mode.");
            return;
        }
        await authFetch('/admin/broadcast-task', { method: 'POST', body: JSON.stringify({ task }) });
    };

    const handleBatchImport = async (csv: string) => {
        const parsedData = parseCSVData(csv);
        // This is an admin feature, so we won't do optimistic updates on the admin's own schedule
        await authFetch('/admin/batch-import', { method: 'POST', body: JSON.stringify(parsedData) });
        alert(`Imported ${parsedData.schedules.length} schedule items.`);
    };

    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl animate-pulse">Initializing Interface...</div></div>;
        
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
                            <TeacherDashboard students={allStudents} onToggleUnacademySub={()=>{}} onDeleteUser={()=>{}} onBatchImport={handleBatchImport} onBroadcastTask={handleBroadcastTask} />
                        ) : currentUser && (
                            <StudentDashboard student={currentUser} onSaveTask={handleSaveTask} onSaveBatchTasks={()=>{}} onDeleteTask={handleDeleteTask} onToggleMistakeFixed={()=>{}} onUpdateSettings={handleUpdateSettings} onLogStudySession={onLogStudySession} onUpdateWeaknesses={onUpdateWeaknesses} onLogResult={onLogResult} onAddExam={onAddExam} onUpdateExam={onUpdateExam} onDeleteExam={onDeleteExam} onExportToIcs={() => exportWeekCalendar(currentUser.SCHEDULE_ITEMS, currentUser.CONFIG.fullName)} googleAuthStatus={googleAuthStatus} onGoogleSignIn={gcal.handleSignIn} onGoogleSignOut={gcal.handleSignOut} onBackupToDrive={onBackupToDrive} onRestoreFromDrive={onRestoreFromDrive} allDoubts={allDoubts} onPostDoubt={()=>{}} onPostSolution={()=>{}} />
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
