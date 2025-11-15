
import React, { useState } from 'react';
import Icon from './Icon';

interface StudentCSLInputProps {
  onClose: () => void;
  onSave: (csv: string) => void;
}

const StudentCSLInput: React.FC<StudentCSLInputProps> = ({ onClose, onSave }) => {
  const [csvText, setCsvText] = useState('');
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      alert("Please enter some CSV data.");
      return;
    }
    onSave(csvText);
  };
  
  const exampleCsv = `ID,TYPE,DAY,TIME,CARD_TITLE,FOCUS_DETAIL,SUBJECT_TAG
A${Date.now().toString().slice(-3)},ACTION,MONDAY,19:00,"Practice Integration","Solve 15 PYQs on Definite Integration.",MATHS`;

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-2">AI Assistant (CSV Input)</h2>
        <p className="text-sm text-gray-400 mb-4">Quickly add tasks or exams by pasting CSV data. You can ask an AI like Gemini to generate this for you. The \`SID\` column is optional.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            className="w-full h-48 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            placeholder={exampleCsv}
          />
          <div className="flex justify-end gap-4 pt-2">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">
                <Icon name="plus" /> Process CSV
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentCSLInput;
