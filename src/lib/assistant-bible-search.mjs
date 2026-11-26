import { bibles, normalize, reference } from './bible.mjs'

// Build once per server instance; no model call, external service or visitor storage.
const indexes = new Map()
export function rankedBibleReferences(message, language) {
  if (!indexes.has(language)) {
    const rows = bibles[language].flatMap(book => book.chapters.flatMap((chapter, c) => chapter.map(v => ({
      ...v, book, chapter: c + 1, words: new Set(normalize(v.text).match(/[\p{L}]{3,}/gu) || []),
    }))))
    const frequencies = new Map()
    for (const row of rows) for (const word of row.words) frequencies.set(word, (frequencies.get(word) || 0) + 1)
    indexes.set(language, { rows, frequencies })
  }
  const { rows, frequencies } = indexes.get(language)
  const ignored = new Set('who what which how when where does did was were are about could would should have this that please bible ministry tell explain question with from your more know want help today why que quien quienes como cual cuando donde para sobre puede puedes quiero saber dice biblia ministerio explica explicar pregunta tiene este esta esto porque'.split(' '))
  const words = [...new Set(normalize(message).match(/[\p{L}]{3,}/gu) || [])].filter(w => !ignored.has(w) && frequencies.has(w)).slice(0, 24)
  if (!words.length) return []
  const scored = rows.map(row => ({ row, score: words.reduce((n,w) => n + (row.words.has(w) ? Math.log(1 + rows.length / frequencies.get(w)) : 0), 0) }))
    .filter(item => item.score > 0).sort((a,b) => b.score-a.score)
  // Two relevant passages, each with surrounding context. Ambiguous names still
  // require clarification; a keyword match is evidence, not a complete biography.
  const selected = [], seen = new Set()
  for (const { row } of scored) {
    const key = row.book.id + '.' + row.chapter
    if (seen.has(key)) continue
    seen.add(key)
    const chapter = row.book.chapters[row.chapter - 1]
    const index = chapter.findIndex(v => v.verse === row.verse)
    const context = chapter.slice(Math.max(0,index-1), index+2)
    selected.push(reference(row.book,row.chapter,context[0].start + '-' + context.at(-1).end))
    if (selected.length === 2) break
  }
  return selected
}
