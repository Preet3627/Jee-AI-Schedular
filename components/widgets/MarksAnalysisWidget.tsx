import React from 'react';
import { ResultData } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';

interface MarksAnalysisWidgetProps {
    results: ResultData[];
}

const TrendIcon: React.FC<{ trend: 'up' | 'down' | 'steady' }> = ({ trend }) => {
    if (trend === 'up') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12 7a1 1 0 11-2 0 1 1 0 012 0zm-2 2a1 1 0 100 2h2a1 1 0 100-2h-2z" clipRule="evenodd" /><path d="M10 2a.75.75 0 01.75.75v14.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zM5.05 8.72a.75.75 0 011.06 0L10 12.66l3.95-3.94a.75.75 0 111.06 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5a.75.75 0 010-1.06z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg>;
    }
    if (trend === 'down') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a.75.75 0 01-.75-.75V2.75a.75.75 0 011.5 0v14.5A.75.75 0 0110 18zM5.05 11.28a.75.75 0 011.06 0L10 7.34l3.95 3.94a.75.75 0 11-1.06 1.06l-4.5-4.5a.75.75 0 010-1.06l4.5-4.5a.75.75 0 011.06 1.06L11.06 10l3.94 3.94a.75.75 0 01-1.06 1.06L10 12.12l-3.95 3.94a.75.75 0 01-1.06-1.06l4.5-4.5a.75.75 0 011.06 0l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-4.5-4.5z" clipRule="evenodd" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" /></svg>;
};

const MarksAnalysisWidget: React.FC<MarksAnalysisWidgetProps> = ({ results }) => {
    const { t } = useLocalization();
    
    const sortedResults = [...results].sort((a, b) => new Date(b.DATE).getTime() - new Date(a.DATE).getTime());
    const latestResult = sortedResults[0];
    const previousResult = sortedResults[1];

    if (!latestResult) {
        return null;
    }

    const getScore = (result: ResultData) => parseInt(result.SCORE.split('/')[0], 10);
    
    let trend: 'up' | 'down' | 'steady' = 'steady';
    let scoreDiff = 0;

    if (previousResult) {
        const latestScore = getScore(latestResult);
        const previousScore = getScore(previousResult);
        scoreDiff = latestScore - previousScore;
        if (scoreDiff > 0) trend = 'up';
        if (scoreDiff < 0) trend = 'down';
    }

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-cyan-400 tracking-widest uppercase mb-4">
                {t({ EN: "Marks Analysis", GU: "માર્ક્સ વિશ્લેષણ" })}
            </h2>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm text-gray-400">Latest Score</p>
                    <p className="text-3xl font-bold text-white">{latestResult.SCORE}</p>
                    <p className="text-xs text-gray-500">on {latestResult.DATE}</p>
                </div>
                {previousResult && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        trend === 'up' ? 'bg-green-500/20 text-green-300' :
                        trend === 'down' ? 'bg-red-500/20 text-red-300' :
                        'bg-gray-500/20 text-gray-300'
                    }`}>
                        <TrendIcon trend={trend} />
                        <span className="font-semibold text-sm">{scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarksAnalysisWidget;