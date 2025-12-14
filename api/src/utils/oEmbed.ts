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
 * @param mediaLink - The embed URL (may be converted from original)
 * @param originalMediaLink - The original user-submitted URL (better for oEmbed lookups)
 */
export async function fetchMediaThumbnail(mediaLink: string, originalMediaLink?: string): Promise<string | null> {
  if (!mediaLink) return null;

  // Use original URL if provided (better for oEmbed lookups)
  const lookupUrl = originalMediaLink || mediaLink;

  try {
    // Spotify - prefer original URL for oEmbed
    if (spotifyRegex.test(mediaLink)) {
      // First try with original URL if provided (open.spotify.com/track/xxx format)
      if (originalMediaLink && spotifyRegex.test(originalMediaLink) && !originalMediaLink.includes('/embed/')) {
        const response = await axios.get(`https://open.spotify.com/oembed?url=${encodeURIComponent(originalMediaLink)}`, {
          timeout: 5000,
        });
        return response.data?.thumbnail_url || null;
      }

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

    // SoundCloud - use original URL for oEmbed (embed URLs contain api.soundcloud.com which doesn't work)
    if (soundcloudRegex.test(mediaLink)) {
      // Prefer original URL if provided (soundcloud.com/artist/track format works with oEmbed)
      if (originalMediaLink && soundcloudRegex.test(originalMediaLink) && !originalMediaLink.includes('w.soundcloud.com') && !originalMediaLink.includes('api.soundcloud.com')) {
        const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(originalMediaLink)}&format=json`, {
          timeout: 5000,
        });
        // Get larger thumbnail (replace -large with -t500x500)
        const thumbnail = response.data?.thumbnail_url;
        if (thumbnail) {
          return thumbnail.replace('-large', '-t500x500').replace('-t200x200', '-t500x500');
        }
        return null;
      }

      // Widget URL format: https://w.soundcloud.com/player/?url=...
      // The url= param contains api.soundcloud.com URLs which don't work with oEmbed
      const urlMatch = mediaLink.match(/url=([^&]+)/);
      if (urlMatch) {
        const trackUrl = decodeURIComponent(urlMatch[1]);
        // Only try oEmbed if it's a regular soundcloud.com URL (not api.soundcloud.com)
        if (!trackUrl.includes('api.soundcloud.com')) {
          const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`, {
            timeout: 5000,
          });
          const thumbnail = response.data?.thumbnail_url;
          if (thumbnail) {
            return thumbnail.replace('-large', '-t500x500').replace('-t200x200', '-t500x500');
          }
        }
        return null;
      }

      // Try direct URL if not widget format
      if (!mediaLink.includes('w.soundcloud.com') && !mediaLink.includes('api.soundcloud.com')) {
        const response = await axios.get(`https://soundcloud.com/oembed?url=${encodeURIComponent(mediaLink)}&format=json`, {
          timeout: 5000,
        });
        const thumbnail = response.data?.thumbnail_url;
        if (thumbnail) {
          return thumbnail.replace('-large', '-t500x500').replace('-t200x200', '-t500x500');
        }
      }
      return null;
    }

    // Bandcamp - prefer original URL for fetching album art via page scraping
    if (bandcampRegex.test(mediaLink)) {
      // If we have the original URL (e.g., artist.bandcamp.com/album/xxx), we can fetch the page
      if (originalMediaLink && bandcampRegex.test(originalMediaLink) && !originalMediaLink.includes('EmbeddedPlayer')) {
        try {
          // Bandcamp pages have album art in meta tags
          const response = await axios.get(originalMediaLink, { timeout: 5000 });
          const html = response.data;
          // Look for og:image meta tag
          const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
          if (ogImageMatch && ogImageMatch[1]) {
            return ogImageMatch[1];
          }
        } catch {
          // Fall through to embed URL parsing
        }
      }

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
