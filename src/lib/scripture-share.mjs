import { searchBible, readablePassageQuery } from './bible.mjs'

export const SITE_ORIGIN = 'https://www.hakadoshministry.com'

// Public share pages use an explicit language, never a visitor's cookie. Only
// validated Bible references can reach image generation; no arbitrary text/URLs.
export function scriptureShare(query, language) {
  if (!['en', 'es'].includes(language) || typeof query !== 'string' || query.length > 1000) return null
  const result = searchBible(query, language)
  if (result.type !== 'passage' || !result.rows.length) return null
  const canonical = result.selections.map(({ book, chapter, endChapter, start, end }) => {
    if (end === Infinity) return `${book.id} ${chapter}${endChapter !== chapter ? `-${endChapter}` : ''}`
    return `${book.id} ${chapter}:${start}${endChapter !== chapter ? `-${endChapter}:${end}` : end !== start ? `-${end}` : ''}`
  }).join('; ')
  const params = new URLSearchParams({ lang: language, q: canonical })
  const title = readablePassageQuery(result)
  return {
    language, query: canonical, title, rows: result.rows,
    version: language === 'es' ? 'BES' : 'BSB',
    path: `/gospel/share?${params}`,
    url: `${SITE_ORIGIN}/gospel/share?${params}`,
    // New editions must not reuse cached images of the previous translations.
    image: `/gospel/share/image?${params}&edition=${language === 'es' ? 'bes-2026' : 'bsb-3'}`,
    reader: `/gospel/open?${params}`,
  }
}

export function scriptureShareLinks(share) {
  const text = `${share.title} (${share.version})`
  return {
    whatsapp: `https://wa.me/?${new URLSearchParams({ text: `${text}\n${share.url}` })}`,
    x: `https://twitter.com/intent/tweet?${new URLSearchParams({ text: text.slice(0, 160), url: share.url })}`,
  }
}

function wrap(text, width) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) { lines.push(line); line = '' }
    line += `${line ? ' ' : ''}${word}`
  }
  if (line) lines.push(line)
  return lines
}

// Keep the text readable at social-preview sizes. Long selections are explicitly
// marked as excerpts; the link always retains the entire requested passage.
export function scriptureImageModel(share, portrait = false) {
  const width = portrait ? 56 : 72
  const maxLines = portrait ? 23 : 9
  const oneChapter = new Set(share.rows.map(row => `${row.book}.${row.chapter}`)).size === 1
  const lines = []
  let included = 0
  for (const row of share.rows) {
    const next = wrap(`${oneChapter ? row.verse : row.reference}  ${row.text}`, width)
    const gap = lines.length ? 1 : 0
    if (lines.length + gap + next.length > maxLines) {
      if (!lines.length) lines.push(...next.slice(0, maxLines - 1), '…')
      break
    }
    if (gap) lines.push('')
    lines.push(...next)
    included++
  }
  return { lines, excerpt: included < share.rows.length, title: share.title.length > 85 ? `${share.title.slice(0, 82)}…` : share.title }
}
