import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import { StudentData, ScheduleItem, StudySession, Config, ResultData, ExamData, DoubtData, ScheduleCardData, HomeworkData } from './types';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import RegistrationScreen from './components/RegistrationScreen';
import DemoModeSelector from './components/DemoModeSelector';
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
    const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
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
        let queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        if (queue.length === 0 || isSyncing) return;
        
        setIsSyncing(true);
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            setIsSyncing(false);
            localStorage.removeItem('syncQueue'); // Clear queue if logged out
            return;
        }

        const failures: SyncQueueItem[] = [];
        for (const item of queue) {
            try {
                const headers = { ...JSON.parse(item.options.headers || '{}'), 'Authorization': `Bearer ${currentToken}` };
                const res = await fetch(item.url, { ...item.options, headers });
                if (!res.ok && res.status !== 409) { // 409 Conflict is acceptable (e.g., duplicate)
                    throw new Error(`Sync failed with status ${res.status}`);
                }
            } catch (error) {
                console.error('Sync failed for item:', item, error);
                failures.push(item);
            }
        }

        localStorage.setItem('syncQueue', JSON.stringify(failures));
        setIsSyncing(false);
        if (failures.length === 0) {
            console.log("Sync queue successfully processed.");
            // Refresh data after successful sync
            if(token) {
                const { user } = await (await authFetch(`${API_URL}/me`)).json();
                setCurrentUser(user.userData);
                localStorage.setItem('cachedUser', JSON.stringify(user.userData));
            }
        }
        else console.warn(`${failures.length} items failed to sync and remain in queue.`);
    }, [isSyncing, token]);

    const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
        if (isDemoMode) {
            if (options.method && options.method !== 'GET') {
                return new Response(JSON.stringify({ message: "Action disabled in Demo Mode" }), { status: 403 });
            }
             // In demo mode, GET requests should return mocked data if needed, but here we assume no GETs need special handling.
             // This is a placeholder for potential demo-mode GET logic.
             return new Response(JSON.stringify([]), {status: 200});
        }
        const forceOffline = JSON.parse(localStorage.getItem('cachedUser') || '{}')?.CONFIG?.settings?.forceOfflineMode;

        if (forceOffline || backendStatus === 'offline') {
            if (options.method && options.method !== 'GET') {
                const queue: SyncQueueItem[] = JSON.parse(localStorage.getItem('syncQueue') || '[]');
                queue.push({ url, options: { ...options, headers: JSON.stringify(options.headers || {}) }, timestamp: Date.now() });
                localStorage.setItem('syncQueue', JSON.stringify(queue));
                setIsSyncing(true); // Show syncing indicator for queued items
            }
            return new Response(JSON.stringify({ message: "Queued for sync" }), { status: 202 });
        }
        
        const currentToken = localStorage.getItem('token');
        if (!currentToken) throw new Error('No token available.');

        const headers = { ...options.headers, 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            handleLogout();
            throw new Error('Unauthorized');
        }
        return response;
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
                if (!res.ok) throw new Error('Offline');
                const wasOffline = backendStatus === 'offline';
                setBackendStatus('online');
                if(wasOffline) {
                    processSyncQueue();
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

            const currentToken = localStorage.getItem('token');
            if (!currentToken) {
                setIsLoading(false);
                navigateTo('login');
                return;
            }

            // Prioritize online fetch, fallback to cache
            if (backendStatus === 'online') {
                try {
                    const res = await fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${currentToken}` }});
                    if (!res.ok) throw new Error("Auth failed");
                    const { userData, role } = await res.json();
                    setCurrentUser(userData);
                    setUserRole(role);
                    localStorage.setItem('cachedUser', JSON.stringify(userData));
                    localStorage.setItem('cachedRole', role);
                    if (role === 'admin') {
                       const studentsRes = await fetch(`${API_URL}/admin/students`, { headers: { Authorization: `Bearer ${currentToken}` }});
                       const studentsData = await studentsRes.json();
                       setAllStudents(studentsData);
                       localStorage.setItem('cachedStudents', JSON.stringify(studentsData));
                    }
                    const doubtsRes = await fetch(`${API_URL}/doubts/all`, { headers: { Authorization: `Bearer ${currentToken}` }});
                    const doubtsData = await doubtsRes.json();
                    setAllDoubts(doubtsData);
                    localStorage.setItem('cachedDoubts', JSON.stringify(doubtsData));
                    navigateTo('dashboard');
                } catch (e) {
                    handleLogout();
                }
            } else { // Offline or checking
                const cachedUser = localStorage.getItem('cachedUser');
                const cachedRole = localStorage.getItem('cachedRole');
                if (cachedUser && cachedRole) {
                    setCurrentUser(JSON.parse(cachedUser));
                    setUserRole(cachedRole as 'student' | 'admin');
                    if (cachedRole === 'admin') {
                        setAllStudents(JSON.parse(localStorage.getItem('cachedStudents') || '[]'));
                    }
                    setAllDoubts(JSON.parse(localStorage.getItem('cachedDoubts') || '[]'));
                    navigateTo('dashboard');
                } else {
                    handleLogout();
                }
            }
            setIsLoading(false);
        };
        if(backendStatus !== 'checking') loadData();
    }, [backendStatus, token, isDemoMode, handleLogout, navigateTo]);

    // Google Client Init
    useEffect(() => {
        const gClientId = currentUser?.CONFIG.settings.googleClientId;
        if (gClientId) {
            initClient(
                gClientId,
                (isSignedIn) => setGoogleAuthStatus(isSignedIn ? 'signed_in' : 'signed_out'),
                (error) => {
                    console.error("GAPI Auth Error:", error);
                    setGoogleAuthStatus('unconfigured');
                }
            ).catch(err => setGoogleAuthStatus('unconfigured'));
        } else if (currentUser) {
            setGoogleAuthStatus('unconfigured');
        }
    }, [currentUser]);


    const handleLoginSuccess = async (data: { token: string; user: { userData: StudentData, role: 'student' | 'admin' }}) => {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        // From this point on, the main useEffect will handle data loading
        setBackendStatus('checking'); // Trigger a re-check and data load
    };

    // FIX: Add login/register handlers to call API and then call handleLoginSuccess
    const handleLogin = async (sid: string, password: string) => {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sid, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        handleLoginSuccess(data);
    };
    
    const handleGoogleLogin = async (credential: string) => {
        const response = await fetch(`${API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: credential })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Google Sign-In Failed');
        handleLoginSuccess(data);
    };

    const handleRegister = async (userData: any) => {
        const res = await fetch(`${API_URL}/register`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(userData)
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || 'Registration failed');
       alert('Registration successful! Please log in.');
       navigateTo('login');
   };

    // All handlers now use optimistic UI updates + authFetch for backend sync
    const optimisticUpdate = (updateFn: (user: StudentData) => StudentData) => {
        if (!currentUser) return;
        const updatedUser = updateFn(currentUser);
        setCurrentUser(updatedUser);
        localStorage.setItem('cachedUser', JSON.stringify(updatedUser));
    };

    const handleSaveTask = async (task: ScheduleItem) => {
        let finalTask = { ...task };
        const isEditing = currentUser?.SCHEDULE_ITEMS.some(t => t.ID === task.ID);
        
        // Google Calendar Sync
        // FIX: Use explicit type check to ensure task is a schedulable type before accessing googleEventId.
        if (googleAuthStatus === 'signed_in' && (task.type === 'ACTION' || task.type === 'HOMEWORK') && task.TIME) {
            try {
                if(isEditing && task.googleEventId) {
                    const updatedEvent = await gcal.updateEvent(task.googleEventId, task);
                    // FIX: Use type assertion as TypeScript cannot infer that finalTask is not an Activity here.
                    (finalTask as ScheduleCardData | HomeworkData).googleEventId = updatedEvent.id;
                } else {
                    const newEvent = await gcal.createEvent(task);
                    // FIX: Use type assertion as TypeScript cannot infer that finalTask is not an Activity here.
                    (finalTask as ScheduleCardData | HomeworkData).googleEventId = newEvent.id;
                }
            } catch(e) { console.error("Google Calendar sync failed:", e); }
        }
        
        optimisticUpdate(user => ({
            ...user,
            SCHEDULE_ITEMS: isEditing 
                ? user.SCHEDULE_ITEMS.map(t => t.ID === finalTask.ID ? finalTask : t)
                : [...user.SCHEDULE_ITEMS, finalTask]
        }));
        await authFetch(`${API_URL}/schedule-items`, { method: 'POST', body: JSON.stringify({ task: finalTask }) });
    };

    const handleDeleteTask = async (taskId: string) => {
        const taskToDelete = currentUser?.SCHEDULE_ITEMS.find(t => t.ID === taskId);
        if(googleAuthStatus === 'signed_in' && taskToDelete && 'googleEventId' in taskToDelete && taskToDelete.googleEventId) {
            try { await gcal.deleteEvent(taskToDelete.googleEventId); } catch(e) { console.error("GCal delete failed:", e); }
        }
        optimisticUpdate(user => ({ ...user, SCHEDULE_ITEMS: user.SCHEDULE_ITEMS.filter(t => t.ID !== taskId) }));
        await authFetch(`${API_URL}/schedule-items/${taskId}`, { method: 'DELETE' });
    };

    const handleUpdateSettings = async (settings: Partial<Config['settings']>) => {
        optimisticUpdate(user => ({ ...user, CONFIG: { ...user.CONFIG, settings: { ...user.CONFIG.settings, ...settings }}}));
        await authFetch(`${API_URL}/config`, { method: 'POST', body: JSON.stringify({ settings }) });
    };

    // ... Other handlers (onLogResult, onAddExam, etc.) follow the same optimisticUpdate + authFetch pattern
    // FIX: Add all remaining handlers to satisfy component props.
    const handleSaveBatchTasks = (tasks: ScheduleItem[]) => {
        optimisticUpdate(user => {
            const newSchedule = [...user.SCHEDULE_ITEMS];
            tasks.forEach(task => { if (!newSchedule.some(t => t.ID === task.ID)) newSchedule.push(task); });
            return { ...user, SCHEDULE_ITEMS: newSchedule };
        });
        tasks.forEach(task => authFetch(`${API_URL}/schedule-items`, { method: 'POST', body: JSON.stringify({ task }) }));
    };

    const onToggleMistakeFixed = (resultId: string, mistake: string) => {
        optimisticUpdate(user => ({ ...user, RESULTS: user.RESULTS.map(r => r.ID === resultId ? { ...r, FIXED_MISTAKES: r.FIXED_MISTAKES?.includes(mistake) ? r.FIXED_MISTAKES.filter(m => m !== mistake) : [...(r.FIXED_MISTAKES || []), mistake] } : r) }));
        authFetch(`${API_URL}/user-data/results`, { method: 'POST', body: JSON.stringify({ resultId, mistake }) });
    };
    
    const onLogStudySession = (session: Omit<StudySession, 'date'>) => {
        const newSession = { ...session, date: new Date().toISOString().split('T')[0] };
        optimisticUpdate(user => ({ ...user, STUDY_SESSIONS: [...user.STUDY_SESSIONS, newSession] }));
        authFetch(`${API_URL}/user-data/study-sessions`, { method: 'POST', body: JSON.stringify(newSession) });
    };

    const onUpdateWeaknesses = (weaknesses: string[]) => {
        optimisticUpdate(user => ({ ...user, CONFIG: { ...user.CONFIG, WEAK: weaknesses }}));
        authFetch(`${API_URL}/user-data/weaknesses`, { method: 'POST', body: JSON.stringify({ weaknesses }) });
    };
    
    const onLogResult = (result: ResultData) => {
        optimisticUpdate(user => ({ ...user, RESULTS: [...user.RESULTS, result], CONFIG: {...user.CONFIG, SCORE: result.SCORE, WEAK: [...new Set([...user.CONFIG.WEAK, ...result.MISTAKES])]}}));
        authFetch(`${API_URL}/user-data/results`, { method: 'POST', body: JSON.stringify({ result }) });
    };

    const onAddExam = (exam: ExamData) => {
        optimisticUpdate(user => ({...user, EXAMS: [...user.EXAMS, exam]}));
        authFetch(`${API_URL}/user-data/exams`, { method: 'POST', body: JSON.stringify({ exam }) });
    };

    const onUpdateExam = (exam: ExamData) => {
        optimisticUpdate(user => ({ ...user, EXAMS: user.EXAMS.map(e => e.ID === exam.ID ? exam : e)}));
        authFetch(`${API_URL}/user-data/exams`, { method: 'POST', body: JSON.stringify({ exam }) });
    };

    const onDeleteExam = (examId: string) => {
        optimisticUpdate(user => ({ ...user, EXAMS: user.EXAMS.filter(e => e.ID !== examId)}));
        authFetch(`${API_URL}/user-data/exams/${examId}`, { method: 'DELETE' });
    };
    
    const onExportToIcs = () => currentUser && exportWeekCalendar(currentUser.SCHEDULE_ITEMS, currentUser.CONFIG.fullName);

    const onBackupToDrive = async () => {
        if (!currentUser || googleAuthStatus !== 'signed_in') return alert("Please connect your Google account first.");
        try {
            const fileId = await gdrive.uploadData(JSON.stringify(currentUser), currentUser.CONFIG.googleDriveFileId);
            const syncTime = new Date().toISOString();
            optimisticUpdate(user => ({ ...user, CONFIG: {...user.CONFIG, googleDriveFileId: fileId, driveLastSync: syncTime }}));
            await authFetch(`${API_URL}/config`, { method: 'POST', body: JSON.stringify({ settings: { googleDriveFileId: fileId, driveLastSync: syncTime }}) });
            alert("Backup successful!");
        } catch(e) { alert(`Backup failed: ${e}`); }
    };
    
    const onRestoreFromDrive = async () => {
        if (!currentUser?.CONFIG.googleDriveFileId || googleAuthStatus !== 'signed_in') return alert("No backup found or Google account not connected.");
        if (!window.confirm("This will overwrite your current data. Are you sure?")) return;
        try {
            const dataStr = await gdrive.downloadData(currentUser.CONFIG.googleDriveFileId);
            const restoredUser: StudentData = JSON.parse(dataStr);
            setCurrentUser(restoredUser); // Full overwrite
            await authFetch(`${API_URL}/user-data/full-sync`, { method: 'POST', body: JSON.stringify(restoredUser) });
            alert("Restore successful!");
        } catch(e) { alert(`Restore failed: ${e}`); }
    };

    // Demo Mode Handler
    const handleSelectDemoUser = (role: 'student' | 'admin') => {
        setIsDemoMode(true);
        if (role === 'admin') {
            setUserRole('admin');
            setAllStudents(studentDatabase);
        } else {
            setUserRole('student');
            setCurrentUser(studentDatabase[0]);
        }
        navigateTo('dashboard');
    };
    
    const renderContent = () => {
        if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="text-xl animate-pulse">Initializing Interface...</div></div>;
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
        // FIX: Pass implemented handlers and fix typo.
        return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onSwitchToRegister={() => navigateTo('register')} backendStatus={backendStatus} />;
    };
    
    return <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">{renderContent()}</div>;
};

export default App;