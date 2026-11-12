import { youtubeChannels } from '../src/lib/youtube-channels.mjs'
import { fetchPlaylistVideos } from '../src/lib/youtube-data.mjs'

// Output only public playlist metadata and sanitized API errors, never the key.
if (!process.env.YOUTUBE_API_KEY) throw new Error('YouTube key is not configured')
for (const [language, channel] of Object.entries(youtubeChannels)) {
  for (const kind of ['videos', 'shorts']) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlists')
    url.search = new URLSearchParams({ part: 'snippet,contentDetails,status', id: channel[kind] })
    try {
      const response = await fetch(url, {
        headers: { 'X-Goog-Api-Key': process.env.YOUTUBE_API_KEY },
        signal: AbortSignal.timeout(15000),
      })
      const data = await response.json()
      console.log(JSON.stringify({ language, kind, id: channel[kind], status: response.status,
        reason: data.error?.errors?.[0]?.reason,
        playlists: data.items?.map(item => ({ title: item.snippet.title, channel: item.snippet.channelTitle,
          channelId: item.snippet.channelId, count: item.contentDetails.itemCount, visibility: item.status.privacyStatus })) }))
      if (!response.ok || data.items?.length !== 1 || data.items[0].snippet.channelId !== channel.channelId) {
        process.exitCode = 1
        continue
      }
      const videos = await fetchPlaylistVideos({ playlistId: channel[kind], channelId: channel.channelId, apiKey: process.env.YOUTUBE_API_KEY })
      console.log(JSON.stringify({ language, kind, fetched: videos.length, newest: videos[0]?.title,
        newestDate: videos[0]?.publishedAt, oldestDate: videos.at(-1)?.publishedAt,
        sorted: videos.every((v, i) => i === 0 || Date.parse(v.publishedAt) <= Date.parse(videos[i - 1].publishedAt)) }))
    } catch {
      console.log(JSON.stringify({ language, kind, error: 'Network request failed' }))
      process.exitCode = 1
    }
  }
}
