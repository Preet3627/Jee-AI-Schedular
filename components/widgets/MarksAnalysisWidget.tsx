import React from 'react';
import { ResultData } from '../../types';
import Icon from '../Icon';

interface MarksAnalysisWidgetProps {
  results: ResultData[];
}

const MarksAnalysisWidget: React.FC<MarksAnalysisWidgetProps> = ({ results }) => {
  if (results.length < 2) {
    return null; // Don't show the widget if there aren't enough data points for a trend
  }

  const scores = results.map(r => parseInt(r.SCORE.split('/')[0]));
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  const points = scores.map((score, index) => {
    const x = (index / (scores.length - 1)) * 100;
    const y = 100 - ((score - minScore) / (maxScore - minScore)) * 100;
    return `${x},${y}`;
  }).join(' ');

  const latestResult = results[results.length - 1];
  const secondLatestResult = results[results.length - 2];
  const trend = parseInt(latestResult.SCORE.split('/')[0]) - parseInt(secondLatestResult.SCORE.split('/')[0]);

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-[var(--accent-color)] tracking-widest uppercase mb-4">
        Score Trend
      </h2>
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-full h-auto">
          {/* Gradient Definition */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'var(--accent-color)', stopOpacity: 0.5 }} />
              <stop offset="100%" style={{ stopColor: 'var(--accent-color)', stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {/* Area Fill */}
          <polygon points={`0,100 ${points} 100,100`} fill="url(#scoreGradient)" />
          {/* Line */}
          <polyline
            fill="none"
            stroke="var(--accent-color)"
            strokeWidth="2"
            points={points}
          />
        </svg>
        <div className="absolute top-0 left-0 text-xs text-gray-400">{maxScore}</div>
        <div className="absolute bottom-0 left-0 text-xs text-gray-400">{minScore}</div>
      </div>
      <div className={`mt-2 flex items-center justify-center gap-2 text-sm font-semibold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend >= 0 ? '+' : ''}{trend} points from last test
      </div>
    </div>
  );
};

export default MarksAnalysisWidget;
