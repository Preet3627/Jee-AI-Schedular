import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import Icon from './Icon';
import { blobToBase64 } from '../utils/file';

interface ImageToTimetableModalProps {
  onClose: () => void;
  onSave: (csv: string) => void;
  geminiApiKey: string;
}

const ImageToTimetableModal: React.FC<ImageToTimetableModalProps> = ({ onClose, onSave, geminiApiKey }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [parsedCsv, setParsedCsv] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // 4MB Limit for Gemini
        setError('Image size must be less than 4MB.');
        return;
      }
      setImagePreview(URL.createObjectURL(file));
      const b64 = await blobToBase64(file);
      setImageBase64(b64);
      setError('');
      setParsedCsv('');
    }
  };

  const handleParseImage = async () => {
    if (!imageBase64) {
      setError('Please upload an image first.');
      return;
    }
     if (!geminiApiKey) {
        alert("Gemini API Key is not set. Please add it in the settings menu.");
        setError("API Key is missing.");
        return;
    }
    setIsLoading(true);
    setError('');
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const textPart = { text: `You are an expert data extraction agent. The user has uploaded an image of a timetable. Your task is to analyze the image and convert the timetable into a valid CSV format.
- The header row MUST be exactly: ID,SID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG,Q_RANGES,SUB_TYPE
- Generate a unique ID for each task (e.g., A101, H202).
- If an entry looks like homework (e.g., mentions question numbers, exercises), its TYPE should be 'HOMEWORK'. Otherwise, it should be 'ACTION'.
- For HOMEWORK tasks, extract the question ranges and format them for the Q_RANGES column. Examples: "L1:1-10@p45;PYQ:5-15", "Exercises:1-5", "10-20".
- For ACTION tasks, SUB_TYPE can be 'DEEP_DIVE', 'ANALYSIS', or 'MORNING_DRILL'. Default to 'DEEP_DIVE' if unsure.
- DAY must be the full English day name (e.g., MONDAY).
- TIME must be in 24-hour HH:MM format. For HOMEWORK without a time, you can leave it blank.
- Infer details from the image to create a concise CARD_TITLE and a more descriptive FOCUS_DETAIL.
- If a SID (Student ID) is present for a row or for the whole table, include it in the SID column. If not, leave the SID column blank.
- If the image is not a timetable, respond with "ERROR: Not a timetable".
- Remove any surrounding text or markdown formatting like \`\`\`csv.` };
      const imagePart = { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } };
      
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: { parts: [textPart, imagePart] },
      });
      
      const resultText = response.text.trim().replace(/```csv|```/g, '');
      if (resultText.startsWith('ERROR')) {
          throw new Error(resultText);
      }
      setParsedCsv(resultText);

    } catch (err: any) {
      setError(`AI parsing failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedCsv) {
        alert("Nothing to save. Please parse an image first.");
        return;
    }
    onSave(parsedCsv);
  };

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">Import Timetable from Image</h2>
        
        <div className="space-y-4">
          {!parsedCsv ? (
             <div>
                <label htmlFor="image-upload" className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-800/50 transition-colors">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Timetable preview" className="max-h-full rounded-md" />
                  ) : (
                    <>
                      <Icon name="upload" className="w-10 h-10 text-gray-500" />
                      <p className="text-gray-400 mt-2">Click to upload image</p>
                      <p className="text-xs text-gray-500">PNG, JPG up to 4MB</p>
                    </>
                  )}
                </label>
                <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
             </div>
          ) : (
             <form onSubmit={handleSubmit}>
                <label className="text-sm font-bold text-gray-400">Parsed CSV Data (Editable)</label>
                <textarea
                    value={parsedCsv}
                    onChange={(e) => setParsedCsv(e.target.value)}
                    className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1"
                />
             </form>
          )}

          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            {parsedCsv ? (
                <button onClick={handleSubmit} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">
                    Save to Schedule
                </button>
            ) : (
                <button onClick={handleParseImage} disabled={!imageBase64 || isLoading} className="w-40 flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                    {isLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Parse with AI'}
                </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageToTimetableModal;
