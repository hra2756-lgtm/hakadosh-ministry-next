import { NextResponse } from 'next/server'
import { findBook, searchBible } from '../../../lib/bible.mjs'
import { LANGUAGE_COOKIE, normalizeLanguage } from '../../../lib/translations.mjs'

// A normal link (never prefetched) sets the language of the daily verse or post.
// The only redirect target is the reader on this origin.
export function GET(request) {
  const params = request.nextUrl.searchParams
  const language = normalizeLanguage(params.get('lang'))
  const book = findBook((params.get('book') || '').slice(0, 40), language)
  const chapter = params.get('chapter') || ''
  const verse = params.get('verse') || ''
  const explicitQuery = params.get('q') || ''
  const query = explicitQuery ? (explicitQuery.length <= 240 ? explicitQuery : '') : book && /^\d{1,3}$/.test(chapter) && /^\d{1,3}(?:-\d{1,3})?$/.test(verse) ? `${book.id} ${chapter}:${verse}` : ''
  const valid = query && searchBible(query, language).type === 'passage'
  const destination = new URL('/gospel', request.url)
  if (valid) destination.searchParams.set('q', query)
  const response = NextResponse.redirect(destination, 303)
  response.headers.set('Cache-Control', 'private, no-store')
  response.cookies.set(LANGUAGE_COOKIE, language, { path: '/', maxAge: 31536000, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:' })
  return response
}
