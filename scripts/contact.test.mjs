import assert from 'node:assert/strict'
import test from 'node:test'
import { handleContact } from '../src/lib/contact-handler.mjs'
import { MINISTRY_EMAIL } from '../src/lib/contact-config.mjs'

const env = { RESEND_API_KEY: 'test-resend-secret', TURNSTILE_SECRET_KEY: 'test-turnstile-secret', TURNSTILE_SITE_KEY: 'test-public-site-key' }
const input = { name: 'María Rivera', email: 'visitor@example.com', topic: 'prayer', message: 'Please pray for our family. Gracias.', website: '', token: 'test-token', submissionId: 'cefb6a12-36e9-43db-8658-115c5c290a25' }
const origin = 'https://www.hakadoshministry.com'
const request = (data = input, headers = {}) => new Request(`${origin}/api/contact`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(data) })
const neverFetch = () => { assert.fail('Blocked submissions must not call an external service') }
const verification = extra => Response.json({ success: true, hostname: 'www.hakadoshministry.com', action: 'contact', ...extra })

test('rejects missing config, forged origins and non-JSON before contacting providers', async () => {
  assert.equal((await handleContact(request(), { env: {}, fetchImpl: neverFetch })).status, 503)
  assert.equal((await handleContact(request(input, { Origin: 'https://attacker.example' }), { env, fetchImpl: neverFetch })).status, 403)
  assert.equal((await handleContact(request(input, { Origin: 'null' }), { env, fetchImpl: neverFetch })).status, 403)
  assert.equal((await handleContact(request(input, { 'Content-Type': 'text/plain' }), { env, fetchImpl: neverFetch })).status, 415)
})

test('validates fields, controls, topic allowlist, honeypot, challenge and actual body size', async () => {
  for (const change of [
    { email: 'victim@example.com\r\nBcc: attacker@example.com' }, { name: 'A\nB' },
    { message: 'short' }, { message: 'x'.repeat(5001) }, { topic: '__proto__' },
    { website: 'spam' }, { token: '' }, { token: 'x'.repeat(2049) }, { submissionId: 'invalid' },
    { extra: 'x'.repeat(33_000) }, { name: 42 },
  ]) {
    assert.equal((await handleContact(request({ ...input, ...change }), { env, fetchImpl: neverFetch })).status, 400)
  }
})

test('failed, replayed, wrong-host and wrong-action challenges cannot send email', async () => {
  for (const challenge of [{ success: false }, { hostname: 'attacker.example' }, { action: 'login' }]) {
    let calls = 0
    const response = await handleContact(request(), { env, fetchImpl: async url => {
      calls++
      assert.ok(url.includes('/siteverify'))
      return verification(challenge)
    } })
    assert.equal(response.status, 400)
    assert.deepEqual(await response.json(), { code: 'verification' })
    assert.equal(calls, 1)
  }
})

test('sends only to ministry inbox, uses reply-to, plain text and idempotency', async () => {
  const calls = []
  const fetchImpl = async (url, options) => {
    calls.push({ url, options })
    return url.includes('/siteverify') ? verification() : Response.json({ id: 'mock-message-id' })
  }
  const response = await handleContact(request({ ...input, to: 'attacker@example.com', message: '<script>alert(1)</script> Please pray.' }), { env, fetchImpl })
  assert.deepEqual(await response.json(), { code: 'sent' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(calls.length, 2)
  const mail = JSON.parse(calls[1].options.body)
  assert.deepEqual(mail.to, [MINISTRY_EMAIL])
  assert.equal(mail.reply_to, input.email)
  assert.equal(mail.from, 'Hakadosh Ministry Website <website@contact.hakadoshministry.com>')
  assert.equal(mail.subject, 'Website message: Prayer request')
  assert.equal(mail.html, undefined)
  assert.match(calls[1].options.headers['Idempotency-Key'], /^contact\//)
})

test('provider errors and network exceptions return no secrets or personal details', async () => {
  for (const mode of ['http', 'throw', 'missing-receipt']) {
    const response = await handleContact(request(), { env, fetchImpl: async url => {
      if (url.includes('/siteverify')) return verification()
      if (mode === 'throw') throw new Error(env.RESEND_API_KEY)
      return mode === 'http' ? Response.json({ secret: env.RESEND_API_KEY }, { status: 429 }) : Response.json({})
    } })
    assert.equal(response.status, 502)
    assert.deepEqual(await response.json(), { code: 'failed' })
  }
})
