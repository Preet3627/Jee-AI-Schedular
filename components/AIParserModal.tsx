

import React, { useState, useRef } from 'react';
import Icon from './Icon';
import { api } from '../api/apiService';

interface AIParserModalProps {
  onClose: () => void;
  onDataReady: (data: any) => void;
}

const AIParserModal: React.FC<AIParserModalProps> = ({ onClose, onDataReady }) => {
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setError('');
      setInputText(''); // Clear text when image is uploaded
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
        const base64String = (reader.result as string).split(',')[1];
        setImageBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleParse = async () => {
    if (!inputText.trim() && !imageBase64) {
      setError('Please enter some text or upload an image to parse.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let result;
      if (imageBase64) {
        result = await api.parseImage(imageBase64);
      } else {
        // Attempt 1: Parse as JSON directly
        try {
          const jsonData = JSON.parse(inputText);
          if (jsonData && (jsonData.schedules || jsonData.exams || jsonData.metrics)) {
            onDataReady(jsonData);
            return; // Success
          }
        } catch (e) { /* Not JSON, proceed to call AI */ }
        
        // Attempt 2: Call AI to convert unstructured text to JSON
        result = await api.parseText(inputText);
      }
      onDataReady(result);

    } catch (err: any) {
      console.error("AI Parser error:", err);
      setError(err.error || 'Failed to parse data. The AI service may be unavailable or the format is unrecognized.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-2">AI Data Import</h2>
        <p className="text-sm text-gray-400 mb-4">Paste unstructured text, raw JSON, or upload a timetable image. The AI will convert it into structured data for your schedule.</p>
        
        {imagePreviewUrl ? (
            <div className="w-full h-48 bg-gray-900 rounded-md flex flex-col items-center justify-center text-center p-2 relative">
                 <img src={imagePreviewUrl} alt="Timetable preview" className="max-h-full rounded-md" />
                 <button 
                    onClick={() => { setImageBase64(null); setImagePreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                 >
                    <Icon name="trash" className="w-4 h-4" />
                 </button>
            </div>
        ) : (
            <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Paste text here, e.g., 'Wednesday at 7pm I have a physics deep dive...' OR paste pre-formatted JSON."
            />
        )}


        {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}

        <div className="flex justify-between items-center gap-4 pt-4 mt-4 border-t border-gray-700/50">
            <div>
                 <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600"
                >
                    <Icon name="image" /> Upload Image
                </button>
            </div>
          <div className="flex items-center gap-4">
              <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Cancel</button>
              <button onClick={handleParse} disabled={isLoading} className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 disabled:opacity-50">
                {isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Parsing...</> : <><Icon name="upload" /> Parse & Import</>}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIParserModal;