/**
 * Sound Design System for Personal Finance App
 *
 * Philosophy: Professional, subtle, confidence-inspiring
 * - Clean tones for positive actions (savings, income)
 * - Soft alerts for budget warnings
 * - Satisfying clicks for interactions
 *
 * Uses Web Audio API for crisp, latency-free sounds
 */

type SoundType =
  | 'click'           // Button clicks, selections
  | 'success'         // Successful transactions, imports
  | 'warning'         // Budget approaching limit
  | 'error'           // Failed actions
  | 'income'          // Money received
  | 'expense'         // Money spent
  | 'toggle'          // Toggle switches
  | 'open'            // Modal/dialog open
  | 'close'           // Modal/dialog close
  | 'hover'           // Subtle hover feedback
  | 'notification'    // Toast/alert appearance
  | 'complete';       // Task completion

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack?: number;
  decay?: number;
  secondFrequency?: number;  // For dual-tone sounds
  delay?: number;            // For chained sounds
}

const SOUNDS: Record<SoundType, SoundConfig | SoundConfig[]> = {
  // Clean, subtle click - like a precision instrument
  click: {
    frequency: 1200,
    duration: 0.05,
    type: 'sine',
    volume: 0.08,
    attack: 0.001,
    decay: 0.04,
  },

  // Upward arpeggio - achievement, success
  success: [
    { frequency: 523, duration: 0.1, type: 'sine', volume: 0.12, attack: 0.01, decay: 0.08 },
    { frequency: 659, duration: 0.1, type: 'sine', volume: 0.12, attack: 0.01, decay: 0.08, delay: 0.08 },
    { frequency: 784, duration: 0.15, type: 'sine', volume: 0.1, attack: 0.01, decay: 0.12, delay: 0.16 },
  ],

  // Gentle warning tone - soft but attention-getting
  warning: {
    frequency: 440,
    duration: 0.2,
    type: 'triangle',
    volume: 0.1,
    attack: 0.02,
    decay: 0.15,
    secondFrequency: 349,
  },

  // Descending tone - error/rejection
  error: [
    { frequency: 330, duration: 0.15, type: 'sine', volume: 0.12, attack: 0.01, decay: 0.12 },
    { frequency: 262, duration: 0.2, type: 'sine', volume: 0.1, attack: 0.01, decay: 0.15, delay: 0.1 },
  ],

  // Positive chime - money received
  income: [
    { frequency: 880, duration: 0.08, type: 'sine', volume: 0.1, attack: 0.005, decay: 0.07 },
    { frequency: 1109, duration: 0.12, type: 'sine', volume: 0.08, attack: 0.005, decay: 0.1, delay: 0.06 },
  ],

  // Soft descending note - money spent (not negative, just informative)
  expense: {
    frequency: 587,
    duration: 0.12,
    type: 'sine',
    volume: 0.08,
    attack: 0.01,
    decay: 0.1,
    secondFrequency: 494,
  },

  // Quick toggle sound
  toggle: {
    frequency: 800,
    duration: 0.04,
    type: 'sine',
    volume: 0.06,
    attack: 0.001,
    decay: 0.035,
  },

  // Soft whoosh up - opening
  open: {
    frequency: 400,
    duration: 0.1,
    type: 'sine',
    volume: 0.05,
    attack: 0.01,
    decay: 0.08,
    secondFrequency: 600,
  },

  // Soft whoosh down - closing
  close: {
    frequency: 500,
    duration: 0.08,
    type: 'sine',
    volume: 0.04,
    attack: 0.01,
    decay: 0.06,
    secondFrequency: 350,
  },

  // Very subtle hover - barely perceptible
  hover: {
    frequency: 1400,
    duration: 0.02,
    type: 'sine',
    volume: 0.02,
    attack: 0.001,
    decay: 0.018,
  },

  // Notification chime
  notification: {
    frequency: 698,
    duration: 0.15,
    type: 'sine',
    volume: 0.1,
    attack: 0.01,
    decay: 0.12,
    secondFrequency: 880,
  },

  // Satisfying completion - task done
  complete: [
    { frequency: 523, duration: 0.08, type: 'sine', volume: 0.1, attack: 0.005, decay: 0.07 },
    { frequency: 784, duration: 0.15, type: 'sine', volume: 0.12, attack: 0.005, decay: 0.12, delay: 0.07 },
  ],
};

class SoundSystem {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 1;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        console.warn('Web Audio API not supported');
        return null;
      }
    }

    // Resume if suspended (required by browsers after user interaction)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    return this.audioContext;
  }

  private playTone(config: SoundConfig, startTime: number = 0): void {
    const ctx = this.getContext();
    if (!ctx || !this.enabled) return;

    const now = ctx.currentTime + startTime;

    // Main oscillator
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, now);

    // If there's a second frequency, sweep to it
    if (config.secondFrequency) {
      oscillator.frequency.linearRampToValueAtTime(config.secondFrequency, now + config.duration);
    }

    // ADSR envelope
    const attack = config.attack || 0.01;
    const decay = config.decay || config.duration * 0.8;
    const peakVolume = config.volume * this.volume;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + attack);
    gainNode.gain.linearRampToValueAtTime(0, now + attack + decay);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + config.duration);
  }

  play(sound: SoundType): void {
    const config = SOUNDS[sound];
    if (!config) return;

    if (Array.isArray(config)) {
      config.forEach((c) => {
        this.playTone(c, c.delay || 0);
      });
    } else {
      this.playTone(config);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getVolume(): number {
    return this.volume;
  }
}

// Singleton instance
export const soundSystem = new SoundSystem();

// Convenience function
export function playSound(sound: SoundType): void {
  soundSystem.play(sound);
}

// Hook for React components
export function useSounds() {
  return {
    play: (sound: SoundType) => soundSystem.play(sound),
    setEnabled: (enabled: boolean) => soundSystem.setEnabled(enabled),
    setVolume: (volume: number) => soundSystem.setVolume(volume),
    isEnabled: () => soundSystem.isEnabled(),
    getVolume: () => soundSystem.getVolume(),
  };
}
