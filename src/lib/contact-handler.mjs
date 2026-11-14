import { createHash } from 'node:crypto'
import { getContactConfig, MINISTRY_EMAIL } from './contact-config.mjs'

const TOPICS = { prayer: 'Prayer request', testimony: 'Testimony', question: 'Question', collaboration: 'Collaboration' }
const MAX_BYTES = 32_768
const CONTROL = /[\u0000-\u001f\u007f]/
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/

function result(code, status) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function validateContact(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  if (['name', 'email', 'topic', 'message', 'token', 'submissionId'].some(key => typeof input[key] !== 'string')) return null
  if (input.website !== undefined && input.website !== '') return null
  const { name, email, message } = Object.fromEntries(['name', 'email', 'message'].map(key => [key, input[key].trim()]))
  if (!name || name.length > 100 || CONTROL.test(name) || email.length > 254 || !EMAIL.test(email)) return null
  if (!Object.hasOwn(TOPICS, input.topic) || message.length < 10 || message.length > 5000 || CONTROL.test(message.replace(/[\n\r\t]/g, ''))) return null
  if (!input.token || input.token.length > 2048 || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) return null
  return { name, email, message, topic: input.topic, token: input.token, submissionId: input.submissionId }
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('origin')
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return null
  const allowed = new Set(['https://www.hakadoshministry.com', 'https://hakadoshministry.com'])
  for (const host of [env.VERCEL_URL, env.VERCEL_BRANCH_URL]) {
    if (host && /^[a-zA-Z0-9.-]+\.vercel\.app$/.test(host)) allowed.add(`https://${host}`)
  }
  // Local previews are permitted only on a local server, never on Vercel.
  const requestUrl = new URL(request.url)
  if (!env.VERCEL && ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)) allowed.add(requestUrl.origin)
  return allowed.has(origin) ? new URL(origin) : null
}

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BYTES) throw new Error('size')
  const reader = request.body?.getReader()
  if (!reader) throw new Error('body')
  const chunks = []
  let size = 0
  const timeout = setTimeout(() => { void reader.cancel() }, 10_000)
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) { await reader.cancel(); throw new Error('size') }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } finally { clearTimeout(timeout); reader.releaseLock() }
}

// Dependency injection lets tests exercise failures without sending mail or exposing keys.
export async function handleContact(request, { env = process.env, fetchImpl = fetch } = {}) {
  const origin = allowedOrigin(request, env)
  if (!origin) return result('invalid', 403)
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return result('invalid', 415)
  const config = getContactConfig(env)
  if (!config.ready) return result('unavailable', 503)
  let input
  try { input = validateContact(await readBody(request)) }
  catch { return result('invalid', 400) }
  if (!input) return result('invalid', 400)

  try {
    const verification = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: input.token }),
    })
    if (!verification.ok) return result('verification', 503)
    const challenge = await verification.json()
    if (challenge.success !== true || challenge.action !== 'contact' || challenge.hostname !== origin.hostname) return result('verification', 400)

    // Recipient and subject are server-owned. Visitor input is plain text, never HTML.
    const mail = {
      from: `Hakadosh Ministry Website <${config.from}>`,
      to: [MINISTRY_EMAIL], reply_to: input.email,
      subject: `Website message: ${TOPICS[input.topic]}`,
      text: `Name: ${input.name}\nEmail: ${input.email}\nTopic: ${TOPICS[input.topic]}\n\n${input.message}`,
    }
    const digest = createHash('sha256').update(JSON.stringify(mail)).digest('hex')
    const sent = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Idempotency-Key': `contact/${input.submissionId}/${digest}` },
      body: JSON.stringify(mail),
    })
    if (!sent.ok) return result('failed', 502)
    const receipt = await sent.json()
    return receipt.id ? result('sent', 200) : result('failed', 502)
  } catch {
    // Never log messages, provider responses, tokens, or credentials.
    return result('failed', 502)
  }
}
