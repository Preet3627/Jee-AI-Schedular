import React, { createContext, useState, useContext, ReactNode, useRef, useCallback, useEffect } from 'react';
import { api } from '../api/apiService';

interface Track {
    id: string;
    title: string;
    artist: string;
    album: string;
    track: string;
    coverArt: string;
    duration: string;
    size: string;
    coverArtUrl?: string;
}

interface MusicPlayerContextType {
    audioElement: HTMLAudioElement | null;
    analyser: AnalyserNode | null;
    isPlaying: boolean;
    currentTrack: Track | null;
    playTrack: (track: Track, tracklist: Track[]) => void;
    play: () => void;
    pause: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
}

const MusicPlayerContext = createContext<MusicPlayerContextType | undefined>(undefined);

export const MusicPlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [tracklist, setTracklist] = useState<Track[]>([]);
    
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    
    const initializeAudioContext = useCallback(() => {
        if (!audioContext) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const analyserNode = context.createAnalyser();
            analyserNode.connect(context.destination);
            setAudioContext(context);
            setAnalyser(analyserNode);
        }
    }, [audioContext]);
    
    const playTrack = useCallback((track: Track, newTracklist: Track[]) => {
        initializeAudioContext();
        
        if (audioElementRef.current && audioContext && analyser) {
            const trackWithArtUrl = { ...track, coverArtUrl: api.getMusicStreamUrl(track.coverArt) };
            setCurrentTrack(trackWithArtUrl);
            setTracklist(newTracklist);

            const streamUrl = api.getMusicStreamUrl(track.id);
            audioElementRef.current.src = streamUrl;
            audioElementRef.current.crossOrigin = "anonymous";
            
            if (!sourceNodeRef.current) {
                sourceNodeRef.current = audioContext.createMediaElementSource(audioElementRef.current);
                sourceNodeRef.current.connect(analyser);
            }

            audioElementRef.current.play().then(() => {
                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                setIsPlaying(true);
            }).catch(e => console.error("Audio playback error:", e));
        }
    }, [audioContext, analyser, initializeAudioContext]);
    
    const play = () => {
        if (audioElementRef.current) {
            audioElementRef.current.play();
            setIsPlaying(true);
            if (audioContext?.state === 'suspended') {
                audioContext.resume();
            }
        }
    };

    const pause = () => {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            setIsPlaying(false);
        }
    };
    
    const navigateTrack = (direction: 'next' | 'prev') => {
        if (!currentTrack || tracklist.length === 0) return;
        
        const currentIndex = tracklist.findIndex(t => t.id === currentTrack.id);
        if (currentIndex === -1) return;
        
        let newIndex;
        if (direction === 'next') {
            newIndex = (currentIndex + 1) % tracklist.length;
        } else {
            newIndex = (currentIndex - 1 + tracklist.length) % tracklist.length;
        }
        playTrack(tracklist[newIndex], tracklist);
    };

    const nextTrack = () => navigateTrack('next');
    const prevTrack = () => navigateTrack('prev');

    useEffect(() => {
        if (!audioElementRef.current) {
            audioElementRef.current = new Audio();
            audioElementRef.current.addEventListener('ended', nextTrack);
        }
        
        return () => {
            if (audioElementRef.current) {
                audioElementRef.current.removeEventListener('ended', nextTrack);
            }
        };
    }, [nextTrack]);


    const value = { audioElement: audioElementRef.current, analyser, isPlaying, currentTrack, playTrack, play, pause, nextTrack, prevTrack };

    return (
        <MusicPlayerContext.Provider value={value}>
            {children}
        </MusicPlayerContext.Provider>
    );
};

export const useMusicPlayer = (): MusicPlayerContextType => {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
    }
    return context;
};
