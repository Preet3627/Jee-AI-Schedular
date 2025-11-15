import React from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { uiTextData } from '../data/mockData';
import { ResultData } from '../types';

interface PerformanceMetricsProps {
    score: string; // e.g., "147/300"
    weaknesses: string[];
    results: ResultData[];
    onToggleMistakeFixed: (resultId: string, mistake: string) => void;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ score, weaknesses, results, onToggleMistakeFixed }) => {
  const { t } = useLocalization();
  const [currentScore, totalScore] = score.split('/');

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm h-full">
      <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-6">
        {t(uiTextData.CURRENT_STATUS_TITLE)}
      </h2>
      
      <div className="space-y-6">
        {/* Score Metric */}
        <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-cyan-500">
          <p className="text-sm text-gray-400">{t(uiTextData.CURRENT_SCORE)}</p>
          <p className="text-3xl font-bold text-white">{currentScore} <span className="text-lg text-gray-400">/ {totalScore}</span></p>
        </div>

        {/* Target Metric */}
        <div className="bg-gray-900 p-4 rounded-lg border-l-4 border-green-500">
          <p className="text-sm text-gray-400">{t(uiTextData.TARGET_SCORE)}</p>
          <p className="text-3xl font-bold text-white">+25%</p>
        </div>

        {/* Weaknesses */}
        <div>
          <h3 className="text-lg font-semibold text-cyan-400 tracking-widest uppercase mb-4">
            {t(uiTextData.WEAKNESS_TITLE)}
          </h3>
          <ul className="space-y-2">
            {weaknesses.map((weakness, index) => (
              <li key={index} className="flex items-center bg-gray-900 p-3 rounded-md">
                <svg className="w-5 h-5 text-cyan-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                <span className="text-gray-300">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;