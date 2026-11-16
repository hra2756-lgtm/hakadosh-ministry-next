import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { likesConfig, makeVisitorCookie, readVisitor, handleLikes, redisCommand, RATE_SCRIPT, LIKE_SCRIPT, LIKE_COOKIE } from '../src/lib/blog-likes.mjs'

const env = { UPSTASH_REDIS_REST_URL: 'https://example.upstash.io', UPSTASH_REDIS_REST_TOKEN: 'test-only-not-a-real-token' }
const config = likesConfig(env)
const base = 'http://localhost:3000'
function request(method = 'GET', cookie, body = { liked: true }, headers = {}) {
  return new Request(`${base}/api/blog/no-milk-today/likes`, { method,
    headers: { ...(method === 'POST' ? { Origin: base, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  })
}
const visitorCookie = () => `${LIKE_COOKIE}=${makeVisitorCookie(config)}`
function store() {
  const rates = new Map()
  const members = new Map()
  const calls = []
  const command = async args => {
    calls.push(args)
    const [operation, script, number, key, ...values] = args
    assert.equal(operation, 'EVAL')
    assert.equal(number, 1)
    if (script === RATE_SCRIPT) {
      const value = (rates.get(key) || 0) + 1
      rates.set(key, value)
      return value <= values[0] ? 1 : 0
    }
    assert.equal(script, LIKE_SCRIPT)
    const set = members.get(key) || new Set()
    const [member, action] = values
    if (action === 'like') set.add(member)
    if (action === 'unlike') set.delete(member)
    members.set(key, set)
    return [set.size, Number(set.has(member))]
  }
  return { command, calls }
}
const lookupPost = async () => ({ ok: true, id: 'permanent-post-id' })

test('database destination and environment separation fail closed', () => {
  for (const url of ['http://example.upstash.io', 'https://evil.example', 'https://example.upstash.io.evil.example', 'https://user:pass@example.upstash.io', 'https://example.upstash.io/?token=bad']) {
    assert.equal(likesConfig({ ...env, UPSTASH_REDIS_REST_URL: url }), null)
  }
  assert.equal(likesConfig({}), null)
  assert.equal(likesConfig({ ...env, UPSTASH_REDIS_REST_URL: '"https://example.upstash.io"', UPSTASH_REDIS_REST_TOKEN: '"example-token"' }).url, 'https://example.upstash.io')
  assert.equal(likesConfig({ ...env, VERCEL: '1' }), null)
  const production = likesConfig({ ...env, VERCEL: '1', VERCEL_ENV: 'production', SANITY_DATASET: 'production' })
  assert.notEqual(production.prefix, config.prefix)
  assert.notDeepEqual(production.signingKey, config.signingKey)
})

test('visitor cookies reject tampering, expiration and use in another environment', () => {
  const id = randomUUID()
  const now = Date.now()
  const value = makeVisitorCookie(config, id, now)
  assert.equal(readVisitor(request('GET', `${LIKE_COOKIE}=${value}`), config, now), id)
  assert.equal(readVisitor(request('GET', `${LIKE_COOKIE}=${value.replace(id, randomUUID())}`), config, now), null)
  assert.equal(readVisitor(request('GET', `${LIKE_COOKIE}=${value}`), config, now + 366 * 86400000), null)
  const different = likesConfig({ ...env, SANITY_DATASET: 'different' })
  assert.equal(readVisitor(request('GET', `${LIKE_COOKIE}=${value}`), different, now), null)
})

test('read is private, issues an HttpOnly cookie, and does not count as a like', async () => {
  const { command } = store()
  const response = await handleLikes(request(), 'no-milk-today', { env, command, lookupPost })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { count: 0, liked: false })
  assert.match(response.headers.get('cache-control'), /no-store/)
  assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/)
  const cookie = response.headers.get('set-cookie').split(';')[0]
  assert.ok(readVisitor(request('GET', cookie), config))
})

test('repeated likes/unlikes are idempotent and totals are shared between visitors', async () => {
  const { command } = store()
  const options = { env, command, lookupPost }
  const a = visitorCookie(), b = visitorCookie()
  const update = async (cookie, liked) => (await handleLikes(request('POST', cookie, { liked }), 'no-milk-today', options)).json()
  assert.deepEqual(await update(a, true), { count: 1, liked: true })
  assert.deepEqual(await update(a, true), { count: 1, liked: true })
  assert.deepEqual(await update(b, true), { count: 2, liked: true })
  assert.deepEqual(await update(a, false), { count: 1, liked: false })
  assert.deepEqual(await update(a, false), { count: 1, liked: false })
  assert.deepEqual(await update(b, false), { count: 0, liked: false })
})

test('forged origins, invalid input and unsigned writes never reach storage', async () => {
  let calls = 0
  const options = { env, lookupPost, command: async () => { calls++; throw new Error('should not run') } }
  for (const bad of [
    request('POST', visitorCookie(), { liked: true }, { Origin: 'https://evil.example' }),
    request('POST', visitorCookie(), { liked: true }, { 'sec-fetch-site': 'cross-site' }),
    request('POST'), request('POST', `${LIKE_COOKIE}=forged`),
    request('POST', visitorCookie(), { liked: 1 }),
    request('POST', visitorCookie(), { liked: true, count: 999 }),
    request('POST', visitorCookie(), { liked: true }, { 'Content-Type': 'text/plain' }),
    request('POST', visitorCookie(), { liked: 'x'.repeat(200) }),
  ]) assert.ok((await handleLikes(bad, 'no-milk-today', options)).status >= 400)
  assert.equal(calls, 0)
})

test('unknown and unpublished posts cannot receive likes', async () => {
  const { command } = store()
  for (const id of [undefined, 'drafts.private-post', 'versions.release.post']) {
    const response = await handleLikes(request('POST', visitorCookie()), 'no-milk-today', { env, command, lookupPost: async () => ({ ok: true, id }) })
    assert.equal(response.status, 404)
  }
})

test('rate limits stop mutations before the post lookup', async () => {
  let lookedUp = false
  const response = await handleLikes(request('POST', visitorCookie()), 'no-milk-today', {
    env, command: async () => 0, lookupPost: async () => { lookedUp = true; return { ok: true, id: 'a' } },
  })
  assert.equal(response.status, 429)
  assert.equal(response.headers.get('retry-after'), '60')
  assert.equal(lookedUp, false)
})

test('Vercel rate buckets use the platform IP, never the visitor cookie', async () => {
  const productionEnv = { ...env, VERCEL: '1', VERCEL_ENV: 'production', SANITY_DATASET: 'production' }
  const { command, calls } = store()
  const response = await handleLikes(new Request('https://www.hakadoshministry.com/api/blog/no-milk-today/likes', {
    headers: { 'x-vercel-forwarded-for': '192.0.2.1' },
  }), 'no-milk-today', { env: productionEnv, command, lookupPost })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie'), /Secure/)
  assert.ok(!JSON.stringify(calls).includes('192.0.2.1'))
})

test('provider failures expose no credentials, and redirecting credentials is forbidden', async () => {
  await assert.rejects(redisCommand(config, ['PING'], async (_url, options) => {
    assert.equal(options.redirect, 'error')
    assert.equal(options.cache, 'no-store')
    return Response.json({ error: `secret: ${env.UPSTASH_REDIS_REST_TOKEN}` })
  }), { message: 'Likes storage unavailable' })
  const response = await handleLikes(request(), 'no-milk-today', { env, lookupPost, command: async () => { throw new Error(env.UPSTASH_REDIS_REST_TOKEN) } })
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { code: 'unavailable' })
})
