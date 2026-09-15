import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, ExternalLink, Video, Volume2, VolumeX, Loader2, Music } from 'lucide-react';
import { SoundItem } from '../types';
import { extractYouTubeId } from '../utils/youtube';
import { isTikTokUrl, extractTikTokId } from '../utils/tiktok';
import { tiktokEngine, TikTokState } from '../utils/tiktokPlayer';

interface SoundCardProps {
  sound: SoundItem;
  isPlaying: boolean;
  onPlay: (sound: SoundItem, containerId?: string) => void;
  onStop?: (soundId: string) => void;
}

const COLOR_ACCENTS: Record<string, { border: string; activeRing: string; dot: string; buttonBg: string; activeBtn: string }> = {
  rose: {
    border: 'border-rose-900/50',
    activeRing: 'ring-2 ring-rose-500 border-rose-500 shadow-lg shadow-rose-950/50',
    dot: 'bg-rose-400',
    buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
    activeBtn: 'bg-rose-600 text-white',
  },
  amber: {
    border: 'border-amber-900/50',
    activeRing: 'ring-2 ring-amber-500 border-amber-500 shadow-lg shadow-amber-950/50',
    dot: 'bg-amber-400',
    buttonBg: 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold',
    activeBtn: 'bg-amber-500 text-stone-950 font-semibold',
  },
  violet: {
    border: 'border-violet-900/50',
    activeRing: 'ring-2 ring-violet-500 border-violet-500 shadow-lg shadow-violet-950/50',
    dot: 'bg-violet-400',
    buttonBg: 'bg-violet-600 hover:bg-violet-500 text-white',
    activeBtn: 'bg-violet-600 text-white',
  },
  cyan: {
    border: 'border-cyan-900/50',
    activeRing: 'ring-2 ring-cyan-500 border-cyan-500 shadow-lg shadow-cyan-950/50',
    dot: 'bg-cyan-400',
    buttonBg: 'bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold',
    activeBtn: 'bg-cyan-500 text-stone-950 font-semibold',
  },
  emerald: {
    border: 'border-emerald-900/50',
    activeRing: 'ring-2 ring-emerald-500 border-emerald-500 shadow-lg shadow-emerald-950/50',
    dot: 'bg-emerald-400',
    buttonBg: 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-semibold',
    activeBtn: 'bg-emerald-500 text-stone-950 font-semibold',
  },
  orange: {
    border: 'border-orange-900/50',
    activeRing: 'ring-2 ring-orange-500 border-orange-500 shadow-lg shadow-orange-950/50',
    dot: 'bg-orange-400',
    buttonBg: 'bg-orange-600 hover:bg-orange-500 text-white',
    activeBtn: 'bg-orange-600 text-white',
  },
  black: {
    border: 'border-stone-700',
    activeRing: 'ring-2 ring-stone-400 border-stone-400 shadow-lg shadow-black/60',
    dot: 'bg-stone-300',
    buttonBg: 'bg-stone-700 hover:bg-stone-600 text-stone-100 font-medium',
    activeBtn: 'bg-stone-700 text-stone-100',
  },
  stone: {
    border: 'border-stone-700',
    activeRing: 'ring-2 ring-stone-400 border-stone-400 shadow-lg shadow-black/60',
    dot: 'bg-stone-300',
    buttonBg: 'bg-stone-700 hover:bg-stone-600 text-stone-100 font-medium',
    activeBtn: 'bg-stone-700 text-stone-100',
  },
};

export const SoundCard: React.FC<SoundCardProps> = ({
  sound,
  isPlaying,
  onPlay,
  onStop,
}) => {
  const accent = COLOR_ACCENTS[sound.color || 'amber'] || COLOR_ACCENTS.amber;
  const containerId = `media-embed-${sound.id}`;

  // Detect media type: TikTok vs YouTube
  const rawTikTok = sound.tiktokUrl || (sound.youtubeUrl && isTikTokUrl(sound.youtubeUrl) ? sound.youtubeUrl : undefined);
  const isTikTok = !!rawTikTok;
  const isYouTube = !isTikTok && !!sound.youtubeUrl && sound.youtubeUrl.trim() !== '';

  const [imageError, setImageError] = useState(false);

  // Track TikTok player engine state when active
  const [tiktokState, setTiktokState] = useState<TikTokState>(() => tiktokEngine.getState());

  useEffect(() => {
    if (!isTikTok) return;
    const unsubscribe = tiktokEngine.subscribeState((state) => {
      if (state.soundId === sound.id || state.soundId === null) {
        setTiktokState(state);
      }
    });
    return unsubscribe;
  }, [isTikTok, sound.id]);

  // Extract identifiers
  const ytVideoId = isYouTube ? extractYouTubeId(sound.youtubeUrl) : null;
  const ttVideoId = isTikTok ? extractTikTokId(rawTikTok) : null;

  // Resolve thumbnail
  let thumbnailUrl = sound.thumbnailUrl || null;
  if (thumbnailUrl && thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('//')) {
    const base = import.meta.env.BASE_URL || './';
    const cleanBase = base === '/' ? '' : base.replace(/\/$/, '');
    thumbnailUrl = `${cleanBase}${thumbnailUrl}`;
  } else if (!thumbnailUrl && ytVideoId) {
    thumbnailUrl = `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`;
  }

  // Determine external URL & tooltip
  const externalUrl = isTikTok ? (sound.tiktokUrl || sound.youtubeUrl) : sound.youtubeUrl;
  const externalLabel = isTikTok ? 'Open on TikTok' : 'Open on YouTube';

  const isCurrentTikTokActive = isTikTok && isPlaying && tiktokState.soundId === sound.id;
  const isTikTokMuted = isCurrentTikTokActive && tiktokState.isMuted;
  const isTikTokReady = isCurrentTikTokActive && tiktokState.isReady;

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isPlaying) {
      if (onStop) onStop(sound.id);
    } else {
      onPlay(sound, containerId);
    }
  };

  const handleUnmute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    tiktokEngine.unmute();
    tiktokEngine.setVolume(100);
  };

  const handleMuteToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (tiktokState.isMuted) {
      tiktokEngine.unmute();
      tiktokEngine.setVolume(100);
    } else {
      tiktokEngine.mute();
    }
  };

  return (
    <div
      id={`sound-card-${sound.id}`}
      className={`relative w-full rounded-2xl bg-[#23201d] border overflow-hidden transition-all duration-200 flex flex-col group shadow-md shadow-black/40 ${
        isPlaying ? accent.activeRing : `${accent.border} hover:border-stone-600 hover:bg-[#282421]`
      }`}
    >
      {/* Video & Thumbnail Player Box (16:9 ratio, responsive across mobile & desktop) */}
      <div className="relative w-full aspect-video bg-[#2d2926] overflow-hidden select-none border-b border-stone-800/80">
        {/* Ambient Blurred Background (smooth backdrop for portrait TikToks & YouTube) */}
        {thumbnailUrl && !imageError && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-25 scale-125 pointer-events-none transition-opacity duration-500"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        )}

        {/* Active Embed Container (YouTube or TikTok) */}
        <div
          id={containerId}
          className={`w-full h-full absolute inset-0 z-10 transition-opacity duration-300 ${
            isPlaying ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Smooth Loading Indicator for TikTok while iframe is initializing */}
        <AnimatePresence>
          {isCurrentTikTokActive && !isTikTokReady && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full h-full absolute inset-0 z-20 bg-stone-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 pointer-events-none"
            >
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-2.5" />
              <span className="text-xs font-medium text-stone-300 tracking-wide">
                Loading clip...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating "Tap to Unmute" overlay pill for TikTok if muted by browser policy */}
        <AnimatePresence>
          {isCurrentTikTokActive && isTikTokMuted && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={handleUnmute}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs shadow-lg shadow-black/70 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
              aria-label="Unmute audio"
            >
              <VolumeX className="w-4 h-4 text-stone-950 fill-current animate-pulse" />
              <span>Tap to Unmute</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Thumbnail & Quick Tap to Play Overlay when idle */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={`Play ${sound.title}`}
            className="w-full h-full absolute inset-0 z-0 cursor-pointer overflow-hidden flex items-center justify-center group focus:outline-none"
          >
            {thumbnailUrl && !imageError ? (
              <img
                src={thumbnailUrl}
                alt={sound.title}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-active:scale-100"
                loading="lazy"
              />
            ) : isTikTok ? (
              /* Sleek TikTok fallback poster */
              <div className="w-full h-full bg-gradient-to-br from-[#2a2623] via-[#201d1b] to-[#181513] flex flex-col items-center justify-center p-4 relative">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800/90 border border-stone-700/80 text-stone-200 text-xs font-medium tracking-wide mb-2 shadow-sm">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span>TikTok Video</span>
                </div>
                <span className="text-[11px] text-stone-300 font-medium">Tap to play clip</span>
              </div>
            ) : (
              /* Styled Sound Artwork Canvas instead of empty black box */
              <div className="w-full h-full bg-gradient-to-br from-[#2c2825] via-[#24201e] to-[#1a1816] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-stone-750/90 border border-stone-650 flex items-center justify-center mb-2 shadow-inner">
                  <Music className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-stone-200 tracking-tight max-w-[200px] truncate">
                  {sound.title}
                </span>
                <span className="text-[11px] text-stone-400 mt-0.5">
                  {sound.category || 'Sound clip'}
                </span>
              </div>
            )}

            {/* Subtle Vignette Gradient - lightened so thumbnail artwork is clearly visible */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-70 group-hover:opacity-50 transition-opacity pointer-events-none" />

            {/* Tap-Friendly Center Play Button */}
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`absolute z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full ${accent.buttonBg} flex items-center justify-center shadow-xl shadow-black/70 transition-transform`}
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current translate-x-0.5" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Sleek Label & Action Bar */}
      <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-[#1a1715]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold text-sm sm:text-base text-stone-100 truncate tracking-tight group-hover:text-amber-200 transition-colors">
              {sound.title}
            </h2>
            {isTikTok && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 shrink-0">
                TikTok
              </span>
            )}
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

        {/* Action Controls: Play/Stop, TikTok Unmute Toggle, External Link */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Dedicated Mute/Unmute toggle button for active TikTok video */}
          {isCurrentTikTokActive && (
            <button
              type="button"
              onClick={handleMuteToggle}
              title={tiktokState.isMuted ? 'Unmute sound' : 'Mute sound'}
              aria-label={tiktokState.isMuted ? 'Unmute sound' : 'Mute sound'}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                tiktokState.isMuted
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
                  : 'bg-stone-800 text-stone-300 border-stone-700 hover:text-white hover:bg-stone-700'
              }`}
            >
              {tiktokState.isMuted ? (
                <VolumeX className="w-3.5 h-3.5 fill-current text-amber-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
          )}

          {/* Main Play / Stop Button */}
          <button
            id={`btn-play-${sound.id}`}
            type="button"
            onClick={handleToggle}
            aria-label={isPlaying ? `Stop ${sound.title}` : `Play ${sound.title}`}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm ${
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

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-stone-500 hover:text-stone-300 transition-colors"
              title={externalLabel}
              aria-label={externalLabel}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
