import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { StudentData, DoubtData, SolutionData } from '../types';
import Icon from './Icon';

interface CommunityDashboardProps {
  student: StudentData;
  isDemoMode: boolean;
}

const API_URL = '/api';

const CommunityDashboard: React.FC<CommunityDashboardProps> = ({ student, isDemoMode }) => {
  const [doubts, setDoubts] = useState<DoubtData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newDoubt, setNewDoubt] = useState('');
  const [isPostingDoubt, setIsPostingDoubt] = useState(false);
  const [solutionTexts, setSolutionTexts] = useState<{[key: string]: string}>({});
  
  const fetchDoubts = useCallback(async () => {
    if (isDemoMode) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/doubts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch doubts.');
      const data = await res.json();
      setDoubts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    fetchDoubts();
  }, [fetchDoubts]);

  const handlePostDoubt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoubt.trim()) return;
    setIsPostingDoubt(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/doubts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newDoubt })
      });
      if (!res.ok) throw new Error('Failed to post doubt.');
      const createdDoubt = await res.json();
      setDoubts(prev => [createdDoubt, ...prev]);
      setNewDoubt('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsPostingDoubt(false);
    }
  };
  
  const handlePostSolution = async (doubtId: string) => {
    const solutionText = solutionTexts[doubtId];
    if (!solutionText || !solutionText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/doubts/${doubtId}/solutions`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ solution: solutionText })
      });
      if (!res.ok) throw new Error('Failed to post solution.');
      const newSolution = await res.json();
      setDoubts(prev => prev.map(d => d.id === doubtId ? {...d, solutions: [...d.solutions, newSolution]} : d));
      setSolutionTexts(prev => ({...prev, [doubtId]: ''}));
    } catch(err: any) {
       alert(err.message);
    }
  };

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-white mb-6">Community Doubts Forum</h2>
      
      <form onSubmit={handlePostDoubt} className="mb-8">
        <textarea
          value={newDoubt}
          onChange={(e) => setNewDoubt(e.target.value)}
          disabled={isDemoMode || isPostingDoubt}
          className="w-full h-24 bg-gray-900/50 border border-gray-600 rounded-md p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-50"
          placeholder="Ask a question to the community..."
        />
        <button type="submit" disabled={isDemoMode || isPostingDoubt || !newDoubt.trim()} className="mt-2 w-full sm:w-auto float-right flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
          {isPostingDoubt ? 'Posting...' : 'Post Doubt'}
        </button>
      </form>

      <div className="space-y-6">
        {isLoading && <p>Loading doubts...</p>}
        {error && <p className="text-red-400">Error: {error}</p>}
        {!isLoading && doubts.length === 0 && <p className="text-gray-500 text-center py-8">No doubts have been posted yet. Be the first!</p>}
        
        {doubts.map(doubt => (
          <div key={doubt.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
            <div className="flex items-start gap-3">
              <img src={doubt.author_photo} alt={doubt.author_name} className="w-10 h-10 rounded-full object-cover" />
              <div>
                <p className="font-semibold text-white">{doubt.author_name} <span className="text-xs text-gray-400 font-normal">({doubt.user_sid})</span></p>
                <p className="text-sm text-gray-300 mt-1">{doubt.question}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(doubt.created_at).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="mt-4 pl-12 space-y-3">
              {doubt.solutions.map(sol => (
                <div key={sol.id} className="flex items-start gap-3 border-t border-gray-700/50 pt-3">
                    <img src={sol.solver_photo} alt={sol.solver_name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-cyan-400 text-sm">{sol.solver_name}</p>
                      <p className="text-sm text-gray-300">{sol.solution}</p>
                       <p className="text-xs text-gray-500 mt-1">{new Date(sol.created_at).toLocaleString()}</p>
                    </div>
                </div>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); handlePostSolution(doubt.id); }} className="flex items-center gap-2 pt-2">
                <input 
                  type="text"
                  value={solutionTexts[doubt.id] || ''}
                  onChange={e => setSolutionTexts(prev => ({...prev, [doubt.id]: e.target.value}))}
                  disabled={isDemoMode}
                  className="flex-grow px-3 py-1.5 text-sm text-gray-200 bg-gray-900/50 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] disabled:opacity-50"
                  placeholder="Write a solution..."
                />
                <button type="submit" disabled={isDemoMode || !solutionTexts[doubt.id]?.trim()} className="p-2 text-white bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:opacity-50">
                  <Icon name="send" className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityDashboard;