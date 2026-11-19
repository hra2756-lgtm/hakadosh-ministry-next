import english from '../data/bible/en.json' with { type: 'json' }
import spanish from '../data/bible/es.json' with { type: 'json' }
import legacyAliases from '../data/bible/book-aliases.json' with { type: 'json' }
import { getVerseOfTheDay } from './verse-of-the-day.js'
import { spanishDailyReference } from './bible-alignment.mjs'

export const bibles = { en: english, es: spanish }
export const MAX_BIBLE_QUERY_LENGTH = 1000
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim()
const compact = value => normalize(value).replace(/[–—]/g, '-').replace(/\s/g, '')
const aliases = new Map()
export const bibleBookNames = new Set()
function addAlias(alias, id) {
  bibleBookNames.add(alias)
  aliases.set(compact(alias), id)
}
for (const books of Object.values(bibles)) for (const book of books) {
  for (const alias of [book.id, book.name, book.abbr, book.name.replace(/^San /, '')]) addAlias(alias, book.id)
}
addAlias('salmo', 'PSA')
// Keep previously published names/abbreviations working after edition changes.
for (const [alias, id] of Object.entries(legacyAliases)) addAlias(alias, id)
for (const [alias, id] of Object.entries({ psalm: 'PSA', salmos: 'PSA', 'song of songs': 'SNG', 'cantar de los cantares': 'SNG', 'cantar de cantares': 'SNG', 'cantares': 'SNG', john: 'JHN', jn: 'JHN', '1 cor': '1CO', '2 cor': '2CO', '1 thes': '1TH', '2 thes': '2TH', '1 tim': '1TI', '2 tim': '2TI', '1 pet': '1PE', '2 pet': '2PE' })) addAlias(alias, id)
const aliasList = [...aliases.keys()].sort((a, b) => b.length - a.length)
export const findBook = (value, language = 'en') => bibles[language].find(book => book.id === aliases.get(compact(value)))
export const chapterHref = (book, chapter) => `/gospel?q=${encodeURIComponent(`${book} ${chapter}`)}`
export const passageHref = (book, chapter, verse, language) => `/gospel/open?${new URLSearchParams({ book, chapter: String(chapter), verse: String(verse), lang: language })}`
export const reference = (book, chapter, verse) => `${book.name} ${chapter}${verse ? `:${verse}` : ''}`

function row(book, chapter, verse) {
  return { ...verse, book: book.id, chapter, reference: reference(book, chapter, verse.verse), key: `${book.id}.${chapter}.${verse.verse}` }
}

const indexes = Object.fromEntries(Object.entries(bibles).map(([language, books]) => [language, books.flatMap(book => book.chapters.flatMap((verses, c) => verses.map(verse => ({ ...row(book, c + 1, verse), search: normalize(verse.text) }))))]))

// Accept either language's names, canonical IDs, and common abbreviations.
// Ranges keep the original translation's verse bridges intact.
export function parseReferences(query, language = 'en') {
  const parts = query.split(/\s*[;,]\s*/)
  if (parts.length > 20) return { error: 'broad' }
  let currentBook, currentChapter, verseContext = false
  const selections = []
  for (const part of parts) {
    const value = compact(part)
    const alias = aliasList.find(name => value.startsWith(name) && (!value.slice(name.length) || /^\d/.test(value.slice(name.length))))
    let rest = value
    if (alias) {
      currentBook = findBook(aliases.get(alias), language)
      rest = value.slice(alias.length)
      currentChapter = undefined
      verseContext = false
    } else if (!currentBook) {
      return /\d\s*:\s*\d/.test(query) ? { error: 'invalid' } : null
    }
    if (!rest && alias) {
      selections.push({ book: currentBook, chapter: 1, endChapter: 1, start: 1, end: Infinity, bookOnly: true })
      continue
    }
    const match = rest.match(/^(\d+)(?::(\d+))?(?:-(?:(\d+):)?(\d+))?$/)
    if (!match) return { error: 'invalid' }
    const [, first, second, endChapterPart, last] = match
    let chapter, endChapter, start, end
    if (second) {
      chapter = Number(first); start = Number(second)
      endChapter = endChapterPart ? Number(endChapterPart) : chapter
      end = last ? Number(last) : start
      verseContext = true
    } else if (!alias && verseContext) {
      chapter = currentChapter; endChapter = chapter
      start = Number(first); end = last ? Number(last) : start
      if (endChapterPart) return { error: 'invalid' }
    } else {
      chapter = Number(first); endChapter = last ? Number(last) : chapter
      start = 1; end = Infinity; verseContext = false
      if (endChapterPart) return { error: 'invalid' }
    }
    if (!chapter || chapter > currentBook.chapters.length || endChapter < chapter || endChapter > currentBook.chapters.length || !start || (endChapter === chapter && end < start)) return { error: 'invalid' }
    const firstVerses = currentBook.chapters[chapter - 1], lastVerses = currentBook.chapters[endChapter - 1]
    if (!firstVerses.some(v => v.start <= start && v.end >= start) || (end !== Infinity && !lastVerses.some(v => v.start <= end && v.end >= end))) return { error: 'invalid' }
    selections.push({ book: currentBook, chapter, endChapter, start, end })
    currentChapter = endChapter
  }
  return { selections }
}

export function searchBible(input, language = 'en', pageInput = 1) {
  const query = typeof input === 'string' ? input.trim() : ''
  if (!query) return { type: 'browse', query, rows: [] }
  if (query.length > MAX_BIBLE_QUERY_LENGTH) return { type: 'error', error: 'broad', query: query.slice(0, MAX_BIBLE_QUERY_LENGTH), rows: [] }
  const parsed = parseReferences(query, language)
  // Full book names can expand a valid multi-passage query. Keep the 20-reference
  // and 500-verse caps, and retain the shorter limit for free-text word searches.
  if (query.length > 240 && !parsed?.selections) return { type: 'error', error: 'broad', query: query.slice(0, 240), rows: [] }
  if (parsed?.error) return { type: 'error', error: parsed.error, query, rows: [] }
  if (parsed) {
    const unique = new Map()
    for (const { book, chapter, endChapter, start, end } of parsed.selections) {
      for (let c = chapter; c <= endChapter; c++) for (const verse of book.chapters[c - 1]) {
        if (verse.end >= (c === chapter ? start : 1) && verse.start <= (c === endChapter ? end : Infinity)) {
          const entry = row(book, c, verse)
          unique.set(entry.key, entry)
          if (unique.size > 500) return { type: 'error', error: 'broad', query, rows: [] }
        }
      }
    }
    return { type: 'passage', query, rows: [...unique.values()], selections: parsed.selections }
  }
  const tokens = (query.match(/"[^"]+"|[^\s"]+/g) || []).map(token => normalize(token.replaceAll('"', ''))).filter(Boolean)
  if (!tokens.length || tokens.some(t => t.length < 2)) return { type: 'error', error: 'short', query, rows: [] }
  const matches = indexes[language].filter(v => tokens.every(token => v.search.includes(token)))
  const pages = Math.max(1, Math.ceil(matches.length / 40))
  const page = Math.min(pages, Math.max(1, /^\d{1,5}$/.test(String(pageInput)) ? Number(pageInput) : 1))
  return { type: 'words', query, total: matches.length, page, pages, rows: matches.slice((page - 1) * 40, page * 40).map(({ search: _search, ...verse }) => verse) }
}

// Keep stable book IDs in navigation URLs, but show localized full names to readers.
export function readablePassageQuery(result) {
  if (result.type !== 'passage') return result.query
  return result.selections.map(({ book, bookOnly, chapter, endChapter, start, end }) => {
    if (bookOnly) return book.name
    if (end === Infinity) return `${book.name} ${chapter}${endChapter !== chapter ? `–${endChapter}` : ''}`
    const range = endChapter !== chapter ? `–${endChapter}:${end}` : end !== start ? `–${end}` : ''
    return `${book.name} ${chapter}:${start}${range}`
  }).join('; ')
}

// Select a single verse with a complete one-to-one counterpart. Preserve the
// original reference in each edition, including chapter-boundary differences.
const dailyPassages = english.flatMap((book, i) => book.chapters.flatMap((verses, c) => verses.flatMap(v => {
  const mapped = spanishDailyReference(book.id, c + 1, v.start)
  if (!mapped) return []
  const [chapter, number] = mapped
  const esVerse = spanish[i].chapters[chapter - 1].find(item => item.start === number)
  if (!esVerse) throw new Error(`Missing BES daily mapping: ${book.id} ${c + 1}:${v.verse}`)
  return [{ en: { book: book.id, chapter: c + 1, verse: v.verse, text: v.text, reference: reference(book, c + 1, v.verse) }, es: { book: book.id, chapter, verse: esVerse.verse, text: esVerse.text, reference: reference(spanish[i], chapter, esVerse.verse) } }]
})))

export const getDailyPassage = now => getVerseOfTheDay(dailyPassages, now)
export { dailyPassages }
