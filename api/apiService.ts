

import { StudentData, ScheduleItem, Config, ResultData, ExamData } from '../types';

const API_URL = '/api';

// This function will handle responses, safely parsing JSON or text.
const handleResponse = async (res: Response) => {
    const responseText = await res.text();
    if (!res.ok) {
        try {
            const errorJson = JSON.parse(responseText);
            throw errorJson; // Throw the whole object
        } catch {
            throw new Error(responseText || `HTTP error! status: ${res.status}`);
        }
    }
    try {
        // Handle successful but empty responses (like 204 No Content)
        return responseText ? JSON.parse(responseText) : {};
    } catch {
        throw new Error('Failed to parse server response.');
    }
};

// Centralized fetch logic that adds the auth token
export const authFetch = async (url: string, options: RequestInit = {}) => {
    const fullUrl = `${API_URL}${url}`;
    const token = localStorage.getItem('token');
    
    const headersInit: HeadersInit = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
        if (headersInit instanceof Headers) {
            headersInit.set('Authorization', `Bearer ${token}`);
        } else if (Array.isArray(headersInit)) {
            headersInit.push(['Authorization', `Bearer ${token}`]);
        } else {
            headersInit['Authorization'] = `Bearer ${token}`;
        }
    }

    const fetchOptions = { ...options, headers: headersInit };

    try {
        const response = await fetch(fullUrl, fetchOptions);
        if (response.status === 401) {
             // Dispatch a global event for the AuthContext to handle logout
             window.dispatchEvent(new Event('auth-error'));
             throw new Error('Unauthorized');
        }
        return handleResponse(response);
    } catch (error) {
        console.warn('API call failed, request might be queued.', error);
        // Offline queueing logic could be implemented here if needed
        throw error;
    }
};

// Helper for public fetch calls (no token)
const publicFetch = (url: string, options: RequestInit = {}) => {
    const fullUrl = `${API_URL}${url}`;
    const fetchOptions = {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
    };
    return fetch(fullUrl, fetchOptions).then(handleResponse);
};

// Collection of all API call functions
export const api = {
    // Config
    getPublicConfig: () => fetch(`${API_URL}/config/public`).then(handleResponse),

    // Auth
    login: (sid: string, password: string) => publicFetch('/login', { method: 'POST', body: JSON.stringify({ sid, password }) }),
    googleLogin: (credential: string) => publicFetch('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) }),
    register: (formData: any) => publicFetch('/register', { method: 'POST', body: JSON.stringify(formData) }),
    verifyEmail: (email: string, code: string) => publicFetch('/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),
    forgotPassword: (email: string) => publicFetch('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: (token: string, password: string) => publicFetch('/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
    
    // User Data
    getMe: () => authFetch('/me'),
    updateProfile: (data: { fullName?: string; profilePhoto?: string }) => authFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    saveTask: (task: ScheduleItem) => authFetch('/schedule-items', { method: 'POST', body: JSON.stringify({ task }) }),
    saveBatchTasks: (tasks: ScheduleItem[]) => authFetch('/schedule-items/batch', { method: 'POST', body: JSON.stringify({ tasks }) }),
    deleteTask: (taskId: string) => authFetch(`/schedule-items/${taskId}`, { method: 'DELETE' }),
    updateConfig: (updates: Partial<Config>) => authFetch('/config', { method: 'POST', body: JSON.stringify(updates) }),
    fullSync: (userData: StudentData) => authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData }) }),

    // Doubts
    getAllDoubts: () => authFetch('/doubts/all'),
    postDoubt: (question: string, question_image?: string) => authFetch('/doubts', { method: 'POST', body: JSON.stringify({ question, question_image }) }),
    postSolution: (doubtId: string, solution: string, solution_image?: string) => authFetch(`/doubts/${doubtId}/solutions`, { method: 'POST', body: JSON.stringify({ solution, solution_image }) }),

    // Admin
    getStudents: () => authFetch('/admin/students'),
    broadcastTask: (task: ScheduleItem) => authFetch('/admin/broadcast-task', { method: 'POST', body: JSON.stringify({ task }) }),
    
    // AI (secure backend endpoints)
    getDailyInsight: (weaknesses: string[]) => authFetch('/ai/daily-insight', { method: 'POST', body: JSON.stringify({ weaknesses }) }),
    aiChat: (data: { history: any[]; prompt: string; imageBase64?: string; }) => authFetch('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
    analyzeMistake: (data: { prompt: string; imageBase64?: string; }) => authFetch('/ai/analyze-mistake', { method: 'POST', body: JSON.stringify(data) }),
    solveDoubt: (data: { prompt: string; imageBase64?: string; }) => authFetch('/ai/solve-doubt', { method: 'POST', body: JSON.stringify(data) }),
    parseText: (text: string) => authFetch('/ai/parse-text', { method: 'POST', body: JSON.stringify({ text }) }),
    parseImageToCsv: (imageBase64: string) => authFetch('/ai/parse-image-to-csv', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
    analyzeTestResults: (data: { imageBase64: string; userAnswers: Record<string, string>; timings: Record<string, number>, syllabus: string }) => authFetch('/ai/analyze-test-results', { method: 'POST', body: JSON.stringify(data) }),
    analyzeSpecificMistake: (data: { imageBase64: string; prompt: string; }) => authFetch('/ai/analyze-specific-mistake', { method: 'POST', body: JSON.stringify(data) }),
};
