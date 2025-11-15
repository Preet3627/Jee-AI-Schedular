import React, { useState, useEffect } from 'react';
import { Config } from '../types';
import Icon from './Icon';

interface SettingsModalProps {
  settings: Config['settings'];
  driveLastSync?: string;
  onClose: () => void;
  onSave: (settings: Partial<Config['settings']>) => void;
  onExportToIcs: () => void;
  googleAuthStatus: 'signed_in' | 'signed_out' | 'loading' | 'unconfigured';
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  onBackupToDrive: () => void;
  onRestoreFromDrive: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = (props) => {
  const { settings, driveLastSync, onClose, onSave, onExportToIcs, googleAuthStatus, onGoogleSignIn, onGoogleSignOut, onBackupToDrive, onRestoreFromDrive } = props;
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#0891b2');
  const [blurEnabled, setBlurEnabled] = useState(settings.blurEnabled !== false);
  const [mobileLayout, setMobileLayout] = useState(settings.mobileLayout || 'standard');
  const [forceOfflineMode, setForceOfflineMode] = useState(settings.forceOfflineMode || false);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [perQuestionTime, setPerQuestionTime] = useState(settings.perQuestionTime || 180);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ accentColor, blurEnabled, mobileLayout: mobileLayout as 'standard' | 'toolbar', forceOfflineMode, geminiApiKey, perQuestionTime });
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

  const ToggleSwitch: React.FC<{ label: string; desc?: string; checked: boolean; onChange: (c: boolean) => void; id: string; }> = ({ label, desc, checked, onChange, id }) => (
    <div>
        <label className="text-base font-bold text-gray-300 flex items-center justify-between">
            <span>{label}</span>
            <div className="relative inline-block w-10 align-middle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} id={id} className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer" style={{ right: checked ? '0' : 'auto', left: checked ? 'auto' : '0' }}/><label htmlFor={id} className={`toggle-label block h-6 rounded-full cursor-pointer ${checked ? 'bg-cyan-500' : 'bg-gray-600'}`}></label></div>
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
              <div className="mt-4"><label htmlFor="gemini-key" className="text-sm font-bold text-gray-400">Gemini API Key</label><input id="gemini-key" type="password" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} className={inputClass} placeholder="Enter your Gemini API Key" /><p className="text-xs text-gray-500 mt-1">Used for AI parsing features. Stored securely on your account.</p></div>
              {googleAuthStatus !== 'unconfigured' && (
                  <div className="mt-4">
                      {googleAuthStatus === 'loading' && <p className="text-sm text-yellow-400 text-center">Connecting to Google...</p>}
                      {googleAuthStatus === 'signed_in' ? (
                        <div className="space-y-2"><h4 className="text-sm font-bold text-gray-300">Google Drive Backup</h4><p className="text-xs text-green-400">Account connected.</p><button type="button" onClick={onBackupToDrive} className="w-full text-center px-4 py-2 text-sm font-semibold text-cyan-300 bg-cyan-900/50 rounded-lg">Backup Now</button><button type="button" onClick={onRestoreFromDrive} className="w-full text-center px-4 py-2 text-sm font-semibold text-yellow-300 bg-yellow-900/50 rounded-lg">Restore from Drive</button>{driveLastSync && <p className="text-xs text-gray-500 text-center">Last sync: {new Date(driveLastSync).toLocaleString()}</p>}<button type="button" onClick={onGoogleSignOut} className="w-full mt-2 px-4 py-2 text-sm text-red-400 bg-red-900/50 rounded-lg">Disconnect Google</button></div>
                      ) : (
                          <button type="button" onClick={onGoogleSignIn} className="w-full mt-2 flex items-center justify-center gap-3 px-4 py-2 text-sm font-semibold text-gray-200 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg">
                            <Icon name="drive" className="w-5 h-5" />
                            Connect Google Account
                          </button>
                      )}
                  </div>
              )}
               <div className="mt-4"><button type="button" onClick={onExportToIcs} className="w-full px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700/50 rounded-lg">Export Week to Calendar (.ics)</button></div>
          </div>

          <div className="border-t border-gray-700/50"></div>
          
          <ToggleSwitch id="blur-toggle" label="Enable UI Blur Effect" desc="May improve performance on some devices." checked={blurEnabled} onChange={setBlurEnabled} />
          <ToggleSwitch id="mobile-layout-toggle" label="Enable Simplified Mobile View" desc="Uses a bottom toolbar on small screens." checked={mobileLayout === 'toolbar'} onChange={(c) => setMobileLayout(c ? 'toolbar' : 'standard')} />
          <ToggleSwitch id="offline-mode-toggle" label="Force Offline Mode" desc="Use cached data to save mobile data." checked={forceOfflineMode} onChange={setForceOfflineMode} />
          <button type="button" onClick={toggleFullScreen} className="w-full px-4 py-3 text-base font-bold text-gray-300 bg-gray-700/50 rounded-lg">{isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}</button>

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