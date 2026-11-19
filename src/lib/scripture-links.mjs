import { bibleBookNames, normalize, parseReferences, searchBible } from './bible.mjs'

// Fixed book-name alternatives and bounded numeric syntax, never a regex from post content.
const accentLetters = { a: '[aá]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]', n: '[nñ]' }
const names = [...new Set([...bibleBookNames].map(normalize))].sort((a, b) => b.length - a.length)
const bookPattern = names.map(name => [...name].map(char => char === ' ' ? '[ \\t]*' : accentLetters[char] || char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')).join('|')
const number = '\\d{1,10}'
const unit = `${number}(?:[ \\t]*:[ \\t]*${number})?(?:[ \\t]*[-–—][ \\t]*${number}(?:[ \\t]*:[ \\t]*${number})?)?`
// A trailing colon can introduce a quotation ("Psalm 91: ..."). Leave that
// punctuation outside the link, but never truncate a colon followed by digits.
const pattern = `(?<![\\p{L}\\p{N}_/])(?:${bookPattern})\\.?[ \\t]*${unit}(?:[ \\t]*[,;][ \\t]*${unit}){0,19}(?![\\p{L}\\p{N}_]|:\\s*\\d|[ \\t]*[-–—][ \\t]*\\d)`

export function findScriptureLinks(text, language = 'en') {
  if (typeof text !== 'string') return []
  language = language === 'es' ? 'es' : 'en'
  // Plain URLs are not prose references. Keep offsets intact when masking them.
  const searchable = text.replace(/(?:https?:\/\/|www\.)\S+/gi, url => ' '.repeat(url.length))
  const links = []
  for (const match of searchable.matchAll(new RegExp(pattern, 'giu'))) {
    const query = match[0].trim()
    if (query.length > 240) continue
    const parsed = parseReferences(query, language)
    if (!parsed?.selections || searchBible(query, language).type !== 'passage') continue
    links.push({ start: match.index, end: match.index + match[0].length, href: `/gospel/open?${new URLSearchParams({ lang: language, q: query })}` })
  }
  return links
}

// One reference can span several Portable Text spans (bold, italic, inline quote).
// Slice the original spans so formatting is preserved inside one accessible link.
export function scriptureSegments(block, language = 'en') {
  const spans = []
  let text = ''
  for (const child of block.children || []) {
    if (child._type !== 'span' || typeof child.text !== 'string') { text += '\n'; continue }
    const start = text.length
    text += child.text
    const linked = (child.marks || []).some(mark => block.markDefs?.some(def => def._key === mark && def._type === 'link'))
    spans.push({ ...child, start, end: text.length, linked })
  }
  const links = findScriptureLinks(text, language).filter(link => !spans.some(span => span.linked && span.start < link.end && span.end > link.start))
  const segments = []
  function append(start, end, href) {
    if (start >= end) return
    segments.push({ href, children: spans.filter(span => span.start < end && span.end > start).map(span => ({ ...span, text: span.text.slice(Math.max(start - span.start, 0), Math.min(end, span.end) - span.start) })) })
  }
  let cursor = 0
  for (const link of links) { append(cursor, link.start); append(link.start, link.end, link.href); cursor = link.end }
  append(cursor, text.length)
  return segments
}

// Expand reference-only paragraphs, not passing mentions or quotations the
// author has already written in the same paragraph. Manual links stay manual.
export function scriptureQuotations(block, language = 'en') {
  if (block._type !== 'block' || block.style === 'blockquote' ||
      block.children?.some(child => child._type !== 'span')) return []
  const segments = scriptureSegments(block, language)
  if (segments.some(segment => !segment.href &&
      /[^\s:;,.()[\]“”"'‘’]/u.test(segment.children.map(child => child.text).join('')))) return []
  const seen = new Set()
  return segments.filter(segment => segment.href).flatMap(segment => {
    const query = new URL(segment.href, 'https://local.invalid').searchParams.get('q')
    const result = searchBible(query, language)
    // Chapter-only references remain links so a short mention cannot insert a
    // whole chapter. The Bible parser also enforces valid, bounded passages.
    if (result.type !== 'passage' || result.selections.some(selection => selection.end === Infinity)) return []
    const key = result.rows.map(row => row.key).join(',')
    if (seen.has(key)) return []
    seen.add(key)
    return [{ href: segment.href, reference: query, rows: result.rows }]
  })
}

// The author explicitly starts the final quotation section with a heading.
// Join spans before matching: pasted posts may be one block with soft newlines.
export function postScriptureQuotations(blocks, language = 'en') {
  const text = blocks.filter(block => block._type === 'block').map(block =>
    (block.children || []).map(child => child._type === 'span' ? child.text || '' : '\n').join('')
  ).join('\n')
  const heading = /^[\t ]*(?:Scriptures|Escrituras)[\t ]*:/im.exec(text)
  if (!heading) return []
  const section = text.slice(heading.index + heading[0].length)
  const seen = new Set()
  const quotes = []
  let verses = 0
  for (const link of findScriptureLinks(section, language)) {
    const query = new URL(link.href, 'https://local.invalid').searchParams.get('q')
    const result = searchBible(query, language)
    if (result.type !== 'passage' || result.selections.some(s => s.end === Infinity)) continue
    const key = result.rows.map(row => row.key).join(',')
    if (seen.has(key)) continue
    if (quotes.length >= 20 || verses + result.rows.length > 500) break
    seen.add(key)
    verses += result.rows.length
    quotes.push({ href: link.href, reference: query, rows: result.rows })
  }
  return quotes
}
