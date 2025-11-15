import React from 'react';

interface ConfigurationErrorScreenProps {
    onRetryConnection: () => void;
    backendStatus: 'checking' | 'online' | 'offline' | 'misconfigured';
}

const ConfigurationErrorScreen: React.FC<ConfigurationErrorScreenProps> = ({ onRetryConnection, backendStatus }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-200">
      <div className="w-full max-w-2xl p-8 space-y-6 bg-[var(--glass-bg)] border border-red-500/50 rounded-xl shadow-2xl shadow-red-500/10 backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-red-400">Server Configuration Error</h1>
          <p className="mt-4 text-gray-300">
            The application backend is not configured correctly. This typically occurs when the required environment variables have not been set on the hosting platform (like Vercel).
          </p>
        </div>
        <div className="space-y-4">
          <h2 className="font-semibold text-cyan-400">Action Required (for Administrator)</h2>
          <p className="text-sm text-gray-400">
            Please go to your project settings on Vercel (or your hosting provider) and add the following environment variables:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-300 bg-gray-900/50 p-4 rounded-md font-mono space-y-1">
            <li><span className="font-bold text-cyan-300">DB_HOST</span>: Your MySQL database host</li>
            <li><span className="font-bold text-cyan-300">DB_USER</span>: Your MySQL database username</li>
            <li><span className="font-bold text-cyan-300">DB_PASSWORD</span>: Your MySQL database password</li>
            <li><span className="font-bold text-cyan-300">DB_NAME</span>: The name of your database</li>
            <li><span className="font-bold text-cyan-300">JWT_SECRET</span>: A long, random, secure string for tokens</li>
          </ul>
           <p className="text-sm text-gray-400">
            After adding these variables, you will need to **redeploy** the application for the changes to take effect. You can use the button below to check the status after redeploying.
           </p>
        </div>
        <div className="mt-6">
            <button onClick={onRetryConnection} disabled={backendStatus === 'checking'} className="w-full max-w-xs mx-auto text-center px-4 py-3 text-base font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition hover:bg-cyan-800/50">
                {backendStatus === 'checking' ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Checking Status...
                    </>
                ) : (
                    'Retry Connection'
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationErrorScreen;
