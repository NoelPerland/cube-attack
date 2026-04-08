import Phaser from 'phaser';
import { GAME_TUNING } from './tuning';

type MaybeAudioContext = AudioContext | null;

function getAudioContextCtor():
  | (typeof AudioContext)
  | undefined {
  const scopedWindow = window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

  return scopedWindow.AudioContext ?? scopedWindow.webkitAudioContext;
}

class ArcadeAudio {
  private context: MaybeAudioContext = null;
  private muted = false;
  private loopEvent: Phaser.Time.TimerEvent | null = null;
  private loopStep = 0;

  setMuted(value: boolean): void {
    this.muted = value;
  }

  isMuted(): boolean {
    return this.muted;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  stopLoop(): void {
    this.loopEvent?.remove(false);
    this.loopEvent = null;
    this.loopStep = 0;
  }

  startLoop(scene: Phaser.Scene): void {
    this.stopLoop();
    const melody = [
      196, 220, 246.94, 293.66, 329.63, 293.66, 246.94, 220,
      196, 220, 261.63, 329.63, 349.23, 329.63, 293.66, 261.63,
    ];
    const bass = [
      98, 98, 123.47, 123.47, 146.83, 146.83, 123.47, 123.47,
      110, 110, 130.81, 130.81, 164.81, 164.81, 130.81, 130.81,
    ];
    this.loopEvent = scene.time.addEvent({
      delay: 380,
      loop: true,
      callback: () => {
        const beat = this.loopStep % melody.length;

        if (beat % 2 === 0) {
          this.playTone({
            frequency: bass[beat],
            duration: 0.24,
            type: 'triangle',
            volume: GAME_TUNING.audio.loopVolume * 0.72,
          });
        }

        this.playTone({
          frequency: melody[beat],
          duration: 0.16,
          type: beat % 4 === 0 ? 'square' : 'triangle',
          volume: GAME_TUNING.audio.loopVolume * (beat % 8 === 7 ? 0.78 : 1),
          when: 0.02,
        });

        if (beat % 8 === 4) {
          this.playTone({
            frequency: melody[beat] * 1.5,
            duration: 0.1,
            type: 'square',
            volume: GAME_TUNING.audio.loopVolume * 0.42,
            when: 0.07,
          });
        }

        this.loopStep += 1;
      },
    });
  }

  playStart(): void {
    this.playTone({
      frequency: 392,
      duration: 0.12,
      type: 'square',
      volume: GAME_TUNING.audio.uiVolume,
    });
    this.playTone({
      frequency: 523.25,
      duration: 0.16,
      type: 'triangle',
      volume: GAME_TUNING.audio.uiVolume * 0.9,
      when: 0.05,
    });
  }

  playJump(): void {
    this.playTone({
      frequency: 392,
      slideTo: 659.25,
      duration: 0.14,
      type: 'square',
      volume: GAME_TUNING.audio.sfxVolume,
    });
  }

  playDeath(): void {
    this.playTone({
      frequency: 196,
      slideTo: 92,
      duration: 0.26,
      type: 'sawtooth',
      volume: GAME_TUNING.audio.sfxVolume * 1.1,
    });
    this.playTone({
      frequency: 110,
      slideTo: 55,
      duration: 0.34,
      type: 'triangle',
      volume: GAME_TUNING.audio.sfxVolume * 0.7,
      when: 0.04,
    });
  }

  playMilestone(): void {
    this.playTone({
      frequency: 659.25,
      duration: 0.1,
      type: 'square',
      volume: GAME_TUNING.audio.uiVolume,
    });
    this.playTone({
      frequency: 783.99,
      duration: 0.12,
      type: 'triangle',
      volume: GAME_TUNING.audio.uiVolume * 0.85,
      when: 0.04,
    });
  }

  private ensureContext(): MaybeAudioContext {
    if (typeof window === 'undefined') {
      return null;
    }

    if (this.context) {
      return this.context;
    }

    const ContextCtor = getAudioContextCtor();

    if (!ContextCtor) {
      return null;
    }

    this.context = new ContextCtor();
    return this.context;
  }

  private playTone({
    frequency,
    duration,
    type,
    volume,
    when = 0,
    slideTo,
  }: {
    frequency: number;
    duration: number;
    type: OscillatorType;
    volume: number;
    when?: number;
    slideTo?: number;
  }): void {
    if (this.muted) {
      return;
    }

    const context = this.ensureContext();

    if (!context) {
      return;
    }

    const startAt = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);

    if (slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(slideTo, 1),
        startAt + duration,
      );
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(volume * GAME_TUNING.audio.masterVolume, 0.0001),
      startAt + 0.012,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.04);
  }
}

export const audio = new ArcadeAudio();
