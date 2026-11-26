import { listQuery, localizePost } from './blog-data.mjs'
import { normalize } from './bible.mjs'
import { terms, relevance } from './assistant-data.mjs'

// Paginate the public published perspective; no credentials or draft reads.
export async function readPublishedPosts(fetchPage) {
  const posts = [], seen = new Set()
  let offset = 0, total = Infinity
  while (offset < total) {
    const request = listQuery(1)
    request.params = { start: offset, end: offset + 100 }
    const response = await fetchPage(request)
    const page = response?.result
    if (!response?.ok || !Array.isArray(page?.posts) || !Number.isSafeInteger(page.total) || page.total < 0) return { posts, complete: false }
    total = page.total
    if (!page.posts.length) return { posts, complete: offset >= total }
    let added = 0
    for (const post of page.posts) {
      if (typeof post?._id !== 'string' || /^(drafts|versions)\./.test(post._id) || seen.has(post._id)) continue
      seen.add(post._id); posts.push(post); added++
    }
    if (!added && offset < total) return { posts, complete: false }
    offset += page.posts.length
  }
  return { posts, complete: true }
}

const aliases = [['faith','fe'], ['prayer','oracion','orar'], ['love','amor'], ['forgiveness','perdon'], ['wisdom','sabiduria'], ['hope','esperanza'], ['fear','miedo','temor'], ['salvation','salvacion'], ['money','dinero'], ['shepherd','pastor'], ['milk','leche']]
export function contentWords(message) {
  const words = terms(message)
  for (const group of aliases) if (group.some(word => words.includes(word))) words.push(...group)
  return [...new Set(words)]
}
function chunks(text) {
  const out = []
  for (let offset = 0; offset < text.length;) {
    let end = Math.min(offset + 1450, text.length)
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end)
      if (boundary > offset + 700) end = boundary
    }
    out.push(text.slice(offset, end).trim()); offset = end
  }
  return out.filter(Boolean)
}
const plainBody = body => body.filter(b => b._type === 'block').map(b => (b.children || []).map(s => s.text || '').join('')).join('\n\n')
const blogIntent = /\b(blog|posts?|articles?|entry|entries|publicacion(?:es)?|articulos?|entradas?|reflexion(?:es)?)\b/
const videoIntent = /\b(videos?|shorts?|youtube|channel|canal)\b/
const latest = /\b(latest|recent|newest|last|ultimo|ultima|ultimos|ultimas|reciente|recientes|nuevo|nueva)\b/

export function selectContent({ posts, videos, message, language, config }) {
  const query = normalize(message), words = contentWords(message)
  const ranked = posts.map(raw => {
    const variants = ['en','es'].map(lang => localizePost(raw, lang, config)).filter((p,i,a) => p && a.findIndex(x => x?.language === p.language) === i)
      .map(post => ({post, plain:plainBody(post.body)}))
    const score = Math.max(0, ...variants.map(({post,plain}) =>
      (query.includes(normalize(post.title)) ? 100 : 0) + relevance(post.title,words)*5 + relevance(plain,words)))
    return {variants, score, date:Date.parse(raw.publishedAt)}
  }).filter(p => p.variants.length && (p.score > 0 || blogIntent.test(query)))
    .sort((a,b) => blogIntent.test(query) && latest.test(query) ? b.date-a.date : b.score-a.score || b.date-a.date).slice(0,2)
  if ((blogIntent.test(query) && latest.test(query) && !/posts|publicaciones|articles|articulos|entries|entradas/.test(query)) || ranked[0]?.score >= 100) ranked.splice(1)
  const blogSources = []
  for (const {variants} of ranked) {
    const preferred = variants.find(v => v.post.language === language) || variants[0]
    // Rank every passage in BOTH translations; keep preferred language on ties.
    const passages = variants.flatMap(v => chunks(v.plain).map((text,index) => ({...v,text,index,score:relevance(text,words)})))
      .sort((a,b) => b.score-a.score || Number(b.post.language===language)-Number(a.post.language===language) || a.index-b.index)
    const selected = passages.slice(0, ranked.length === 1 ? 4 : 2)
    for (const passage of selected) {
      blogSources.push({id:`post-${blogSources.length}`,kind:'blog',title:passage.post.title,
        url:`/blog/${preferred.post.slug}`,text:`Published post; language ${passage.post.language}; date ${passage.post.publishedAt.slice(0,10)}; passage ${passage.index+1}. Excerpt, not necessarily the whole post:\n${passage.text}`})
    }
  }
  const rankedVideos = videos.map(v => ({...v,score:(query.includes(normalize(v.title)) ? 100 : 0)+relevance(v.title,words)*5}))
    .filter(v => v.score > 0 || videoIntent.test(query))
    .sort((a,b) => videoIntent.test(query) && latest.test(query) ? Date.parse(b.publishedAt)-Date.parse(a.publishedAt) : b.score-a.score || Number(b.language===language)-Number(a.language===language) || Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,2)
  const videoSources = rankedVideos.map((v,i) => ({id:`video-${i}`,kind:'video',title:v.title.slice(0,220),url:`https://www.youtube.com/watch?v=${v.id}`,
    text:`Public ${v.language} channel ${v.kind}; published ${v.publishedAt.slice(0,10)}. TITLE ONLY: ${v.title.slice(0,300)}. No transcript. You may discuss the biblical principle suggested by the title, clearly as general Bible teaching, not a claim about the video's actual message. No prophetic interpretation, predictions or financial advice.`}))
  return {blogSources,videoSources}
}
