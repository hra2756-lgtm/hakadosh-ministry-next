import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { likesConfig, redisCommand, RATE_SCRIPT } from './blog-likes.mjs'

export function assistantConnection(env = process.env) {
  const secret = env.ASSISTANT_SHARED_SECRET
  if (!secret || secret.length < 48) return null
  if (!env.VERCEL && env.NODE_ENV === 'development') return {
    url: 'http://127.0.0.1:8787/api/chat', headers: { Authorization: `Bearer ${secret}` },
  }
  if (env.VERCEL_ENV !== 'production' || !env.ASSISTANT_ACCESS_CLIENT_ID || !env.ASSISTANT_ACCESS_CLIENT_SECRET) return null
  return {
    url: 'https://hakadosh-ministry-assistant.hra2756.workers.dev/api/chat',
    headers: { Authorization: `Bearer ${secret}`, 'CF-Access-Client-Id': env.ASSISTANT_ACCESS_CLIENT_ID, 'CF-Access-Client-Secret': env.ASSISTANT_ACCESS_CLIENT_SECRET },
  }
}

export function assistantOrigin(request, env = process.env) {
  const host = request.headers.get('host') || ''
  const origin = request.headers.get('origin')
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  if (!env.VERCEL && env.NODE_ENV === 'development') return /^(localhost|127\.0\.0\.1):\d{1,5}$/.test(host) && origin === `http://${host}`
  return env.VERCEL_ENV === 'production' && ['hakadoshministry.com', 'www.hakadoshministry.com'].includes(host) && origin === `https://${host}`
}

export async function assistantRate(request, env = process.env, command) {
  const config = likesConfig(env)
  const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim()
  if (!config || !isIP(ip || '')) throw Error('rate-unavailable')
  // Short-lived keyed hashes, never raw addresses or chat content.
  const id = createHmac('sha256', config.signingKey).update(`assistant:${ip}`).digest('hex')
  const run = command || (args => redisCommand(config, args))
  const result = await run(['EVAL', RATE_SCRIPT, 1, `hm:assistant:production:rate:${id}`, 5])
  if (![0, 1].includes(result)) throw Error('rate-unavailable')
  return result === 1
}
