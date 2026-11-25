import 'server-only'
import { fetchBlog, blogConfig, listQuery, localizePost } from './blog-data.mjs'
import { getPlaylist } from './youtube'
import { youtubeChannels } from './youtube-channels.mjs'
import { bibleSources, ministrySources, terms, relevance, relevantExcerpt } from './assistant-data.mjs'

export async function assistantKnowledge(message, language) {
  const words = terms(message), config = blogConfig()
  const channel = youtubeChannels[language]
  // Public, credential-free published perspective. This uses the same dataset as the local blog.
  const request = listQuery(1)
  request.params.end = 200
  const [blog, videoResults, shortResults] = await Promise.all([
    fetchBlog(config, request),
    getPlaylist(channel.videos, channel.channelId),
    getPlaylist(channel.shorts, channel.channelId),
  ])
  const posts = (blog.result?.posts || []).map(post => localizePost(post, language, config)).filter(Boolean)
  const latestPost = /latest (?:blog )?post|recent (?:blog )?post|ultimo (?:articulo|post)|últim[oa] (?:publicación|entrada)/i.test(message)
  const ranked = posts.map((post, index) => {
    const plain = post.body.filter(b => b._type === 'block').map(b => (b.children || []).map(s => s.text || '').join('')).join('\n')
    return { post, plain, score: latestPost ? 1000 - index : relevance(post.title, words) * 3 + relevance(plain, words) }
  }).filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 2)
  const uniqueVideos = [...new Map([...videoResults.videos, ...shortResults.videos].map(v => [v.id, v])).values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
  const latestVideo = /latest (?:video|short)|último (?:video|vídeo|short)/i.test(message)
  const videos = uniqueVideos.map((v, index) => ({ ...v, score: latestVideo ? 1000 - index : relevance(v.title, words) }))
    .filter(v => v.score > 0).sort((a, b) => b.score - a.score).slice(0, 2)
  return [
    ...ministrySources(language), ...bibleSources(message, language),
    ...ranked.map(({ post, plain }, i) => ({ id: `post-${i}`, kind: 'blog', title: post.title, url: `/blog/${post.slug}`,
      text: `Published ministry post (${post.language}), excerpt only: ${relevantExcerpt(plain, words)}` })),
    ...videos.map(v => ({ id: `video-${v.id.toLowerCase().replaceAll('_', '-')}`, kind: 'video', title: v.title.slice(0, 220),
      text: 'Verified public ministry video TITLE ONLY. No transcript available; do not summarize or claim knowledge of its teaching.', url: `https://www.youtube.com/watch?v=${v.id}` })),
  ].slice(0, 16)
}
