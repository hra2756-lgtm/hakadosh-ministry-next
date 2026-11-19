import test from 'node:test'
import assert from 'node:assert/strict'
import { scriptureShare, scriptureShareLinks, scriptureImageModel } from '../src/lib/scripture-share.mjs'

test('sharing preserves the complete selection and explicit language in stable public links', () => {
  const share = scriptureShare('Matthew 24:1-3', 'en')
  assert.equal(share.rows.length, 3)
  assert.equal(share.query, 'MAT 24:1-3')
  assert.equal(share.version, 'BSB')
  const es = scriptureShare('Mateo 24:1–3', 'es')
  assert.equal(es.rows.length, 3)
  assert.equal(es.query, share.query)
  assert.equal(es.version, 'BES')
  assert.notEqual(es.rows[0].text, share.rows[0].text)
  for (const item of [share, es]) {
    const url = new URL(item.url)
    assert.equal(url.origin, 'https://www.hakadoshministry.com')
    assert.equal(url.searchParams.get('lang'), item.language)
    assert.equal(url.searchParams.get('q'), item.query)
    const links = scriptureShareLinks(item)
    assert.ok(new URL(links.whatsapp).searchParams.get('text').includes(item.url))
    assert.equal(new URL(links.x).searchParams.get('url'), item.url)
  }
})

test('image endpoints cannot accept arbitrary text, unsupported languages, unbounded input or invalid verses', () => {
  for (const query of [null, ['John 3:16'], 'faith', '<script>alert(1)</script>', 'John 3:999', 'John 3:16 '.repeat(150), 'Genesis 1-50']) assert.equal(scriptureShare(query, 'en'), null)
  assert.equal(scriptureShare('John 3:16', 'fr'), null)
  assert.equal(scriptureShare('John 3:16', undefined), null)
})

test('short passages fit; long images label excerpts without truncating the shared reader', () => {
  const short = scriptureShare('Psalm 23:1-2', 'en')
  const model = scriptureImageModel(short, true)
  assert.equal(model.excerpt, false)
  assert.ok(model.lines.join(' ').includes('The LORD is my shepherd'))
  const long = scriptureShare('Psalm 119', 'en')
  assert.equal(long.rows.length, 176)
  for (const portrait of [false, true]) {
    const image = scriptureImageModel(long, portrait)
    assert.equal(image.excerpt, true)
    assert.ok(image.lines.length <= (portrait ? 23 : 9))
    assert.ok(image.lines.every(line => !line.includes('<')))
  }
  assert.equal(long.rows.length, 176)
  assert.equal(new URL(long.url).searchParams.get('q'), 'PSA 119')
})

test('multiple chapters retain identifying references in the image', () => {
  const share = scriptureShare('John 3:36-4:2; Romans 8:28', 'en')
  assert.equal(share.rows.length, 4)
  assert.match(scriptureImageModel(share, true).lines[0], /^John 3:36/)
})
