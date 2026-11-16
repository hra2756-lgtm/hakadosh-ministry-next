import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import { blogConfig, validSlug } from './blog-data.mjs'

export const LIKE_COOKIE = 'hm-likes-v1'
const YEAR = 31_536_000
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/

function credentialValue(value) {
  const text = value?.trim() || ''
  // Dashboard examples wrap values in quotes; Generic Credentials preserve those quotes.
  return ['"', "'"].includes(text[0]) && text.at(-1) === text[0] ? text.slice(1, -1) : text
}

export function likesConfig(env = process.env) {
  const blog = blogConfig(env)
  const token = credentialValue(env.UPSTASH_REDIS_REST_TOKEN)
  try {
    const url = new URL(credentialValue(env.UPSTASH_REDIS_REST_URL))
    if (!blog || !token || /\s/.test(token) || url.protocol !== 'https:' ||
      !/^[a-z0-9-]+\.upstash\.io$/.test(url.hostname) || url.port || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/') return null
    const stage = env.VERCEL ? (env.VERCEL_ENV === 'production' ? 'production' : 'preview') : 'local'
    const prefix = `hm:likes:v1:${stage}:${blog.projectId}:${blog.dataset}`
    // Derive a separate signing key. Rotating the Redis token also resets browser recognition.
    const signingKey = createHmac('sha256', token).update(`cookie-signing:${prefix}`).digest()
    return { url: url.origin, token, prefix, signingKey }
  } catch { return null }
}

const digest = value => createHash('sha256').update(value).digest('hex')
const mac = (config, value) => createHmac('sha256', config.signingKey).update(value).digest('base64url')

export function makeVisitorCookie(config, id = randomUUID(), now = Date.now()) {
  const payload = `${id}.${Math.floor(now / 1000) + YEAR}`
  return `${payload}.${mac(config, payload)}`
}

export function readVisitor(request, config, now = Date.now()) {
  const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${LIKE_COOKIE}=`))?.slice(LIKE_COOKIE.length + 1)
  const [id, expiry, signature, extra] = (cookie || '').split('.')
  if (extra !== undefined || !UUID.test(id || '') || !/^\d{10}$/.test(expiry || '') || !/^[a-zA-Z0-9_-]{43}$/.test(signature || '')) return null
  const seconds = Math.floor(now / 1000)
  if (Number(expiry) <= seconds || Number(expiry) > seconds + YEAR + 60) return null
  const expected = mac(config, `${id}.${expiry}`)
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature)) ? id : null
}

export const RATE_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], 60) end
if count > tonumber(ARGV[1]) then return 0 end
return 1`

export const LIKE_SCRIPT = `
if ARGV[2] == 'like' then redis.call('SADD', KEYS[1], ARGV[1]) end
if ARGV[2] == 'unlike' then redis.call('SREM', KEYS[1], ARGV[1]) end
return {redis.call('SCARD', KEYS[1]), redis.call('SISMEMBER', KEYS[1], ARGV[1])}`

export async function redisCommand(config, command, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(config.url, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(6000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(command),
    })
    if (!response.ok) throw new Error('unavailable')
    const data = await response.json()
    if (!Object.hasOwn(data, 'result') || data.error) throw new Error('unavailable')
    return data.result
  } catch { throw new Error('Likes storage unavailable') }
}

export async function changeLike(config, postId, visitorId, action, command = args => redisCommand(config, args)) {
  if (!['read', 'like', 'unlike'].includes(action)) throw new Error('Invalid action')
  const key = `${config.prefix}:post:${digest(postId)}`
  const member = mac(config, `visitor:${visitorId}`)
  const result = await command(['EVAL', LIKE_SCRIPT, 1, key, member, action])
  if (!Array.isArray(result) || !Number.isSafeInteger(result[0]) || result[0] < 0 || ![0, 1].includes(result[1])) throw new Error('Invalid count')
  return { count: result[0], liked: result[1] === 1 }
}

function allowedRequest(request, env, writing) {
  const url = new URL(request.url)
  const allowed = new Set(['https://www.hakadoshministry.com', 'https://hakadoshministry.com'])
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
    if (host && /^[a-zA-Z0-9.-]+\.vercel\.app$/.test(host)) allowed.add(`https://${host}`)
  }
  if (!env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) allowed.add(url.origin)
  if (!allowed.has(url.origin) || request.headers.get('sec-fetch-site') === 'cross-site') return false
  const origin = request.headers.get('origin')
  return origin ? origin === url.origin : !writing
}

async function readInput(request) {
  if (Number(request.headers.get('content-length')) > 128) throw new Error('size')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('body')
  const chunks = []
  let length = 0
  const timer = setTimeout(() => { void reader.cancel() }, 5000)
  try {
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.length
      if (length > 128) { await reader.cancel(); throw new Error('size') }
      chunks.push(value)
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!data || Array.isArray(data) || Object.keys(data).length !== 1 || typeof data.liked !== 'boolean') throw new Error('input')
    return data.liked
  } finally { clearTimeout(timer); reader.releaseLock() }
}

function respond(data, status = 200, headers = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie', ...headers } })
}

// Only this fixed operation is exposed. No arbitrary Redis commands or client-supplied totals.
export async function handleLikes(request, slug, { env = process.env, lookupPost, command: suppliedCommand } = {}) {
  const writing = request.method === 'POST'
  if (!['GET', 'POST'].includes(request.method)) return respond({ code: 'invalid' }, 405)
  if (!validSlug(slug) || !allowedRequest(request, env, writing)) return respond({ code: 'invalid' }, 403)
  if (writing && request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return respond({ code: 'invalid' }, 415)
  const config = likesConfig(env)
  if (!config) return respond({ code: 'unavailable' }, 503)
  let visitor = readVisitor(request, config)
  if (writing && !visitor) return respond({ code: 'refresh' }, 403)
  let desired
  if (writing) {
    try { desired = await readInput(request) }
    catch { return respond({ code: 'invalid' }, 400) }
  }
  // Trust this header only when running on Vercel. Local requests share a local bucket.
  const ip = env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() : 'local'
  if (env.VERCEL && !isIP(ip || '')) return respond({ code: 'unavailable' }, 503)
  const command = suppliedCommand || (args => redisCommand(config, args))
  try {
    const bucket = `${config.prefix}:rate:${writing ? 'write' : 'read'}:${mac(config, `network:${ip}`)}`
    if (await command(['EVAL', RATE_SCRIPT, 1, bucket, writing ? 30 : 120]) !== 1) return respond({ code: 'limited' }, 429, { 'Retry-After': '60' })
    const post = await lookupPost(slug)
    if (!post.ok) return respond({ code: 'unavailable' }, 503)
    if (!post.id || typeof post.id !== 'string' || post.id.includes('.')) return respond({ code: 'missing' }, 404)
    const headers = {}
    if (!visitor) {
      visitor = randomUUID()
      headers['Set-Cookie'] = `${LIKE_COOKIE}=${makeVisitorCookie(config, visitor)}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Lax${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`
    }
    const result = await changeLike(config, post.id, visitor, writing ? (desired ? 'like' : 'unlike') : 'read', command)
    return respond(result, 200, headers)
  } catch {
    // Never log provider responses, credentials, raw IPs or cookie values.
    return respond({ code: 'unavailable' }, 503)
  }
}
