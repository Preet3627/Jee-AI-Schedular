import React, { useState, useRef } from 'react';
import { StudentData, DoubtData } from '../types';
import Icon from './Icon';
import { blobToBase64 } from '../utils/file';

interface DoubtsDashboardProps {
  student: StudentData;
  allDoubts: DoubtData[];
  onPostDoubt: (question: string, image?: string) => void;
  onPostSolution: (doubtId: string, solution: string, image?: string) => void;
  onAskAi: () => void;
}

const DoubtsDashboard: React.FC<DoubtsDashboardProps> = ({ student, allDoubts, onPostDoubt, onPostSolution, onAskAi }) => {
  const [newDoubt, setNewDoubt] = useState('');
  const [newDoubtImage, setNewDoubtImage] = useState<string | null>(null);
  const [solutionTexts, setSolutionTexts] = useState<{[key: string]: string}>({});
  const [solutionImages, setSolutionImages] = useState<{[key: string]: string | null}>({});
  const doubtImageInputRef = useRef<HTMLInputElement>(null);
  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, callback: (img: string) => void) => {
      const file = e.target.files?.[0];
      if(file) {
        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            alert("Image size should not exceed 2MB.");
            return;
        }
        const base64 = await blobToBase64(file);
        callback(base64);
      }
  }

  const handlePostDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubt.trim()) return;
    onPostDoubt(newDoubt, newDoubtImage || undefined);
    setNewDoubt('');
    setNewDoubtImage(null);
    if (doubtImageInputRef.current) doubtImageInputRef.current.value = "";
  };

  const handlePostSolution = (e: React.FormEvent, doubtId: string) => {
    e.preventDefault();
    const solutionText = solutionTexts[doubtId];
    if (!solutionText || !solutionText.trim()) return;
    onPostSolution(doubtId, solutionText, solutionImages[doubtId] || undefined);
    setSolutionTexts(prev => ({...prev, [doubtId]: ''}));
    setSolutionImages(prev => ({...prev, [doubtId]: null}));
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Doubts Forum</h2>
        <button onClick={onAskAi} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-r from-purple-600 to-cyan-600">
            <img src="https://ponsrischool.in/wp-content/uploads/2025/10/gemini-color.webp" alt="Gemini Logo" className="w-5 h-5"/>
            Ask Gemini
        </button>
      </div>
      
      <form onSubmit={handlePostDoubt} className="mb-8 bg-gray-900/30 p-4 rounded-lg">
        <textarea
          value={newDoubt}
          onChange={(e) => setNewDoubt(e.target.value)}
          className="w-full h-24 bg-gray-900/50 border border-gray-600 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
          placeholder="Ask a question to the community..."
        />
        <div className="flex justify-between items-center mt-2">
            <div>
                 <input type="file" accept="image/*" className="hidden" ref={doubtImageInputRef} onChange={(e) => handleImageUpload(e, setNewDoubtImage)} id="doubt-image-upload" />
                 <label htmlFor="doubt-image-upload" className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer hover:underline">
                     <Icon name="image" className="w-4 h-4"/> {newDoubtImage ? "Image Attached" : "Attach Image"}
                 </label>
            </div>
            <button type="submit" disabled={!newDoubt.trim()} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
              Post Doubt
            </button>
        </div>
      </form>

      <div className="space-y-6">
        {allDoubts.length === 0 && <p className="text-gray-500 text-center py-8">No doubts have been posted yet. Be the first!</p>}
        
        {allDoubts.map(doubt => (
          <div key={doubt.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex items-start gap-3">
              <img src={doubt.author_photo} alt={doubt.author_name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-white">{doubt.author_name} <span className="text-xs text-gray-400 font-normal">({doubt.user_sid})</span></p>
                <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{doubt.question}</p>
                {doubt.question_image && <img src={`data:image/png;base64,${doubt.question_image}`} alt="Question visual" className="mt-2 rounded-md max-w-sm" />}
                <p className="text-xs text-gray-500 mt-2">{new Date(doubt.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-4 pl-12 space-y-3">
              {doubt.solutions.map(sol => (
                <div key={sol.id} className="flex items-start gap-3 border-t border-gray-700/50 pt-3">
                    <img src={sol.solver_photo} alt={sol.solver_name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-cyan-400 text-sm">{sol.solver_name}</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{sol.solution}</p>
                      {sol.solution_image && <img src={`data:image/png;base64,${sol.solution_image}`} alt="Solution visual" className="mt-2 rounded-md max-w-xs" />}
                       <p className="text-xs text-gray-500 mt-1">{new Date(sol.created_at).toLocaleString()}</p>
                    </div>
                </div>
              ))}
              <form onSubmit={(e) => handlePostSolution(e, doubt.id)} className="pt-2">
                <input 
                  type="text"
                  value={solutionTexts[doubt.id] || ''}
                  onChange={e => setSolutionTexts(prev => ({...prev, [doubt.id]: e.target.value}))}
                  className="w-full px-3 py-1.5 text-sm text-gray-200 bg-gray-900/50 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-50"
                  placeholder="Write a solution..."
                />
                 <div className="flex justify-between items-center mt-2">
                     <input type="file" accept="image/*" className="hidden" id={`sol-img-${doubt.id}`} onChange={(e) => handleImageUpload(e, (img) => setSolutionImages(prev => ({...prev, [doubt.id]: img})))} />
                     <label htmlFor={`sol-img-${doubt.id}`} className="flex items-center gap-2 text-xs text-cyan-400 cursor-pointer hover:underline"><Icon name="image" className="w-4 h-4"/> {solutionImages[doubt.id] ? "Image Attached" : "Attach Image"}</label>
                    <button type="submit" disabled={!solutionTexts[doubt.id]?.trim()} className="p-2 text-white bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:opacity-50">
                      <Icon name="send" className="w-4 h-4" />
                    </button>
                </div>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoubtsDashboard;
