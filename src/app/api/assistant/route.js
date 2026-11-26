import { assistantEnabled, validateChat, formatAnswer, uncertainAnswer } from '../../../lib/assistant-data.mjs'
import { assistantKnowledge } from '../../../lib/assistant-knowledge'
import { assistantConnection, assistantOrigin, assistantRate } from '../../../lib/assistant-production.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const state = globalThis.__ministryChatLimit ??= { minute: 0, count: 0, busy: false }
const reply = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })

export async function POST(request) {
  if (!assistantEnabled()) return reply({ error: 'disabled' }, 404)
  if (!assistantOrigin(request)) return reply({ error: 'origin' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'invalid' }, 400)
  const minute = Math.floor(Date.now() / 60000)
  if (state.minute !== minute) { state.minute = minute; state.count = 0 }
  if (state.busy) return reply({ error: 'busy' }, 429)
  if (state.count >= 5) return reply({ error: 'rate_limit' }, 429)
  const connection = assistantConnection()
  if (!connection) return reply({ error: 'unavailable' }, 503)
  state.busy = true; state.count++
  try {
    if (process.env.VERCEL && !await assistantRate(request)) return reply({ error: 'rate_limit' }, 429)
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: 'invalid' }, 400)
    const parts = []; let size = 0
    while (true) {
      const { done, value } = await reader.read(); if (done) break
      size += value.byteLength
      if (size > 24000) { await reader.cancel(); return reply({ error: 'too_large' }, 413) }
      parts.push(value)
    }
    let chat
    try { chat = validateChat(JSON.parse(Buffer.concat(parts).toString('utf8'))) }
    catch { return reply({ error: 'invalid' }, 400) }
    const recentUserText = chat.messages.filter(m => m.role === 'user').slice(-2).map(m => m.content).join('\n')
    const sources = await assistantKnowledge(recentUserText, chat.language)
    // Fixed server destination; credentials and source selection never reach the browser.
    const response = await fetch(connection.url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...connection.headers },
      body: JSON.stringify({ ...chat, sources: sources.map(({ id, kind, title, text }) => ({ id, kind, title, text })) }),
      signal: AbortSignal.timeout(45000), cache: 'no-store', redirect: 'error',
    })
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}))
      console.warn('[assistant] upstream unavailable', response.status, ['validation', 'budget', 'provider', 'answer'].includes(failure.stage) ? failure.stage : 'connection', ['invalid_json', 'missing_text', 'missing_answer', 'long_answer', 'unsafe_answer', 'invalid_sources'].includes(failure.reason) ? failure.reason : '')
      if (failure.stage === 'answer' && ['invalid_json', 'missing_text', 'missing_answer', 'long_answer', 'unsafe_answer', 'invalid_sources'].includes(failure.reason)) return reply(uncertainAnswer(chat.language))
      const limit = response.status === 429 && ['usage_limit', 'rate_limit', 'busy'].includes(failure.error) ? failure.error : null
      return reply({ error: limit || 'unavailable' }, limit ? 429 : 503)
    }
    const data = await response.json()
    try { return reply(formatAnswer(data, sources)) }
    catch {
      console.warn('[assistant] answer could not be verified')
      return reply(uncertainAnswer(chat.language))
    }
  } catch (error) {
    console.warn('[assistant] request failed', ['TimeoutError', 'AbortError'].includes(error?.name) ? error.name : 'validation-or-connection')
    return reply({ error: 'unavailable' }, 503)
  }
  finally { state.busy = false }
}
