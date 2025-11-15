import React from 'react';
import Icon from './Icon';

interface DemoModeSelectorProps {
  onSelectDemoUser: (role: 'student' | 'admin') => void;
}

const DemoModeSelector: React.FC<DemoModeSelectorProps> = ({ onSelectDemoUser }) => {
  const buttonClass = "w-full flex items-center justify-center gap-3 px-4 py-4 text-lg font-semibold text-white rounded-lg transition-transform hover:scale-105 shadow-lg bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl shadow-purple-500/10 backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Backend Offline</h1>
          <p className="mt-2 text-gray-400">The server is currently unavailable. You can explore the application in Demo Mode.</p>
        </div>
        <div className="space-y-4">
          <h2 className="text-center font-semibold text-cyan-400">CONTINUE AS</h2>
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

export default DemoModeSelector;