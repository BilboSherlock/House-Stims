export interface SoundItem {
  /** Unique ID for the sound */
  id: string;
  /** Display title of the stim or clip */
  title: string;
  /** Short description or context (e.g. "Whistle chirp", "Satisfying wooden tap") */
  description?: string;
  /**
   * Path to local audio file relative to the public folder.
   * Example: "/sounds/my-clip.mp3" or "" if using procedural synthesis placeholder.
   */
  audioSrc?: string;
  /**
   * Optional YouTube URL or ID (e.g. 'https://youtu.be/iRnzJ6gtAeU' or 'iRnzJ6gtAeU').
   * If provided, the soundboard will play the audio directly from YouTube!
   */
  youtubeUrl?: string;
  /** Optional TikTok URL or video ID (e.g. 'https://www.tiktok.com/@.../video/7682884362580397334' or 'https://vm.tiktok.com/ZN8jHUyaS/') */
  tiktokUrl?: string;
  /** Optional general video URL (YouTube or TikTok or direct video) */
  videoUrl?: string;
  /** Optional custom thumbnail preview image */
  thumbnailUrl?: string;
  /** Optional start offset in seconds for clip playback (supports YouTube, TikTok, and audio) */
  startTime?: number;
  /** Optional end offset in seconds for clip playback (stops playback when reached) */
  endTime?: number;
  /** Optional duration in seconds for clip playback */
  duration?: number;
  /** Optional start offset in seconds for YouTube clip (alias for startTime) */
  youtubeStartTime?: number;
  /** Optional duration or end offset in seconds for YouTube clip (alias for duration) */
  youtubeDuration?: number;
  /**
   * Built-in zero-dependency sound synthesizer used if audioSrc is empty or fails to load.
   * Gives instant, satisfying stim sounds without needing any audio files yet!
   */
  synthSound?:
    | 'bubble-pop'
    | 'chime-high'
    | 'wooden-tap'
    | 'gentle-purr'
    | 'marimba-note'
    | 'spring-boing'
    | 'laser-blip'
    | 'calm-gong'
    | 'click-snap'
    | 'sub-thump'
    | 'empty';
  /** Keyboard trigger shortcut key (e.g. "1", "Q", "A", "Space") */
  keyShortcut?: string;
  /** Group / category tag (e.g. "Vocal Stims", "Rhythms", "Clicks & Pops", "Custom") */
  category?: string;
  /** Relative volume multiplier (0.0 to 1.0, defaults to 1.0) */
  volume?: number;
  /** Accent color variant for the button border/glow */
  color?: 'amber' | 'emerald' | 'indigo' | 'rose' | 'cyan' | 'violet' | 'sky' | 'orange' | 'fuchsia' | 'black' | 'stone';
  /** Loop sound continuously until tapped again (defaults to false) */
  loop?: boolean;
}

export interface SoundboardConfig {
  /** Soundboard main title */
  appTitle: string;
  /** Subtitle / house stim note */
  appSubtitle: string;
  /** Allow multiple sounds to play simultaneously (polyphony) */
  allowPolyphony: boolean;
  /** List of all sound items configured in the codebase */
  sounds: SoundItem[];
}
