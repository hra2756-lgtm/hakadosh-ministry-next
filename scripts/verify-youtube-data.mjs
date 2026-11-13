import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fetchPlaylistVideos, visibleCount } from '../src/lib/youtube-data.mjs'

const id = n => String(n).padStart(11, '0')
const video = (n, date, options = {}) => ({
  id: id(n), snippet: { title: `Video ${n}`, channelId: 'my-channel', publishedAt: date,
    thumbnails: { high: { url: `https://i.ytimg.com/vi/${id(n)}/hqdefault.jpg` } } },
  status: { privacyStatus: 'public', embeddable: true }, ...options,
})

test('fetches all playlist pages, removes duplicates, and sorts by actual video date', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push(url.href)
    assert.equal(options.headers['X-Goog-Api-Key'], 'test-secret')
    assert.equal(options.cache, 'no-store')
    assert.ok(!url.href.includes('test-secret'))
    if (url.pathname.endsWith('/playlistItems')) {
      return { ok: true, json: async () => url.searchParams.has('pageToken')
        ? { items: [2, 3].map(n => ({ contentDetails: { videoId: id(n) } })) }
        : { items: [1, 2].map(n => ({ contentDetails: { videoId: id(n) } })), nextPageToken: 'page2' } }
    }
    assert.equal(url.searchParams.get('id'), [1, 2, 3].map(id).join(','))
    return { ok: true, json: async () => ({ items: [video(1, '2025-01-01'), video(2, '2026-03-01'), video(3, '2026-01-01')] }) }
  }
  const result = await fetchPlaylistVideos({ playlistId: 'playlist', channelId: 'my-channel', apiKey: 'test-secret', fetchImpl })
  assert.deepEqual(result.map(v => v.id), [2, 3, 1].map(id))
  assert.equal(calls.length, 3)
  assert.ok(!JSON.stringify(result).includes('test-secret'))
})

test('filters private, removed, wrong-channel, upcoming, and undated videos; retains a YouTube link for non-embeddable videos', async () => {
  const items = [
    video(1, '2026-01-01'),
    video(2, '2026-01-02', { status: { privacyStatus: 'private', embeddable: true } }),
    video(3, '2026-01-03', { snippet: { channelId: 'other', publishedAt: '2026-01-03' } }),
    video(4, '2026-01-04', { status: { privacyStatus: 'public', embeddable: false } }),
    video(5, 'bad-date'),
    video(6, '2027-01-01', { snippet: { channelId: 'my-channel', publishedAt: '2027-01-01', liveBroadcastContent: 'upcoming' } }),
  ]
  const fetchImpl = async url => ({ ok: true, json: async () => url.pathname.endsWith('/playlistItems')
    ? { items: [1, 2, 3, 4, 5, 6, 7].map(n => ({ contentDetails: { videoId: id(n) } })) }
    : { items } })
  const result = await fetchPlaylistVideos({ playlistId: 'playlist', channelId: 'my-channel', apiKey: 'secret', fetchImpl })
  assert.deepEqual(result.map(v => v.id), [4, 1].map(id))
  assert.equal(result[0].embeddable, false)
})

test('API outages do not leak upstream errors or return a misleading partial list', async () => {
  await assert.rejects(fetchPlaylistVideos({ playlistId: 'p', channelId: 'c', apiKey: 'secret',
    fetchImpl: async () => { throw new Error('request included secret') },
  }), { message: 'YOUTUBE_UNAVAILABLE' })
  await assert.rejects(fetchPlaylistVideos({ playlistId: 'p', channelId: 'c', apiKey: 'secret',
    fetchImpl: async () => ({ ok: false }),
  }), { message: 'YOUTUBE_UNAVAILABLE' })
})

test('handles empty playlists and detects broken pagination', async () => {
  assert.deepEqual(await fetchPlaylistVideos({ playlistId: 'p', channelId: 'c', apiKey: 'secret',
    fetchImpl: async () => ({ ok: true, json: async () => ({ items: [] }) }),
  }), [])
  await assert.rejects(fetchPlaylistVideos({ playlistId: 'p', channelId: 'c', apiKey: 'secret',
    fetchImpl: async () => ({ ok: true, json: async () => ({ items: [], nextPageToken: 'same-token' }) }),
  }), { message: 'YOUTUBE_PAGINATION_FAILED' })
})

test('visible counts reject malformed query parameters and clamp to the available videos', () => {
  for (const value of [undefined, 'bad', '-20', ['12'], '999999999999999999999']) assert.equal(visibleCount(value, 20), 6)
  assert.equal(visibleCount('12', 20), 12)
  assert.equal(visibleCount('500', 20), 20)
  assert.equal(visibleCount('6', 0), 0)
})
