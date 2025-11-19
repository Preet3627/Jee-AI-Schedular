
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

    const logout = useCallback(() => {
        setCurrentUser(null);
        setUserRole(null);
        setToken(null);
        setIsDemoMode(false);
        setVerificationEmail(null);
        localStorage.clear();
    }, []);

    const handleLoginSuccess = useCallback((data: { token: string; user: StudentData }) => {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setCurrentUser(data.user);
        setUserRole(data.user.role);
        localStorage.setItem('cachedUser', JSON.stringify(data.user));
        setIsDemoMode(false);
        setVerificationEmail(null);
    }, []);
    
    const refreshUser = useCallback(async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            logout();
            return;
        };
        try {
            const user = await api.getMe();
            setCurrentUser(user);
            setUserRole(user.role);
            localStorage.setItem('cachedUser', JSON.stringify(user));
        } catch (error) {
            console.error("