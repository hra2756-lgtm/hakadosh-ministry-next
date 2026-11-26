import { getLanguage, getPageMetadata } from '../../lib/language'
import { bibles, isNewTestament, chapterHref, findBook, reference, searchBible, readablePassageQuery, MAX_BIBLE_QUERY_LENGTH } from '../../lib/bible.mjs'
import { gospelText } from '../../lib/gospel-translations.mjs'
import { scriptureShare } from '../../lib/scripture-share.mjs'
import { ScriptureShare } from '../components/scripture-share'
import './gospel.css'

export async function generateMetadata() { return getPageMetadata('gospel') }

export default async function GospelPage({ searchParams }) {
  const { language } = await getLanguage()
  const t = gospelText[language]
  const params = await searchParams
  const books = bibles[language]
  const requestedBook = typeof params.book === 'string' ? findBook(params.book, language) : null
  const query = params.q ?? (params.book ? `${requestedBook?.id || '?'} ${typeof params.chapter === 'string' ? params.chapter : '1'}` : '')
  const result = searchBible(query, language, params.page)
  const share = result.type === 'passage' ? scriptureShare(result.query, language) : null
  const selected = result.rows[0]
  const selectedBook = selected ? findBook(selected.book, language) : requestedBook || books[0]
  const selectedChapter = selected?.chapter || 1
  const recommendations = [...new Map(result.rows.map(v => [`${v.book}.${v.chapter}`, { book: findBook(v.book, language), chapter: v.chapter }])).values()].slice(0, 3)
  const singleChapter = result.type === 'passage' && new Set(result.rows.map(v => `${v.book}.${v.chapter}`)).size === 1
  const ranges = []
  if (singleChapter) for (const verse of result.rows) {
    const previous = ranges.at(-1)
    if (previous && previous[1] + 1 === verse.start) previous[1] = verse.end
    else ranges.push([verse.start, verse.end])
  }
  const verseLabel = singleChapter && result.rows.length !== selectedBook.chapters[selectedChapter - 1].length
    ? ranges.map(([start, end]) => start === end ? start : `${start}–${end}`).join(', ') : ''

  const passageGroups = []
  for (const verse of result.rows) {
    let group = passageGroups.at(-1)
    if (!group || group.book !== verse.book || group.chapter !== verse.chapter) {
      group = { book: verse.book, chapter: verse.chapter, rows: [] }
      passageGroups.push(group)
    }
    group.rows.push(verse)
  }
  for (const group of passageGroups) {
    const spans = []
    for (const verse of group.rows) {
      const last = spans.at(-1)
      if (last && last[1] + 1 === verse.start) last[1] = verse.end
      else spans.push([verse.start, verse.end])
    }
    group.title = reference(findBook(group.book, language), group.chapter, spans.map(([a,b]) => a === b ? a : a + '–' + b).join(', '))
  }
  const pageHref = page => `/gospel?${new URLSearchParams({ q: result.query, page: String(page) })}`

  return <div className="gospel-page">
    <header className="gospel-heading">
      <p className="gospel-eyebrow">{t.eyebrow}</p>
      <p>{t.intro}</p>
      <span className="gospel-edition">{t.version}</span>
    </header>
    <section data-testament={isNewTestament(selectedBook.id) ? 'new' : 'old'} className="bible-search-panel" aria-label={t.search}>
      <div className="bible-search-controls">
      <form action="/gospel" method="get" className="bible-search-form" role="search">
        <label htmlFor="bible-query">{t.search}</label>
        <div className="bible-search-line">
          <input id="bible-query" name="q" type="search" required maxLength={MAX_BIBLE_QUERY_LENGTH} defaultValue={readablePassageQuery(result)} placeholder={t.placeholder} aria-describedby="bible-search-help" />
          <button className="hero-button hero-button-primary" type="submit">{t.submit} <span aria-hidden="true">→</span></button>
        </div><p id="bible-search-help">{t.help}</p>
      </form>
      <form action="/gospel" method="get" className="bible-browse-form" aria-label={t.browse}>
        <div><label htmlFor="bible-book">{t.book}</label>
          <select id="bible-book" name="book" defaultValue={selectedBook.id}>
            {[books.slice(0, 39), books.slice(39)].map((group, i) => <optgroup key={i} label={i ? t.new : t.old}>
              {group.map(book => <option key={book.id} value={book.id} data-chapters={book.chapters.length} data-testament={isNewTestament(book.id) ? 'new' : 'old'}>{book.name}</option>)}
            </optgroup>)}
          </select>
        </div>
        <div><label htmlFor="bible-chapter">{t.chapter}</label><div className="bible-chapter-picker"><input id="bible-chapter" type="number" name="chapter" min="1" max={selectedBook.chapters.length} required defaultValue={selectedChapter} /><button type="button" className="bible-chapter-toggle" hidden popoverTarget="bible-chapter-menu" aria-label={t.chapters} aria-controls="bible-chapter-menu">⌄</button><div id="bible-chapter-menu" popover="auto" role="group" aria-label={t.chapters}><div className="bible-chapter-calendar" /></div></div></div>
        <button type="submit" className="hero-button hero-button-secondary">{t.open}</button>
      </form>
      </div>
    </section>
    <div className="bible-layout">
      <aside className="bible-library" aria-label={t.books}>
        <h3>{t.books}</h3>
        {[books.slice(0, 39), books.slice(39)].map((group, index) => <details data-testament={index ? 'new' : 'old'} key={index} open={index === (books.indexOf(selectedBook) >= 39 ? 1 : 0)}>
          <summary>{index ? t.new : t.old}<span>{group.length}</span></summary>
          <div className="bible-book-list">{group.map(book => <a href={chapterHref(book.id, 1)} key={book.id} aria-current={selectedBook.id === book.id && result.rows.length ? 'true' : undefined}>{book.name}<span>{book.chapters.length}</span></a>)}</div>
        </details>)}
      </aside>
      <section data-testament={isNewTestament(selectedBook.id) ? 'new' : 'old'} className="bible-reading-column" aria-label={t.passages}>
        {result.type === 'browse' && <div className="bible-welcome">
          <span aria-hidden="true" className="bible-welcome-symbol">✦</span>
          <h3>{t.welcome}</h3><p>{t.welcomeBody}</p>
          <div className="bible-start-links">{['GEN', 'PSA', 'JHN'].map(id => <a className="hero-button hero-button-secondary" key={id} href={chapterHref(id, 1)}>{reference(findBook(id, language), 1)} →</a>)}</div>
        </div>}
        {result.type === 'error' && <p className="bible-notice" role="alert">{t[result.error]}</p>}
        {result.type === 'words' && <div className="bible-result-heading"><h3>{t.results}</h3><p>{result.total} {t.found}</p></div>}
        {result.type === 'words' && !result.rows.length && <p className="bible-notice">{t.none}</p>}
        {!!result.rows.length && <>
          <div className="bible-reading-panel">
            <div className="bible-reading-top">
            {singleChapter && <header className="bible-chapter-heading"><h3>{reference(selectedBook, selectedChapter, verseLabel)}</h3><p>{t.version}</p>
              <details><summary>{t.chapters}</summary><nav className="bible-chapter-grid" aria-label={t.chapters}>{selectedBook.chapters.map((_, i) => <a key={i} href={chapterHref(selectedBook.id, i + 1)} aria-current={selectedChapter === i + 1 ? 'page' : undefined}>{i + 1}</a>)}</nav></details>
            </header>}
            <div className="bible-highlight-tools" data-highlight-tools hidden data-select-first={t.selectFirst} data-saved={t.saved} data-cleared={t.cleared} data-storage={t.storage} data-limit={t.limit}>
              <div className="bible-highlight-popup" data-highlight-popup hidden role="toolbar" aria-label={t.highlight}>
                {['yellow', 'pink', 'blue', 'green'].map((color, i) => <button key={color} type="button" data-highlight-color={color} aria-label={t.highlightColors[i]} title={t.highlightColors[i]}><span aria-hidden="true" /></button>)}
                <button type="button" data-highlight-erase aria-label={t.eraseSelection} title={t.eraseSelection}><svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg></button>
              </div>
              <p>{t.highlightHelp}</p><p data-highlight-status role="status" aria-live="polite" />
            </div>
            </div>
            <div className="bible-passages" data-bible-passages data-language={language}>
              {passageGroups.map((group, index) => <section key={index} className="bible-passage-group" data-passage-title={group.title} data-testament={isNewTestament(group.book) ? 'new' : 'old'}>
                {!singleChapter && <h3 className="bible-passage-title">{group.title}</h3>}
                <div className="bible-passage-flow">{group.rows.map(verse => <article key={verse.key} data-testament={isNewTestament(verse.book) ? 'new' : 'old'} data-reference={verse.reference} className="bible-verse" id={'verse-' + verse.key}>
                  <sup><a className="bible-verse-number" href={chapterHref(verse.book, verse.chapter) + '#verse-' + verse.key} aria-label={verse.reference}>{verse.verse}</a></sup>{' '}
                  <p data-verse-text={verse.key}>{verse.text}</p>{' '}
                </article>)}</div>
              </section>)}
            </div>
            {(singleChapter || share) && <div className="bible-reading-footer">
              {singleChapter && selectedChapter > 1 ? <a href={chapterHref(selectedBook.id, selectedChapter - 1)}>← {t.previousChapter}</a> : <span />}
              {share && <ScriptureShare share={share} text={t} />}
              {singleChapter && selectedChapter < selectedBook.chapters.length ? <a href={chapterHref(selectedBook.id, selectedChapter + 1)}>{t.nextChapter} →</a> : <span />}
            </div>}
          </div>
          {result.type === 'words' && result.pages > 1 && <nav className="bible-pagination" aria-label={t.results}>
            {result.page > 1 ? <a href={pageHref(result.page - 1)}>← {t.previous}</a> : <span />}
            <span>{t.page} {result.page} {t.of} {result.pages}</span>
            {result.page < result.pages ? <a href={pageHref(result.page + 1)}>{t.next} →</a> : <span />}
          </nav>}
          <aside className="bible-recommendation" aria-label={t.recommendation}>
            <p className="gospel-eyebrow">{t.recommendation}</p><h3>{t.full}</h3><p>{t.recommendBody}</p>
            <div>{recommendations.map(({ book, chapter }) => <a key={`${book.id}.${chapter}`} className="hero-button hero-button-secondary" href={chapterHref(book.id, chapter)}>{reference(book, chapter)} →</a>)}</div>
          </aside>
        </>}
      </section>
    </div>
    <footer className="bible-license"><details><summary>{t.licenses}</summary>
      <p>Berean Standard Bible (BSB) · Public domain / Dominio público. <a href="https://berean.bible/terms.htm">Berean Bible · 3rd Printing</a>.</p>
      <p>La Biblia en Español Sencillo (BES) · Segunda Edición (2026). Dominio público / Public domain. Irma Flores · <a href="https://audiobiblia.org/spabes_ab/spabes.htm">AudioBiblia.org</a> · <a href="https://ebible.org/spabes/copyright.htm">eBible.org</a>.</p>
      <p>{t.format}</p>
    </details></footer>
    <script src="/gospel-reader.js" defer />
    <script src="/gospel-share.js" defer />
  </div>
}
