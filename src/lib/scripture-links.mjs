import { bibleBookNames, normalize, parseReferences, searchBible } from './bible.mjs'

// Fixed book-name alternatives and bounded numeric syntax, never a regex from post content.
const accentLetters = { a: '[aá]', e: '[eé]', i: '[ií]', o: '[oó]', u: '[uúü]', n: '[nñ]' }
const names = [...new Set([...bibleBookNames].map(normalize))].sort((a, b) => b.length - a.length)
const bookPattern = names.map(name => [...name].map(char => char === ' ' ? '[ \\t]*' : accentLetters[char] || char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('')).join('|')
const number = '\\d{1,10}'
const unit = `${number}(?:[ \\t]*:[ \\t]*${number})?(?:[ \\t]*[-–—][ \\t]*${number}(?:[ \\t]*:[ \\t]*${number})?)?`
const pattern = `(?<![\\p{L}\\p{N}_/])(?:${bookPattern})\\.?[ \\t]*${unit}(?:[ \\t]*[,;][ \\t]*${unit}){0,19}(?![\\p{L}\\p{N}_:]|[ \\t]*[-–—][ \\t]*\\d)`

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
