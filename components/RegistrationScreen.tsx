import React, { useState } from 'react';
import Icon from './Icon';

interface RegistrationScreenProps {
    onRegister: (userData: any) => Promise<void>;
    onSwitchToLogin: () => void;
    backendStatus: 'checking' | 'online' | 'offline';
    onGoogleLogin: (token: string) => Promise<void>;
}

const RegistrationScreen: React.FC<RegistrationScreenProps> = ({ onRegister, onSwitchToLogin, backendStatus }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        sid: '',
        password: '',
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName || !formData.sid || !formData.password) {
            setError('All fields are required.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await onRegister(formData);
        } catch (err: any) {
            setError(err.message || 'Registration failed.');
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
                    <p className="mt-2 text-gray-400">Join the JEE Scheduler Pro</p>
                    {backendStatus !== 'online' && <p className="mt-4 text-xs text-yellow-400 bg-yellow-900/50 p-2 rounded-md">Backend is offline. Registration is disabled.</p>}
                </div>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="fullName" className={labelClass}>Full Name</label>
                        <input id="fullName" name="fullName" type="text" required className={inputClass} onChange={handleInputChange} value={formData.fullName} />
                    </div>
                     <div>
                        <label htmlFor="sid" className={labelClass}>Student ID</label>
                        <input id="sid" name="sid" type="text" required className={inputClass} onChange={handleInputChange} value={formData.sid} />
                    </div>
                     <div>
                        <label htmlFor="password" className={labelClass}>Password</label>
                        <input id="password" name="password" type="password" required className={inputClass} onChange={handleInputChange} value={formData.password} />
                    </div>
                    {error && <p className="text-sm text-center text-red-400">{error}</p>}
                    <button type="submit" disabled={isLoading || backendStatus !== 'online'} className={buttonClass}>
                        {isLoading ? 'Creating Account...' : <> <Icon name="user-plus" /> Create Account </>}
                    </button>
                 </form>
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