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

const aiGuideText = `# Universal Data Documentation for AI Agents (JEE Scheduler Pro)
# Version: 5.9.0 (JSON Only)
# Purpose: To guide AI agents in generating structured JSON data for the JEE Scheduler Pro platform.

## 1. CRITICAL AI BEHAVIOR: Output Raw JSON ONLY
Your entire response **MUST** be a single, raw JSON object.
- **DO NOT** include any explanations, conversational text, or markdown formatting like \`\`\`json.
- Your output will be parsed directly by a machine.

## 2. INTERACTION & DATA GATHERING
- **DO NOT INVENT DATA:** If the user's request is vague, you **MUST** ask for clarification.
- **ASK FOR DETAILS:** For schedules, ask for timetables, exam dates, syllabus, and weak topics.
- **Example with Answer Key:** "Create a homework for JEE Mains 2023 Jan 29 Shift 1 paper and find its official answer key."

## 3. Top-Level JSON Structure (for User Import)
Your entire output must be a single JSON object with these keys. Provide empty arrays \`[]\` for types not present.
\`\`\`json
{
  "schedules": [ /* ... */ ],
  "exams": [ /* ... */ ],
  "metrics": [ /* ... */ ],
  "practice_test": { /* ... */ }
}
\`\`\`

---
### 4.1 \`schedules\` Array Items
| Key         | Type   | Description                                           | Example                               |
|-------------|--------|-------------------------------------------------------|---------------------------------------|
| \`id\`        | string | Unique ID (e.g., \`A101\`, \`H202\`).                     | \`"A101"\`                              |
| \`type\`      | string | \`"ACTION"\` or \`"HOMEWORK"\`.                           | \`"ACTION"\`                            |
| \`day\`       | string | Full day name, uppercase. Use for **repeating weekly tasks** like revision. | \`"FRIDAY"\`                            |
| \`date\`      | string | **Optional.** \`YYYY-MM-DD\` format. Use for **specific, one-off events** (e.g., a special class). Overrides \`day\`. | \`"2024-09-15"\`                         |
| \`time\`      | string | \`HH:MM\` format. Required for \`ACTION\`.                | \`"20:30"\`                             |
| \`title\`     | string | Concise title of the task.                            | \`"Rotational Dynamics Deep Dive"\`     |
| \`detail\`    | string | A descriptive explanation.                            | \`"Fix FBD, Tension errors."\`          |
| \`subject\`   | string | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, etc.                 | \`"PHYSICS"\`                           |
| \`q_ranges\`  | string | **For \`HOMEWORK\` only.** Semicolon-separated. Categories: \`NCERT\`, \`LEVEL-1\`, \`LEVEL-2\`, \`PYQ\`, \`CD\` (Classroom Discussion) | \`"NCERT:1-10;LEVEL-1:5-15;PYQ:20-30"\` |
| \`sub_type\`  | string | **For \`ACTION\` only.** \`DEEP_DIVE\`, \`ANALYSIS\`, etc.  | \`"DEEP_DIVE"\`                         |
| \`answers\`   | object | **For \`HOMEWORK\` only.** Optional. If asked, you MUST generate this. Maps question numbers to answers, e.g., \`{"1": "A", "2": "C", "76": "12.50"}\`. | \`{"1": "A", "2": "D"}\` |

---
### 4.2 \`exams\` Array Items
| Key        | Type   | Description                                | Example                                |
|------------|--------|--------------------------------------------|----------------------------------------|
| \`id\`       | string | Unique ID (e.g., \`E301\`).                  | \`"E301"\`                               |
| \`type\`     | string | Must be \`"EXAM"\`.                          | \`"EXAM"\`                               |
| \`subject\`  | string | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, or \`FULL\`.| \`"FULL"\`                               |
| \`title\`    | string | The name of the exam.                      | \`"AITS Mock Test #3"\`                  |
| \`date\`     | string | \`YYYY-MM-DD\` format.                       | \`"2024-08-15"\`                           |
| \`time\`     | string | \`HH:MM\` format.                            | \`"09:00"\`                                |
| \`syllabus\` | string | Comma-separated list of topics.            | \`"Rotational Motion,Thermodynamics"\`   |

---
### 4.3 \`metrics\` Array Items
| Key          | Type   | Description                                       | Example                                  |
|--------------|--------|---------------------------------------------------|------------------------------------------|
| \`type\`       | string | \`"RESULT"\` or \`"WEAKNESS"\`.                       | \`"RESULT"\`                               |
| \`score\`      | string | **For \`RESULT\` only.** "marks/total" format.      | \`"185/300"\`                              |
| \`mistakes\`   | string | **For \`RESULT\` only.** Semicolon-separated.       | \`"Integration;Young's Double Slit"\`      |
| \`weaknesses\` | string | **For \`WEAKNESS\` only.** Semicolon-separated.     | \`"Definite Integration;Wave Optics"\`     |

---
### 4.4 \`practice_test\` Object (Optional)
- **Purpose:** To generate a complete practice test on a given topic, or to import one.
- **Top-level keys:** \`questions\`, \`answers\`.

#### 4.4.1 \`questions\` Array Items
| Key       | Type          | Description                             | Example                                      |
|-----------|---------------|-----------------------------------------|----------------------------------------------|
| \`number\`  | number        | The question number, starting from 1.   | \`1\`                                          |
| \`text\`    | string        | The full question text.                 | \`"What is the capital of France?"\`            |
| \`options\` | array[string] | An array of 4 string options for MCQs. Empty for Numerical. | \`["(A) Berlin", "(B) Madrid", "(C) Paris"]\`   |
| \`type\`    | string        | \`"MCQ"\` or \`"NUM"\`.                       | \`"MCQ"\`                                      |

#### 4.4.2 \`answers\` Object
- A JSON object mapping the question number (as a string) to the correct answer.
- **Example:** \`{"1": "C", "2": "14.5"}\`

---
## 5. FULFILLMENT: Generating a PWA Deep Link
For Google Assistant actions, you can generate a deep link that opens the PWA and automatically imports data.

**URL Structure:**
\`https://[YOUR_PWA_DOMAIN]/index.html?action=new_schedule&text={ENCODED_JSON}\`

**Instructions:**
1.  Generate the complete JSON object as specified in sections 3 and 4.
2.  **URL-encode** the entire JSON string. This is a critical step (\`encodeURIComponent\` in JavaScript).
3.  Append the encoded string to the URL as the value for the \`text\` parameter.

**Example:**
- **Raw JSON:** \`{"schedules":[{"id":"A101","type":"ACTION", ...}]}\`
- **Encoded JSON:** \`%7B%22schedules%22%3A%5B%7B%22id%22%3A%22A101%22%2C%22type%22%3A%22ACTION%22%2C...%7D%5D%7D\`
- **Final URL:** \`https://[YOUR_PWA_DOMAIN]/index.html?action=new_schedule&text=%7B%22schedules%22...%7D\``;


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

  const pwaUrl = `${window.location.origin}${window.location.pathname}`;

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
               <div className="mt-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700 space-y-3">
                <p className="text-sm font-semibold text-cyan-400">Google Assistant Voice Integration</p>
                <div className='text-xs text-gray-400 space-y-2'>
                    <p>You can add tasks by voice using a custom Google Assistant Action. This is an advanced setup that you configure outside of this app.</p>
                    <p><span className='font-bold text-gray-300'>How it works:</span>
                        <ol className='list-decimal list-inside pl-2 mt-1 space-y-1'>
                            <li>Create a custom 'Action' in the Google Assistant platform.</li>
                            <li>Provide the <button type="button" onClick={() => setShowAiGuide(true)} className="text-cyan-400 hover:underline">AI Prompt Guide</button> as the 'system instructions' for the Action's AI.</li>
                            <li>Set the Action's 'deep link' fulfillment to the URL below.</li>
                            <li>When you speak your command, the AI will generate the correct JSON data and open this app to import it.</li>
                        </ol>
                    </p>
                </div>

                <div>
                    <p className="text-xs font-semibold text-gray-300 mt-2">Fulfillment URL:</p>
                    <pre className="text-xs text-mono bg-gray-800 p-2 rounded-md mt-1 break-all font-semibold">
                      {`${pwaUrl}?action=new_schedule&text={ENCODED_JSON}`}
                    </pre>
                </div>
                 <div>
                    <p className="text-xs font-semibold text-gray-300 mt-2">Example Voice Commands:</p>
                    <ul className='text-xs text-gray-400 space-y-1 mt-1 list-disc list-inside pl-2'>
                        <li>"Hey Google, ask JEE Scheduler Pro to schedule a Physics deep dive for tomorrow at 7 PM on Rotational Dynamics."</li>
                        <li>"Hey Google, tell JEE Scheduler Pro to log my test score of 210/300 with mistakes in Stereoisomerism."</li>
                         <li>"Hey Google, ask JEE Scheduler Pro to create a homework for Chemistry P-Block elements for Friday, questions from NCERT 1 to 15."</li>
                    </ul>
                </div>
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