

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
}

const aiGuideText = `# Universal CSV Documentation for AI Agents (JEE Scheduler Pro)
# Version: 3.7.0
# Purpose: To guide AI agents in generating CSV data for the JEE Scheduler Pro platform.

## 1. CRITICAL AI BEHAVIOR: Always Use Raw CSV
When a user asks you to generate a schedule, timetable, homework list, exam list, or a list of their mistakes, your entire response **MUST** be raw CSV text.
- **DO NOT** include any explanations, apologies, conversational text, or markdown formatting like \`\`\`csv\`\`\` before or after the data.
- Your output will be parsed directly by a machine. Any extra text will cause the import to fail.

---
## 2. General Rules & Best Practices
- **Format:** Standard CSV. Each import can handle MULTIPLE data types (schemas) in a single paste.
- **Header Row:** The first row MUST be a header row.
- **Newlines:** Each data row MUST end with a newline character. **DO NOT** output the entire CSV on a single line.
- **Quoting:** Fields containing commas, newlines, or double quotes MUST be enclosed in double quotes (\`"\`). Example: \`"Solve conceptual questions, focusing on FBDs."\`
- **ID Generation:** Generate a unique alphanumeric ID for each new SCHEDULE or EXAM entry. Prefix with 'A' for ACTION, 'H' for HOMEWORK, 'E' for EXAM.
- **Scheduling Logic (CRITICAL):**
    - For weekdays (Monday to Saturday), schedule all study-related \`ACTION\` tasks between **17:00 (5 PM) and 23:30 (11:30 PM)**.
    - On Sundays, you can schedule tasks at any time, with one exception.
    - **Kota Test Exception:** If a "Kota test" or similar major mock exam is scheduled on a Sunday, do NOT schedule any other tasks between **07:00 (7 AM) and 13:00 (1 PM)** to avoid conflicts.

---
## 3. Data Type: SCHEDULE (for Study Sessions & Homework)
**Header:** \`ID,SID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE\`
**CRITICAL RULE for \`TYPE\`:** If a task involves solving specific questions (e.g., "Ex 1.1, Qs 1-10"), its \`TYPE\` **MUST** be \`HOMEWORK\`. If it is a timed study block without specific question numbers, its \`TYPE\` **MUST** be \`ACTION\`.

---
## 4. Data Type: EXAM
**Header:** \`ID,SID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS\`

---
## 5. Data Type: METRICS (for Results & Mistakes)
**Header:** \`SID,TYPE,SCORE,MISTAKES,WEAKNESSES\``;


const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const { settings, driveLastSync, isCalendarSyncEnabled, calendarLastSync, onClose, onSave, onExportToIcs, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive, onApiKeySet } = props;
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
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [guideCopied, setGuideCopied] = useState(false);

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
  
  const handleCopyGuide = () => {
    navigator.clipboard.writeText(aiGuideText);
    setGuideCopied(true);
    setTimeout(() => setGuideCopied(false), 2000);
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
  
  const colorPresets = ['#0891b2', '#7c3aed', '#16a34a', '#db2777', '#ca8a04'];
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
              <div className="mt-4">
                <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    <div>
                        <p className="text-sm font-semibold text-cyan-400">AI Prompt Guide</p>
                        <p className="text-xs text-gray-400">How to generate data with an AI.</p>
                    </div>
                    <button type="button" onClick={() => setShowAiGuide(!showAiGuide)} className="text-xs font-semibold px-3 py-1 bg-gray-700 rounded-md hover:bg-gray-600">
                        {showAiGuide ? 'Hide' : 'Show'}
                    </button>
                </div>
                {showAiGuide && (
                    <div className="mt-2 bg-gray-900/80 p-3 rounded-lg border border-gray-700 relative">
                        <div className="max-h-40 overflow-y-auto pr-2">
                            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{aiGuideText}</pre>
                        </div>
                        <button 
                            type="button" 
                            onClick={handleCopyGuide} 
                            className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600"
                        >
                            <Icon name={guideCopied ? 'check' : 'copy'} className="w-3 h-3" />
                            {guideCopied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                )}
              </div>
              {googleAuthStatus === 'unconfigured' ? null : googleAuthStatus === 'loading' ? (
                <p className="text-sm text-yellow-400 text-center mt-4">Connecting to Google...</p>
              ) : (
                <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                    {googleAuthStatus === 'signed_in' ? (
                        <>
                            <p className="text-sm font-semibold text-green-400">Google Account Connected</p>
                            <div className="mt-4 space-y-4">
                                <ToggleSwitch id="calendar-sync-toggle" label="Sync to Google Calendar" desc="Automatically sync tasks to your calendar." checked={calendarSync} onChange={setCalendarSync} />
                                {calendarSync && calendarLastSync && <p className="text-xs text-gray-500">Last sync: {new Date(calendarLastSync).toLocaleString()}</p>}
                                
                                <div>
                                    <p className="text-sm font-bold text-gray-300">Google Drive Backup</p>
                                    <div className="flex gap-2 mt-2">
                                        <button type="button" onClick={onBackupToDrive} className="flex-1 text-center px-4 py-2 text-sm font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg">Backup</button>
                                        <button type="button" onClick={onRestoreFromDrive} className="flex-1 text-center px-4 py-2 text-sm font-semibold text-yellow-300 bg-yellow-900/50 rounded-lg">Restore</button>
                                    </div>
                                    {driveLastSync && <p className="text-xs text-gray-500 text-center mt-1">Last backup: {new Date(driveLastSync).toLocaleString()}</p>}
                                </div>
                            </div>
                             <button type="button" onClick={onGoogleSignOut} className="w-full mt-4 px-4 py-2 text-sm text-red-400 bg-red-900/50 rounded-lg">Disconnect Google</button>
                        </>
                    ) : (
                         <button type="button" onClick={onGoogleSignIn} className="w-full flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold text-gray-200 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg">
                            <Icon name="drive" className="w-5 h-5" />
                            Connect Google Account
                        </button>
                    )}
                </div>
              )}
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