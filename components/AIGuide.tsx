import React, { useState, useEffect } from 'react';

const AIGuide: React.FC = () => {
    const [guideText, setGuideText] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGuide = async () => {
            try {
                const response = await fetch('/ai-agent-guide.txt');
                if (!response.ok) {
                    throw new Error('Failed to load AI guide.');
                }
                const text = await response.text();
                setGuideText(text);
            } catch (error) {
                console.error(error);
                setGuideText('Error: Could not load the AI agent guide. Please check the console.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchGuide();
    }, []);

    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">AI Agent Guide</h2>
            <p className="text-gray-400 mb-6">
                Use the following documentation to instruct a Large Language Model (like Gemini) to generate valid CSV data for batch importing schedules, exams, or student metrics. Copy and paste the relevant sections as part of your prompt to the AI.
            </p>
            <div className="bg-gray-900 p-4 rounded-md border border-gray-600 max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <p className="text-gray-500 animate-pulse">Loading guide...</p>
                ) : (
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{guideText}</pre>
                )}
            </div>
        </div>
    );
};

export default AIGuide;
