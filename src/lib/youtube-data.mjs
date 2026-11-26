// This module is used by the server-only adapter and Node verification scripts.
// The API key is supplied in memory and is never part of URLs or returned data.
function youtubeRequest(apiKey, fetchImpl) {
  if (!apiKey || apiKey === 'PASTE_YOUR_KEY_HERE') throw new Error('YOUTUBE_NOT_CONFIGURED')

  return async function request(resource, params) {
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
}

export function durationLabel(value) {
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value || '')
  if (!match) return null
  const seconds = Number(match[1] || 0) * 86400 + Number(match[2] || 0) * 3600 + Number(match[3] || 0) * 60 + Number(match[4] || 0)
  if (!Number.isSafeInteger(seconds) || seconds <= 0) return null
  const hours = Math.floor(seconds / 3600), minutes = Math.floor(seconds % 3600 / 60)
  return `${hours ? `${hours}:` : ''}${hours ? String(minutes).padStart(2, '0') : minutes}:${String(seconds % 60).padStart(2, '0')}`
}

export async function fetchChannelStatistics({ channelId, apiKey, fetchImpl = fetch }) {
  const request = youtubeRequest(apiKey, fetchImpl)
  const data = await request('channels', { part: 'statistics', id: channelId })
  const item = data.items?.find(item => item.id === channelId)
  if (!item?.statistics) throw new Error('YOUTUBE_INVALID_RESPONSE')
  const count = value => typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null
  return {
    subscribers: item.statistics.hiddenSubscriberCount ? null : count(item.statistics.subscriberCount),
    videos: count(item.statistics.videoCount),
  }
}

export async function fetchPlaylistVideos({ playlistId, channelId, apiKey, fetchImpl = fetch }) {
  const request = youtubeRequest(apiKey, fetchImpl)

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
      part: 'snippet,status,contentDetails', id: allIds.slice(offset, offset + 50).join(','),
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
        duration: durationLabel(item.contentDetails?.duration),
      })
    }
  }
  return videos.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id))
}

// Use each channel's complete uploads collection for assistant title search,
// including public videos outside the website's curated playlists.
export async function fetchChannelVideos({ channelId, apiKey, fetchImpl = fetch }) {
  const request = youtubeRequest(apiKey, fetchImpl)
  const data = await request('channels', { part: 'contentDetails', id: channelId })
  const playlistId = data.items?.find(item => item.id === channelId)?.contentDetails?.relatedPlaylists?.uploads
  if (typeof playlistId !== 'string' || !/^[A-Za-z0-9_-]+$/.test(playlistId)) throw new Error('YOUTUBE_INVALID_RESPONSE')
  return fetchPlaylistVideos({playlistId, channelId, apiKey, fetchImpl})
}

export function visibleCount(value, total) {
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 6
  return Math.min(total, Math.max(6, Number.isSafeInteger(parsed) ? parsed : 6))
}
