import 'server-only'
import { cookies } from 'next/headers'
import { cache } from 'react'
import { LANGUAGE_COOKIE, normalizeLanguage, translations } from './translations.mjs'

// Request-scoped: never cache a visitor's language in a shared data cache.
export const getLanguage = cache(async () => {
  const language = normalizeLanguage((await cookies()).get(LANGUAGE_COOKIE)?.value)
  return { language, text: translations[language] }
})

export async function getPageMetadata(page) {
  const { text } = await getLanguage()
  return {
    title: `${text.nav[page]} | Hakadosh Ministry`,
    description: text.pages[page]?.description ?? text.youtube.subtitle,
  }
}
