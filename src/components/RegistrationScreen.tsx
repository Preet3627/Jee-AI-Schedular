import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface RegistrationScreenProps {
    onRegister: (data: any) => Promise<void>;
    onSwitchToLogin: () => void;
    onGoogleLogin: (token: string) => Promise<void>;
    backendStatus: 'checking' | 'online' | 'offline';
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister, onSwitchToLogin, onGoogleLogin, backendStatus }) => {
    const [step, setStep] = useState<'form' | 'verify'>('form');
    const [formData, setFormData] = useState({ fullName: '', sid: '', password: '' });
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const GOOGLE_CLIENT_ID = "59869142203-8qna4rfo93rrv9uiok3bes28pfu5k1l1.apps.googleusercontent.com";

    useEffect(() => {
        if (window.google) {
            try {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCallback,
                });
                window.google.accounts.id.renderButton(
                    document.getElementById("googleSignUpButton"),
                    { theme: "outline", size: "large", type: 'standard', text: 'signup_with' }
                );
            } catch (error) {
                console.error("Google Sign-Up initialization error:", error);
            }
        }
    }, []);

    const handleGoogleCallback = async (response: any) => {
        setIsGoogleLoading(true);
        setError('');
        try {
            await onGoogleLogin(response.credential);
        } catch (err: any) {
            setError(err.message || 'Google sign-up failed.');
            setIsGoogleLoading(false);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const responseText = await res.text();
            
            if (!res.ok) {
                try {
                    const errorJson = JSON.parse(responseText);
                    throw new Error(errorJson.error || 'Registration failed.');
                } catch {
                    throw new Error(responseText || 'Registration failed.');
                }
            }

            try {
                const data = JSON.parse(responseText);
                if (data.token) {
                    await onRegister(data);
                } else {
                    setStep('verify');
                }
            } catch {
                throw new Error('Failed to read server response for registration.');
            }
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await fetch('/api/verify-and-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sid: formData.sid, code })
            });
            const responseText = await res.text();

            if (!res.ok) {
                try {
                    const errorJson = JSON.parse(responseText);
                    throw new Error(errorJson.error || 'Verification failed.');
                } catch {
                    throw new Error(responseText || 'Verification failed.');
                }
            }
            
            try {
                const data = JSON.parse(responseText);
                await onRegister(data);
            } catch {
                 throw new Error('Failed to read server response for verification.');
            }
        } catch (err: any) {
            setError(err.message || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const inputClass = "w-full px-4 py-3 mt-2 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 transition";
    const labelClass = "text-sm font-bold text-gray-400";
    const buttonClass = "w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]";

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl shadow-purple-500/10 backdrop-blur-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white">Create Account</h1>
                    <p className="mt-2 text-gray-400">Join JEE Scheduler Pro</p>
                     {backendStatus !== 'online' && <p className="mt-4 text-xs text-yellow-400 bg-yellow-900/50 p-2 rounded-md">Backend is offline. Registration is disabled.</p>}
                </div>

                {step === 'form' ? (
                    <>
                        <div className="space-y-4">
                            <div id="googleSignUpButton" className={`flex justify-center transition-opacity ${backendStatus !== 'online' || isGoogleLoading ? 'opacity-50 pointer-events-none' : ''}`}></div>
                            {(isGoogleLoading) && <p className="text-sm text-center text-gray-400 animate-pulse">Creating account with Google...</p>}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800 text-gray-400">Or with an Email</span></div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="fullName" className={labelClass}>Full Name</label>
                                <input id="fullName" name="fullName" type="text" required className={inputClass} onChange={handleInputChange} value={formData.fullName} />
                            </div>
                            <div>
                                <label htmlFor="sid" className={labelClass}>Email</label>
                                <input id="sid" name="sid" type="email" required className={inputClass} onChange={handleInputChange} value={formData.sid} />
                            </div>
                            <div>
                                <label htmlFor="password" className={labelClass}>Password</label>
                                <input id="password" name="password" type="password" required className={inputClass} onChange={handleInputChange} value={formData.password} />
                            </div>
                            {error && <p className="text-sm text-center text-red-400">{error}</p>}
                            <button type="submit" disabled={isLoading || isGoogleLoading || backendStatus !== 'online'} className={buttonClass}>
                                {isLoading ? 'Sending Code...' : <> <Icon name="user-plus" /> Create Account </>}
                            </button>
                        </form>
                    </>
                ) : (
                    <form onSubmit={handleVerifySubmit} className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-white">Check your email</h2>
                            <p className="text-sm text-gray-400 mt-2">We've sent a 6-digit verification code to <span className="font-semibold text-cyan-400">{formData.sid}</span>.</p>
                        </div>
                        <div>
                            <label htmlFor="code" className={labelClass}>Verification Code</label>
                            <input id="code" name="code" type="text" required className={inputClass} onChange={(e) => setCode(e.target.value)} value={code} />
                        </div>
                        {error && <p className="text-sm text-center text-red-400">{error}</p>}
                        <button type="submit" disabled={isLoading || backendStatus !== 'online'} className={buttonClass}>
                            {isLoading ? 'Verifying...' : <> <Icon name="check" /> Verify & Register </>}
                        </button>
                         <p className="text-xs text-center text-gray-500">
                            Didn't get a code? Check your spam folder or{' '}
                            <button type="button" onClick={() => setStep('form')} className="font-medium text-cyan-500 hover:underline">
                                go back and try again.
                            </button>
                        </p>
                    </form>
                )}

                 <p className="text-sm text-center text-gray-400">
                    Already have an account?{' '}
                    <button onClick={onSwitchToLogin} className="font-medium text-cyan-400 hover:underline">
                        Login here
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegistrationScreen;
