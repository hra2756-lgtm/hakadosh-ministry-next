// Temporary mitigation for GHSA-fc5q-39xc-vjpf. See docs/picomatch-mitigation.md.
// Keep npm's audit visible: this does not rename packages or suppress advisories.
const fs = require('node:fs')
const path = require('node:path')
const { createHash } = require('node:crypto')

const originalHashes = {
  '2.3.2': '3a91656f440069aa8f8e15c9d695b9f6b2209df1eab2be8127c72cbcca45ff5f',
  '4.0.4': 'ce57c04e04994b83e2ca566170fa192e6fe19d710bea6da00ce2f76d01c0dea4',
  '4.0.7': '4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4',
}
const anchor = 'const analyzeRepeatedExtglob = (body, options) => {\n'
const guard = String.raw`  // Hakadosh temporary mitigation: GHSA-fc5q-39xc-vjpf.
  // A wildcard inside an unbounded repeated group can cause nested backtracking.
  // Use picomatch's existing literal fallback, even with recursion checks disabled.
  // Conservatively includes stars inside quoted text/classes; see mitigation docs.
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '\\') {
      i++;
    } else if (body[i] === '*') {
      return { risky: true };
    }
  }

`
const hash = source => createHash('sha256').update(source).digest('hex')

function patchedSource(source, version) {
  const expected = originalHashes[version]
  if (!expected) throw new Error(`Unreviewed picomatch version ${version}; review the mitigation before installing.`)
  const original = source.includes(guard) ? source.replace(guard, '') : source
  if (hash(original) !== expected || original.split(anchor).length !== 2) {
    throw new Error(`Unexpected picomatch ${version} parser bytes; refusing to patch.`)
  }
  const patched = original.replace(anchor, anchor + guard)
  if (source !== original && source !== patched) throw new Error('Unexpected patch placement.')
  return patched
}

function packages(root) {
  root = path.resolve(root)
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
  const entries = Object.entries(lock.packages || {}).filter(([name]) => /(?:^|\/)node_modules\/picomatch$/.test(name))
  if (!entries.length) throw new Error('No locked picomatch packages found; review whether this mitigation can be removed.')
  return entries.map(([name, locked]) => {
    const directory = path.resolve(root, name)
    if (!directory.startsWith(path.join(root, 'node_modules') + path.sep)) throw new Error('Invalid package path.')
    const installed = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'))
    if (installed.name !== 'picomatch' || installed.version !== locked.version) throw new Error(`Installed package differs from lock: ${name}`)
    return { directory, version: installed.version, parser: path.join(directory, 'lib', 'parse.js') }
  })
}

function apply(root, verifyOnly = false) {
  // Validate every source before changing any of them.
  const entries = packages(root).map(entry => {
    const source = fs.readFileSync(entry.parser, 'utf8')
    return { ...entry, source, patched: patchedSource(source, entry.version) }
  })
  for (const entry of entries) {
    if (entry.source !== entry.patched) {
      if (verifyOnly) throw new Error(`Missing picomatch mitigation: ${entry.parser}`)
      fs.writeFileSync(entry.parser, entry.patched)
    }
  }
  return entries.length
}

module.exports = { apply, packages, patchedSource }
if (require.main === module) {
  const verifyOnly = process.argv.includes('--verify')
  const root = process.argv.slice(2).find(arg => arg !== '--verify') || '.'
  console.log(`picomatch mitigation ${verifyOnly ? 'verified' : 'applied'}: ${apply(root, verifyOnly)} copies`)
}
