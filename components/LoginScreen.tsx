import React, { useState, useEffect } from 'react';
import Icon from './Icon';

// FIX: Add google to window type for Google Identity Services
declare global {
  interface Window {
    google: any;
  }
}
interface LoginScreenProps {
    onLogin: (sid: string, password: string) => Promise<void>;
    onSwitchToRegister: () => void;
    backendStatus: 'checking' | 'online' | 'offline';
    // FIX: Add onGoogleLogin to props to support Google Sign-In
    onGoogleLogin: (token: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onGoogleLogin, onSwitchToRegister, backendStatus }) => {
    const [sid, setSid] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    // FIX: Add state for Google login loading
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    // This should ideally come from backend/settings, but hardcoded for client-side init
    const GOOGLE_CLIENT_ID = "59869142203-8qna4rfo93rrv9uiok3bes28pfu5k1l1.apps.googleusercontent.com";

    // FIX: Add useEffect to initialize and render Google Sign-In button
    useEffect(() => {
        if (window.google && backendStatus === 'online') {
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById("googleSignInButton"),
                    { theme: "outline", size: "large", type: 'standard', text: 'continue_with' }
                );
            } catch (error) {
                console.error("Google Sign-In initialization error:", error);
            }
        }
    }, [backendStatus]);

    // FIX: Add callback handler for Google Sign-In
    const handleGoogleCallback = async (response: any) => {
        setIsGoogleLoading(true);
        setError('');
        try {
            await onGoogleLogin(response.credential);
        } catch (err: any) {
            setError(err.message || 'Google login failed.');
            setIsGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            // Using dummy validation for demo mode as onLogin is empty
             if (!sid || !password) throw new Error("Please enter credentials.");
            await onLogin(sid, password);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 mt-2 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition";
    const labelClass = "text-sm font-bold text-gray-400";
    const buttonClass = "w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]";

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl shadow-purple-500/10 backdrop-blur-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">JEE Scheduler Pro</h1>
                    <p className="mt-2 text-gray-400">Login to your dashboard</p>
                     {backendStatus !== 'online' && <p className="mt-4 text-xs text-yellow-400 bg-yellow-900/50 p-2 rounded-md">Backend is offline. Login is disabled.</p>}
                </div>
                {/* FIX: Add Google Sign-In button UI and divider */}
                 <div className="space-y-4">
                    <div id="googleSignInButton" className={`flex justify-center transition-opacity ${backendStatus !== 'online' || isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}></div>
                    {(isGoogleLoading) && <p className="text-sm text-center text-gray-400 animate-pulse">Verifying...</p>}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div>
                        <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800/80 text-gray-400 backdrop-blur-sm">Or with Student ID</span></div>
                    </div>
                 </div>
                 <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="sid" className={labelClass}>Student ID</label>
                        <input id="sid" name="sid" type="text" required className={inputClass} onChange={(e) => setSid(e.target.value)} value={sid} />
                    </div>
                     <div>
                        <label htmlFor="password" className={labelClass}>Password</label>
                        <input id="password" name="password" type="password" required className={inputClass} onChange={(e) => setPassword(e.target.value)} value={password} />
                    </div>
                     {error && <p className="text-sm text-center text-red-400">{error}</p>}
                     <button type="submit" disabled={isLoading || isGoogleLoading || backendStatus !== 'online'} className={buttonClass}>
                        {isLoading ? 'Logging in...' : <> <Icon name="login" /> Login </>}
                    </button>
                 </form>
                  <p className="text-sm text-center text-gray-400">
                    Don't have an account?{' '}
                    <button onClick={onSwitchToRegister} className="font-medium text-cyan-400 hover:underline">
                        Register here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;