// Run via with-youtube-key.cjs. Never print credentials or provider responses.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { likesConfig, changeLike, redisCommand } from '../src/lib/blog-likes.mjs'

const config = likesConfig()
assert.ok(config, 'Upstash credentials missing or invalid; check the two named Generic Credentials.')
assert.ok(config.prefix.includes(':local:'), 'This smoke check is for local development only.')
// Isolate verification keys from post counters and remove them in finally.
config.prefix += `:check:${randomUUID()}`
const keys = new Set()
const command = async args => {
  keys.add(args[3])
  return redisCommand(config, args)
}
try {
  assert.equal(await redisCommand(config, ['PING']), 'PONG')
  const a = randomUUID(), b = randomUUID(), post = 'storage-smoke-test'
  const results = await Promise.all(Array.from({ length: 8 }, () => changeLike(config, post, a, 'like', command)))
  assert.ok(results.every(result => result.count === 1 && result.liked))
  assert.deepEqual(await changeLike(config, post, b, 'like', command), { count: 2, liked: true })
  assert.deepEqual(await changeLike(config, post, a, 'unlike', command), { count: 1, liked: false })
  assert.deepEqual(await changeLike(config, post, a, 'unlike', command), { count: 1, liked: false })
  assert.deepEqual(await changeLike(config, post, b, 'unlike', command), { count: 0, liked: false })
  console.log('Passed: saved Upstash credentials, atomic duplicate protection, two visitors, and undo. Post counts were not modified.')
} finally {
  for (const key of keys) await redisCommand(config, ['DEL', key])
}
