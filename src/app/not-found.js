import Link from 'next/link'
import { getLanguage } from '../lib/language'

export default async function NotFound() {
  const { text } = await getLanguage()
  return (
    <section className="content-shell">
      <div className="content-card">
        <span className="content-eyebrow">404</span>
        <h1 className="content-title">{text.notFound.title}</h1>
        <p className="content-copy">{text.notFound.body}</p>
        <Link href="/" className="hero-button hero-button-primary">{text.notFound.home}</Link>
      </div>
    </section>
  )
}
