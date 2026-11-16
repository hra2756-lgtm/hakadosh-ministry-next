import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { verifyArchive, fileHash } from './blog-backup-archive.mjs'

const requireStudio = createRequire(new URL('../studio/package.json', import.meta.url))
const { packTar } = await import(pathToFileURL(requireStudio.resolve('modern-tar')).href)
const root = 'production-export-2026-11-15'
const asset = Buffer.from('test image bytes')
const imageName = `${createHash('sha1').update(asset).digest('hex')}-1x1.png`
function entry(name, data) {
  const body = Buffer.from(data)
  return { header: { name: `${root}/${name}`, type: 'file', size: body.length }, body }
}
function entries({ missing = false, corrupt = false, duplicate = false } = {}) {
  const doc = { _id: 'post-1', _type: 'post', title: { en: 'Wisdom', es: 'Sabiduría — Jesús' }, image: { _sanityAsset: `image@file://./images/${imageName}` } }
  const docs = [doc, { _id: 'drafts.post-2', _type: 'post', body: [] }]
  if (duplicate) docs.push(doc)
  return [entry('data.ndjson', docs.map(d => JSON.stringify(d)).join('\n')), entry('assets.json', '{}'),
    ...missing ? [] : [entry(`images/${imageName}`, corrupt ? 'incorrect bytes' : asset)]]
}
async function archive(t, items) {
  const folder = await mkdtemp(join(tmpdir(), 'hakadosh-backup-test-'))
  const path = join(folder, 'sample.tar.gz')
  t.after(async () => { await unlink(path); await rmdir(folder) })
  await writeFile(path, gzipSync(await packTar(items)))
  return path
}

test('backup validation reads published/draft documents and verifies asset bytes', async t => {
  const path = await archive(t, entries())
  assert.deepEqual(await verifyArchive(path), { documents: 2, posts: 2, drafts: 1, images: 1, files: 0 })
  assert.match(await fileHash(path), /^[a-f0-9]{64}$/)
})
test('backup validation rejects missing referenced assets', async t => {
  const path = await archive(t, entries({ missing: true }))
  await assert.rejects(verifyArchive(path), /missing a referenced/)
})
test('backup validation rejects corrupt asset bytes', async t => {
  const path = await archive(t, entries({ corrupt: true }))
  await assert.rejects(verifyArchive(path), /checksum mismatch/)
})
test('backup validation rejects duplicate documents and incomplete archives', async t => {
  const duplicate = await archive(t, entries({ duplicate: true }))
  await assert.rejects(verifyArchive(duplicate), /duplicate document/)
  const incomplete = await archive(t, [entry('assets.json', '{}')])
  await assert.rejects(verifyArchive(incomplete), /missing documents/)
})
