const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Parse only supported YouTube URL forms; never accepts arbitrary embed HTML/URLs. */
export function parseYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id: string | null = null;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (url.pathname === '/watch') id = url.searchParams.get('v');
      else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] ?? null;
      else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] ?? null;
    } else if (host === 'youtu.be') {
      id = url.pathname.split('/')[1] ?? null;
    }
    return id && VIDEO_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const youtubeThumbnailUrl = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
export const youtubeEmbedUrl = (videoId: string) => `https://www.youtube-nocookie.com/embed/${videoId}`;
