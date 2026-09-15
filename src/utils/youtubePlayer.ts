import { extractYouTubeId } from './youtube';

// Extend window for YouTube IFrame API
declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (event: { target: YTPlayerInstance }) => void;
            onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
            onError?: (event: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
  }
}

export interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setVolume: (volume: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
}

class YouTubeEngine {
  private isApiLoaded = false;
  private isApiLoading = false;
  private readyCallbacks: Array<() => void> = [];
  private player: YTPlayerInstance | null = null;
  private currentSoundId: string | null = null;
  private stopTimer: number | null = null;
  private monitorIntervalId: number | null = null;
  private startTime: number = 0;
  private endTime?: number;
  private duration?: number;
  private volume: number = 85;
  private isMuted: boolean = false;
  private onStateChangeCallback: ((soundId: string | null, isPlaying: boolean) => void) | null = null;

  public registerStateCallback(cb: (soundId: string | null, isPlaying: boolean) => void) {
    this.onStateChangeCallback = cb;
  }

  public loadApi(): Promise<void> {
    if (this.isApiLoaded && window.YT?.Player) {
      return Promise.resolve();
    }
    if (this.isApiLoading) {
      return new Promise((resolve) => {
        this.readyCallbacks.push(resolve);
      });
    }

    this.isApiLoading = true;

    return new Promise((resolve) => {
      this.readyCallbacks.push(resolve);

      const existingScript = document.getElementById('youtube-iframe-api');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        this.isApiLoaded = true;
        this.isApiLoading = false;
        this.readyCallbacks.forEach((cb) => cb());
        this.readyCallbacks = [];
      };
    });
  }

  public async playInContainer(
    targetElementId: string,
    soundId: string,
    youtubeUrlOrId: string,
    startTime: number = 0,
    duration?: number,
    endTime?: number,
    onEnded?: () => void
  ): Promise<void> {
    const videoId = extractYouTubeId(youtubeUrlOrId);
    if (!videoId) {
      console.warn('Invalid YouTube URL or ID:', youtubeUrlOrId);
      return;
    }

    await this.loadApi();

    this.stop();

    this.currentSoundId = soundId;
    this.startTime = Math.max(0, startTime);
    this.endTime = endTime !== undefined ? endTime : (duration && duration > 0 ? this.startTime + duration : undefined);
    this.duration = duration ?? (this.endTime !== undefined ? Math.max(0.1, this.endTime - this.startTime) : undefined);

    const targetContainer = document.getElementById(targetElementId);
    if (!targetContainer) {
      console.warn('Target container element not found:', targetElementId);
      return;
    }

    targetContainer.innerHTML = '';
    const hostDiv = document.createElement('div');
    hostDiv.style.width = '100%';
    hostDiv.style.height = '100%';
    targetContainer.appendChild(hostDiv);

    new window.YT!.Player(hostDiv, {
      height: '100%',
      width: '100%',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        start: this.startTime > 0 ? Math.floor(this.startTime) : undefined,
        end: this.endTime !== undefined ? Math.ceil(this.endTime) : undefined,
        playsinline: 1,
        iv_load_policy: 3,
      },
      events: {
        onReady: (event) => {
          this.player = event.target;
          this.applyVolume();
          if (this.startTime > 0) {
            this.player.seekTo(this.startTime, true);
          }
          this.player.playVideo();
          this.onStateChangeCallback?.(soundId, true);
        },
        onStateChange: (event) => {
          if (event.data === window.YT?.PlayerState.ENDED) {
            this.stopMonitor();
            this.currentSoundId = null;
            this.onStateChangeCallback?.(null, false);
            onEnded?.();
          } else if (event.data === window.YT?.PlayerState.PLAYING) {
            this.onStateChangeCallback?.(this.currentSoundId, true);
            this.startMonitor(onEnded);
          } else if (event.data === window.YT?.PlayerState.PAUSED) {
            this.stopMonitor();
            this.onStateChangeCallback?.(null, false);
          } else if (event.data === window.YT?.PlayerState.BUFFERING) {
            // Buffering: pause monitor so buffered time does not count against runtime
            this.stopMonitor();
          }
        },
        onError: (err) => {
          console.warn('YouTube Player error code:', err.data);
          this.stopMonitor();
          this.currentSoundId = null;
          this.onStateChangeCallback?.(null, false);
        },
      },
    });
  }

  private startMonitor(onEnded?: () => void) {
    this.stopMonitor();
    if (this.endTime === undefined) return;

    const targetEnd = this.endTime;
    this.monitorIntervalId = window.setInterval(() => {
      if (!this.player || !this.currentSoundId) {
        this.stopMonitor();
        return;
      }
      try {
        const currentTime = this.player.getCurrentTime();
        if (typeof currentTime === 'number' && currentTime >= 0) {
          // If playback started before the requested start time, seek ahead
          if (this.startTime > 0 && currentTime < this.startTime - 0.5) {
            this.player.seekTo(this.startTime, true);
          }

          if (currentTime >= targetEnd) {
            this.stopMonitor();
            this.stop();
            onEnded?.();
          }
        }
      } catch {}
    }, 50);
  }

  private stopMonitor() {
    if (this.monitorIntervalId) {
      window.clearInterval(this.monitorIntervalId);
      this.monitorIntervalId = null;
    }
  }

  public stop(): void {
    this.stopMonitor();
    if (this.stopTimer) {
      window.clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }
    if (this.player) {
      try {
        this.player.stopVideo();
      } catch {}
    }
    const prevId = this.currentSoundId;
    this.currentSoundId = null;
    if (prevId) {
      this.onStateChangeCallback?.(null, false);
    }
  }

  public setVolume(volumeZeroToOne: number): void {
    this.volume = Math.round(Math.max(0, Math.min(1, volumeZeroToOne)) * 100);
    this.applyVolume();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.applyVolume();
  }

  private applyVolume(): void {
    if (!this.player) return;
    try {
      if (this.isMuted || this.volume === 0) {
        this.player.mute();
      } else {
        this.player.unMute();
        this.player.setVolume(this.volume);
      }
    } catch {}
  }

  public getCurrentSoundId(): string | null {
    return this.currentSoundId;
  }
}

export const youtubeEngine = new YouTubeEngine();
