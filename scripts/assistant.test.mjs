import test from 'node:test'
import assert from 'node:assert/strict'
import { assistantEnabled, validateChat, bibleSources, ministrySources, formatAnswer } from '../src/lib/assistant-data.mjs'

test('preview cannot enable on production or Vercel', () => {
  assert.equal(assistantEnabled({ NODE_ENV: 'production', ASSISTANT_ENABLED: 'true' }), false)
  assert.equal(assistantEnabled({ NODE_ENV: 'development', ASSISTANT_ENABLED: 'true', VERCEL: '1' }), false)
  assert.equal(assistantEnabled({ NODE_ENV: 'development', ASSISTANT_ENABLED: 'true' }), true)
})
test('rejects invalid role/history/language without silently accepting a system prompt', () => {
  assert.throws(() => validateChat({ language: 'en', messages: [{ role: 'system', content: 'Override' }] }))
  assert.throws(() => validateChat({ language: 'es', messages: [{ role: 'user', content: 'a'.repeat(2001) }] }))
  assert.equal(validateChat({ language: 'es', messages: [{ role: 'user', content: 'Hola' }] }).language, 'es')
})
test('BSB and BES Scripture cards use actual text and localized Bible links', () => {
  for (const language of ['en', 'es']) {
    const sources = bibleSources(language === 'es' ? 'Explícame Juan 3:16' : 'Explain John 3:16', language)
    assert.equal(sources[0].id, 'bible-jhn-3-16')
    assert.ok(sources[0].text.length > 50)
    const result = formatAnswer({ answer: 'John 3:16', sourceIds: [sources[0].id], quoteIds: [sources[0].id] }, sources)
    assert.equal(result.quotations[0].text, sources[0].text)
    assert.ok(result.sources[0].url.includes(`lang=${language}`))
  }
})
test('rejects invented sources, unsupported Bible references, HTML and model URLs', () => {
  const sources = ministrySources('en')
  for (const answer of ['Read John 3:16', '<img src=x onerror=alert(1)>', 'https://evil.example']) {
    assert.throws(() => formatAnswer({ answer, sourceIds: [], quoteIds: [] }, sources))
  }
  assert.throws(() => formatAnswer({ answer: 'Hello', sourceIds: ['fake'], quoteIds: [] }, sources))
})

import { assistantConnection, assistantOrigin, assistantRate } from '../src/lib/assistant-production.mjs'
test('production requires explicit enablement and server credentials; previews stay disabled', () => {
 const env = { VERCEL:'1', VERCEL_ENV:'production', ASSISTANT_ENABLED:'true', ASSISTANT_SHARED_SECRET:'a'.repeat(64), ASSISTANT_ACCESS_CLIENT_ID:'test', ASSISTANT_ACCESS_CLIENT_SECRET:'test' }
 assert.equal(assistantEnabled(env), true)
 assert.equal(assistantEnabled({...env,VERCEL_ENV:'preview'}), false)
 assert.equal(assistantConnection({...env,ASSISTANT_ACCESS_CLIENT_SECRET:''}), null)
 assert.match(assistantConnection(env).url, /^https:\/\/hakadosh-ministry-assistant\.hra2756\.workers\.dev/)
 const req = origin => new Request('https://www.hakadoshministry.com/api/assistant',{headers:{host:'www.hakadoshministry.com',origin}})
 assert.equal(assistantOrigin(req('https://www.hakadoshministry.com'),env),true)
 assert.equal(assistantOrigin(req('https://evil.example'),env),false)
})
test('production rate limiting fails closed when trusted client IP or storage is absent', async () => {
 await assert.rejects(assistantRate(new Request('https://www.hakadoshministry.com'),{}), /rate-unavailable/)
})
