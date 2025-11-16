
import React, { useState } from 'react';
import Icon from './Icon';
import { api } from '../api/apiService';
import { parseCSVData } from '../utils/cslParser';

interface AIParserModalProps {
  onClose: () => void;
  onDataReady: (data: any) => void;
}

const AIParserModal: React.FC<AIParserModalProps> = ({ onClose, onDataReady }) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleParse = async () => {
    if (!inputText.trim()) {
      setError('Please enter some text to parse.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Attempt 1: Parse as JSON directly
      try {
        const jsonData = JSON.parse(inputText);
        if (jsonData && (jsonData.schedules || jsonData.exams || jsonData.metrics)) {
          onDataReady(jsonData);
          return; // Success
        }
      } catch (e) { /* Not JSON, proceed to next step */ }
      
      // Attempt 2: Parse as CSV directly
      const csvData = parseCSVData(inputText);
      if (csvData.schedules.length > 0 || csvData.exams.length > 0 || csvData.metrics.length > 0) {
        onDataReady(csvData);
        return; // Success
      }

      // Attempt 3: Call AI to convert unstructured text to JSON
      const result = await api.parseText(inputText);
      onDataReady(result);

    } catch (err: any) {
      console.error("AI Parser error:", err);
      setError(err.error || 'Failed to parse text. The AI service may be unavailable or the format is unrecognized.');
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
        <p className="text-sm text-gray-400 mb-4">Paste any text about your schedule (unstructured text, JSON, or CSV). The app will intelligently convert it into structured data.</p>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="e.g., 'Wednesday at 7pm I have a physics deep dive on rotational motion...' OR paste pre-formatted JSON/CSV."
        />

        {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}

        <div className="flex justify-end gap-4 pt-4">
          <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Cancel</button>
          <button onClick={handleParse} disabled={isLoading} className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 disabled:opacity-50">
            {isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Parsing...</> : <><Icon name="upload" /> Parse & Import</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIParserModal;
