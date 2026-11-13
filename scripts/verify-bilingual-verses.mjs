import assert from 'node:assert/strict'
import { test } from 'node:test'
import english from '../src/data/kjv-nt.json' with { type: 'json' }
import spanish from '../src/data/rv1909-nt.json' with { type: 'json' }
import { getSpanishVerse } from '../src/lib/spanish-verse.js'
import { getVerseOfTheDay } from '../src/lib/verse-of-the-day.js'

test('all 7,957 KJV references have exactly one complete Spanish counterpart', () => {
  assert.equal(english.length, 7957)
  assert.equal(spanish.length, english.length)
  assert.equal(new Set(spanish.map(v => v.book)).size, 27)
  assert.equal(new Set(spanish.map(v => `${v.book}:${v.chapter}`)).size, 260)
  const references = new Set()
  for (const verse of english) {
    const translated = getSpanishVerse(verse)
    assert.equal(translated.book, verse.book)
    assert.equal(translated.chapter, verse.chapter)
    assert.equal(translated.verse, verse.verse)
    assert.ok(translated.text.trim(), verse.reference)
    assert.doesNotMatch(translated.text, /[<>\uFFFD]/, verse.reference)
    references.add(`${translated.book}:${translated.chapter}:${translated.verse}`)
  }
  assert.equal(references.size, 7957)
})

test('Spanish spelling and translated book names are retained', () => {
  const translated = getSpanishVerse({ book: 'John', chapter: 3, verse: 16 })
  assert.equal(translated.reference, 'Juan 3:16')
  assert.equal(translated.text, 'Porque de tal manera amó Dios al mundo, que ha dado á su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.')
})

test('source numbering differences retain the corresponding passage', () => {
  const acts = getSpanishVerse({ book: 'Acts', chapter: 19, verse: 41 })
  assert.equal(acts.text, 'Y habiendo dicho esto, despidió la concurrencia.')
  assert.equal(acts.reference, 'Hechos 19:40')
  assert.equal(acts.kjvReference, 'Hechos 19:41')
  assert.ok(!getSpanishVerse({ book: 'Acts', chapter: 19, verse: 40 }).text.includes(acts.text))
  const greeting = getSpanishVerse({ book: '2Corinthians', chapter: 13, verse: 13 })
  assert.equal(greeting.text, 'Todos los santos os saludan.')
  assert.equal(greeting.reference, '2 Corintios 13:12')
  const blessing = getSpanishVerse({ book: '2Corinthians', chapter: 13, verse: 14 })
  assert.ok(blessing.text.startsWith('La gracia del Señor Jesucristo,'))
  assert.equal(blessing.reference, '2 Corintios 13:13')
})

test('both languages follow the existing Eastern-time selection across midnight and DST', () => {
  const pairs = [
    ['2026-11-11T05:00:00Z', '2026-11-12T04:59:59Z'],
    ['2026-03-08T05:00:00Z', '2026-03-09T03:59:59Z'],
    ['2026-11-01T04:00:00Z', '2026-11-02T04:59:59Z'],
  ]
  for (const [start, end] of pairs) {
    const first = getVerseOfTheDay(english, new Date(start))
    const last = getVerseOfTheDay(english, new Date(end))
    assert.equal(first, last)
    assert.equal(getSpanishVerse(first), getSpanishVerse(last))
    const nextDay = getVerseOfTheDay(english, new Date(Date.parse(end) + 1000))
    assert.notEqual(nextDay.reference, first.reference)
    assert.notEqual(getSpanishVerse(nextDay), getSpanishVerse(first))
  }
})
