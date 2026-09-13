import React from 'react';
import { motion } from 'motion/react';
import { Play, Square, ExternalLink } from 'lucide-react';
import { SoundItem } from '../types';
import { extractYouTubeId } from '../utils/youtube';

interface SoundCardProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem, containerId?: string) => void;
  onStop?: (soundId: string) => void;
}

const COLOR_ACCENTS: Record<string, { border: string; activeRing: string; dot: string; buttonBg: string; activeBtn: string }> = {
  rose: {
    border: 'border-rose-900/40',
    activeRing: 'ring-2 ring-rose-500/80 border-rose-500/80 shadow-lg shadow-rose-950/40',
    dot: 'bg-rose-400',
    buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
    activeBtn: 'bg-rose-600 text-white',
  },
  amber: {
    border: 'border-amber-900/40',
    activeRing: 'ring-2 ring-amber-500/80 border-amber-500/80 shadow-lg shadow-amber-950/40',
    dot: 'bg-amber-400',
    buttonBg: 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold',
    activeBtn: 'bg-amber-500 text-stone-950 font-semibold',
  },
  violet: {
    border: 'border-violet-900/40',
    activeRing: 'ring-2 ring-violet-500/80 border-violet-500/80 shadow-lg shadow-violet-950/40',
    dot: 'bg-violet-400',
    buttonBg: 'bg-violet-600 hover:bg-violet-500 text-white',
    activeBtn: 'bg-violet-600 text-white',
  },
  cyan: {
    border: 'border-cyan-900/40',
    activeRing: 'ring-2 ring-cyan-500/80 border-cyan-500/80 shadow-lg shadow-cyan-950/40',
    dot: 'bg-cyan-400',
    buttonBg: 'bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold',
    activeBtn: 'bg-cyan-500 text-stone-950 font-semibold',
  },
  emerald: {
    border: 'border-emerald-900/40',
    activeRing: 'ring-2 ring-emerald-500/80 border-emerald-500/80 shadow-lg shadow-emerald-950/40',
    dot: 'bg-emerald-400',
    buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold',
    activeBtn: 'bg-emerald-500 text-stone-950 font-semibold',
  },
  orange: {
    border: 'border-orange-900/40',
    activeRing: 'ring-2 ring-orange-500/80 border-orange-500/80 shadow-lg shadow-orange-950/40',
    dot: 'bg-orange-400',
    buttonBg: 'bg-orange-600 hover:bg-orange-500 text-white',
    activeBtn: 'bg-orange-600 text-white',
  },
  black: {
    border: 'border-stone-800',
    activeRing: 'ring-2 ring-stone-400/80 border-stone-400/80 shadow-lg shadow-black/50',
    dot: 'bg-stone-300',
    buttonBg: 'bg-stone-800 hover:bg-stone-700 text-stone-100',
    activeBtn: 'bg-stone-800 text-stone-100',
  },
  stone: {
    border: 'border-stone-800',
    activeRing: 'ring-2 ring-stone-400/80 border-stone-400/80 shadow-lg shadow-black/50',
    dot: 'bg-stone-300',
    buttonBg: 'bg-stone-800 hover:bg-stone-700 text-stone-100',
    activeBtn: 'bg-stone-800 text-stone-100',
  },
};

export const SoundCard: React.FC<SoundCardProps> = ({
  sound,
  isPlaying,
  onPlay,
  onStop,
}) => {
  const accent = COLOR_ACCENTS[sound.color || 'cyan'] || COLOR_ACCENTS.cyan;
  const containerId = `yt-embed-${sound.id}`;
  const videoId = extractYouTubeId(sound.youtubeUrl);
  const thumbnailUrl = videoId
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlaying) {
      if (onStop) onStop(sound.id);
    } else {
      onPlay(sound, containerId);
    }
  };

  return (
    <div
      id={`sound-card-${sound.id}`}
      className={`relative w-full rounded-2xl bg-stone-900/90 border overflow-hidden transition-all duration-200 flex flex-col ${
        isPlaying ? accent.activeRing : `${accent.border} hover:border-stone-700`
      }`}
    >
      {/* Video & Thumbnail Player Box (16:9 ratio, responsive on mobile) */}
      <div className="relative w-full aspect-video bg-black overflow-hidden select-none">
        {/* Active YouTube Iframe Container */}
        <div
          id={containerId}
          className={`w-full h-full absolute inset-0 z-10 transition-opacity duration-200 ${
            isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Thumbnail & Quick Tap to Play Overlay */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={`Play ${sound.title}`}
            className="w-full h-full absolute inset-0 z-0 cursor-pointer overflow-hidden flex items-center justify-center group focus:outline-none"
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={sound.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-100"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-stone-900" />
            )}

            {/* Subtle Vignette Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/30" />

            {/* Tap-Friendly Center Play Button */}
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`absolute z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full ${accent.buttonBg} flex items-center justify-center shadow-xl shadow-black/60 transition-transform`}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current translate-x-0.5" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Sleek Label & Toggle Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-stone-900/95">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm sm:text-base text-stone-100 truncate tracking-tight">
              {sound.title}
            </h2>
            {isPlaying && (
              <span className="flex h-2 w-2 relative shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${accent.dot}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${accent.dot}`} />
              </span>
            )}
          </div>
          {sound.description && (
            <p className="text-[11px] sm:text-xs text-stone-400 truncate mt-0.5">
              {sound.description}
            </p>
          )}
        </div>

        {/* Action Button: Play / Stop */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id={`btn-play-${sound.id}`}
            type="button"
            onClick={handleToggle}
            aria-label={isPlaying ? `Stop ${sound.title}` : `Play ${sound.title}`}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              isPlaying
                ? 'bg-rose-950 text-rose-200 border border-rose-800/80 shadow-sm'
                : accent.buttonBg
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {sound.youtubeUrl && (
            <a
              href={sound.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-stone-500 hover:text-stone-300 transition-colors"
              title="Open video on YouTube"
              aria-label={`Open ${sound.title} on YouTube`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
