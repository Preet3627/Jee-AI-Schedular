import React from 'react';
import Icon from './Icon';

interface BackendOfflineScreenProps {
  onSelectDemoUser: (role: 'student' | 'admin') => void;
  onRetryConnection: () => void;
  backendStatus: 'checking' | 'online' | 'offline' | 'misconfigured';
}

const BackendOfflineScreen: React.FC<BackendOfflineScreenProps> = ({ onSelectDemoUser, onRetryConnection, backendStatus }) => {
  const buttonClass = "w-full flex items-center justify-center gap-3 px-4 py-4 text-lg font-semibold text-white rounded-lg transition-transform hover:scale-105 shadow-lg bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl shadow-purple-500/10 backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-yellow-400">Server Unavailable</h1>
          <p className="mt-2 text-gray-400">The application could not connect to the backend. You can try again or explore its features using sample data in Demo Mode.</p>
          <button onClick={onRetryConnection} disabled={backendStatus === 'checking'} className="mt-6 w-full max-w-xs mx-auto text-center px-4 py-2 text-sm font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition hover:bg-cyan-800/50">
            {backendStatus === 'checking' ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Checking...
                </>
            ) : (
                'Retry Connection'
            )}
        </button>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-gray-800/80 text-gray-400 backdrop-blur-sm">Or Continue In Demo</span></div>
          </div>
          <button onClick={() => onSelectDemoUser('student')} className={buttonClass}>
            <Icon name="dashboard" className="w-6 h-6" />
            Student (Demo)
          </button>
          <button onClick={() => onSelectDemoUser('admin')} className={buttonClass}>
            <Icon name="users" className="w-6 h-6" />
            Admin (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackendOfflineScreen;
