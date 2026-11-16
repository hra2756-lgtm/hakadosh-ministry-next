import { createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'

// Reuse the archive reader installed and locked with Sanity's export tooling.
const studioRequire = createRequire(new URL('../studio/package.json', import.meta.url))
const { createTarDecoder } = await import(pathToFileURL(studioRequire.resolve('modern-tar')).href)

export async function fileHash(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

export async function verifyArchive(path) {
  const entries = Readable.toWeb(createReadStream(path))
    .pipeThrough(new DecompressionStream('gzip')).pipeThrough(createTarDecoder())
  const files = new Set()
  const requiredAssets = new Set()
  const ids = new Set()
  const summary = { documents: 0, posts: 0, drafts: 0, images: 0, files: 0 }
  let root
  let documentsFound = false
  let assetsFound = false
  function references(value) {
    if (!value || typeof value !== 'object') return
    if (typeof value._sanityAsset === 'string') {
      const match = /^(?:image|file)@file:\/\/\.\/(images|files)\/([^/\\]+)$/.exec(value._sanityAsset)
      if (!match || match[2] === '..') throw new Error('Invalid asset reference in archive.')
      requiredAssets.add(`${root}/${match[1]}/${match[2]}`)
    }
    for (const child of Object.values(value)) if (typeof child === 'object') references(child)
  }
  function document(line) {
    if (!line.trim()) return
    const doc = JSON.parse(line)
    if (!doc || typeof doc._id !== 'string' || typeof doc._type !== 'string' || ids.has(doc._id)) {
      throw new Error('Invalid or duplicate document in archive.')
    }
    ids.add(doc._id)
    summary.documents++
    if (doc._type === 'post') summary.posts++
    if (doc._id.startsWith('drafts.')) summary.drafts++
    references(doc)
  }
  for await (const { header, body } of entries) {
    const parts = header.name.split('/')
    if (parts.some(part => part === '..') || header.name.includes('\\') || header.name.startsWith('/')) {
      throw new Error('Unsafe archive entry.')
    }
    root ??= parts[0]
    if (!root.startsWith('production-export-') || parts[0] !== root) throw new Error('Unexpected dataset in archive.')
    if (header.type === 'directory') { await body.cancel(); continue }
    if (header.type !== 'file' || files.has(header.name)) throw new Error('Unexpected or duplicate archive entry.')
    files.add(header.name)
    if (header.name === `${root}/data.ndjson`) {
      documentsFound = true
      const decoder = new TextDecoder('utf-8', { fatal: true })
      let pending = ''
      for await (const chunk of body) {
        pending += decoder.decode(chunk, { stream: true })
        let end
        while ((end = pending.indexOf('\n')) !== -1) {
          document(pending.slice(0, end)); pending = pending.slice(end + 1)
        }
        if (pending.length > 16 * 1024 * 1024) throw new Error('Document exceeds the backup verification size limit.')
      }
      document(pending + decoder.decode())
    } else if (header.name === `${root}/assets.json`) {
      const metadata = JSON.parse(await new Response(body).text())
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('Invalid asset metadata.')
      assetsFound = true
    } else {
      const match = /^(images|files)\/([a-f0-9]{40})(?:-[^/]+)?\.[a-z0-9]+$/.exec(parts.slice(1).join('/'))
      if (!match) throw new Error('Unexpected asset filename.')
      const hash = createHash('sha1')
      for await (const chunk of body) hash.update(chunk)
      if (hash.digest('hex') !== match[2]) throw new Error('Asset checksum mismatch.')
      summary[match[1]]++
    }
  }
  if (!documentsFound || !assetsFound) throw new Error('Archive is missing documents or asset metadata.')
  for (const asset of requiredAssets) if (!files.has(asset)) throw new Error('Archive is missing a referenced image or file.')
  return summary
}
