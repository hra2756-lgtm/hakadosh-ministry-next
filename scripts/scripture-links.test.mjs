import test from 'node:test'
import assert from 'node:assert/strict'
import { findScriptureLinks, scriptureSegments, scriptureQuotations } from '../src/lib/scripture-links.mjs'
import { bibles, searchBible } from '../src/lib/bible.mjs'

const queries = (text, language) => findScriptureLinks(text, language).map(link => new URL(link.href, 'https://example.test').searchParams.get('q'))
const span = (text, marks = []) => ({ _type: 'span', text, marks })

test('all 66 books in both languages produce valid internal links', () => {
  for (const language of ['en', 'es']) for (const book of bibles[language]) {
    const text = `Read (${book.name} 1:1).`
    const links = findScriptureLinks(text, language)
    assert.equal(links.length, 1, text)
    const url = new URL(links[0].href, 'https://example.test')
    assert.equal(url.pathname, '/gospel/open')
    assert.equal(url.searchParams.get('lang'), language)
    assert.equal(searchBible(url.searchParams.get('q'), language).rows[0].book, book.id)
    assert.equal(text.slice(links[0].start, links[0].end), `${book.name} 1:1`)
  }
})

test('recognizes accents, abbreviations, chapters, ranges, lists and separate references', () => {
  for (const text of ['John 3:16–18', 'Juan 3:16, 18', 'John 3:36–4:2', 'Psalm 23', '1 Cor. 13:4-7', '1John 1:1', 'Génesis 1:1', 'Genesis 1:1', 'Cantar de los Cantares 2:1', 'Jn. 3:16', 'John 3:16; 4:1']) {
    assert.deepEqual(queries(text), [text], text)
  }
  assert.deepEqual(queries('John 3:16; Romans 8:28 and Juan 1:1.'), ['John 3:16', 'Romans 8:28', 'Juan 1:1'])
  assert.deepEqual(queries('😀 **John 3:16**'), ['John 3:16'])
})

test('invalid and uncertain references stay plain text; URLs are not rewritten', () => {
  for (const text of ['John', 'John 99:1', 'John 3:999', 'John 3:0', 'John 3:18-16', 'John 3:16-999', 'John 3000:1', 'John 3:16000', 'John 3:16abc', 'notJohn 3:16', 'https://example.org/John3:16', 'www.example.org/John3:16', 'the third chapter', 'Love never fails.']) {
    assert.deepEqual(queries(text), [], text)
  }
})

test('chapter headings before quotations link without consuming the colon or formatting', () => {
  for (const [language, name, rest] of [['en', 'Psalm', '\nHe who dwells'], ['es', 'Salmo', ']\nEl que habita']]) {
    const heading = `${name} 91`
    const block = { children: [span(`${heading}: `, ['strong', 'inlineQuote']), span(rest)] }
    const segments = scriptureSegments(block, language)
    const linked = segments.filter(segment => segment.href)
    assert.equal(linked.length, 1)
    assert.equal(linked[0].children.map(child => child.text).join(''), heading)
    const params = new URL(linked[0].href, 'https://example.test').searchParams
    assert.equal(params.get('lang'), language)
    assert.equal(searchBible(params.get('q'), language).rows.length, 16)
    assert.equal(segments.flatMap(segment => segment.children).map(child => child.text).join(''), `${heading}: ${rest}`)
  }
  assert.deepEqual(queries('Psalm 91:'), ['Psalm 91'])
  for (const text of ['Psalm 91:999', 'Psalm 91: 999', 'Psalm 91:\n999', 'Psalm 91:16:99']) assert.deepEqual(queries(text), [], text)
})

test('references split across formatting create one link and preserve the original content', () => {
  const block = { children: [span('Read '), span('John ', ['strong']), span('3:', ['em']), span('16', ['inlineQuote']), span(' today.')] }
  const segments = scriptureSegments(block, 'es')
  assert.equal(segments.filter(segment => segment.href).length, 1)
  assert.equal(new URL(segments[1].href, 'https://example.test').searchParams.get('lang'), 'es')
  assert.deepEqual(segments[1].children.map(child => child.marks), [['strong'], ['em'], ['inlineQuote']])
  assert.equal(segments.flatMap(segment => segment.children).map(child => child.text).join(''), 'Read John 3:16 today.')
})

test('existing links and inline objects are boundaries; author data is never mutated', () => {
  const block = { markDefs: [{ _key: 'manual', _type: 'link', href: 'https://example.org' }], children: [span('John ', ['manual']), span('3:16 and Romans 8:28')] }
  const original = structuredClone(block)
  assert.equal(scriptureSegments(block).filter(s => s.href).length, 1)
  assert.deepEqual(block, original)
  assert.equal(scriptureSegments({ children: [span('John '), { _type: 'image' }, span('3:16')] }).filter(s => s.href).length, 0)
  assert.equal(scriptureSegments({ children: [span('John 3:16\nRomans 8:28')] }).filter(s => s.href).length, 2)
})

test('long prose and near-matches do not require unbounded matching', { timeout: 3000 }, () => {
  assert.equal(findScriptureLinks('John 9999999999:9999999999. '.repeat(2000)).length, 0)
})

test('reference-only paragraphs quote exact local text, ranges and formatted references in both languages', () => {
  for (const [language, query] of [['en', 'Psalm 23:1-2'], ['es', 'Salmo 23:1–2'], ['en', 'John 3:36–4:2'], ['es', 'Juan 3:16, 18']]) {
    const block = { _type: 'block', children: [span(query.slice(0, 3), ['strong']), span(query.slice(3), ['highlight'])] }
    const original = structuredClone(block)
    const quotes = scriptureQuotations(block, language)
    assert.equal(quotes.length, 1)
    assert.deepEqual(quotes[0].rows, searchBible(query, language).rows)
    assert.deepEqual(block, original)
  }
  const block = { _type: 'block', children: [span('(John 3:16); Romans 8:28.')] }
  assert.equal(scriptureQuotations(block).length, 2)
  assert.equal(scriptureQuotations({ _type: 'block', children: [span('John 3:16; John 3:16')] }).length, 1)
})

test('prose, chapter-only references, manual links and existing quotations do not auto-expand', () => {
  for (const text of ['Psalm 91:', 'John 3', 'Read John 3:16 today.', 'John 3:16\nFor God so loved the world', 'John 3:999', '<img>John 3:16']) {
    assert.deepEqual(scriptureQuotations({ _type: 'block', children: [span(text)] }), [], text)
  }
  assert.deepEqual(scriptureQuotations({ _type: 'block', style: 'blockquote', children: [span('John 3:16')] }), [])
  assert.deepEqual(scriptureQuotations({ _type: 'block', markDefs: [{ _key: 'm', _type: 'link', href: 'https://example.com' }], children: [span('John 3:16', ['m'])] }), [])
})
