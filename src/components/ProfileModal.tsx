
import React, { useState, useRef } from 'react';
import { StudentData } from '../types';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { blobToBase64 } from '../utils/file';

interface ProfileModalProps {
  user: StudentData;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateProfile } = useAuth();

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB Limit
        setError('Image size must be less than 2MB.');
        return;
      }
      // Create a preview and convert to base64
      setImagePreview(URL.createObjectURL(file));
      const b64 = await blobToBase64(file);
      setImageBase64(`data:${file.type};base64,${b64}`);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64) return;
    setIsLoading(true);
    setError('');
    try {
        await updateProfile({ profilePhoto: imageBase64 });
        handleClose();
    } catch (err: any) {
        setError(err.message || 'Failed to update profile.');
    } finally {
        setIsLoading(false);
    }
  };

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';
  const currentPhoto = imagePreview || user.profilePhoto;

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-md bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-6 text-center">My Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <img src={currentPhoto} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-cyan-500/50" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-1.5 bg-gray-800 rounded-full text-white hover:bg-gray-700 transition-colors">
                        <Icon name="edit" className="w-4 h-4" />
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white text-center">{user.fullName}</h3>
                    <p className="text-sm text-gray-400 text-center">{user.email}</p>
                </div>
            </div>
            
            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <div className="flex justify-center gap-4 pt-4">
                <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">
                    Close
                </button>
                <button type="submit" disabled={isLoading || !imageBase64} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
