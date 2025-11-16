
import React, { useState } from 'react';
import { StudyMaterialItem } from '../types';
import Icon from './Icon';

interface FileViewerModalProps {
  file: StudyMaterialItem | null;
  onClose: () => void;
}

const FileViewerModal: React.FC<FileViewerModalProps> = ({ file, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  if (!file) return null;

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';
  
  const fileUrl = `/api/study-material/content?path=${encodeURIComponent(file.path)}`;
  const fileName = file.name.toLowerCase();
  
  const isPdf = fileName.endsWith('.pdf');
  const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some(ext => fileName.endsWith(ext));

  const renderContent = () => {
    if (isPdf) {
      return <iframe src={fileUrl} className="w-full h-full border-0" title={file.name} />;
    }
    if (isImage) {
      return <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain" />;
    }
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-white p-8">
        <Icon name="file-text" className="w-24 h-24 text-gray-500 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Preview not available</h3>
        <p className="text-gray-400 mb-6">This file type cannot be displayed in the app.</p>
        <a 
          href={fileUrl} 
          download={file.name}
          className="px-6 py-3 text-base font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white"
        >
          Download File
        </a>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full h-full max-w-4xl max-h-[90vh] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl ${contentAnimationClasses} flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <header className="flex-shrink-0 p-4 border-b border-[var(--glass-border)] flex justify-between items-center">
          <h2 className="text-lg font-bold text-white truncate pr-4">{file.name}</h2>
          <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>
        <main className="flex-grow flex items-center justify-center overflow-hidden p-2">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default FileViewerModal;
