import React from 'react';
import { Sparkles, Zap, Shield, Headphones, Music, LucideIcon } from 'lucide-react';

interface CategoryBannerProps {
  category: string;
  count: number;
  isPlaying?: boolean;
}

interface CategoryStyle {
  icon: LucideIcon;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  bannerBorder: string;
  bannerGradient: string;
}

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  'House Stims': {
    icon: Sparkles,
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/30',
    bannerBorder: 'border-amber-500/25',
    bannerGradient: 'from-amber-950/40 via-stone-900/80 to-stone-900/60',
  },
  'X-Men': {
    icon: Zap,
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/30',
    bannerBorder: 'border-cyan-500/25',
    bannerGradient: 'from-cyan-950/40 via-stone-900/80 to-stone-900/60',
  },
  'Invincible': {
    icon: Shield,
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/30',
    bannerBorder: 'border-rose-500/25',
    bannerGradient: 'from-rose-950/40 via-stone-900/80 to-stone-900/60',
  },
  'Unc': {
    icon: Headphones,
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/30',
    bannerBorder: 'border-emerald-500/25',
    bannerGradient: 'from-emerald-950/40 via-stone-900/80 to-stone-900/60',
  },
};

const DEFAULT_CATEGORY_STYLE: CategoryStyle = {
  icon: Music,
  badgeBg: 'bg-violet-500/15',
  badgeText: 'text-violet-400',
  badgeBorder: 'border-violet-500/30',
  bannerBorder: 'border-stone-700/60',
  bannerGradient: 'from-stone-850 via-stone-900/80 to-stone-900/60',
};

const CategoryBannerComponent: React.FC<CategoryBannerProps> = ({
  category,
  count,
  isPlaying = false,
}) => {
  const style = CATEGORY_STYLES[category] || DEFAULT_CATEGORY_STYLE;
  const Icon = style.icon;

  return (
    <div
      id={`category-banner-${category.toLowerCase().replace(/\s+/g, '-')}`}
      className={`relative flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-gradient-to-r ${style.bannerGradient} border ${style.bannerBorder} backdrop-blur-sm shadow-md mb-4.5`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-lg ${style.badgeBg} ${style.badgeText} border ${style.badgeBorder} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-stone-100 truncate">
            {category}
          </h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-800/90 text-stone-300 border border-stone-700/60 shrink-0 font-mono">
            {count} {count === 1 ? 'clip' : 'clips'}
          </span>
        </div>
      </div>

      {isPlaying && (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/70 border border-emerald-700/50 px-2.5 py-1 rounded-full shrink-0 shadow-sm animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Active</span>
        </div>
      )}
    </div>
  );
};

export const CategoryBanner = React.memo(CategoryBannerComponent);
