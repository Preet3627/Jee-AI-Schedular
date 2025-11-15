import React, { useState } from 'react';
import Icon from './Icon';
import { GoogleGenAI } from '@google/genai';

interface AIParserModalProps {
  onClose: () => void;
  onSave: (csv: string) => void;
  geminiApiKey: string;
}

const AIParserModal: React.FC<AIParserModalProps> = ({ onClose, onSave, geminiApiKey }) => {
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
    if (!geminiApiKey) {
      setError('Gemini API Key is not configured in settings.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const systemInstruction = `You are a data conversion expert. Your task is to convert unstructured text describing a student's schedule, exams, or results into a valid CSV format according to the provided schema. You must ONLY output the raw CSV data, with no explanations, backticks, or "csv" language specifier. The user will provide the schema and the text to convert. Use the current date to infer any missing date information if required. Generate unique IDs for each item. Today's date is ${new Date().toLocaleDateString()}`;
      
      const prompt = `
        Please convert the following text into a valid CSV.
        
        Available CSV Schemas:
        1. SCHEDULE: ID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE
        2. EXAM: ID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS
        
        Determine the correct schema from the text and generate the CSV.
        
        Text to convert:
        ---
        ${inputText}
        ---
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction },
      });
      
      const parsedCsv = response.text.trim();
      onSave(parsedCsv);

    } catch (err: any) {
      console.error("Gemini API error:", err);
      setError(`Failed to parse text. ${err.message || 'Please check your API key and input.'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-2">AI Text Parser</h2>
        <p className="text-sm text-gray-400 mb-4">Paste any text describing a schedule or exam list, and the AI will attempt to convert it into a valid format for import.</p>
        
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          placeholder="e.g., 'Wednesday at 7pm I have a physics deep dive on rotational motion. On friday I have maths homework from chapter 5 questions 10-20.'"
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
