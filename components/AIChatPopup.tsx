
import React, { useState, useRef, useEffect } from 'react';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

interface AIChatPopupProps {
  history: { role: string; parts: { text: string }[] }[];
  onSendMessage: (prompt: string, imageBase64?: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

const AIChatPopup: React.FC<AIChatPopupProps> = ({ history, onSendMessage, onClose, isLoading }) => {
  const { currentUser } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  
  // Draggable state
  const popupRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Scroll to bottom of chat on new message
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [history]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (popupRef.current) {
      setIsDragging(true);
      setOffset({
        x: e.clientX - popupRef.current.offsetLeft,
        y: e.clientY - popupRef.current.offsetTop
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && popupRef.current) {
      e.preventDefault();
      setPosition({
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, offset]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setImageBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !imageBase64) return;
    onSendMessage(prompt, imageBase64 || undefined);
    setPrompt('');
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      ref={popupRef}
      className="fixed bottom-6 right-6 w-[360px] h-[520px] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl flex flex-col z-50 transition-transform"
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <header
        onMouseDown={handleMouseDown}
        className="p-3 border-b border-[var(--glass-border)] flex-shrink-0 flex justify-between items-center cursor-move"
      >
        <div className="flex items-center gap-2">
            <Icon name="gemini" className="w-6 h-6 text-cyan-400" />
            <h3 className="font-bold text-white">AI Assistant</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </header>
      
      <main ref={chatBodyRef} className="flex-grow p-3 overflow-y-auto space-y-4">
        {history.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <Icon name="gemini" className="w-6 h-6 text-cyan-400 self-start flex-shrink-0" />}
            <div className={`max-w-[80%] px-3 py-2 rounded-xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.parts[0].text}</p>
            </div>
            {msg.role === 'user' && <img src={currentUser?.profilePhoto} className="w-6 h-6 rounded-full self-start flex-shrink-0" alt="user" />}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-end gap-2 justify-start">
                <Icon name="gemini" className="w-6 h-6 text-cyan-400 self-start flex-shrink-0" />
                <div className="max-w-[80%] px-3 py-2 rounded-xl bg-gray-700 text-gray-200 rounded-bl-none">
                    <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"></span>
                    </div>
                </div>
            </div>
        )}
      </main>

      <footer className="p-3 border-t border-[var(--glass-border)] flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-cyan-400 rounded-full bg-gray-700/50 flex-shrink-0">
              <Icon name="image" className="w-5 h-5" />
            </button>
            <div className="relative flex-grow">
                 <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full px-4 py-2 pr-10 text-sm text-gray-200 bg-gray-900/50 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                />
                {imageBase64 && <div className="absolute top-1/2 right-3 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>}
            </div>
            <button type="submit" disabled={isLoading || (!prompt.trim() && !imageBase64)} className="p-2 text-white bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                <Icon name="send" className="w-5 h-5" />
            </button>
        </form>
      </footer>
    </div>
  );
};

export default AIChatPopup;
