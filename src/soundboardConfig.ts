import { SoundboardConfig } from './types';

/**
 * ============================================================================
 * HOUSE STIM SOUNDBOARD CONFIGURATION
 * ============================================================================
 *
 * All stims and clips are configured here in code.
 * - To add more clips: Add an item to the `sounds` array.
 * - For YouTube clips: set `youtubeUrl: "https://youtu.be/..."`.
 * - For local audio files: place in `/public/sounds/` and set `audioSrc: "/sounds/clip.mp3"`.
 * ============================================================================
 */

export const SOUNDBOARD_CONFIG: SoundboardConfig = {
  appTitle: 'House Stims',
  appSubtitle: 'Tap to play',
  allowPolyphony: false,
  sounds: [
    {
      id: 'yt-get-out',
      title: 'Get Out!',
      description: 'Classic comedic house stim shout clip',
      youtubeUrl: 'https://youtu.be/iRnzJ6gtAeU?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'rose',
    },
    {
      id: 'yt-a-steak',
      title: 'A Steak!',
      description: 'Enthusiastic food stim moment',
      youtubeUrl: 'https://youtu.be/IG-hbYepJuo?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'amber',
    },
    {
      id: 'yt-eli-35',
      title: 'Eli, 35, Beautiful Woman',
      description: 'Iconic household quote stim clip',
      youtubeUrl: 'https://youtu.be/zBUjXdSbgsw?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'violet',
    },
    {
      id: 'yt-unc-dance',
      title: 'UNC Dance',
      description: 'Hype dance rhythm house stim',
      youtubeUrl: 'https://youtu.be/bpkDlz4ZwJU?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'cyan',
    },
    {
      id: 'yt-know-when-to-hold-them',
      title: 'Know When to Hold Them',
      description: 'Kenny Rogers Gambler house singalong clip',
      youtubeUrl: 'https://youtu.be/yPqvV7VbhCs?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'emerald',
    },
    {
      id: 'yt-can-i-sing-it-bartender',
      title: 'Can I Sing It, The Bartender',
      description: 'Lively vocal bartender stim song',
      youtubeUrl: 'https://youtu.be/Qdc2cgn09fQ?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'orange',
    },
    {
      id: 'yt-a-black-one',
      title: 'A Black One',
      description: 'House stim clip',
      youtubeUrl: 'https://youtu.be/I04LeOk8d_I?list=PLdUrbQOZtGn0',
      category: 'House Stims',
      color: 'black',
    },
  ],
};
