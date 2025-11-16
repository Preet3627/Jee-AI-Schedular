
import React, { useState, useEffect } from 'react';
import { api } from '../../api/apiService';
import Icon from '../Icon';

interface DailyInsightWidgetProps {
    weaknesses: string[];
}

const DailyInsightWidget: React.FC<DailyInsightWidgetProps> = ({ weaknesses }) => {
    const [insight, setInsight] = useState<{ quote: string; insight: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInsight = async () => {
            setIsLoading(true);
            setError('');
            try {
                const result = await api.getDailyInsight(weaknesses);
                setInsight(result);
            } catch (err) {
                setError('Could not load AI insight.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInsight();
    }, [weaknesses]);

    return (
        <div className="bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            {isLoading && (
                <div className="flex items-center justify-center h-24">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
            {error && <p className="text-center text-yellow-400">{error}</p>}
            {insight && (
                <div className="space-y-4">
                    <p className="text-lg font-medium text-gray-300 italic text-center">"{insight.quote}"</p>
                    <div className="border-t border-gray-700/50 my-4"></div>
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                         <h4 className="text-sm font-bold text-cyan-400 mb-2 flex items-center gap-2">
                            <Icon name="gemini" className="w-4 h-4" /> Tip of the Day
                        </h4>
                        <p className="text-sm text-gray-300">{insight.insight}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyInsightWidget;
