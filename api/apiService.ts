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

// Collection of all API call functions
export const api = {
    // Auth
    login: (sid: string, password: string) => fetch(`${API_URL}/login`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ sid, password }) }).then(handleResponse),
    googleLogin: (credential: string) => fetch(`${API_URL}/auth/google`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ credential }) }).then(handleResponse),
    register: (formData: any) => fetch(`${API_URL}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) }).then(handleResponse),
    verifyEmail: (email: string, code: string) => fetch(`${API_URL}/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) }).then(handleResponse),
    
    // User Data
    getMe: () => authFetch('/me'),
    updateProfile: (data: { fullName?: string; profilePhoto?: string }) => authFetch('/profile', { method: 'PUT', body: JSON.stringify(data) }),
    saveTask: (task: ScheduleItem) => authFetch('/schedule-items', { method: 'POST', body: JSON.stringify({ task }) }),
    deleteTask: (taskId: string) => authFetch(`/schedule-items/${taskId}`, { method: 'DELETE' }),
    // FIX: Renamed to updateConfig and changed signature to be more flexible
    updateConfig: (updates: Partial<Config>) => authFetch('/config', { method: 'POST', body: JSON.stringify(updates) }),
    fullSync: (userData: StudentData) => authFetch('/user-data/full-sync', { method: 'POST', body: JSON.stringify({ userData }) }),

    // Doubts
    getAllDoubts: () => authFetch('/doubts/all'),
    postDoubt: (question: string, question_image?: string) => authFetch('/doubts', { method: 'POST', body: JSON.stringify({ question, question_image }) }),
    postSolution: (doubtId: string, solution: string, solution_image?: string) => authFetch(`/doubts/${doubtId}/solutions`, { method: 'POST', body: JSON.stringify({ solution, solution_image }) }),

    // Admin
    getStudents: () => authFetch('/admin/students'),
    broadcastTask: (task: ScheduleItem) => authFetch('/admin/broadcast-task', { method: 'POST', body: JSON.stringify({ task }) }),
    
    // FIX: Add missing 'solveDoubt' method for the AI Doubt Solver feature.
    solveDoubt: (data: { prompt: string; imageBase64?: string; apiKey: string; }) => authFetch('/ai/solve-doubt', { method: 'POST', body: JSON.stringify({ prompt: data.prompt, imageBase64: data.imageBase64 }) }),
};