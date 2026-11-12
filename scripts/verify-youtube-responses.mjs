import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const apiKey = process.env.YOUTUBE_API_KEY
assert.ok(apiKey && apiKey.length > 10, 'A configured API key is required')
const base = new URL(process.argv[2] ?? 'http://localhost:3000')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Use a local verification server')

for (const route of ['/', '/youtube-spanish', '/youtube-english', '/youtube-english?videos=12&shorts=6', '/youtube-player.js']) {
  const response = await fetch(new URL(route, base))
  assert.equal(response.status, 200, `Unexpected status for ${route}`)
  const body = await response.text()
  assert.ok(!body.includes(apiKey), 'Credential found in response')
  if (route.startsWith('/youtube-') && route !== '/youtube-player.js') {
    const csp = response.headers.get('content-security-policy') ?? ''
    assert.ok(csp.includes('frame-src https://www.youtube-nocookie.com'), 'Missing frame policy')
    assert.ok(body.includes('data-youtube-src='), 'Expected loaded video cards')
    const count = [...body.matchAll(/<article class="youtube-card /g)].length
    assert.equal(count, route.includes('?') ? 18 : 12, 'Unexpected card count')
  }
}

async function scan(directory) {
  let count = 0
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) }
  catch (error) { if (error.code === 'ENOENT') return 0; throw error }
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) count += await scan(path)
    else if (entry.isFile()) {
      assert.ok(!(await readFile(path)).includes(Buffer.from(apiKey)), 'Credential found in project output')
      count += 1
    }
  }
  return count
}
let checkedFiles = 0
for (const directory of ['src', 'public', 'scripts', 'docs', '.next/cache', '.next/static', '.next/server']) {
  checkedFiles += await scan(directory)
}
console.log(`Response, pagination, CSP and credential-isolation checks passed (${checkedFiles} files scanned).`)
