import { SoundItem } from './types';
import { youtubeEngine } from './utils/youtubePlayer';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bufferCache = new Map<string, AudioBuffer>();
  private activeSources = new Map<string, Array<() => void>>();
  private activeSoundIds = new Set<string>();
  private listeners = new Set<(activeIds: string[]) => void>();
  private volume: number = 0.85;
  private isMuted: boolean = false;

  constructor() {
    // Listen for YouTube engine playback state changes
    youtubeEngine.registerStateCallback((soundId, isPlaying) => {
      if (!soundId) {
        // Clear any youtube sound from active ids
        const toDelete: string[] = [];
        this.activeSoundIds.forEach((id) => {
          if (id.startsWith('yt-') || id === this.lastYtSoundId) {
            toDelete.push(id);
          }
        });
        toDelete.forEach((id) => this.activeSoundIds.delete(id));
        this.notify();
      } else {
        if (isPlaying) {
          this.activeSoundIds.add(soundId);
          this.lastYtSoundId = soundId;
        } else {
          this.activeSoundIds.delete(soundId);
        }
        this.notify();
      }
    });
  }

  private lastYtSoundId: string | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public subscribe(listener: (activeIds: string[]) => void) {
    this.listeners.add(listener);
    listener(Array.from(this.activeSoundIds));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = Array.from(this.activeSoundIds);
    this.listeners.forEach((fn) => fn(list));
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    youtubeEngine.setVolume(this.volume);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    youtubeEngine.setMuted(muted);
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isPlaying(soundId: string): boolean {
    return this.activeSoundIds.has(soundId);
  }

  public stopAll() {
    this.activeSources.forEach((stoppers) => {
      stoppers.forEach((stop) => {
        try {
          stop();
        } catch {
          // ignore
        }
      });
    });
    this.activeSources.clear();
    this.activeSoundIds.clear();
    youtubeEngine.stop();
    this.notify();
  }

  public stopSound(soundId: string) {
    if (youtubeEngine.getCurrentSoundId() === soundId) {
      youtubeEngine.stop();
    }
    const stoppers = this.activeSources.get(soundId);
    if (stoppers) {
      stoppers.forEach((stop) => {
        try {
          stop();
        } catch {
          // ignore
        }
      });
      this.activeSources.delete(soundId);
    }
    this.activeSoundIds.delete(soundId);
    this.notify();
  }

  public async preload(audioSrc: string): Promise<void> {
    if (!audioSrc || this.bufferCache.has(audioSrc)) return;
    try {
      const response = await fetch(audioSrc);
      if (!response.ok) return;
      const arrayBuffer = await response.arrayBuffer();
      const ctx = this.initContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(audioSrc, decoded);
    } catch {
      // Quietly ignore network/preload failures
    }
  }

  public async play(sound: SoundItem, allowPolyphony = false, targetElementId?: string): Promise<void> {
    // Optional tactile haptic feedback for phone use
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Safe fail
      }
    }

    if (!allowPolyphony) {
      this.stopAll();
    }

    // Check if sound is a YouTube clip (plays both video and audio)
    if (sound.youtubeUrl && sound.youtubeUrl.trim() !== '') {
      this.markActive(sound.id);
      const containerId = targetElementId || `yt-embed-${sound.id}`;
      try {
        await youtubeEngine.playInContainer(
          containerId,
          sound.id,
          sound.youtubeUrl,
          sound.youtubeStartTime || 0,
          sound.youtubeDuration,
          () => {
            this.markInactive(sound.id);
          }
        );
        return;
      } catch (err) {
        console.warn('Could not play YouTube video clip:', err);
      }
    }

    const ctx = this.initContext();
    if (!this.masterGain) return;

    // Register active id
    this.markActive(sound.id);

    // If local audio file path is provided and cached or fetchable:
    if (sound.audioSrc && sound.audioSrc.trim() !== '') {
      try {
        await this.playAudioFile(sound, ctx);
        return;
      } catch (err) {
        console.warn(`Could not play audioSrc "${sound.audioSrc}", falling back to procedural stim sound.`, err);
      }
    }

    // Otherwise use procedural Web Audio stim synthesizer
    this.playSynthesizedSound(sound, ctx);
  }

  private markActive(soundId: string, stopper?: () => void) {
    this.activeSoundIds.add(soundId);
    if (stopper) {
      const list = this.activeSources.get(soundId) || [];
      list.push(stopper);
      this.activeSources.set(soundId, list);
    }
    this.notify();
  }

  private markInactive(soundId: string, stopper?: () => void) {
    if (stopper) {
      const list = this.activeSources.get(soundId);
      if (list) {
        const filtered = list.filter((fn) => fn !== stopper);
        if (filtered.length > 0) {
          this.activeSources.set(soundId, filtered);
        } else {
          this.activeSources.delete(soundId);
          this.activeSoundIds.delete(soundId);
        }
      } else {
        this.activeSoundIds.delete(soundId);
      }
    } else {
      this.activeSoundIds.delete(soundId);
      this.activeSources.delete(soundId);
    }
    this.notify();
  }

  private async playAudioFile(sound: SoundItem, ctx: AudioContext): Promise<void> {
    const src = sound.audioSrc!;
    let buffer = this.bufferCache.get(src);

    if (!buffer) {
      const response = await fetch(src);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      this.bufferCache.set(src, buffer);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = !!sound.loop;

    const soundGain = ctx.createGain();
    const itemVol = sound.volume ?? 1.0;
    soundGain.gain.setValueAtTime(itemVol, ctx.currentTime);

    source.connect(soundGain);
    soundGain.connect(this.masterGain!);

    const stopFn = () => {
      try {
        source.stop();
        source.disconnect();
        soundGain.disconnect();
      } catch {
        // ignore
      }
    };

    this.markActive(sound.id, stopFn);

    source.onended = () => {
      this.markInactive(sound.id, stopFn);
    };

    source.start(0);
  }

  private playSynthesizedSound(sound: SoundItem, ctx: AudioContext) {
    const t0 = ctx.currentTime;
    const soundGain = ctx.createGain();
    const itemVol = (sound.volume ?? 1.0) * 0.7;
    soundGain.gain.setValueAtTime(itemVol, t0);
    soundGain.connect(this.masterGain!);

    let duration = 0.3;
    const stopCallbacks: Array<() => void> = [];

    const synthType = sound.synthSound || 'bubble-pop';

    switch (synthType) {
      case 'bubble-pop': {
        duration = 0.16;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, t0);
        osc.frequency.exponentialRampToValueAtTime(950, t0 + 0.09);
        osc.frequency.exponentialRampToValueAtTime(600, t0 + duration);

        gain.gain.setValueAtTime(0.01, t0);
        gain.gain.linearRampToValueAtTime(1.0, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'wooden-tap': {
        duration = 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(740, t0);
        osc.frequency.exponentialRampToValueAtTime(160, t0 + duration);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, t0);
        filter.Q.setValueAtTime(5, t0);

        gain.gain.setValueAtTime(1.0, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'click-snap': {
        duration = 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, t0);
        osc.frequency.exponentialRampToValueAtTime(200, t0 + duration);

        gain.gain.setValueAtTime(0.7, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'chime-high': {
        duration = 0.65;
        const freqs = [880, 1320, 1760];
        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t0 + idx * 0.03);

          gain.gain.setValueAtTime(0.4 / (idx + 1), t0 + idx * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

          osc.connect(gain);
          gain.connect(soundGain);
          osc.start(t0 + idx * 0.03);
          osc.stop(t0 + duration);
          stopCallbacks.push(() => {
            try {
              osc.stop();
            } catch {}
          });
        });
        break;
      }

      case 'marimba-note': {
        duration = 0.35;
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t0);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(1320, t0);

        gain.gain.setValueAtTime(1.0, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(soundGain);

        osc.start(t0);
        oscHarmonic.start(t0);
        osc.stop(t0 + duration);
        oscHarmonic.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
            oscHarmonic.stop();
          } catch {}
        });
        break;
      }

      case 'calm-gong': {
        duration = 1.2;
        const base = 261.63; // C4
        [1, 2.76, 5.4].forEach((ratio, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(base * ratio, t0);

          gain.gain.setValueAtTime(0.5 / (i + 1), t0);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

          osc.connect(gain);
          gain.connect(soundGain);
          osc.start(t0);
          osc.stop(t0 + duration);
          stopCallbacks.push(() => {
            try {
              osc.stop();
            } catch {}
          });
        });
        break;
      }

      case 'spring-boing': {
        duration = 0.45;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, t0);
        osc.frequency.linearRampToValueAtTime(620, t0 + 0.12);
        osc.frequency.linearRampToValueAtTime(240, t0 + 0.24);
        osc.frequency.linearRampToValueAtTime(480, t0 + 0.36);
        osc.frequency.linearRampToValueAtTime(300, t0 + duration);

        gain.gain.setValueAtTime(0.8, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'laser-blip': {
        duration = 0.2;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, t0);
        osc.frequency.exponentialRampToValueAtTime(90, t0 + duration);

        gain.gain.setValueAtTime(0.5, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'gentle-purr': {
        duration = 0.7;
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const mainGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, t0);

        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(24, t0); // 24Hz purr flutter

        lfoGain.gain.setValueAtTime(0.5, t0);
        lfo.connect(lfoGain);

        mainGain.gain.setValueAtTime(0.5, t0);
        mainGain.gain.exponentialRampToValueAtTime(0.01, t0 + duration);

        osc.connect(mainGain);
        mainGain.connect(soundGain);

        osc.start(t0);
        lfo.start(t0);
        osc.stop(t0 + duration);
        lfo.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
            lfo.stop();
          } catch {}
        });
        break;
      }

      case 'sub-thump': {
        duration = 0.25;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, t0);
        osc.frequency.exponentialRampToValueAtTime(40, t0 + duration);

        gain.gain.setValueAtTime(1.0, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }

      case 'empty':
      default: {
        // Friendly clean blip for empty placeholder slots
        duration = 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, t0);
        osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.08);

        gain.gain.setValueAtTime(0.4, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

        osc.connect(gain);
        gain.connect(soundGain);
        osc.start(t0);
        osc.stop(t0 + duration);
        stopCallbacks.push(() => {
          try {
            osc.stop();
          } catch {}
        });
        break;
      }
    }

    const allStop = () => {
      stopCallbacks.forEach((cb) => cb());
      try {
        soundGain.disconnect();
      } catch {}
    };

    this.markActive(sound.id, allStop);

    setTimeout(() => {
      this.markInactive(sound.id, allStop);
    }, duration * 1000 + 30);
  }
}

export const audioEngine = new AudioEngine();
