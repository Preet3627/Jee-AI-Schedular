import React, { useState, useRef, useEffect } from 'react';
import { StudentData } from '../types';
import Icon from './Icon';
import { blobToBase64 } from '../utils/file';

interface AIDoubtSolverModalProps {
  student: StudentData;
  onClose: () => void;
}

interface Message {
    sender: 'user' | 'gemini';
    text: string;
    image?: string; // base64 for user, url for gemini
}

const API_URL = '/api';

const AIDoubtSolverModal: React.FC<AIDoubtSolverModalProps> = ({ student, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [prompt, setPrompt] = useState('');
    const [image, setImage] = useState<{ preview: string; base64: string } | null>(null);
    const [conversation, setConversation] = useState<Message[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                setError('Image size must be less than 4MB.');
                return;
            }
            const preview = URL.createObjectURL(file);
            const base64 = await blobToBase64(file);
            setImage({ preview, base64 });
            setError('');
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || !student.CONFIG.settings.geminiApiKey) {
            if (!student.CONFIG.settings.geminiApiKey) {
                 setError('Gemini API key is missing. Please set it in settings.');
            }
            return;
        }
        
        const userMessage: Message = { sender: 'user', text: prompt, image: image?.preview };
        setConversation(prev => [...prev, userMessage]);
        setIsLoading(true);
        setError('');
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/ai/solve-doubt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    prompt,
                    imageBase64: image?.base64,
                    apiKey: student.CONFIG.settings.geminiApiKey
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to get response from AI.');
            }

            const data = await res.json();
            const geminiMessage: Message = { sender: 'gemini', text: data.response };
            setConversation(prev => [...prev, geminiMessage]);

        } catch (err: any) {
            setError(err.message);
            const errorMessage: Message = { sender: 'gemini', text: `Sorry, I encountered an error: ${err.message}` };
            setConversation(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setPrompt('');
            setImage(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
    const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

    return (
        <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
            <div className={`w-full max-w-2xl h-[80vh] flex flex-col bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
                <header className="p-4 border-b border-[var(--glass-border)] flex-shrink-0 flex items-center gap-3">
                    <img src="https://ponsrischool.in/wp-content/uploads/2025/10/gemini-color.webp" alt="Gemini Logo" className="w-8 h-8"/>
                    <div>
                        <h2 className="text-xl font-bold text-white">Ask Gemini</h2>
                        <p className="text-sm text-gray-400">Your AI-powered doubt solver</p>
                    </div>
                </header>

                <main className="flex-grow p-4 overflow-y-auto space-y-6">
                    {conversation.length === 0 && (
                        <div className="text-center text-gray-500 pt-16">
                            <p>Ask me anything about your studies!</p>
                            <p className="text-sm">You can upload an image of a question too.</p>
                        </div>
                    )}
                    {conversation.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'gemini' && <img src="https://ponsrischool.in/wp-content/uploads/2025/10/gemini-color.webp" alt="Gemini" className="w-8 h-8 rounded-full flex-shrink-0" />}
                            <div className={`max-w-md p-3 rounded-lg ${msg.sender === 'user' ? 'bg-cyan-800/80 text-white' : 'bg-gray-700/70'}`}>
                                {msg.image && <img src={msg.image} alt="Doubt image" className="rounded-md mb-2 max-w-xs" />}
                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            {msg.sender === 'user' && <img src={student.CONFIG.profilePhoto} alt="User" className="w-8 h-8 rounded-full flex-shrink-0" />}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-start gap-3">
                             <img src="https://ponsrischool.in/wp-content/uploads/2025/10/gemini-color.webp" alt="Gemini" className="w-8 h-8 rounded-full flex-shrink-0" />
                             <div className="max-w-md p-3 rounded-lg bg-gray-700/70">
                                <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                     <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                                     <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                                </div>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>

                <footer className="p-4 border-t border-[var(--glass-border)] flex-shrink-0">
                     {error && <p className="text-xs text-red-400 mb-2 text-center">{error}</p>}
                     {image && (
                        <div className="mb-2 flex items-center gap-2 p-2 bg-gray-900/50 rounded-md">
                            <img src={image.preview} alt="preview" className="w-10 h-10 rounded-md object-cover" />
                            <p className="text-xs text-gray-400 flex-grow">Image attached</p>
                            <button onClick={() => {setImage(null); if(fileInputRef.current) fileInputRef.current.value = '';}} className="p-1 text-gray-400 hover:text-white"><Icon name="trash" className="w-4 h-4" /></button>
                        </div>
                     )}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" id="ai-image-upload" />
                        <label htmlFor="ai-image-upload" className="p-3 text-gray-300 bg-gray-700/50 rounded-full cursor-pointer hover:bg-gray-600/50">
                            <Icon name="image" className="w-5 h-5" />
                        </label>
                        <input
                            type="text"
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Type your question..."
                            disabled={isLoading}
                            className="flex-grow px-4 py-3 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                            onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) handleSubmit(e); }}
                        />
                        <button type="submit" disabled={isLoading || !prompt.trim()} className="p-3 text-white bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <Icon name="send" className="w-5 h-5" />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};

export default AIDoubtSolverModal;
