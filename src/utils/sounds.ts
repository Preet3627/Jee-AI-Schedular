const VIBRATION_PATTERNS = {
  click: [50],
  success: [100, 50, 100],
  error: [75, 50, 75],
  finish: [200],
};

let audioContext: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
    if (audioContext && audioContext.state !== 'closed') return audioContext;
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        return audioContext;
    } catch (error) {
        console.warn('Web Audio API is not supported in this browser.');
        return null;
    }
}

const playTone = (frequency: number, duration: number = 0.1, type: OscillatorType = 'sine') => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume context if it's suspended (e.g., due to browser policy)
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
};

export const playNextSound = () => playTone(440, 0.08); // A4
export const playSkipSound = () => playTone(330, 0.08); // E4
export const playStopSound = () => playTone(220, 0.12, 'square'); // A3
export const playTimesUpSound = () => {
    playTone(880, 0.15, 'sawtooth'); // A5
    setTimeout(() => playTone(880, 0.15, 'sawtooth'), 200);
};

export const vibrate = (pattern: keyof typeof VIBRATION_PATTERNS) => {
    if ('vibrate' in navigator) {
        try {
            navigator.vibrate(VIBRATION_PATTERNS[pattern]);
        } catch (error) {
            console.warn('Vibration failed', error);
        }
    }
};