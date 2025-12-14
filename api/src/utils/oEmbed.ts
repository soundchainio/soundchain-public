import axios from 'axios';

// Platform detection regex
const spotifyRegex = /spotify\.com/;
const soundcloudRegex = /soundcloud\.com/;
const bandcampRegex = /bandcamp\.com/;
const vimeoRegex = /vimeo\.com/;
const youtubeRegex = /(?:youtube\.com|youtu\.be)/;

/**
 * Fetches thumbnail URL for a media embed link via oEmbed APIs
 * This runs server-side to avoid CORS issues
 */
export async function fetchMediaThumbnail(mediaLink: string): Promise<string | null> {
  if (!mediaLink) return null;

  try {
    // Spotify - extract track/album/playlist URL from embed URL
    if (spotifyRegex.test(mediaLink)) {
      // Convert embed URL to regular URL for oEmbed
      const match = mediaLink.match(/spotify\.com\/embed\/(track|album|playlist)\/([a-zA-Z0-9]+)/);
      if (match) {
        const [, type, id] = match;
        const originalUrl = `https://open.spotify.com/${type}/${id}`;
        const response = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(originalUrl)}`, {
          timeout: 5000,
        });
        return response.data?.thumbnail_url || null;
      }
      // Try direct URL if not embed format
      const response = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(mediaLink)}`, {
        timeout: 5000,
      });
      return response.data?.thumbnail_url || null;
    }

    // SoundCloud - extract track URL from widget URL
    if (soundcloudRegex.test(mediaLink)) {
      // Widget URL format: https://w.soundcloud.com/player/?url=...
      const urlMatch = mediaLink.match(/url=([^&]+)/);
      if (urlMatch) {
        const trackUrl = decodeURIComponent(urlMatch[1]);
        const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`, {
          timeout: 5000,
        });
        return response.data?.thumbnail_url || null;
      }
      // Try direct URL
      const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(mediaLink)}&format=json`, {
        timeout: 5000,
      });
      return response.data?.thumbnail_url || null;
    }

    // Bandcamp - extract album art from embed URL
    if (bandcampRegex.test(mediaLink)) {
      // Bandcamp embed URLs contain album= or track= parameters
      // Format: https://bandcamp.com/EmbeddedPlayer/album=xxx/...
      const albumMatch = mediaLink.match(/album=(\d+)/);
      const trackMatch = mediaLink.match(/track=(\d+)/);

      if (albumMatch) {
        // Bandcamp album art URL pattern
        return `https://f4.bcbits.com/img/a${albumMatch[1]}_10.jpg`;
      }
      if (trackMatch) {
        // Track art URL pattern (may not always work)
        return `https://f4.bcbits.com/img/a${trackMatch[1]}_10.jpg`;
      }
      return null;
    }

    // Vimeo
    if (vimeoRegex.test(mediaLink)) {
      const match = mediaLink.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (match) {
        const videoId = match[1];
        const response = await axios.get(`https://vimeo.com/api/v2/video/${videoId}.json`, {
          timeout: 5000,
        });
        return response.data?.[0]?.thumbnail_large || response.data?.[0]?.thumbnail_medium || null;
      }
      return null;
    }

    // YouTube - direct thumbnail URL (no API needed)
    if (youtubeRegex.test(mediaLink)) {
      const match = mediaLink.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
      if (match) {
        return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
      }
      return null;
    }

    return null;
  } catch (error) {
    // Silently fail - thumbnail is optional
    console.error('Failed to fetch media thumbnail:', error instanceof Error ? error.message : error);
    return null;
  }
}
