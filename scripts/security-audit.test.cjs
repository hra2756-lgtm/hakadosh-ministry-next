const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { assess, ADVISORY } = require('./security-audit-policy.cjs')
const now = new Date('2026-11-18T01:00:00Z')
const nodes = new Set(['node_modules/picomatch'])
const fixture = () => ({ auditReportVersion: 2, metadata: { vulnerabilities: { total: 2 } }, vulnerabilities: {
  picomatch: { severity: 'high', nodes: [...nodes], via: [{ name: 'picomatch', dependency: 'picomatch', url: ADVISORY, severity: 'high', range: '<=4.0.7' }] },
  parent: { severity: 'high', via: ['picomatch'] },
} })

test('accepts only the reviewed advisory and its dependency chain', () => {
  assert.equal(assess(fixture(), nodes, now).dependencyFindings, 2)
})
test('another advisory, including one in picomatch, still blocks release', () => {
  const r = fixture()
  r.vulnerabilities.picomatch.via.push({ ...r.vulnerabilities.picomatch.via[0], url: 'https://github.com/advisories/GHSA-another-advisory' })
  assert.throws(() => assess(r, nodes, now), /Unapproved/)
})
test('changed severity, affected range or package identity requires review', () => {
  for (const change of [{ severity: 'critical' }, { range: '*' }, { name: 'other-package' }, { dependency: 'other-package' }]) {
    const r = fixture()
    Object.assign(r.vulnerabilities.picomatch.via[0], change)
    assert.throws(() => assess(r, nodes, now), /Unapproved/)
  }
})
test('missing or unverified copies block release', () => {
  assert.throws(() => assess(fixture(), new Set(), now), /verification/)
  assert.throws(() => assess(fixture(), new Set(['node_modules/other']), now), /lacks verified/)
  const r = fixture()
  r.vulnerabilities.picomatch.nodes.push('node_modules/extra/node_modules/picomatch')
  assert.throws(() => assess(r, nodes, now), /lacks verified/)
})
test('exception expires at the approved deadline', () => {
  assert.equal(assess(fixture(), nodes, new Date('2026-11-25T05:59:59Z')).dependencyFindings, 2)
  assert.throws(() => assess(fixture(), nodes, new Date('2026-11-25T06:00:00Z')), /expired/)
  assert.throws(() => assess(fixture(), nodes, new Date('invalid')), /expired/)
})
test('audit errors, incomplete reports, missing chains and empty cycles fail closed', () => {
  assert.throws(() => assess({ error: { message: 'network unavailable' } }, nodes, now), /Invalid/)
  const r = fixture()
  r.metadata.vulnerabilities.total = 0
  assert.throws(() => assess(r, nodes, now), /Incomplete/)
  const missing = fixture()
  missing.vulnerabilities.parent.via = ['absent']
  assert.throws(() => assess(missing, nodes, now), /Incomplete/)
  const cycle = fixture()
  cycle.vulnerabilities.parent.via = ['parent']
  assert.throws(() => assess(cycle, nodes, now), /cycle/)
})
test('cyclic dependency chains must still resolve solely to the reviewed advisory', () => {
  const r = fixture()
  r.vulnerabilities.parent.via.push('parent')
  assert.equal(assess(r, nodes, now).dependencyFindings, 2)
})
test('keeps the previous moderate-or-higher threshold', () => {
  const r = fixture()
  r.metadata.vulnerabilities.total++
  r.vulnerabilities.other = { severity: 'low', via: [{ url: 'https://example.com/another-advisory' }] }
  assert.equal(assess(r, nodes, now).dependencyFindings, 2)
  r.vulnerabilities.other.severity = 'moderate'
  assert.throws(() => assess(r, nodes, now), /Unapproved/)
})
test('a clean report is not falsely labelled as having an accepted vulnerability', () => {
  const r = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} }
  assert.equal(assess(r, nodes, now).status, 'no-moderate-or-higher-findings')
})
test('runner rejects cached-report flags and a failed fresh audit', () => {
  const runner = path.join(__dirname, 'security-audit.cjs')
  const override = spawnSync(process.execPath, [runner, '--report', 'cached.json'], { encoding: 'utf8', timeout: 5000, windowsHide: true })
  assert.ifError(override.error)
  assert.equal(override.status, 1)
  assert.match(override.stderr, /overrides are not supported/)
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hakadosh-audit-test-'))
  try {
    const fakeNpm = path.join(temp, 'failed-npm.cjs')
    fs.writeFileSync(fakeNpm, 'process.stdout.write(JSON.stringify({error:{message:"Unavailable"}})); process.exitCode=1;')
    const result = spawnSync(process.execPath, [runner], {
      cwd: path.join(__dirname, '..'), env: { ...process.env, npm_execpath: fakeNpm },
      encoding: 'utf8', timeout: 30000, windowsHide: true,
    })
    assert.ifError(result.error)
    assert.equal(result.status, 1)
    // Expiration must also continue to block this integration test in the future.
    assert.match(result.stderr, /audit returned an error|exception expired/)
    assert.doesNotMatch(result.stdout, /Guarded audit decision/)
  } finally {
    fs.unlinkSync(path.join(temp, 'failed-npm.cjs'))
    fs.rmdirSync(temp)
  }
})
