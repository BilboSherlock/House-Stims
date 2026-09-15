import React from 'react';
import { Volume2, VolumeX, Square, Code2 } from 'lucide-react';

interface HeaderControlsProps {
  title: string;
  subtitle?: string;
  activeCount: number;
  onStopAll: () => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onMuteToggle: () => void;
  onOpenCodeGenerator?: () => void;
}

const HeaderControlsComponent: React.FC<HeaderControlsProps> = ({
  title,
  subtitle,
  activeCount,
  onStopAll,
  volume,
  isMuted,
  onVolumeChange,
  onMuteToggle,
  onOpenCodeGenerator,
}) => {
  return (
    <header className="border-b border-stone-800/80 bg-stone-950/95 backdrop-blur sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3.5">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        {/* App Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-100 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] text-stone-400 truncate hidden xs:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Global Controls: Volume, Code Generator & Stop All */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Link Code Generator Modal Button */}
          {onOpenCodeGenerator && (
            <button
              id="btn-open-code-generator"
              type="button"
              onClick={onOpenCodeGenerator}
              title="Paste link to generate soundboard backend code"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-amber-500/50 text-stone-200 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Add Sound Code</span>
              <span className="sm:hidden">Add Code</span>
            </button>
          )}

          {/* Compact Volume Control */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-stone-900 border border-stone-800/90 rounded-xl px-2 sm:px-2.5 py-1.5">
            <button
              id="btn-mute-toggle"
              type="button"
              onClick={onMuteToggle}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="text-stone-400 hover:text-stone-200 transition-colors focus:outline-none"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              id="input-master-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              aria-label="Volume"
              className="w-14 sm:w-20 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-stone-200"
            />
          </div>

          {/* Stop All Button */}
          <button
            id="btn-stop-all"
            type="button"
            onClick={onStopAll}
            disabled={activeCount === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              activeCount > 0
                ? 'bg-rose-950/90 hover:bg-rose-900 border-rose-700 text-rose-200 cursor-pointer shadow-md'
                : 'bg-stone-900/50 border-stone-800/60 text-stone-600 cursor-default opacity-50'
            }`}
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export const HeaderControls = React.memo(HeaderControlsComponent);
