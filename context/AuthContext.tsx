
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import { StudentData } from '../types';
// FIX: Corrected import path to point to apiService.
import { api } from '../api/apiService';
// FIX: Corrected import path for mockData.
import { studentDatabase } from '../data/mockData';

interface AuthContextType {
    currentUser: StudentData | null;
    userRole: 'student' | 'admin' | null;
    token: string | null;
    isDemoMode: boolean;
    isLoading: boolean;
    verificationEmail: string | null; // Email that needs verification
    login: (sid: string, password: string) => Promise<void>;
    googleLogin: (credential: string) => Promise<void>;
    logout: () => void;
    enterDemoMode: (role: 'student' | 'admin') => void;
    loginWithToken: (token: string) => void;
    refreshUser: () => Promise<void>;
    updateProfile: (data: { fullName?: string; profilePhoto?: string }) => Promise<void>;
    setVerificationEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<StudentData | null>(null);
    const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

    const handleLoginSuccess = useCallback((data: { token: string; user: StudentData }) => {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setUserRole(data.user.role);
        localStorage.setItem('cachedUser', JSON.stringify(data.user));
        setIsDemoMode(false);
        setIsLoading(false);
        setVerificationEmail(null);
    }, []);
    
    const logout = useCallback(() => {
        setCurrentUser(null);
        setUserRole(null);
        setToken(null);
        setIsDemoMode(false);
        setVerificationEmail(null);
        localStorage.clear();
    }, []);

    const loginWithToken = useCallback(async (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('token', newToken);
        try {
            const user = await api.getMe();
            handleLoginSuccess({ token: newToken, user });
        } catch (error) {
            console.error("Failed to fetch user with new token.", error);
            logout();
        }
    }, [handleLoginSuccess, logout]);

    const refreshUser = useCallback(async () => {
        if (!token) return;
        try {
            const user = await api.getMe();
            setCurrentUser(user);
            setUserRole(user.role);
            localStorage.setItem('cachedUser', JSON.stringify(user));
        } catch (error) {
            console.error("Failed to refresh user, token might be invalid.", error);
            logout();
        }
    }, [token, logout]);
    
    const updateProfile = async (data: { fullName?: string; profilePhoto?: string }) => {
        if(!currentUser) return;
        try {
            await api.updateProfile(data);
            await refreshUser();
        } catch (error) {
            console.error("Failed to update profile", error);
            throw error;
        }
    };

    useEffect(() => {
        const handleAuthError = () => {
            console.warn('Authentication error detected. Logging out.');
            logout();
        };
        window.addEventListener('auth-error', handleAuthError);
        return () => window.removeEventListener('auth-error', handleAuthError);
    }, [logout]);
    
    useEffect(() => {
        const loadUser = async () => {
            if (token) {
                await refreshUser();
            }
            setIsLoading(false);
        };
        loadUser();
    }, [token, refreshUser]);
    
    const login = async (sid: string, password: string) => {
        try {
            const data = await api.login(sid, password);
            handleLoginSuccess(data);
        } catch (error: any) {
            if (error.needsVerification) {
                setVerificationEmail(error.email);
            }
            // Re-throw for the UI component to handle
            throw new Error(error.error || 'Login failed');
        }
    };

    const googleLogin = async (credential: string) => {
        const data = await api.googleLogin(credential);
        handleLoginSuccess(data);
    };
    
    const enterDemoMode = (role: 'student' | 'admin') => {
        setIsDemoMode(true);
        setUserRole(role);
        if (role === 'student') {
            setCurrentUser(studentDatabase[0]);
        } else {
            setCurrentUser(null);
        }
        setIsLoading(false);
    };

    const value = { currentUser, userRole, token, isDemoMode, isLoading, verificationEmail, login, googleLogin, logout, enterDemoMode, loginWithToken, refreshUser, updateProfile, setVerificationEmail };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};