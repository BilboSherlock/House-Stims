/**
 * TikTok URL detection and video ID extraction utilities
 */

// Cache of known short-link IDs to full TikTok video IDs
const SHORT_LINK_MAP: Record<string, string> = {
  'ZN8jHUyaS': '7682884362580397334',
  'zn8jhuyas': '7682884362580397334',
};

/**
 * Checks if a string is a TikTok URL or identifier
 */
export function isTikTokUrl(urlOrId?: string): boolean {
  if (!urlOrId) return false;
  const lower = urlOrId.trim().toLowerCase();
  return (
    lower.includes('tiktok.com') ||
    lower.includes('vm.tiktok') ||
    lower.includes('vt.tiktok') ||
    /^\d{15,22}$/.test(urlOrId.trim())
  );
}

/**
 * Extracts a numeric video ID from various TikTok URL patterns:
 * - https://www.tiktok.com/@thetigerentertainment777/video/7682884362580397334
 * - https://www.tiktok.com/embed/v2/7682884362580397334
 * - https://www.tiktok.com/player/v1/7682884362580397334
 * - https://vm.tiktok.com/ZN8jHUyaS/
 * - 7682884362580397334
 */
export function extractTikTokId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();

  // Pure digits ID (15 to 22 digits)
  if (/^\d{15,22}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard video, embed, or player URL containing ID
  const directMatch = trimmed.match(/(?:video\/|v\/|embed\/v2\/|embed\/|player\/v1\/)(\d{15,22})/i);
  if (directMatch) {
    return directMatch[1];
  }

  // Check short link code (e.g. vm.tiktok.com/ZN8jHUyaS/)
  const shortMatch = trimmed.match(/(?:vm\.tiktok\.com|vt\.tiktok\.com)\/([a-zA-Z0-9_-]+)/i);
  if (shortMatch) {
    const code = shortMatch[1].replace(/\/$/, '');
    if (SHORT_LINK_MAP[code] || SHORT_LINK_MAP[code.toLowerCase()]) {
      return SHORT_LINK_MAP[code] || SHORT_LINK_MAP[code.toLowerCase()];
    }
  }

  return null;
}

/**
 * Builds the player iframe source URL for a TikTok video
 */
export function getTikTokPlayerUrl(
  videoId: string,
  autoplay: boolean = true,
  muted: boolean = false,
  startTime: number = 0
): string {
  const params = new URLSearchParams();
  if (autoplay) {
    params.set('autoplay', '1');
  } else {
    params.set('autoplay', '0');
  }
  // Explicitly signal unmuted state and full volume controls to TikTok player
  params.set('muted', muted ? '1' : '0');
  params.set('volume_control', '1');
  params.set('controls', '1');
  if (startTime > 0) {
    params.set('t', Math.floor(startTime).toString());
  }

  return `https://www.tiktok.com/player/v1/${videoId}?${params.toString()}`;
}
