import React, { useState, useEffect, useRef } from 'react';
import Icon from '../Icon';

const MusicVisualizerWidget: React.FC = () => {
    const [metadata, setMetadata] = useState<MediaMetadata | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    useEffect(() => {
        // FIX: The MediaSession API does not have `addEventListener` for metadata or playback state changes.
        // The correct way to monitor for these changes is to poll the properties periodically.
        if (!('mediaSession' in navigator)) {
            return;
        }

        const updateState = () => {
            setMetadata(navigator.mediaSession.metadata);
            setIsPlaying(navigator.mediaSession.playbackState === 'playing');
        };

        // Initial state check
        updateState();

        // Set up an interval to poll for changes
        const intervalId = setInterval(updateState, 1000); // Poll every second

        // Cleanup interval on component unmount
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    if (!isPlaying || !metadata?.title) {
        return null;
    }

    const artworkSrc = metadata.artwork?.find(art => art.sizes === '96x96' || art.sizes === '128x128')?.src || metadata.artwork?.[0]?.src;

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-4 backdrop-blur-sm flex items-center gap-4 animate-fadeIn">
            {artworkSrc ? (
                <img src={artworkSrc} alt={metadata.album || 'album art'} className="w-16 h-16 rounded-lg object-cover" />
            ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Icon name="music" className="w-8 h-8 text-gray-500" />
                </div>
            )}
            <div className="flex-grow overflow-hidden">
                <p className="font-bold text-white truncate">{metadata.title}</p>
                <p className="text-sm text-gray-400 truncate">{metadata.artist} - {metadata.album}</p>
            </div>
            <div className="flex items-end gap-1 h-12 flex-shrink-0">
                <div className="soundbar-bar w-2 bg-cyan-400" style={{ animationDelay: '0s', animationDuration: '1.2s' }}></div>
                <div className="soundbar-bar w-2 bg-purple-500" style={{ animationDelay: '-0.2s', animationDuration: '1.5s' }}></div>
                <div className="soundbar-bar w-2 bg-cyan-400" style={{ animationDelay: '-0.5s', animationDuration: '1.0s' }}></div>
                <div className="soundbar-bar w-2 bg-purple-500" style={{ animationDelay: '-0.3s', animationDuration: '1.8s' }}></div>
                <div className="soundbar-bar w-2 bg-cyan-400" style={{ animationDelay: '-0.7s', animationDuration: '1.3s' }}></div>
            </div>
        </div>
    );
};

export default MusicVisualizerWidget;
