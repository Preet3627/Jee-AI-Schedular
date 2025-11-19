import React, { useState, useEffect } from 'react';
import { api } from '../api/apiService';
import Icon from './Icon';
import { useMusicPlayer } from '../context/MusicPlayerContext';

interface MusicLibraryModalProps {
  onClose: () => void;
}

interface Album {
    id: string;
    name: string;
    artist: string;
    coverArt: string;
    songCount: string;
}

interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    track: string;
    coverArt: string;
    duration: string;
    size: string;
}

const MusicLibraryModal: React.FC<MusicLibraryModalProps> = ({ onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const { playTrack, currentTrack } = useMusicPlayer();

    useEffect(() => {
        const fetchLibrary = async () => {
            setIsLoading(true);
            setError('');
            try {
                const data = await api.getMusicLibrary();
                if (data && data.album) {
                    setAlbums(Array.isArray(data.album) ? data.album : [data.album]);
                } else {
                    setAlbums([]);
                }
            } catch (err: any) {
                setError(err.error || "Failed to load music library. Check server configuration.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLibrary();
    }, []);

    const fetchAlbumTracks = async (albumId: string) => {
        setIsLoading(true);
        setError('');
        try {
            const data = await api.getMusicAlbum(albumId);
            if (data && data.song) {
                setTracks(Array.isArray(data.song) ? data.song : [data.song]);
            } else {
                setTracks([]);
            }
        } catch (err: any) {
            setError("Failed to load album tracks.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAlbumClick = (album: Album) => {
        setSelectedAlbum(album);
        fetchAlbumTracks(album.id);
    };

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const handleBackToAlbums = () => {
        setSelectedAlbum(null);
        setTracks([]);
    };
    
    const filteredAlbums = albums.filter(album =>
        album.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        album.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
    const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

    return (
        <div className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${animationClasses}`} onClick={handleClose}>
            <div className={`w-full h-full max-w-4xl max-h-[90vh] bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl ${contentAnimationClasses} flex flex-col`} onClick={(e) => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b border-[var(--glass-border)] flex justify-between items-center gap-4">
                    {selectedAlbum ? (
                        <button onClick={handleBackToAlbums} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300">
                            <Icon name="arrow-left" className="w-5 h-5"/> Back to Albums
                        </button>
                    ) : (
                        <input
                            type="text"
                            placeholder="Search albums..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full max-w-xs px-3 py-1.5 text-sm bg-gray-900/50 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    )}
                    <h2 className="text-lg font-bold text-white truncate">{selectedAlbum ? selectedAlbum.name : 'Music Library'}</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 text-gray-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto p-4">
                    {isLoading && <div className="text-center text-gray-400">Loading...</div>}
                    {error && <div className="text-center text-red-400">{error}</div>}
                    {!isLoading && !error && (
                        selectedAlbum ? (
                            <div className="space-y-2">
                                {tracks.map(track => (
                                    <button 
                                        key={track.id} 
                                        onClick={() => playTrack(track, tracks)}
                                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${currentTrack?.id === track.id ? 'bg-cyan-600/30' : 'hover:bg-gray-700/50'}`}
                                    >
                                        <span className="font-mono text-sm text-gray-400">{track.track}</span>
                                        <span className="flex-grow text-white">{track.title}</span>
                                        <span className="text-sm text-gray-400">{Math.floor(Number(track.duration)/60)}:{String(Number(track.duration)%60).padStart(2,'0')}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {filteredAlbums.map(album => (
                                    <button key={album.id} onClick={() => handleAlbumClick(album)} className="text-left group">
                                        <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden relative">
                                            <img src={api.getMusicStreamUrl(album.coverArt)} alt={album.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Icon name="play" className="w-12 h-12 text-white" />
                                            </div>
                                        </div>
                                        <p className="font-semibold text-white truncate mt-2 text-sm">{album.name}</p>
                                        <p className="text-xs text-gray-400 truncate">{album.artist}</p>
                                    </button>
                                ))}
                            </div>
                        )
                    )}
                </main>
            </div>
        </div>
    );
};

export default MusicLibraryModal;