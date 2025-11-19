import React, { useState, useEffect } from 'react';
import { api } from '../api/apiService';
import Icon from './Icon';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { Track } from '../types';
import StaticWaveform from './StaticWaveform';

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

const MusicLibraryModal: React.FC<MusicLibraryModalProps> = ({ onClose }) => {
    const [isExiting, setIsExiting] = useState(false);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    // FIX: Add `isPlaying` to the destructuring of `useMusicPlayer` to resolve the 'Cannot find name' error.
    const { playTrack, currentTrack, isPlaying } = useMusicPlayer();
    const [activeView, setActiveView] = useState<'albums' | 'tracks'>('albums');
    const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);

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
                    if (!data) throw new Error("Music service returned no data.");
                }
            } catch (err: any) {
                setError(err.error || "Failed to load music library. Check server configuration and .env file.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLibrary();
    }, []);

    const fetchAlbumTracks = async (album: Album) => {
        setIsLoading(true);
        setError('');
        setSelectedAlbum(album);
        setActiveView('tracks');
        try {
            const data = await api.getMusicAlbum(album.id);
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
    
    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
    const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

    const filteredTracks = tracks.filter(track =>
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={`fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md ${animationClasses}`} onClick={handleClose}>
            <div className={`w-full h-full max-w-6xl max-h-[90vh] bg-gray-900/50 border border-gray-700 rounded-xl shadow-2xl ${contentAnimationClasses} flex overflow-hidden`} onClick={(e) => e.stopPropagation()}>
                
                {/* Main Content */}
                <div className="flex-grow flex flex-col bg-gray-800/30">
                    <header className="flex-shrink-0 p-4 border-b border-gray-700/50 flex justify-between items-center gap-4">
                        <div className="flex items-center gap-4">
                           <button className="px-3 py-1.5 text-sm font-semibold rounded-lg text-white bg-red-600 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-white"></div> LIVE</button>
                           <button className="px-3 py-1.5 text-sm font-semibold rounded-lg text-gray-300 hover:bg-gray-700">NEWS</button>
                           <button className="px-3 py-1.5 text-sm font-semibold rounded-lg text-white bg-gray-700">POPULAR</button>
                           <button className="px-3 py-1.5 text-sm font-semibold rounded-lg text-gray-300 hover:bg-gray-700">FEATURED</button>
                        </div>
                         <div className="relative">
                            <input
                                type="text"
                                placeholder="Search tracks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full max-w-xs px-4 py-1.5 text-sm bg-gray-900/50 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                    </header>
                    <main className="flex-grow overflow-y-auto p-4 space-y-2">
                        {isLoading && <div className="text-center text-gray-400 py-10">Loading Library...</div>}
                        {error && <div className="text-center text-red-400 py-10">{error}</div>}
                        {!isLoading && !error && (
                            filteredTracks.map(track => (
                                <div key={track.id} className={`w-full p-2 rounded-lg flex items-center gap-3 transition-colors ${currentTrack?.id === track.id ? 'bg-cyan-600/20' : 'bg-gray-800/50'}`}>
                                    <button onClick={() => playTrack(track, tracks)} className="relative flex-shrink-0">
                                        <img src={api.getMusicStreamUrl(track.coverArt)} alt={track.album} className="w-16 h-16 rounded-md object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                            <Icon name={currentTrack?.id === track.id && isPlaying ? 'pause' : 'play'} className="w-8 h-8 text-white" />
                                        </div>
                                    </button>
                                    <div className="flex-grow min-w-0">
                                        <p className="font-semibold text-white truncate">{track.title}</p>
                                        <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                                    </div>
                                    <div className="flex-shrink-0 w-2/5">
                                        <StaticWaveform trackId={track.id} />
                                    </div>
                                    <div className="text-sm text-gray-400 font-mono flex-shrink-0">{Math.floor(Number(track.duration)/60)}:{String(Number(track.duration)%60).padStart(2,'0')}</div>
                                </div>
                            ))
                        )}
                         {!isLoading && filteredTracks.length === 0 && !error && (
                            <div className="text-center text-gray-500 py-10">No tracks found.</div>
                         )}
                    </main>
                </div>
                
                {/* Right Sidebar */}
                <div className="w-72 flex-shrink-0 bg-gray-900/30 border-l border-gray-700/50 p-4 overflow-y-auto">
                    <h3 className="font-bold text-white mb-4">Playlists</h3>
                    <div className="space-y-2">
                        {['My Favorites', 'Workout Mix', 'Study Focus'].map(name => (
                            <button key={name} className="w-full text-left p-2 rounded-md hover:bg-gray-700/50 flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-700 rounded-md"></div>
                                <span className="text-sm text-gray-300">{name}</span>
                            </button>
                        ))}
                    </div>
                     <h3 className="font-bold text-white mt-6 mb-4">Following</h3>
                     <div className="space-y-3">
                        {['Artist One', 'DJ Two', 'Podcast Three'].map(name => (
                             <div key={name} className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-600"></div>
                                <span className="text-sm text-gray-300">{name}</span>
                             </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default MusicLibraryModal;