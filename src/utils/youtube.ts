/**
 * Helper to extract YouTube video ID from various URL shapes:
 * - https://youtu.be/iRnzJ6gtAeU?list=PLdUrbQOZtGn0
 * - https://www.youtube.com/watch?v=iRnzJ6gtAeU
 * - https://www.youtube.com/embed/iRnzJ6gtAeU
 * - iRnzJ6gtAeU
 */
export function extractYouTubeId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}
