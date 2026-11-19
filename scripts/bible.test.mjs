import test from 'node:test'
import assert from 'node:assert/strict'
import { bibles, dailyPassages, getDailyPassage, parseReferences, searchBible, passageHref, readablePassageQuery } from '../src/lib/bible.mjs'
import manifest from '../src/data/bible/manifest.json' with { type: 'json' }
import legacyAliases from '../src/data/bible/book-aliases.json' with { type: 'json' }

test('both complete Bibles contain 66 ordered books and 1,189 populated chapters', () => {
  for (const [language, books] of Object.entries(bibles)) {
    assert.equal(books.length, 66)
    assert.equal(books[0].id, 'GEN')
    assert.equal(books[38].id, 'MAL')
    assert.equal(books[39].id, 'MAT')
    assert.equal(books[65].id, 'REV')
    assert.equal(books.reduce((n, book) => n + book.chapters.length, 0), 1189)
    const gaps = []
    for (const book of books) for (const [index, chapter] of book.chapters.entries()) {
      assert.ok(chapter.length)
      let previous = 0
      for (const verse of chapter) {
        assert.ok(verse.start > previous)
        for (let v = previous + 1; v < verse.start; v++) gaps.push(`${book.id}.${index + 1}.${v}`)
        assert.equal(verse.start, verse.end)
        previous = verse.end
        assert.ok(verse.text.trim())
        assert.doesNotMatch(verse.text, /[<>\uFFFD]/)
      }
    }
    assert.deepEqual(gaps.sort(), manifest[language].omittedMainTextPositions)
  }
  assert.equal(bibles.en.flatMap(b => b.chapters.flat()).length, 31086)
  assert.equal(bibles.es.flatMap(b => b.chapters.flat()).length, 31102)
  assert.equal(searchBible('Genesis 1:1').rows[0].text, 'In the beginning God created the heavens and the earth.')
  assert.equal(searchBible('Génesis 1:1', 'es').rows[0].text, 'Al principio Dios hizo el cielo y la tierra.')
})

test('reference search supports both languages, ranges, commas, and multiple books', () => {
  for (const language of ['en', 'es']) {
    assert.equal(searchBible('John 3', language).rows.at(-1).end, 36)
    assert.equal(searchBible('Juan 3:16–18', language).rows[0].start, 16)
    const multi = searchBible('John 3:16,18; Romanos 8:28', language)
    assert.equal(multi.type, 'passage')
    assert.deepEqual(multi.rows.map(v => v.book), ['JHN', 'JHN', 'ROM'])
    assert.deepEqual(multi.rows.map(v => v.start), [16, 18, 28])
    assert.equal(searchBible('John 3:36-4:2', language).rows.at(-1).chapter, 4)
    assert.equal(searchBible('1 John 1:1', language).rows[0].book, '1JN')
    assert.equal(searchBible('1Corinthians 13', language).rows[0].book, '1CO')
    assert.equal(searchBible('Salmos 119', language).rows.at(-1).end, 176)
    assert.equal(searchBible('Revelation 22:21', language).rows[0].book, 'REV')
    assert.equal(searchBible('John', language).rows[0].chapter, 1)
    assert.equal(searchBible('John 3:16; John 3:16', language).rows.length, 1)
  }
})

test('BES verses stay separate; BSB source gaps retain their original numbering', () => {
  const result = searchBible('Genesis 1:11,12', 'es')
  assert.equal(result.rows.length, 2)
  assert.deepEqual(result.rows.map(v => v.verse), ['11', '12'])
  assert.equal(result.rows[0].reference, 'Génesis 1:11')
  assert.equal(searchBible('Job 39', 'es').rows.length, 30)
  assert.equal(searchBible('Numbers 13', 'es').rows.length, 33)
  assert.equal(searchBible('3 John 1:14', 'es').rows[0].text, 'Espero verte pronto, y hablaremos cara a cara. La paz sea contigo. Los amigos te saludan. Saluda a los amigos, a cada uno por su nombre.')
  assert.equal(searchBible('John 5:4', 'en').type, 'error')
  assert.equal(searchBible('John 5:4', 'es').rows[0].start, 4)
  assert.deepEqual(searchBible('John 5:3-5', 'en').rows.map(v => v.start), [3, 5])
  assert.equal(searchBible('Psalm 23:1', 'en').rows[0].text, 'A Psalm of David. The LORD is my shepherd; I shall not want.')
  assert.equal(searchBible('Salmo 23:1', 'es').rows[0].text, 'El Señor es mi pastor; no me faltará ningún bien.')
  for (const book of bibles.es) for (const verses of book.chapters) for (const v of verses) assert.equal(v.start, v.end)
})

test('full book names can be resubmitted without changing the selected passages', () => {
  for (const language of ['en', 'es']) {
    for (const query of ['PRO 3:5,6; 2CH 7:14', 'JHN 3:36-4:2', '1CH 2-3', 'SNG', Array(20).fill('1TH 1:1').join(';')]) {
      const original = searchBible(query, language)
      assert.equal(original.type, 'passage')
      const display = readablePassageQuery(original)
      assert.deepEqual(searchBible(display, language).rows, original.rows, display)
    }
  }
  assert.equal(searchBible('a'.repeat(1001)).error, 'broad')
  assert.equal(readablePassageQuery(searchBible('faith')), 'faith')
})

test('malformed, excessive, nonexistent, and hostile queries fail safely', () => {
  for (const query of ['John 0', 'John 22', 'John 3:0', 'John 3:99', 'John 4-3', 'John 3:18-16', 'John 1-21', 'John 3:16;', 'Fakebook 3:16', 'John ' + '1'.repeat(240)]) {
    const result = searchBible(query)
    assert.equal(result.type, 'error', query)
    assert.equal(result.rows.length, 0)
  }
  assert.equal(searchBible('a').error, 'short')
  assert.equal(searchBible('a'.repeat(241)).error, 'broad')
  assert.equal(parseReferences(Array(21).fill('John 1').join(';')).error, 'broad')
  assert.equal(searchBible('<script>alert(1)</script>').rows.length, 0)
  assert.equal(searchBible(['John 1', 'John 2']).type, 'browse')
})

test('keyword search is accent/case insensitive, supports phrases and bounds pagination', () => {
  const first = searchBible('amor', 'es')
  assert.ok(first.total > 40)
  assert.equal(first.rows.length, 40)
  assert.deepEqual(searchBible('AMOR', 'es').rows, first.rows)
  assert.deepEqual(searchBible('Espíritu', 'es').rows, searchBible('espiritu', 'es').rows)
  assert.ok(searchBible('"God so loved"').rows.some(v => v.reference === 'John 3:16'))
  assert.ok(searchBible('God world').rows.some(v => v.reference === 'John 3:16'))
  assert.equal(searchBible('love', 'en', -1).page, 1)
  const last = searchBible('love', 'en', 99999)
  assert.equal(last.page, last.pages)
  assert.ok(!first.rows.some(a => searchBible('amor', 'es', 2).rows.some(b => a.key === b.key)))
})

test('every daily passage links to the exact same displayed text in both languages', () => {
  assert.equal(new Set(dailyPassages.map(p => p.en.book)).size, 66)
  for (const pair of dailyPassages) for (const language of ['en', 'es']) {
    const v = pair[language]
    const result = searchBible(`${v.book} ${v.chapter}:${v.verse}`, language)
    assert.equal(result.type, 'passage', v.reference)
    assert.equal(result.rows.map(row => row.text).join(' '), v.text, v.reference)
    const url = new URL(passageHref(v.book, v.chapter, v.verse, language), 'https://example.org')
    assert.equal(url.pathname, '/gospel/open')
    assert.equal(url.searchParams.get('lang'), language)
  }
  assert.equal(dailyPassages.length, 31086)
  for (const pair of dailyPassages) for (const v of Object.values(pair)) assert.match(v.verse, /^\d+$/)
  assert.equal(dailyPassages.find(p => p.en.book === 'JON' && p.en.chapter === 1 && p.en.verse === '17').es.reference, 'Jonás 1:17')
  assert.equal(dailyPassages.find(p => p.en.book === 'JOB' && p.en.chapter === 40 && p.en.verse === '1').es.reference, 'Job 40:1')
  assert.equal(dailyPassages.find(p => p.en.book === '2CO' && p.en.chapter === 13 && p.en.verse === '14').es.verse, '14')
  for (const pair of dailyPassages) {
    assert.equal(pair.en.chapter, pair.es.chapter)
    assert.equal(pair.en.verse, pair.es.verse)
  }
})

test('daily pairs cover the whole BSB and all BES positions except the 16 BSB source gaps', () => {
  assert.equal(manifest.en.omittedMainTextPositions.length, 16)
  for (const language of ['en', 'es']) {
    const seen = new Set(dailyPassages.map(pair => `${pair[language].book}.${pair[language].chapter}.${pair[language].verse}`))
    assert.equal(seen.size, dailyPassages.length)
    for (const key of manifest.en.omittedMainTextPositions) {
      assert.ok(!seen.has(key), key)
      if (language === 'es') seen.add(key)
    }
    const all = bibles[language].flatMap(b => b.chapters.flatMap((c, i) => c.map(v => `${b.id}.${i + 1}.${v.verse}`)))
    assert.equal(seen.size, all.length)
    for (const key of all) assert.ok(seen.has(key), key)
  }
})

test('previous edition book names and abbreviations still resolve existing links and posts', () => {
  for (const [alias, id] of Object.entries(legacyAliases)) for (const language of ['en', 'es']) {
    assert.equal(searchBible(`${alias} 1:1`, language).rows[0]?.book, id, alias)
  }
})

test('daily selection remains shared and stable across Eastern-time day boundaries', () => {
  for (const [start, end] of [['2026-11-17T05:00:00Z', '2026-11-18T04:59:59Z'], ['2026-03-08T05:00:00Z', '2026-03-09T03:59:59Z']]) {
    assert.equal(getDailyPassage(new Date(start)), getDailyPassage(new Date(end)))
    assert.notEqual(getDailyPassage(new Date(start)), getDailyPassage(new Date(Date.parse(end) + 1000)))
  }
})
