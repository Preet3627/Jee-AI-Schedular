import React from 'react';
import { ResultData } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';

const MarksAnalysisWidget: React.FC<{ results: ResultData[] }> = ({ results }) => {
    const { t } = useLocalization();
    
    if (results.length === 0) {
        return null;
    }

    const sortedResults = [...results].sort((a, b) => new Date(a.DATE).getTime() - new Date(b.DATE).getTime());
    const latestResult = sortedResults[sortedResults.length - 1];
    
    // Chart Data
    const chartData = sortedResults.map(r => ({
        score: parseInt(r.SCORE.split('/')[0], 10),
        total: parseInt(r.SCORE.split('/')[1], 10) || 300
    }));

    const maxScore = Math.max(...chartData.map(d => d.score), 0);
    const minScore = Math.min(...chartData.map(d => d.score));

    // SVG Chart dimensions
    const width = 300;
    const height = 100;
    const padding = 10;

    const points = chartData.map((d, i) => {
        const x = (width - padding * 2) / (chartData.length > 1 ? chartData.length - 1 : 1) * i + padding;
        const y = height - padding - ((d.score / (Math.max(maxScore, d.total) || 300)) * (height - padding * 2));
        return `${x},${y}`;
    }).join(' ');
    
    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-4">
                {t({ EN: "Marks Analysis", GU: "માર્ક્સ વિશ્લેષણ" })}
            </h2>
            <div className="text-center mb-4">
                <p className="text-sm text-gray-400">Latest Score</p>
                <p className="text-3xl font-bold text-white">{latestResult.SCORE}</p>
                <p className="text-xs text-gray-500">on {new Date(latestResult.DATE).toLocaleDateString()}</p>
            </div>
            {chartData.length > 1 && (
                <div>
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" aria-label="Score progression chart">
                        <polyline
                            fill="none"
                            stroke="url(#line-gradient)"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={points}
                        />
                         <defs>
                            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="var(--gradient-purple)" />
                                <stop offset="100%" stopColor="var(--accent-color)" />
                            </linearGradient>
                        </defs>
                    </svg>
                     <div className="flex justify-between text-xs font-mono text-gray-400 mt-1">
                        <span>Min: {minScore}</span>
                        <span>Max: {maxScore}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarksAnalysisWidget;
