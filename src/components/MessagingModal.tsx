import React, { useState, useEffect, useRef } from 'react';
import { StudentData, MessageData } from '../types';
import Icon from './Icon';

interface MessagingModalProps {
  student: StudentData;
  onClose: () => void;
}

const MessagingModal: React.FC<MessagingModalProps> = ({ student, onClose }) => {
  const [newMessage, setNewMessage] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    alert("Messaging not fully implemented in this version.");
    setNewMessage('');
  };

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg h-[70vh] flex flex-col bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b border-[var(--glass-border)] flex-shrink-0">
          <h2 className="text-xl font-bold text-white">Message to {student.CONFIG.fullName}</h2>
          <p className="text-sm text-gray-400">{student.CONFIG.SID}</p>
        </header>

        <main className="flex-grow p-4 overflow-y-auto">
            <p className="text-center text-gray-500">Messaging features are under development.</p>
             <div ref={messagesEndRef} />
        </main>
        
        <footer className="p-4 border-t border-[var(--glass-border)] flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-grow px-4 py-2 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" disabled={!newMessage.trim()} className="p-3 text-white bg-cyan-600 rounded-full hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="send" className="w-5 h-5" />
                </button>
            </form>
        </footer>
      </div>
    </div>
  );
};

export default MessagingModal;
