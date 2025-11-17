
import React, { useState, useEffect } from 'react';
import { Config } from '../types';
import Icon from './Icon';

interface SettingsModalProps {
  settings: Config['settings'];
  driveLastSync?: string;
  isCalendarSyncEnabled?: boolean;
  calendarLastSync?: string;
  onClose: () => void;
  onSave: (settings: Partial<Config['settings'] & { geminiApiKey?: string; isCalendarSyncEnabled?: boolean }>) => void;
  onExportToIcs: () => void;
  googleAuthStatus: 'signed_in' | 'signed_out' | 'loading' | 'unconfigured';
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onBackupToDrive: () => void;
  onRestoreFromDrive: () => void;
  onApiKeySet: () => void;
  onOpenAssistantGuide: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const { settings, driveLastSync, isCalendarSyncEnabled, calendarLastSync, onClose, onSave, onExportToIcs, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, onApiKeySet, onOpenAssistantGuide } = props;
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#0891b2');
  const [blurEnabled, setBlurEnabled] = useState(settings.blurEnabled !== false);
  const [mobileLayout, setMobileLayout] = useState(settings.mobileLayout || 'standard');
  const [forceOfflineMode, setForceOfflineMode] = useState(settings.forceOfflineMode || false);
  const [perQuestionTime, setPerQuestionTime] = useState(settings.perQuestionTime || 180);
  const [showAiChat, setShowAiChat] = useState(settings.showAiChatAssistant !== false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [calendarSync, setCalendarSync] = useState(isCalendarSyncEnabled || false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isExiting, setIsExiting] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleRequestNotification = async () => {
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
        // Here you would typically schedule notifications.
        // For now, we just show a confirmation.
        new Notification("Notifications Enabled!", {
            body: "You'll now receive reminders for your schedule.",
        });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settingsToSave: Partial<Config['settings'] & { geminiApiKey?: string; isCalendarSyncEnabled?: boolean }> = { 
        accentColor, 
        blurEnabled, 
        mobileLayout: mobileLayout as 'standard' | 'toolbar', 
        forceOfflineMode, 
        perQuestionTime,
        showAiChatAssistant: showAiChat,
        isCalendarSyncEnabled: calendarSync,
    };
    if (geminiApiKey.trim()) {
        settingsToSave.geminiApiKey = geminiApiKey.trim();
        onSave(settingsToSave);
        onApiKeySet();
    } else {
        onSave(settingsToSave);
    }
    handleClose();
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => alert(`Error enabling full-screen: ${err.message}`));
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  
  const colorPresets = ['#0891b2', '#7c3aed', '#16a34a', '#db2777', '#ca8a04', '#64748b'];
  const inputClass = "w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  const ToggleSwitch: React.FC<{ label: string; desc?: string; checked: boolean; onChange: (c: boolean) => void; id: string; disabled?: boolean; }> = ({ label, desc, checked, onChange, id, disabled }) => (
    <div className={`${disabled ? 'opacity-50' : ''}`}>
        <label className="text-base font-bold text-gray-300 flex items-center justify-between">
            <span>{label}</span>
            <div className="relative inline-block w-10 align-middle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} id={id} disabled={disabled} className={`toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} style={{ right: checked ? '0' : 'auto', left: checked ? 'auto' : '0' }}/><label htmlFor={id} className={`toggle-label block h-6 rounded-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${checked ? 'bg-cyan-500' : 'bg-gray-600'}`}></label></div>
        </label>
        {desc && <p className="text-xs text-gray-500 mt-1">{desc}</p>}
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-md bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses} overflow-y-auto max-h-[90vh]`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="text-base font-bold text-gray-300">Accent Color</label>
            <div className="flex items-center gap-3 mt-2">
                {colorPresets.map(c => <button key={c} type="button" onClick={() => setAccentColor(c)} className={`w-8 h-8 rounded-full ${accentColor === c ? 'ring-2 ring-white' : ''}`} style={{ backgroundColor: c }}></button>)}
                <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 p-0 border-none rounded-full cursor-pointer bg-transparent" />
            </div>
          </div>
          
          <div className="border-t border-gray-700/50"></div>
          
           <div>
              <h3 className="text-base font-bold text-gray-300">Integrations & Data</h3>
               <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <p className="text-sm font-semibold text-cyan-400">Gemini API Key</p>
                <p className="text-xs text-gray-400 mb-2">Provide your own key to use AI features. Your key is stored securely and is never visible to others.</p>
                 <input type="password" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} className={inputClass} placeholder="Enter new API key to update" />
                 {settings.hasGeminiKey && !geminiApiKey && <p className="text-xs text-green-400 mt-1">An API key is already saved for your account.</p>}
              </div>
              <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700 space-y-2">
                <p className="text-sm font-semibold text-cyan-400">API Integration</p>
                <p className="text-xs text-gray-400">
                    For advanced integrations (e.g., custom scripts, third-party services), you can use a personal API token to import data directly to your account.
                </p>
                <p className="text-xs text-gray-400">
                    You can generate and manage your API token from the <span className="font-bold text-gray-200">My Profile</span> page (click your name in the header). For instructions on how to format your data, see the AI Guide in the Admin Dashboard.
                </p>
               </div>
              
               <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                {(() => {
                    switch (googleAuthStatus) {
                        case 'unconfigured':
                            return (
                                <div className="text-center opacity-60">
                                    <p className="text-sm font-semibold text-yellow-400">Google Integration Not Configured</p>
                                    <p className="text-xs text-gray-400 mt-1">The administrator needs to set up Google API credentials on the server to enable Calendar Sync and Drive Backup.</p>
                                </div>
                            );
                        case 'loading':
                            return <p className="text-sm text-yellow-400 text-center animate-pulse">Connecting to Google...</p>;
                        case 'signed_in':
                            return (
                                <>
                                    <p className="text-sm font-semibold text-green-400">Google Account Connected</p>
                                    <div className="mt-4 space-y-4">
                                        <ToggleSwitch id="calendar-sync-toggle" label="Sync to Google Calendar" desc="Automatically sync tasks to your calendar." checked={calendarSync} onChange={setCalendarSync} />
                                        {calendarSync && calendarLastSync && <p className="text-xs text-gray-500">Last sync: {new Date(calendarLastSync).toLocaleString()}</p>}
                                        
                                        <div>
                                            <p className="text-sm font-bold text-gray-300">Google Drive Backup</p>
                                            <div className="flex gap-2 mt-2">
                                                <button type="button" onClick={onBackupToDrive} className="flex-1 text-center px-4 py-2 text-sm font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg hover:bg-cyan-800/50">Backup</button>
                                                <button type="button" onClick={onRestoreFromDrive} className="flex-1 text-center px-4 py-2 text-sm font-semibold text-yellow-300 bg-yellow-900/50 rounded-lg hover:bg-yellow-800/50">Restore</button>
                                            </div>
                                            {driveLastSync && <p className="text-xs text-gray-500 text-center mt-1">Last backup: {new Date(driveLastSync).toLocaleString()}</p>}
                                        </div>
                                    </div>
                                    <button type="button" onClick={onGoogleSignOut} className="w-full mt-4 px-4 py-2 text-sm text-red-400 bg-red-900/50 rounded-lg">Disconnect Google</button>
                                </>
                            );
                        case 'signed_out':
                            return (
                                <button type="button" onClick={onGoogleSignIn} className="w-full flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold text-gray-200 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg">
                                    <Icon name="drive" className="w-5 h-5" />
                                    Connect Google Account
                                </button>
                            );
                        default:
                            return null;
                    }
                })()}
                </div>

                <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <p className="text-sm font-semibold text-cyan-400">Google Assistant</p>
                    <p className="text-xs text-gray-400 mb-2">Control your schedule hands-free using voice commands.</p>
                    <button type="button" onClick={onOpenAssistantGuide} className="w-full text-center px-4 py-2 text-sm font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg hover:bg-cyan-800/50">
                        View Setup Guide & Commands
                    </button>
                </div>
              
               <div className="mt-4"><button type="button" onClick={onExportToIcs} className="w-full px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700/50 rounded-lg">Export Week to Calendar (.ics)</button></div>
          </div>
          
          <div className="border-t border-gray-700/50"></div>

          <div>
             <h3 className="text-base font-bold text-gray-300">App Preferences</h3>
             <div className="mt-4 space-y-4">
                <ToggleSwitch id="ai-chat-toggle" label="Show AI Chat Assistant" desc="Shows the floating Gemini icon on the dashboard." checked={showAiChat} onChange={setShowAiChat} />
                <ToggleSwitch id="blur-toggle" label="Enable UI Blur Effect" desc="May improve performance on some devices." checked={blurEnabled} onChange={setBlurEnabled} />
                <ToggleSwitch id="mobile-layout-toggle" label="Enable Simplified Mobile View" desc="Uses a bottom toolbar on small screens." checked={mobileLayout === 'toolbar'} onChange={(c) => setMobileLayout(c ? 'toolbar' : 'standard')} />
                <ToggleSwitch id="offline-mode-toggle" label="Force Offline Mode" desc="Use cached data to save mobile data." checked={forceOfflineMode} onChange={setForceOfflineMode} />
                <button type="button" onClick={toggleFullScreen} className="w-full px-4 py-3 text-base font-bold text-gray-300 bg-gray-700/50 rounded-lg">{isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}</button>
                
                <div>
                    <label className="text-base font-bold text-gray-300">Notifications</label>
                    {notificationPermission === 'granted' && <p className="text-xs text-green-400 mt-1">Notifications are enabled.</p>}
                    {notificationPermission === 'denied' && <p className="text-xs text-red-400 mt-1">Notifications are blocked. You must enable them in your browser settings.</p>}
                    {notificationPermission === 'default' && (
                        <button type="button" onClick={handleRequestNotification} className="w-full mt-2 px-4 py-3 text-base font-bold text-gray-300 bg-gray-700/50 rounded-lg">Enable Notifications</button>
                    )}
                </div>
            </div>
          </div>

          <div className="border-t border-gray-700/50"></div>
          
          <div>
            <label className="text-base font-bold text-gray-300">Practice Timer</label>
            <div className="mt-2">
                <label htmlFor="per-question-time" className="text-sm font-bold text-gray-400">Default time per question (seconds)</label>
                <input id="per-question-time" type="number" value={perQuestionTime} onChange={e => setPerQuestionTime(parseInt(e.target.value, 10))} className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
