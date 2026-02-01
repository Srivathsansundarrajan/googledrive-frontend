// Sound service using Web Audio API for procedural sound generation
// Optimized for low latency with singleton AudioContext

class SoundService {
    private audioContext: AudioContext | null = null;
    private initialized = false;

    // Initialize audio context on first use
    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        // Resume context if suspended (browser autoplay policies)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }

    // Pre-initialize to reduce first-sound latency
    public init() {
        if (!this.initialized) {
            this.getAudioContext();
            this.initialized = true;
        }
    }

    // Play a tone with specified parameters
    private playTone(
        frequency: number,
        duration: number,
        type: OscillatorType = 'sine',
        volume: number = 0.3
    ) {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

            // Quick fade out to avoid clicks
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (err) {
            console.error('Sound playback error:', err);
        }
    }

    // Play a frequency sweep
    private playSweep(
        startFreq: number,
        endFreq: number,
        duration: number,
        volume: number = 0.3
    ) {
        try {
            const ctx = this.getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(startFreq, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);

            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (err) {
            console.error('Sound playback error:', err);
        }
    }

    // Success sound: ascending chirp
    public playSuccess() {
        this.playSweep(400, 600, 0.15, 0.25);
    }

    // Create sound: clean tone
    public playCreate() {
        this.playTone(523, 0.1, 'sine', 0.25);
    }

    // Delete sound: descending sweep
    public playDelete() {
        this.playSweep(400, 200, 0.15, 0.25);
    }

    // Upload sound: rising sequence
    public playUpload() {
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;

            // Play three quick ascending notes
            [400, 500, 600].forEach((freq, i) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, now);

                const startTime = now + i * 0.08;
                const endTime = startTime + 0.08;

                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        } catch (err) {
            console.error('Sound playback error:', err);
        }
    }

    // Notification sound: double beep
    public playNotification() {
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;

            // Two beeps
            [0, 0.15].forEach((delay) => {
                const oscillator = ctx.createOscillator();
                const gainNode = ctx.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(ctx.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, now);

                const startTime = now + delay;
                const endTime = startTime + 0.1;

                gainNode.gain.setValueAtTime(0.2, startTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, endTime);

                oscillator.start(startTime);
                oscillator.stop(endTime);
            });
        } catch (err) {
            console.error('Sound playback error:', err);
        }
    }
}

// Export singleton instance
const soundService = new SoundService();

// Pre-initialize on module load (helps reduce latency)
if (typeof window !== 'undefined') {
    // Initialize on first user interaction to comply with browser autoplay policies
    const initOnInteraction = () => {
        soundService.init();
        document.removeEventListener('click', initOnInteraction);
        document.removeEventListener('keydown', initOnInteraction);
        document.removeEventListener('touchstart', initOnInteraction);
    };

    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true });
}

export default soundService;
