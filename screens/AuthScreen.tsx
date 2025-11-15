
import React, { useState, useEffect } from 'react';
import LoginScreen from '../components/LoginScreen';
import RegistrationScreen from '../components/RegistrationScreen';
import { useAuth } from '../context/AuthContext';

interface AuthScreenProps {
    backendStatus: 'checking' | 'online' | 'offline' | 'misconfigured';
}

const AuthScreen: React.FC<AuthScreenProps> = ({ backendStatus }) => {
    const { verificationEmail, setVerificationEmail } = useAuth();
    const [isRegistering, setIsRegistering] = useState(false);
    
    // If auth context says we need to verify, show that screen.
    // Otherwise, show login or register based on local state.
    const currentView = verificationEmail ? 'verify' : (isRegistering ? 'register' : 'login');

    const handleSwitchToLogin = () => {
        setIsRegistering(false);
        setVerificationEmail(null);
    };
    
    if (currentView === 'register' || currentView === 'verify') {
        return <RegistrationScreen 
                    onSwitchToLogin={handleSwitchToLogin} 
                    backendStatus={backendStatus} 
                    initialEmail={verificationEmail}
                    onVerificationSuccess={handleSwitchToLogin}
                />;
    }
    
    return <LoginScreen 
                onSwitchToRegister={() => setIsRegistering(true)} 
                backendStatus={backendStatus}
            />;
};

export default AuthScreen;
