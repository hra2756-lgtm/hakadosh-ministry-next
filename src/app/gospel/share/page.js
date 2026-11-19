import { notFound } from 'next/navigation'
import { scriptureShare, SITE_ORIGIN } from '../../../lib/scripture-share.mjs'
import { gospelText } from '../../../lib/gospel-translations.mjs'
import { ScriptureShare } from '../../components/scripture-share'
import '../gospel.css'

export async function generateMetadata({ searchParams }) {
  const params = await searchParams
  const share = scriptureShare(params.q, params.lang)
  if (!share) return { title: 'Scripture | Hakadosh Ministry', robots: { index: false, follow: false } }
  const title = `${share.title} (${share.version})`
  const description = share.rows.map(row => row.text).join(' ').slice(0, 250)
  const image = `${SITE_ORIGIN}${share.image}`
  return { title, description, alternates: { canonical: share.url }, robots: { index: false, follow: true },
    openGraph: { type: 'article', title, description, url: share.url, locale: share.language === 'es' ? 'es_MX' : 'en_US', images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: image, alt: title }] },
  }
}

export default async function SharedScripturePage({ searchParams }) {
  const params = await searchParams
  const share = scriptureShare(params.q, params.lang)
  if (!share) notFound()
  const t = gospelText[share.language]
  return <article className="gospel-page scripture-share-page" lang={share.language}>
    <div className="bible-reading-panel">
      <header className="bible-chapter-heading"><h1>{share.title}</h1><p>{t.version}</p></header>
      <ScriptureShare share={share} text={t} />
      <div className="bible-passages">{share.rows.map(row => <article className="bible-verse" key={row.key}><span className="bible-verse-number">{row.reference}</span><p>{row.text}</p></article>)}</div>
      <a className="hero-button hero-button-secondary scripture-open-reader" href={share.reader}>{t.openReader} →</a>
    </div>
    <script src="/gospel-share.js" defer />
  </article>
}
