// This module is used by the server-only adapter and Node verification scripts.
// The API key is supplied in memory and is never part of URLs or returned data.
export async function fetchPlaylistVideos({ playlistId, channelId, apiKey, fetchImpl = fetch }) {
  if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') throw new Error('YOUTUBE_NOT_CONFIGURED')

  async function request(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`)
    url.search = new URLSearchParams(params)
    try {
      const response = await fetchImpl(url, {
        headers: { 'X-Goog-Api-Key': apiKey },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      })
      if (!response.ok) throw new Error('YOUTUBE_UNAVAILABLE')
      return await response.json()
    } catch {
      // Upstream errors can contain request details. Do not propagate them.
      throw new Error('YOUTUBE_UNAVAILABLE')
    }
  }

  const ids = new Set()
  const tokens = new Set()
  let pageToken = ''
  do {
    if (tokens.has(pageToken) || tokens.size >= 100) throw new Error('YOUTUBE_PAGINATION_FAILED')
    tokens.add(pageToken)
    const data = await request('playlistItems', {
      part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}),
    })
    if (!Array.isArray(data.items)) throw new Error('YOUTUBE_INVALID_RESPONSE')
    for (const item of data.items) {
      const id = item.contentDetails?.videoId
      if (/^[A-Za-z0-9_-]{11}$/.test(id ?? '')) ids.add(id)
    }
    pageToken = data.nextPageToken ?? ''
  } while (pageToken)

  const videos = []
  const allIds = [...ids]
  for (let offset = 0; offset < allIds.length; offset += 50) {
    const data = await request('videos', {
      part: 'snippet,status', id: allIds.slice(offset, offset + 50).join(','),
    })
    if (!Array.isArray(data.items)) throw new Error('YOUTUBE_INVALID_RESPONSE')
    for (const item of data.items) {
      const snippet = item.snippet
      if (!ids.has(item.id) || snippet?.channelId !== channelId || item.status?.privacyStatus !== 'public') continue
      if (snippet.liveBroadcastContent === 'upcoming' || !Number.isFinite(Date.parse(snippet.publishedAt))) continue
      const thumbnails = snippet.thumbnails ?? {}
      const candidate = thumbnails.maxres?.url ?? thumbnails.high?.url ?? thumbnails.medium?.url ?? thumbnails.default?.url
      let thumbnail = null
      try {
        const url = new URL(candidate)
        if (url.protocol === 'https:' && url.hostname === 'i.ytimg.com') thumbnail = url.href
      } catch { /* A missing thumbnail must not hide an otherwise valid video. */ }
      videos.push({
        id: item.id, title: snippet.title, publishedAt: snippet.publishedAt,
        thumbnail, embeddable: item.status.embeddable === true,
      })
    }
  }
  return videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id))
}

export function visibleCount(value, total) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 6
  return Math.min(total, Math.max(6, Number.isSafeInteger(parsed) ? parsed : 6))
}
