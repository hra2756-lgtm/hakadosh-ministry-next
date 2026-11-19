export const BLOG_PROJECT_ID = '2a3jhsqe'
export const BLOG_PAGE_SIZE = 12
export const validSlug = value => typeof value === 'string' && value.length <= 96 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)

export function blogConfig(env = process.env) {
  const projectId = env.SANITY_PROJECT_ID || BLOG_PROJECT_ID
  // A deployment must opt into a dataset explicitly; never publish test content by accident.
  const dataset = env.SANITY_DATASET || (env.VERCEL ? '' : 'development')
  return /^[a-z0-9]+$/.test(projectId) && /^[a-z0-9_-]+$/.test(dataset)
    ? { projectId, dataset } : null
}

export function safeHttpsUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null
  } catch { return null }
}

export function youtubeUrl(value) {
  const safe = safeHttpsUrl(value)
  return safe && ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(new URL(safe).hostname) ? safe : null
}

export function imageUrl(asset, config) {
  // Build URLs from validated asset references, not arbitrary remote URLs from content.
  const match = /^image-([a-f0-9]+)-(\d+x\d+)-(jpg|jpeg|png|webp|gif|avif)$/.exec(asset?._ref || '')
  return match && config ? `https://cdn.sanity.io/images/${config.projectId}/${config.dataset}/${match[1]}-${match[2]}.${match[3]}?w=1400&fit=max&auto=format` : null
}

export function localizePost(post, language = 'en', config = blogConfig()) {
  if (!post || !validSlug(post.slug) || typeof post._id !== 'string' || post._id.includes('.')) return null
  const hasContent = lang => typeof post.title?.[lang] === 'string' && post.title[lang].trim() &&
    Array.isArray(post.body?.[lang]) && post.body[lang].some(block => block._type === 'block' && block.children?.some(child => child.text?.trim()))
  const contentLanguage = hasContent(language) ? language : hasContent(language === 'es' ? 'en' : 'es') ? (language === 'es' ? 'en' : 'es') : null
  if (!contentLanguage || !Number.isFinite(Date.parse(post.publishedAt))) return null
  const body = post.body[contentLanguage]
  const plain = body.flatMap(block => (block.children || []).map(child => child.text || '')).join(' ')
  return {
    id: post._id, slug: post.slug, language: contentLanguage,
    title: post.title[contentLanguage].slice(0, 180),
    excerpt: (post.excerpt?.[contentLanguage] || plain).slice(0, 300),
    body, publishedAt: post.publishedAt,
    automaticScriptureQuotes: post.automaticScriptureQuotes !== false,
    category: ['faith', 'prayer', 'testimony'].includes(post.category) ? post.category : 'reflection',
    image: imageUrl(post.image?.asset, config),
    alt: post.image?.alt?.[contentLanguage] || '',
    video: youtubeUrl(post.videoUrl),
  }
}

const filter = `_type == "post" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && defined(slug.current) && defined(publishedAt) && ((defined(title.en) && count(body.en) > 0) || (defined(title.es) && count(body.es) > 0))`
const projection = '{_id,"slug":slug.current,title,excerpt,body,publishedAt,category,image,videoUrl,automaticScriptureQuotes}'

export function listQuery(page) {
  const start = (page - 1) * BLOG_PAGE_SIZE
  return { query: `{"posts": *[${filter}] | order(publishedAt desc, _id asc)[$start...$end]${projection}, "total": count(*[${filter}])}`, params: { start, end: start + BLOG_PAGE_SIZE } }
}

export function postQuery(slug) {
  return { query: `*[${filter} && slug.current == $slug][0]${projection}`, params: { slug } }
}

export async function fetchBlog(config, request, fetcher = fetch) {
  if (!config) return { ok: false, result: null }
  const url = new URL(`https://${config.projectId}.api.sanity.io/v2026-11-14/data/query/${config.dataset}`)
  url.searchParams.set('query', request.query)
  url.searchParams.set('perspective', 'published')
  for (const [key, value] of Object.entries(request.params)) url.searchParams.set(`$${key}`, JSON.stringify(value))
  try {
    // No credentials: unauthenticated public reads cannot retrieve Sanity drafts.
    const response = await fetcher(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 60 } })
    if (!response.ok) return { ok: false, result: null }
    const data = await response.json()
    return Object.hasOwn(data, 'result') ? { ok: true, result: data.result } : { ok: false, result: null }
  } catch { return { ok: false, result: null } }
}

export function pageNumber(value) {
  return /^\d{1,4}$/.test(value || '') ? Math.max(1, Number(value)) : 1
}
