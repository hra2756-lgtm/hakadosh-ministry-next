import 'server-only'
import { unstable_cache } from 'next/cache'
import { fetchPlaylistVideos } from './youtube-data.mjs'

// Only sanitized public results are cached. Neither the secret nor request
// headers are cache arguments or stored fetch responses.
const cachedPlaylist = unstable_cache(async (playlistId, channelId) => ({
  videos: await fetchPlaylistVideos({ playlistId, channelId, apiKey: process.env.YOUTUBE_API_KEY }),
  fetchedAt: Date.now(),
}), ['hakadosh-youtube-v1'], { revalidate: 3600 })

export async function getPlaylist(playlistId, channelId) {
  if (!process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY === 'PASTE_YOUR_KEY_HERE') {
    return { videos: [], unavailable: true }
  }
  try {
    const result = await cachedPlaylist(playlistId, channelId)
    // Do not continue showing stale/deleted metadata indefinitely on outages.
    if (Date.now() - result.fetchedAt > 86400000) throw new Error('YOUTUBE_CACHE_EXPIRED')
    return { videos: result.videos, unavailable: false }
  } catch {
    return { videos: [], unavailable: true }
  }
}
