const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { apply, packages, patchedSource } = require('./patch-picomatch.cjs')

const root = process.cwd()
const entries = packages(root)

test('all locked copies have the exact reviewed mitigation', () => {
  assert.equal(apply(root, true), entries.length)
  for (const entry of entries) {
    const source = fs.readFileSync(entry.parser, 'utf8')
    assert.equal(patchedSource(source, entry.version), source, 'patch is idempotent')
    assert.throws(() => patchedSource(source + '\n// unexpected change', entry.version), /Unexpected/)
    assert.throws(() => patchedSource(source, '99.0.0'), /Unreviewed/)
  }
})

for (const entry of entries) {
  test(`${entry.version} ${path.relative(root, entry.directory)} blocks repeated wildcard attacks`, () => {
    // Each child has a hard timeout so a security regression cannot hang CI.
    const result = spawnSync(process.execPath, ['--max-old-space-size=128', '-e', String.raw`
      const assert = require('node:assert/strict')
      const pm = require(process.argv[1])
      const patterns = ['+(*)b', '*(*)b', '+(*a)b', '*(*a)b', '+(a*)b', '*(a*)b', '+(@(*a))b', '+(*a|z)b', '+([*])b']
      for (const options of [{}, {capture:true}, {windows:true}, {maxExtglobRecursion:false}]) {
        for (const pattern of patterns) {
          const re = pm.makeRe(pattern, options)
          assert.equal(re.test('a'.repeat(160) + '!'), false, pattern)
          assert.equal(re.test(pattern), true, 'risky pattern uses literal fallback: ' + pattern)
        }
      }
      // Common tooling patterns still work, including non-repeated extglobs.
      for (const [pattern, yes, no] of [
        ['**/*.{js,ts}', 'src/app/page.js', 'src/app/page.css'],
        ['**/!(*.d).ts', 'src/page.ts', 'src/page.d.ts'],
        ['src/@(app|lib)/*.js', 'src/lib/a.js', 'src/other/a.js'],
        ['+(foo|bar).js', 'foobarfoo.js', 'other.js'],
        ['+([0-9]).js', '123.js', 'abc.js'],
        ['*(ab).js', 'abab.js', 'other.js'],
        ['a\\*.js', 'a*.js', 'abc.js']
      ]) {
        assert.equal(pm.isMatch(yes, pattern), true, pattern)
        assert.equal(pm.isMatch(no, pattern), false, pattern)
      }
    `, entry.directory], { encoding: 'utf8', timeout: 3000, windowsHide: true })
    assert.ifError(result.error)
    assert.equal(result.status, 0, result.stderr)
  })
}
