import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code2,
  Copy,
  Check,
  X,
  ExternalLink,
  Video,
  Music,
  Sparkles,
  ClipboardPaste,
  Clock,
} from 'lucide-react';
import { isTikTokUrl, extractTikTokId } from '../utils/tiktok';
import { extractYouTubeId } from '../utils/youtube';

interface LinkCodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_COLORS = [
  { id: 'amber', name: 'Amber', dot: 'bg-amber-400' },
  { id: 'cyan', name: 'Cyan', dot: 'bg-cyan-400' },
  { id: 'violet', name: 'Violet', dot: 'bg-violet-400' },
  { id: 'rose', name: 'Rose', dot: 'bg-rose-400' },
  { id: 'emerald', name: 'Emerald', dot: 'bg-emerald-400' },
  { id: 'orange', name: 'Orange', dot: 'bg-orange-400' },
  { id: 'black', name: 'Dark Stone', dot: 'bg-stone-400' },
] as const;

export const LinkCodeGeneratorModal: React.FC<LinkCodeGeneratorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('House Stims');
  const [color, setColor] = useState<'amber' | 'cyan' | 'violet' | 'rose' | 'emerald' | 'orange' | 'black'>('amber');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset copied state on url or config change
  useEffect(() => {
    setCopied(false);
  }, [url, title, category, color, startTimeInput, endTimeInput]);

  // Detect link type and parameters
  const linkAnalysis = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) {
      return { type: 'empty', id: null, startTime: 0 };
    }

    if (isTikTokUrl(trimmed)) {
      const ttId = extractTikTokId(trimmed);
      return {
        type: 'tiktok',
        id: ttId,
        startTime: 0,
      };
    }

    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      // Check for timestamp (e.g. t=120 or t=2m0s)
      let startTime = 0;
      const tMatch = trimmed.match(/[?&]t=([0-9mh]+s?|[0-9]+)/);
      if (tMatch) {
        const rawTime = tMatch[1];
        if (/^\d+$/.test(rawTime)) {
          startTime = parseInt(rawTime, 10);
        } else {
          // Parse e.g. 1m30s
          let total = 0;
          const min = rawTime.match(/(\d+)m/);
          const sec = rawTime.match(/(\d+)s/);
          if (min) total += parseInt(min[1], 10) * 60;
          if (sec) total += parseInt(sec[1], 10);
          startTime = total;
        }
      }

      return {
        type: 'youtube',
        id: ytId,
        startTime,
      };
    }

    // Direct audio URL check (.mp3, .wav, .ogg, .m4a, or http link)
    if (/\.(mp3|wav|ogg|m4a|aac)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('http')) {
      const fileNameMatch = trimmed.match(/\/([a-zA-Z0-9_-]+)\.(mp3|wav|ogg|m4a|aac)/i);
      const cleanName = fileNameMatch ? fileNameMatch[1] : 'clip';
      return {
        type: 'audio',
        id: cleanName,
        startTime: 0,
      };
    }

    return { type: 'unknown', id: null, startTime: 0 };
  }, [url]);

  // Derived Title placeholder / value
  const resolvedTitle = title.trim() || 'New Sound Clip';

  // Generate the formatted code snippet
  const generatedSnippet = useMemo(() => {
    const trimmedUrl = url.trim();
    const safeTitle = resolvedTitle.replace(/'/g, "\\'");
    const safeCategory = (category.trim() || 'House Stims').replace(/'/g, "\\'");

    const parsedStart = startTimeInput.trim() !== '' ? Number(startTimeInput) : (linkAnalysis.startTime > 0 ? linkAnalysis.startTime : undefined);
    const parsedEnd = endTimeInput.trim() !== '' ? Number(endTimeInput) : undefined;

    let timingProps = '';
    if (parsedStart !== undefined && !isNaN(parsedStart) && parsedStart >= 0) {
      timingProps += `\n      startTime: ${parsedStart},`;
    }
    if (parsedEnd !== undefined && !isNaN(parsedEnd) && parsedEnd > 0) {
      timingProps += `\n      endTime: ${parsedEnd},`;
    }

    if (linkAnalysis.type === 'tiktok') {
      const soundId = linkAnalysis.id ? `tiktok-${linkAnalysis.id}` : `tiktok-${Date.now().toString().slice(-6)}`;
      return `    {
      id: '${soundId}',
      title: '${safeTitle}',
      description: 'House stim clip',
      tiktokUrl: '${trimmedUrl}',${timingProps}
      category: '${safeCategory}',
      color: '${color}',
    },`;
    }

    if (linkAnalysis.type === 'youtube') {
      const soundId = linkAnalysis.id ? `yt-${linkAnalysis.id}` : `yt-${Date.now().toString().slice(-6)}`;
      return `    {
      id: '${soundId}',
      title: '${safeTitle}',
      description: 'House stim clip',
      youtubeUrl: '${trimmedUrl}',${timingProps}
      category: '${safeCategory}',
      color: '${color}',
    },`;
    }

    if (linkAnalysis.type === 'audio') {
      const soundId = linkAnalysis.id ? `audio-${linkAnalysis.id}` : `audio-${Date.now().toString().slice(-6)}`;
      return `    {
      id: '${soundId}',
      title: '${safeTitle}',
      description: 'House stim clip',
      audioSrc: '${trimmedUrl}',${timingProps}
      category: '${safeCategory}',
      color: '${color}',
    },`;
    }

    // Default template if no URL pasted yet
    return `    {
      id: 'clip-${Date.now().toString().slice(-6)}',
      title: '${safeTitle}',
      description: 'House stim clip',
      tiktokUrl: 'PASTE_TIKTOK_OR_YOUTUBE_URL_HERE',${timingProps}
      category: '${safeCategory}',
      color: '${color}',
    },`;
  }, [url, resolvedTitle, category, color, linkAnalysis, startTimeInput, endTimeInput]);

  // Handle Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback copy using textarea
      const el = document.createElement('textarea');
      el.value = generatedSnippet;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Handle Paste from Clipboard button
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
      }
    } catch {
      // Browser permission denied or not supported, ignore silently
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800/80 bg-stone-900/90">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-stone-100">
                  Generate Sound Code
                </h2>
                <p className="text-xs text-stone-400">
                  Paste a link to generate the configuration code to paste
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form & Code Content */}
          <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
            {/* Link Input Field */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Paste Link (TikTok or YouTube)
              </label>
              <div className="relative flex items-center">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="e.g. https://www.tiktok.com/@.../video/... or https://youtu.be/..."
                  className="w-full bg-stone-950 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-stone-100 text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500/80 pr-20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  title="Paste from clipboard"
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </button>
              </div>

              {/* Detected Link Indicator */}
              <div className="mt-1.5 flex items-center gap-2">
                {linkAnalysis.type === 'tiktok' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                    <Video className="w-3 h-3" />
                    TikTok Video Detected
                  </span>
                )}
                {linkAnalysis.type === 'youtube' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-md">
                    <Video className="w-3 h-3" />
                    YouTube Clip Detected {linkAnalysis.startTime > 0 ? `(starts @ ${linkAnalysis.startTime}s)` : ''}
                  </span>
                )}
                {linkAnalysis.type === 'audio' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                    <Music className="w-3 h-3" />
                    Direct Audio File Detected
                  </span>
                )}
                {linkAnalysis.type === 'unknown' && url.trim() !== '' && (
                  <span className="text-[11px] text-amber-400/80">
                    Custom link (will generate standard audio/clip config)
                  </span>
                )}
              </div>
            </div>

            {/* Sound Title & Category in 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Sound Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Inside Scoop"
                  className="w-full bg-stone-950 border border-stone-700/80 rounded-xl px-3 py-2 text-stone-100 text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500/80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="House Stims"
                  className="w-full bg-stone-950 border border-stone-700/80 rounded-xl px-3 py-2 text-stone-100 text-xs sm:text-sm placeholder:text-stone-600 focus:outline-none focus:border-amber-500/80"
                />
              </div>
            </div>

            {/* Clip Segment Timestamps (Optional) */}
            <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Clip Segment / Timestamps <span className="text-stone-500 font-normal">(Optional)</span>
                </span>
                <span className="text-[11px] text-stone-500 font-mono">Seconds</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">
                    Start Time (s)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    placeholder={linkAnalysis.startTime > 0 ? `${linkAnalysis.startTime} (detected)` : '0'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-100 text-xs placeholder:text-stone-600 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-stone-400 mb-1">
                    End Time (s)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={endTimeInput}
                    onChange={(e) => setEndTimeInput(e.target.value)}
                    placeholder="e.g. 7 or 42"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1.5 text-stone-100 text-xs placeholder:text-stone-600 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>
              <p className="text-[10px] text-stone-500">
                Stops playback automatically at end time (e.g. 27s to 42s). Leave blank to play full clip.
              </p>
            </div>

            {/* Accent Color Selection */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Card Accent Color
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      color === c.id
                        ? 'bg-stone-800 border-stone-400 text-stone-100 font-semibold'
                        : 'bg-stone-950/70 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code Output Box */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Generated Code to Paste:
                </span>
                <span className="text-[11px] text-stone-500">
                  into <code className="text-stone-300 bg-stone-800 px-1 py-0.5 rounded">src/soundboardConfig.ts</code>
                </span>
              </div>

              <div className="relative group">
                <pre className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 font-mono text-[11px] sm:text-xs text-stone-200 overflow-x-auto selection:bg-stone-700 selection:text-white leading-relaxed">
                  <code>{generatedSnippet}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 border-t border-stone-800/80 bg-stone-900/90 flex items-center justify-between gap-3">
            <p className="text-[11px] text-stone-500 truncate hidden sm:block">
              Paste inside <span className="text-stone-400 font-mono">sounds: [...]</span>
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
              >
                Close
              </button>

              <button
                id="btn-copy-generated-code"
                type="button"
                onClick={handleCopy}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-md cursor-pointer ${
                  copied
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Backend Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
