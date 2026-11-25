import { normalize, parseReferences, searchBible } from './bible.mjs'
import { findScriptureLinks } from './scripture-links.mjs'
import { MINISTRY_EMAIL, SOCIAL_LINKS } from './contact-config.mjs'

export const assistantEnabled = (env = process.env) => env.ASSISTANT_ENABLED === 'true' && ((!env.VERCEL && env.NODE_ENV === 'development') || (env.VERCEL === '1' && env.VERCEL_ENV === 'production'))
export function validateChat(body) {
  if (!body || !['en', 'es'].includes(body.language) || !Array.isArray(body.messages) ||
      body.messages.length < 1 || body.messages.length > 7 || body.messages.length % 2 !== 1) throw Error('invalid')
  const messages = body.messages.map((m, i) => {
    if (m?.role !== (i % 2 ? 'assistant' : 'user') || typeof m.content !== 'string' ||
        !m.content.trim() || m.content.length > 2000) throw Error('invalid')
    return { role: m.role, content: m.content.trim() }
  })
  return { messages, language: body.language }
}

const stop = new Set('what which how when where does about could would should have this that please bible ministry tell explain question with from your more know want help today que como cual cuando donde para sobre puede puedes quiero saber dice biblia ministerio explica explicar pregunta tiene este esta esto dios god jesus christ cristo senor lord scripture scriptures verse verses versiculo versiculos'.split(' '))
export const terms = text => [...new Set(normalize(text).match(/[\p{L}]{3,}/gu) || [])].filter(word => !stop.has(word)).slice(0, 12)
export const relevance = (text, words) => words.reduce((score, word) => score + (normalize(text).includes(word) ? 1 : 0), 0)
export function relevantExcerpt(text, words) {
  const chunks = text.match(/[\s\S]{1,1300}(?:\s|$)/g) || [text.slice(0, 1300)]
  return chunks.sort((a, b) => relevance(b, words) - relevance(a, words))[0].trim()
}

const themes = [
  [/\b(faith|fe|believ\w*|creer)\b/, 'HEB 11:1; ROM 10:17'],
  [/\b(pray\w*|oracion|orar)\b/, 'MAT 6:9-13; PHP 4:6-7'],
  [/\b(salvation|saved|salvacion|salvo|salvar)\b/, 'EPH 2:8-10; ROM 10:9-10'],
  [/\b(love|amor|amar)\b/, '1CO 13:4-7; JHN 13:34-35'],
  [/\b(forgiv\w*|perdon\w*)\b/, 'EPH 4:32; MAT 6:14-15'],
  [/\b(wealth|money|steward\w*|rich\w*|dinero|riqueza\w*|mayordomia)\b/, '1TI 6:6-10; MAT 6:19-21'],
  [/\b(anxiety|worry|fear|ansiedad|preocup\w*|miedo|temor)\b/, 'PHP 4:6-7; 1PE 5:7'],
  [/\b(hear\w*|guidance|discern\w*|escuchar|oir|guia|conocer)\b/, 'JHN 10:27; 1JN 4:1; JAS 1:5'],
  [/holy spirit|espiritu santo|fruit of the spirit|fruto del espiritu/, 'GAL 5:22-26; JHN 14:26'],
  [/\b(grief|sorrow|mourning|duelo|tristeza|consuelo)\b/, 'PSA 34:18; MAT 5:4'],
]

export function bibleSources(message, language) {
  const explicit = findScriptureLinks(message, language).map(link => new URL(link.href, 'https://local.invalid').searchParams.get('q'))
  const queries = explicit.length ? explicit.slice(0, 3) : themes.filter(([pattern]) => pattern.test(normalize(message))).slice(0, 2).map(([, q]) => q)
  if (!queries.length) queries.push(...terms(message).slice(0, 2))
  const seen = new Set(), sources = []
  for (const query of queries) {
    const result = searchBible(query, language)
    for (const row of result.rows.slice(0, 6)) {
      if (seen.has(row.key) || row.text.length > 1600) continue
      seen.add(row.key)
      sources.push({ id: `bible-${row.key.toLowerCase().replaceAll('.', '-')}`, kind: 'bible',
        title: `${row.reference} · ${language === 'es' ? 'BES' : 'BSB'}`, text: row.text,
        url: `/gospel/open?${new URLSearchParams({ lang: language, q: `${row.book} ${row.chapter}:${row.verse}` })}` })
      if (sources.length === 6) return sources
    }
  }
  return sources
}

export function ministrySources(language) {
  const es = language === 'es'
  return [
    { id: 'ministry', kind: 'ministry', title: 'Hakadosh Ministry', url: '/', text: 'Hakadosh Ministry: the place where you can reconcile your relationship with Jesus Christ. Public pages: Home (daily Scripture), Gospel (Bible reader), Blog (Words of Wisdom), YouTube, Music, Store, Connect with Us. Do not infer services, products or features beyond supplied facts.' },
    { id: 'contact', kind: 'ministry', title: es ? 'Conecta con nosotros' : 'Connect with Us', url: '/contact', text: `Preferred personal contact: ${MINISTRY_EMAIL}. The contact page has a message form. Chat does not send messages. No promised response time.` },
    { id: 'reader', kind: 'ministry', title: es ? 'Lee la Biblia' : 'Read the Bible', url: '/gospel', text: 'Bible reader: BSB English, BES Spanish; search books, chapters, verses or words; session highlighting and passage sharing. Read full chapters for context.' },
    { id: 'instagram', kind: 'ministry', title: 'Instagram', url: SOCIAL_LINKS.instagram, text: 'Official Instagram: @hakadoshministry.' },
    { id: 'x', kind: 'ministry', title: 'X', url: SOCIAL_LINKS.x, text: 'Official X: @HakadoshMinistr.' },
    { id: 'channel', kind: 'ministry', title: es ? 'YouTube Español' : 'YouTube English', url: es ? 'https://www.youtube.com/@HakadoshMinistry_ES' : 'https://www.youtube.com/@HakadoshMinistry_EN', text: 'Official ministry YouTube channel in the selected language. Public videos and Shorts. Titles alone do not establish teachings.' },
  ]
}

export function formatAnswer(data, sources) {
  if (typeof data?.answer !== 'string' || !data.answer.trim() || data.answer.length > 2400 || /https?:|www\.|<\/?[a-z][^>]*>/i.test(data.answer)) throw Error('invalid_answer')
  for (const field of ['sourceIds', 'quoteIds']) {
    if (!Array.isArray(data[field]) || data[field].length > (field === 'sourceIds' ? 4 : 2) || data[field].some(id =>
      !sources.some(s => s.id === id && (field !== 'quoteIds' || s.kind === 'bible')))) throw Error('invalid_answer')
  }
  // Only server-constructed links and original Bible text reach the UI.
  const references = findScriptureLinks(data.answer)
  for (const ref of references) {
    const q = new URL(ref.href, 'https://local.invalid').searchParams.get('q')
    const parsed = parseReferences(q)
    // It is valid to recommend the surrounding chapter of a supplied verse.
    if (parsed?.selections?.every(s => s.end === Infinity && s.chapter === s.endChapter &&
        sources.some(source => source.id.startsWith(`bible-${s.book.id.toLowerCase()}-${s.chapter}-`)))) continue
    const rows = searchBible(q).rows
    if (rows.some(r => !sources.some(s => s.id === `bible-${r.key.toLowerCase().replaceAll('.', '-')}`))) throw Error('unsupported_reference')
  }
  return { answer: data.answer, sources: [...new Set(data.sourceIds)].map(id => {
    const s = sources.find(item => item.id === id); return { title: s.title, url: s.url }
  }), quotations: [...new Set(data.quoteIds)].map(id => {
    const s = sources.find(item => item.id === id); return { title: s.title, url: s.url, text: s.text }
  }) }
}
