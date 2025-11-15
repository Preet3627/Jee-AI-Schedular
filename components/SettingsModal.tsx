import React, { useState } from 'react';
import { Config } from '../types';
import Icon from './Icon';

interface SettingsModalProps {
  settings: Config['settings'];
  onClose: () => void;
  onSave: (settings: Partial<Config['settings']>) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onClose, onSave }) => {
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#0891b2');
  const [blurEnabled, setBlurEnabled] = useState(settings.blurEnabled !== false);
  const [mobileLayout, setMobileLayout] = useState(settings.mobileLayout || 'standard');
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ accentColor, blurEnabled, mobileLayout: mobileLayout as 'standard' | 'toolbar' });
    handleClose();
  };
  
  const colorPresets = ['#0891b2', '#7c3aed', '#16a34a', '#db2777', '#ca8a04'];

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  const ToggleSwitch: React.FC<{
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    id: string;
  }> = ({ label, description, checked, onChange, id }) => (
    <div>
        <label className="text-base font-bold text-gray-300 flex items-center justify-between">
            <span>{label}</span>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={(e) => onChange(e.target.checked)} 
                    id={id}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    style={{ right: checked ? '0' : 'auto', left: checked ? 'auto' : '0' }}
                />
                <label 
                    htmlFor={id} 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${checked ? 'bg-cyan-500' : 'bg-gray-600'}`}>
                </label>
            </div>
        </label>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-md bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6">Display Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="text-base font-bold text-gray-300">Accent Color</label>
            <div className="flex items-center gap-3 mt-2">
                {colorPresets.map(color => (
                    <button key={color} type="button" onClick={() => setAccentColor(color)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${accentColor === color ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white' : ''}`} style={{ backgroundColor: color }}></button>
                ))}
                <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-8 h-8 p-0 border-none rounded-full cursor-pointer bg-transparent"
                />
            </div>
          </div>
          
          <ToggleSwitch
            id="blur-toggle"
            label="Enable UI Blur Effect"
            description="Disabling this may improve performance on some devices."
            checked={blurEnabled}
            onChange={setBlurEnabled}
          />

          <ToggleSwitch
            id="mobile-layout-toggle"
            label="Enable Simplified Mobile View"
            description="Uses a bottom toolbar for easier navigation on small screens."
            checked={mobileLayout === 'toolbar'}
            onChange={(checked) => setMobileLayout(checked ? 'toolbar' : 'standard')}
          />

          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)] text-white hover:opacity-90 transition-opacity">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;