



import React, { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Corrected import paths to point to local directories instead of 'src/'
import Header from './components/Header';
import { StudentData, ScheduleItem, StudySession, Config } from './types';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { useLocalization } from './context/LocalizationContext';
import RegistrationScreen from './components/RegistrationScreen';
// FIX: Correct import path to use the populated `DemoModeSelector.tsx` file, resolving a critical build error.
import DemoModeSelector from './components/DemoModeSelector';
// FIX: Correct import path to use the populated `mockData.ts` file, resolving a critical build error.
import { studentDatabase } from './data/mockData';
// FIX: Correct import path to use the populated `csvParser.ts` file, resolving a critical build error.
import { parseCSVData } from './utils/csvParser';

const API_URL = '/api';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<StudentData | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [view, setView] = useState<'login' | 'register' | 'dashboard'>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoUser, setDemoUser] = useState<'student' | 'admin' | null>(null);
  
  const scheduledNotificationsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // --- Browser History Management ---
  useEffect(() => {
    // Handles user clicking browser back/forward buttons
    const handlePopState = (event: PopStateEvent) => {
        const newView = event.state?.view || 'login';
        setView(newView);
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set the initial history state.
    // This ensures that on page load, the history matches the initial view.
    const initialPath = window.location.pathname.substring(1) || 'login';
    window.history.replaceState({ view: initialPath }, '', `/${initialPath}`);
    setView(initialPath as 'login' | 'register' | 'dashboard');


    return () => {
        window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Pushes a new state to browser history when the view changes programmatically
  const navigateTo = useCallback((newView: 'login' | 'register' | 'dashboard') => {
      const currentPath = window.location.pathname;
      const newPath = `/${newView}`;
      
      // Update the view state first
      setView(newView);
      
      // Only push to history if the path is actually different
      if (currentPath !== newPath) {
          window.history.pushState({ view: newView }, '', newPath);
      }
  }, []);


  useEffect(() => {
    const checkBackendStatus = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5-second timeout

      try {
        const response = await fetch(`${API_URL}/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error('Offline');
        setBackendStatus('online');
      } catch (error) {
        clearTimeout(timeoutId);
        setBackendStatus('offline');
      }
    };
    checkBackendStatus();
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setUserRole(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('cachedUser');
    localStorage.removeItem('cachedRole');
    localStorage.removeItem('cachedStudents');
    setIsDemoMode(false);
    setDemoUser(null);
    scheduledNotificationsRef.current.forEach(clearTimeout);
    scheduledNotificationsRef.current = [];
    navigateTo('login');
  }, [navigateTo]);

  const scheduleNotifications = useCallback((scheduleItems: ScheduleItem[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notification permission not granted or not supported.');
        return;
    }

    scheduledNotificationsRef.current.forEach(clearTimeout);
    scheduledNotificationsRef.current = [];

    const now = new Date();
    const todayIndex = (now.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    const dayMap = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

    scheduleItems.forEach(item => {
        if ((item.type === 'ACTION' || item.type === 'HOMEWORK') && 'TIME' in item && item.TIME && 'DAY' in item) {
            const [hours, minutes] = item.TIME.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            const itemDayIndex = dayMap.indexOf(item.DAY.EN.toUpperCase());
            if (itemDayIndex === -1) return;
            
            let dayDifference = itemDayIndex - todayIndex;
            if (dayDifference < 0) {
                dayDifference += 7; 
            }

            const notificationDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayDifference, hours, minutes, 0);

            const delay = notificationDate.getTime() - now.getTime();
            if (delay > 0 && delay <= 48 * 60 * 60 * 1000) {
                const timeoutId = setTimeout(() => {
                    new Notification(`Reminder: ${item.CARD_TITLE.EN}`, {
                        body: `It's time for: ${item.FOCUS_DETAIL.EN}`,
                        icon: 'https://ponsrischool.in/wp-content/uploads/2025/11/Gemini_Generated_Image_ujvnj5ujvnj5ujvn.png'
                    });
                }, delay);
                scheduledNotificationsRef.current.push(timeoutId);
            }
        }
    });
  }, []);
  
  const refreshAllStudents = useCallback(async (authToken: string) => {
    if (!authToken) return;
    try {
        const res = await fetch(`${API_URL}/students`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        setAllStudents(data);
        localStorage.setItem('cachedStudents', JSON.stringify(data));
    } catch (error) {
        console.error("Error fetching students:", error);
    }
  }, []);

  useEffect(() => {
    if (userRole === 'student' && currentUser) {
      if (Notification.permission === 'granted') {
        scheduleNotifications(currentUser.SCHEDULE_ITEMS);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            scheduleNotifications(currentUser.SCHEDULE_ITEMS);
          }
        });
      }
    }
  }, [currentUser, userRole, scheduleNotifications]);
  
  useEffect(() => {
    const authAndLoad = async () => {
      if (demoUser) {
        setIsLoading(false);
        return;
      }
      
      if (backendStatus === 'online' && token) {
        try {
          const res = await fetch(`${API_URL}/me`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (res.ok) {
            const { userData, role } = await res.json();
            setCurrentUser(userData);
            setUserRole(role);
            navigateTo('dashboard');
            localStorage.setItem('cachedUser', JSON.stringify(userData));
            localStorage.setItem('cachedRole', role);
            if (role === 'admin') {
              await refreshAllStudents(token);
            }
          } else {
            handleLogout();
          }
        } catch (error) {
          console.error("API is online, but auth check failed:", error);
          handleLogout();
        }
      } else if (backendStatus === 'offline' && token) {
        // Offline mode: load from cache
        const cachedUser = localStorage.getItem('cachedUser');
        const cachedRole = localStorage.getItem('cachedRole');
        if (cachedUser && cachedRole) {
          setCurrentUser(JSON.parse(cachedUser) as StudentData);
          setUserRole(cachedRole as 'student' | 'admin');
          navigateTo('dashboard');
          if (cachedRole === 'admin') {
            const cachedStudents = localStorage.getItem('cachedStudents');
            if (cachedStudents) {
              setAllStudents(JSON.parse(cachedStudents) as StudentData[]);
            }
          }
        } else {
          // No cache, but has token - treat as logged out
          handleLogout();
        }
      }
      setIsLoading(false);
    };

    if (backendStatus !== 'checking') {
      authAndLoad();
    }
  }, [backendStatus, demoUser, token, handleLogout, refreshAllStudents, navigateTo]);

  // FIX: Centralize login success logic to be reused by standard and Google login.
  const handleLoginSuccess = (data: { token: string; user: { userData: StudentData, role: 'student' | 'admin' }}) => {
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setCurrentUser(data.user.userData);
    setUserRole(data.user.role);
    navigateTo('dashboard');
    
    // Cache data on successful login
    localStorage.setItem('cachedUser', JSON.stringify(data.user.userData));
    localStorage.setItem('cachedRole', data.user.role);

    if (data.user.role === 'admin' && data.token) {
       refreshAllStudents(data.token);
    }
  };

  const handleGoogleLogin = async (token: string): Promise<void> => {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    
    const data = await res.json();
    if (!res.ok) {
       throw new Error(data.error || 'Google Login failed.');
    }
    handleLoginSuccess(data);
  };

  const handleLogin = async (sid: string, password: string): Promise<void> => {
     const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sid, password })
     });
     
     const data = await res.json();

     if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
     }
     handleLoginSuccess(data);
  };
  
  const handleRegister = async (userData: any): Promise<void> => {
     const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
     });
     if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Registration failed');
     }
     alert('Registration successful! Please log in.');
     navigateTo('login');
  };
  
  const handleSelectDemoUser = (role: 'student' | 'admin') => {
    setDemoUser(role);
    setIsDemoMode(true);
    if (role === 'admin') {
      setUserRole('admin');
      // FIX: Cast result of JSON.parse to retain type information and fix downstream type errors.
      setAllStudents(JSON.parse(JSON.stringify(studentDatabase)) as StudentData[]);
    } else {
      setUserRole('student');
      // FIX: Cast result of JSON.parse to retain type information.
      setCurrentUser(JSON.parse(JSON.stringify(studentDatabase[0])) as StudentData);
    }
    navigateTo('dashboard');
  };

  const handleSaveTask = async (task: ScheduleItem) => {
    if (!currentUser) return;
    
    const existingTaskIndex = currentUser.SCHEDULE_ITEMS.findIndex(item => item.ID === task.ID);
    let newSchedule: ScheduleItem[];
    if (existingTaskIndex > -1) {
        newSchedule = currentUser.SCHEDULE_ITEMS.map(item => item.ID === task.ID ? task : item);
    } else {
        newSchedule = [...currentUser.SCHEDULE_ITEMS, task];
    }
    const updatedUser = { ...currentUser, SCHEDULE_ITEMS: newSchedule };
    setCurrentUser(updatedUser);
    localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save
    scheduleNotifications(updatedUser.SCHEDULE_ITEMS);

    if (!isDemoMode && backendStatus === 'online') {
        try {
            await fetch(`${API_URL}/schedule-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ task })
            });
        } catch (error) {
            console.error("Error saving task to server:", error);
            // Optional: Add logic to queue failed requests
        }
    }
  };
  
  const handleSaveBatchTasks = (tasks: ScheduleItem[]) => {
      if (!currentUser) return;
      const newSchedule = [...currentUser.SCHEDULE_ITEMS];
      tasks.forEach(task => {
          if (!newSchedule.some(item => item.ID === task.ID)) {
              newSchedule.push(task);
          }
      });
      const updatedUser = { ...currentUser, SCHEDULE_ITEMS: newSchedule };
      setCurrentUser(updatedUser);
      localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save
      scheduleNotifications(updatedUser.SCHEDULE_ITEMS);

      // Add API call for online mode here if needed
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUser) return;
    const newSchedule = currentUser.SCHEDULE_ITEMS.filter(item => item.ID !== taskId);
    const updatedUser = { ...currentUser, SCHEDULE_ITEMS: newSchedule };
    setCurrentUser(updatedUser);
    localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save

    if (!isDemoMode && backendStatus === 'online') {
        try {
            await fetch(`${API_URL}/schedule-items/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error deleting task from server:", error);
        }
    }
  };

  const handleToggleMistakeFixed = async (resultId: string, mistake: string) => {
     if (!currentUser) return;
     const newResults = currentUser.RESULTS.map(result => {
         if (result.ID === resultId) {
             const fixed = result.FIXED_MISTAKES || [];
             const newFixed = fixed.includes(mistake) 
                 ? fixed.filter(m => m !== mistake) 
                 : [...fixed, mistake];
             return { ...result, FIXED_MISTAKES: newFixed };
         }
         return result;
     });
     const updatedUser = { ...currentUser, RESULTS: newResults };
     setCurrentUser(updatedUser);
     localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save

     if (!isDemoMode && backendStatus === 'online') {
         try {
            await fetch(`${API_URL}/mistakes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ resultId, mistake })
            });
         } catch(error) {
            console.error("Error updating mistake on server:", error);
         }
     }
  };

  const handleBatchImport = async (csl: string) => {
    if(isDemoMode) {
      try {
        interface ParsedCSLItem {
          sid: string;
          item: ScheduleItem;
        }
        const parsedData = parseCSVData(csl);
        const parsedItems = parsedData.schedules as ParsedCSLItem[];
        alert(`Parsed ${parsedItems.length} items. Applying updates.`);
        setAllStudents(prevStudents => {
          const studentsMap = new Map(prevStudents.map(s => [s.CONFIG.SID, s]));
          parsedItems.forEach(parsed => {
            const student = studentsMap.get(parsed.sid);
            if (student) {
                if (!student.SCHEDULE_ITEMS.some(item => item.ID === parsed.item.ID)) {
                    const updatedStudent = {
                      ...student,
                      SCHEDULE_ITEMS: [...student.SCHEDULE_ITEMS, parsed.item],
                    };
                    studentsMap.set(parsed.sid, updatedStudent);
                }
            }
          });
          return Array.from(studentsMap.values());
        });
      } catch (error: any) {
        alert(`CSL Parsing Error: ${error.message}`);
      }
      return;
    }
    try {
        const res = await fetch(`${API_URL}/csl-batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ csl })
        });
        if (!res.ok) throw new Error('Batch import failed');
        if (token) await refreshAllStudents(token);
        alert('Batch import successful!');
    } catch (error) {
        console.error("Error in batch import:", error);
        alert('Batch import failed.');
    }
  };

  const handleToggleSub = async (sid: string) => {
     if(isDemoMode) {
       setAllStudents(prev => prev.map(s => s.CONFIG.SID === sid ? { ...s, CONFIG: { ...s.CONFIG, UNACADEMY_SUB: !s.CONFIG.UNACADEMY_SUB }} : s));
       return;
     }
     // API call would go here.
  };
  
  const handleDeleteUser = async (sid: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${sid}? This cannot be undone.`)) {
        return;
    }
    const updatedStudents = allStudents.filter(s => s.CONFIG.SID !== sid);
    setAllStudents(updatedStudents);
    localStorage.setItem('cachedStudents', JSON.stringify(updatedStudents)); // Offline save

    if (!isDemoMode && backendStatus === 'online') {
        try {
            await fetch(`${API_URL}/users/${sid}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error("Error deleting user from server:", error);
            alert('An error occurred while deleting the user.');
        }
    }
  };

  const handleUpdateSettings = async (settings: Partial<Config['settings']>) => {
    if (!currentUser) return;
    const updatedConfig = { 
        ...currentUser.CONFIG, 
        settings: { ...currentUser.CONFIG.settings, ...settings }
    };
    const updatedUser = { ...currentUser, CONFIG: updatedConfig };
    setCurrentUser(updatedUser);
    localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save

    if (!isDemoMode && backendStatus === 'online') {
        try {
            await fetch(`${API_URL}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ settings: updatedUser.CONFIG.settings })
            });
        } catch (error) {
            console.error("Failed to save settings:", error);
        }
    }
  };
  
  const handleLogStudySession = async (session: Omit<StudySession, 'date'>) => {
    if (!currentUser) return;
    
    const newSession: StudySession = {
        ...session,
        date: new Date().toISOString().split('T')[0]
    };
    
    const updatedUser = {
        ...currentUser,
        STUDY_SESSIONS: [...(currentUser.STUDY_SESSIONS || []), newSession]
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('cachedUser', JSON.stringify(updatedUser)); // Offline save

    if (!isDemoMode && backendStatus === 'online') {
        try {
            await fetch(`${API_URL}/study-sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...newSession, session_date: newSession.date, duration_seconds: newSession.duration })
            });
        } catch (error) {
            console.error("Failed to log study session:", error);
        }
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen text-gray-400">
          <div className="text-xl animate-pulse">Initializing Interface...</div>
        </div>
      );
    }

    if (backendStatus === 'offline' && !token && !demoUser) {
      return <DemoModeSelector onSelectDemoUser={handleSelectDemoUser} />;
    }
    
    const settings = currentUser?.CONFIG?.settings;
    const mainAppClasses = settings?.blurEnabled === false ? 'no-blur' : '';
    const mainAppStyles = {
        '--accent-color': settings?.accentColor || '#0891b2',
    } as React.CSSProperties;
    
    if (view === 'dashboard' && (currentUser || (userRole === 'admin' && allStudents.length > 0))) {
      return (
        <div className={mainAppClasses} style={mainAppStyles}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <Header 
                  user={{ 
                    name: currentUser?.CONFIG.fullName || 'Admin', 
                    id: currentUser?.CONFIG.SID || 'ADMIN',
                    profilePhoto: currentUser?.CONFIG.profilePhoto
                  }} 
                  onLogout={handleLogout}
                  backendStatus={backendStatus}
                  isDemoMode={isDemoMode}
                />
                {userRole === 'admin' ? (
                    <TeacherDashboard 
                      students={allStudents}
                      onToggleUnacademySub={handleToggleSub}
                      onDeleteUser={handleDeleteUser}
                      onBatchImport={handleBatchImport}
                      isDemoMode={isDemoMode}
                    />
                ) : currentUser && (
                    <StudentDashboard 
                      student={currentUser}
                      onSaveTask={handleSaveTask}
                      onSaveBatchTasks={handleSaveBatchTasks}
                      onDeleteTask={handleDeleteTask}
                      onToggleMistakeFixed={handleToggleMistakeFixed}
                      onUpdateSettings={handleUpdateSettings}
                      onLogStudySession={handleLogStudySession}
                      isDemoMode={isDemoMode}
                    />
                )}
            </div>
        </div>
      );
    }

    if (view === 'register') {
      // FIX: Pass onGoogleLogin prop to RegistrationScreen to satisfy its required props.
      return <RegistrationScreen onRegister={handleRegister} onSwitchToLogin={() => navigateTo('login')} onGoogleLogin={handleGoogleLogin} backendStatus={backendStatus} />;
    }

    // FIX: Pass onGoogleLogin prop to LoginScreen to satisfy its required props.
    return <LoginScreen onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} onSwitchToRegister={() => navigateTo('register')} backendStatus={backendStatus} />;
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
        {renderContent()}
    </div>
  );
};

export default App;