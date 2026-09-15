import { extractTikTokId, getTikTokPlayerUrl } from './tiktok';

export interface TikTokState {
  soundId: string | null;
  isPlaying: boolean;
  isMuted: boolean;
  isReady: boolean;
  volume: number; // 0 to 100
}

type StateListener = (state: TikTokState) => void;

class TikTokEngine {
  private currentSoundId: string | null = null;
  private currentContainerId: string | null = null;
  private activeIframe: HTMLIFrameElement | null = null;
  private isMuted: boolean = false;
  private isReady: boolean = false;
  private isPlaying: boolean = false;
  private volume: number = 100;
  private onEndedCallback: (() => void) | null = null;
  private onStateChangeCallback: ((soundId: string | null, isPlaying: boolean) => void) | null = null;
  private stateListeners: Set<StateListener> = new Set();
  private burstTimerIds: number[] = [];
  private stopTimer: number | null = null;
  private startTime: number = 0;
  private endTime?: number;
  private duration?: number;
  private lastCurrentTime: number | null = null;
  private hasInitialSeekCompleted: boolean = false;

  constructor() {
    this.setupMessageListener();
  }

  public registerStateCallback(cb: (soundId: string | null, isPlaying: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public getState(): TikTokState {
    return {
      soundId: this.currentSoundId,
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      isReady: this.isReady,
      volume: this.volume,
    };
  }

  private notify() {
    const state = this.getState();
    this.stateListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('Error in TikTok state listener:', err);
      }
    });
  }

  /**
   * Listen for bidirectional postMessage events from the TikTok player iframe
   * TikTok player uses `{ type: string, value: unknown, "x-tiktok-player": true }`
   */
  private setupMessageListener() {
    if (typeof window === 'undefined') return;

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || typeof data !== 'object' || !data['x-tiktok-player']) {
        return;
      }

      const { type, value } = data;

      switch (type) {
        case 'onPlayerReady':
          this.isReady = true;
          // Player is initialized inside iframe: immediately unmute and enforce 100% volume
          this.unmute();
          this.setVolume(this.volume);
          if (this.startTime > 0) {
            this.seekTo(this.startTime);
          }
          this.play();
          this.notify();
          break;

        case 'onCurrentTime': {
          let currentSec: number | null = null;
          if (typeof value === 'number') {
            currentSec = value;
          } else if (value && typeof value === 'object') {
            const v = value as Record<string, unknown>;
            if (typeof v.currentTime === 'number') {
              currentSec = v.currentTime;
            } else if (typeof v.time === 'number') {
              currentSec = v.time;
            } else if (typeof v.current_time === 'number') {
              currentSec = v.current_time;
            }
          }

          if (currentSec !== null && currentSec >= 0) {
            this.lastCurrentTime = currentSec;

            // Enforce startTime if starting further into the video
            if (this.startTime > 0 && !this.hasInitialSeekCompleted) {
              if (currentSec < this.startTime - 0.4) {
                this.seekTo(this.startTime);
              } else {
                this.hasInitialSeekCompleted = true;
              }
            }

            // Check if actual video runtime has reached the target end
            const targetEnd =
              this.endTime ??
              (this.duration !== undefined ? this.startTime + this.duration : undefined);

            if (targetEnd !== undefined && currentSec >= targetEnd) {
              const callback = this.onEndedCallback;
              this.stop();
              if (callback) callback();
              return;
            }
          }
          break;
        }

        case 'onMute':
          this.isMuted = Boolean(value);
          this.notify();
          // If the player reported it was forced muted by browser policy,
          // try to immediately unmute if we are still actively playing
          if (this.isMuted && this.isPlaying) {
            this.unmute();
          }
          break;

        case 'onVolumeChange':
          if (typeof value === 'number') {
            this.volume = value;
            this.notify();
          }
          break;

        case 'onStateChange':
          // State codes: -1 = init, 0 = ended, 1 = playing, 2 = paused, 3 = buffering
          if (value === 0) {
            // Video ended: stop cleanly and trigger end callbacks
            const callback = this.onEndedCallback;
            this.stop();
            if (callback) callback();
          } else if (value === 1) {
            this.isPlaying = true;
            this.isReady = true;
            if (this.currentSoundId && this.onStateChangeCallback) {
              this.onStateChangeCallback(this.currentSoundId, true);
            }
            // Fire unmute once more when playback starts
            this.unmute();

            // Calibrated playback stop timer:
            // Crucial: Only start/adjust timer when the media is ACTUALLY PLAYING.
            // This prevents iframe loading & buffering delays from eating into clip runtime!
            if (this.stopTimer) {
              window.clearTimeout(this.stopTimer);
              this.stopTimer = null;
            }

            const targetEnd =
              this.endTime ??
              (this.duration !== undefined ? this.startTime + this.duration : undefined);

            if (targetEnd !== undefined) {
              const currentOffset =
                this.lastCurrentTime !== null && this.lastCurrentTime >= this.startTime
                  ? this.lastCurrentTime
                  : this.startTime;
              const remainingSec = Math.max(0.1, targetEnd - currentOffset);

              // Set fallback timer with a slight margin so onCurrentTime fires first with exact precision
              this.stopTimer = window.setTimeout(() => {
                const callback = this.onEndedCallback;
                this.stop();
                if (callback) callback();
              }, Math.ceil(remainingSec * 1000) + 120);
            }
          } else if (value === 2 || value === 3) {
            // Paused (2) or Buffering (3): pause stopTimer so buffering doesn't deduct from clip runtime
            if (this.stopTimer) {
              window.clearTimeout(this.stopTimer);
              this.stopTimer = null;
            }
            if (value === 2) {
              this.isPlaying = false;
              if (this.currentSoundId && this.onStateChangeCallback) {
                this.onStateChangeCallback(this.currentSoundId, false);
              }
              this.notify();
            }
          }
          break;

        default:
          break;
      }
    });
  }

  public getCurrentSoundId(): string | null {
    return this.currentSoundId;
  }

  public isCurrentlyMuted(): boolean {
    return this.isMuted;
  }

  public isPlayerReady(): boolean {
    return this.isReady;
  }

  /**
   * Sends a structured postMessage to the TikTok embed iframe
   */
  public sendCommand(type: string, value?: unknown) {
    if (!this.activeIframe || !this.activeIframe.contentWindow) {
      return;
    }

    try {
      this.activeIframe.contentWindow.postMessage(
        {
          type,
          ...(value !== undefined ? { value } : {}),
          'x-tiktok-player': true,
        },
        '*'
      );
    } catch (e) {
      console.warn('Could not postMessage to TikTok iframe:', e);
    }
  }

  /**
   * Request player to unmute
   */
  public unmute() {
    this.isMuted = false;
    this.sendCommand('unMute');
    this.sendCommand('setVolume', Math.max(1, this.volume));
    this.notify();
  }

  /**
   * Request player to mute
   */
  public mute() {
    this.isMuted = true;
    this.sendCommand('mute');
    this.notify();
  }

  /**
   * Set player volume (0 to 100)
   */
  public setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, Math.round(volume)));
    this.volume = clamped;
    this.sendCommand('setVolume', clamped);
    if (clamped > 0 && this.isMuted) {
      this.unmute();
    }
  }

  /**
   * Seek to specific position in seconds
   */
  public seekTo(seconds: number) {
    this.sendCommand('seekTo', Math.max(0, seconds));
  }

  /**
   * Resume / Play video
   */
  public play() {
    this.isPlaying = true;
    this.sendCommand('play');
    this.notify();
  }

  /**
   * Pause video
   */
  public pause() {
    this.sendCommand('pause');
    this.notify();
  }

  /**
   * Clears any active unmute pulse timers
   */
  private clearBurstTimers() {
    this.burstTimerIds.forEach((id) => window.clearTimeout(id));
    this.burstTimerIds = [];
  }

  /**
   * Mounts and plays a TikTok clip inside the specified DOM container
   */
  public playInContainer(
    targetElementId: string,
    soundId: string,
    tiktokUrlOrId: string,
    startTime: number = 0,
    duration?: number,
    endTime?: number,
    onEnded?: () => void
  ): boolean {
    const videoId = extractTikTokId(tiktokUrlOrId);
    if (!videoId) {
      console.warn('Could not extract TikTok video ID from:', tiktokUrlOrId);
      return false;
    }

    // Stop previous clip
    this.stop();

    const container = document.getElementById(targetElementId);
    if (!container) {
      console.warn('Target container element not found for TikTok embed:', targetElementId);
      return false;
    }

    this.currentSoundId = soundId;
    this.currentContainerId = targetElementId;
    this.onEndedCallback = onEnded || null;
    this.isPlaying = true;
    this.isReady = false;
    this.isMuted = false;
    this.startTime = Math.max(0, startTime);
    this.endTime = endTime !== undefined ? endTime : (duration && duration > 0 ? this.startTime + duration : undefined);
    this.duration = duration ?? (this.endTime !== undefined ? Math.max(0.1, this.endTime - this.startTime) : undefined);
    this.lastCurrentTime = null;
    this.hasInitialSeekCompleted = this.startTime <= 0;

    // Reset container smoothly
    container.innerHTML = '';

    // Create responsive player iframe with unmuted, autoplay, and start-time attributes
    const iframe = document.createElement('iframe');
    iframe.src = getTikTokPlayerUrl(videoId, true, false, startTime);
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.borderRadius = '0.75rem';
    // Feature policy ensuring audio, autoplay and inline display permissions
    iframe.allow =
      'accelerometer; autoplay *; clipboard-write; encrypted-media *; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.title = `TikTok Clip ${soundId}`;

    // Handle initial load event
    iframe.addEventListener('load', () => {
      this.isReady = true;
      this.unmute();
      this.setVolume(this.volume);
      if (this.startTime > 0) {
        this.seekTo(this.startTime);
      }
      this.play();
      this.notify();
    });

    container.appendChild(iframe);
    this.activeIframe = iframe;

    // Execute an aggressive burst of unMute and seek postMessages across the first 3 seconds
    // to break through browser autoplay mute delays as soon as the internal script mounts
    this.clearBurstTimers();
    const delays = [60, 150, 300, 500, 800, 1200, 1800, 2600, 3500];
    delays.forEach((delay) => {
      const timerId = window.setTimeout(() => {
        if (this.currentSoundId === soundId && this.activeIframe) {
          this.unmute();
          this.setVolume(this.volume);
          if (this.startTime > 0) {
            this.seekTo(this.startTime);
          }
        }
      }, delay);
      this.burstTimerIds.push(timerId);
    });

    // Note: Stop timers are strictly managed in onCurrentTime and onStateChange (PLAYING)
    // to match the exact media runtime without being distorted by network or iframe load times.

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(soundId, true);
    }
    this.notify();

    return true;
  }

  /**
   * Stop active TikTok playback and clean up DOM & listeners
   */
  public stop() {
    this.clearBurstTimers();
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (!this.currentSoundId && !this.activeIframe) {
      return;
    }

    // Try graceful pause before removal
    this.sendCommand('pause');

    this.currentSoundId = null;
    this.isPlaying = false;
    this.isReady = false;
    this.onEndedCallback = null;

    if (this.activeIframe) {
      try {
        this.activeIframe.src = 'about:blank';
        this.activeIframe.remove();
      } catch {
        // Safe fail
      }
      this.activeIframe = null;
    }

    if (this.currentContainerId) {
      const container = document.getElementById(this.currentContainerId);
      if (container) {
        container.innerHTML = '';
      }
      this.currentContainerId = null;
    }

    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(null, false);
    }
    this.notify();
  }
}

export const tiktokEngine = new TikTokEngine();
