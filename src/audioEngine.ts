import { SoundItem } from './types';
import { youtubeEngine } from './utils/youtubePlayer';
import { tiktokEngine } from './utils/tiktokPlayer';
import { isTikTokUrl } from './utils/tiktok';
import { playProceduralSynth } from './utils/synthesizer';

export interface SoundTiming {
  start: number;
  duration?: number;
  endTime?: number;
}

export function resolveClipTiming(sound: SoundItem): SoundTiming {
  const start = sound.startTime ?? sound.youtubeStartTime ?? 0;
  let duration: number | undefined = sound.duration ?? sound.youtubeDuration;
  if (duration === undefined && sound.endTime !== undefined) {
    duration = Math.max(0.1, sound.endTime - start);
  }
  return { start, duration, endTime: sound.endTime };
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private readonly bufferCache = new Map<string, AudioBuffer>();
  private readonly activeSources = new Map<string, Array<() => void>>();
  private readonly activeSoundIds = new Set<string>();
  private readonly listeners = new Set<(activeIds: ReadonlySet<string>) => void>();
  private volume: number = 0.85;
  private isMuted: boolean = false;
  private lastYtSoundId: string | null = null;
  private lastTikTokSoundId: string | null = null;

  constructor() {
    this.bindExternalEngine(youtubeEngine, 'yt-', (id) => (this.lastYtSoundId = id), () => this.lastYtSoundId);
    this.bindExternalEngine(tiktokEngine, 'tiktok-', (id) => (this.lastTikTokSoundId = id), () => this.lastTikTokSoundId);
  }

  private bindExternalEngine(
    engine: { registerStateCallback: (cb: (soundId: string | null, isPlaying: boolean) => void) => void },
    prefix: string,
    setLastId: (id: string | null) => void,
    getLastId: () => string | null
  ) {
    engine.registerStateCallback((soundId, isPlaying) => {
      if (!soundId) {
        const lastId = getLastId();
        const toDelete: string[] = [];
        this.activeSoundIds.forEach((id) => {
          if (id.startsWith(prefix) || id === lastId) {
            toDelete.push(id);
          }
        });
        toDelete.forEach((id) => this.activeSoundIds.delete(id));
      } else {
        if (isPlaying) {
          this.activeSoundIds.add(soundId);
          setLastId(soundId);
        } else {
          this.activeSoundIds.delete(soundId);
        }
      }
      this.notify();
    });
  }

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.applyGainNodeVolume();
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private applyGainNodeVolume() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
  }

  public subscribe(listener: (activeIds: ReadonlySet<string>) => void) {
    this.listeners.add(listener);
    listener(this.activeSoundIds);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getActiveIds(): ReadonlySet<string> {
    return this.activeSoundIds;
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.activeSoundIds));
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.applyGainNodeVolume();
    youtubeEngine.setVolume(this.volume);
    tiktokEngine.setVolume(this.volume * 100);
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyGainNodeVolume();
    youtubeEngine.setMuted(muted);
    if (muted) {
      tiktokEngine.mute();
    } else {
      tiktokEngine.unmute();
    }
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
        } catch {}
      });
    });
    this.activeSources.clear();
    this.activeSoundIds.clear();
    youtubeEngine.stop();
    tiktokEngine.stop();
    this.notify();
  }

  public stopSound(soundId: string) {
    if (youtubeEngine.getCurrentSoundId() === soundId) {
      youtubeEngine.stop();
    }
    if (tiktokEngine.getCurrentSoundId() === soundId) {
      tiktokEngine.stop();
    }
    const stoppers = this.activeSources.get(soundId);
    if (stoppers) {
      stoppers.forEach((stop) => {
        try {
          stop();
        } catch {}
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
      // Quietly ignore network failures
    }
  }

  public async play(sound: SoundItem, allowPolyphony = false, targetElementId?: string): Promise<void> {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    if (!allowPolyphony) {
      this.stopAll();
    }

    const containerId = targetElementId || `media-embed-${sound.id}`;
    const { start, duration, endTime } = resolveClipTiming(sound);

    // 1. TikTok clip
    const rawTikTokUrl = sound.tiktokUrl || (sound.youtubeUrl && isTikTokUrl(sound.youtubeUrl) ? sound.youtubeUrl : undefined);
    if (rawTikTokUrl && rawTikTokUrl.trim() !== '') {
      this.markActive(sound.id);
      const played = tiktokEngine.playInContainer(containerId, sound.id, rawTikTokUrl, start, duration, endTime, () => {
        this.markInactive(sound.id);
      });
      if (played) return;
    }

    // 2. YouTube clip
    if (sound.youtubeUrl && sound.youtubeUrl.trim() !== '' && !isTikTokUrl(sound.youtubeUrl)) {
      this.markActive(sound.id);
      try {
        await youtubeEngine.playInContainer(containerId, sound.id, sound.youtubeUrl, start, duration, endTime, () => {
          this.markInactive(sound.id);
        });
        return;
      } catch (err) {
        console.warn('Could not play YouTube video clip:', err);
      }
    }

    const ctx = this.initContext();
    if (!this.masterGain) return;

    // 3. Local audio file or procedural Web Audio stim synth
    this.markActive(sound.id);
    if (sound.audioSrc && sound.audioSrc.trim() !== '') {
      try {
        await this.playAudioFile(sound, ctx, start, duration, endTime);
        return;
      } catch (err) {
        console.warn(`Fallback to procedural stim sound for "${sound.title}".`, err);
      }
    }

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

  private async playAudioFile(
    sound: SoundItem,
    ctx: AudioContext,
    startOffset: number,
    durationSec?: number,
    endTime?: number
  ): Promise<void> {
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
    soundGain.gain.setValueAtTime(sound.volume ?? 1.0, ctx.currentTime);
    source.connect(soundGain);
    soundGain.connect(this.masterGain!);

    const stopFn = () => {
      try {
        source.stop();
        source.disconnect();
        soundGain.disconnect();
      } catch {}
    };

    this.markActive(sound.id, stopFn);
    source.onended = () => this.markInactive(sound.id, stopFn);

    const dur = durationSec ?? (endTime !== undefined ? Math.max(0.1, endTime - startOffset) : undefined);
    if (dur !== undefined) {
      source.start(0, startOffset, dur);
    } else if (startOffset > 0) {
      source.start(0, startOffset);
    } else {
      source.start(0);
    }
  }

  private playSynthesizedSound(sound: SoundItem, ctx: AudioContext) {
    const synthHandle = playProceduralSynth(ctx, this.masterGain!, sound.synthSound, sound.volume ?? 1.0);
    this.markActive(sound.id, synthHandle.stop);
    setTimeout(() => {
      this.markInactive(sound.id, synthHandle.stop);
    }, synthHandle.duration * 1000 + 30);
  }
}

export const audioEngine = new AudioEngine();
