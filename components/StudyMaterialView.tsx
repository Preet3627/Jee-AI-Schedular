
import React, { useState, useEffect } from 'react';
import { StudyMaterialItem } from '../types';
import { api } from '../api/apiService';
import Icon from './Icon';

interface StudyMaterialViewProps {
  onViewFile: (file: StudyMaterialItem) => void;
}

const StudyMaterialView: React.FC<StudyMaterialViewProps> = ({ onViewFile }) => {
  const [path, setPath] = useState('/');
  const [items, setItems] = useState<StudyMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError('');
      try {
        const data = await api.getStudyMaterial(path);
        setItems(data);
      } catch (err: any) {
        setError(err.error || 'Failed to load study materials. The repository may not be configured by the administrator.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [path]);

  const handleItemClick = (item: StudyMaterialItem) => {
    if (item.type === 'folder') {
      setPath(item.path);
    } else {
      onViewFile(item);
    }
  };

  const navigateToPath = (index: number) => {
    const pathSegments = path.split('/').filter(Boolean);
    const newPath = '/' + pathSegments.slice(0, index + 1).join('/');
    setPath(newPath);
  };

  const breadcrumbs = path.split('/').filter(Boolean);

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-white mb-4">Study Material</h2>
      
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4 bg-gray-900/50 p-2 rounded-md">
        <button onClick={() => setPath('/')} className="hover:text-white">Home</button>
        {breadcrumbs.map((segment, index) => (
          <React.Fragment key={index}>
            <span>/</span>
            <button onClick={() => navigateToPath(index)} className="hover:text-white">{segment}</button>
          </React.Fragment>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-10 border-2 border-dashed border-red-500/30 rounded-lg">
            <p className="font-semibold">Error Loading Resources</p>
            <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <button key={item.path} onClick={() => handleItemClick(item)} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-cyan-500 text-left flex items-center gap-4">
              <Icon name={item.type === 'folder' ? 'folder' : 'file-text'} className="w-8 h-8 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-white truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{new Date(item.modified).toLocaleDateString()}</p>
              </div>
            </button>
          ))}
          {items.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">This folder is empty.</p>}
        </div>
      )}
    </div>
  );
};

export default StudyMaterialView;
