import { getLanguage } from '../../lib/language'

export default async function PlaceholderPage({ page }) {
  const { text } = await getLanguage()
  return (
    <section className="content-shell">
      <div className="content-card">
        <span className="content-eyebrow">{text.nav[page]}</span>
        <h1 className="content-title">{text.pages[page].title}</h1>
        <p className="content-copy">{text.pages[page].body}</p>
      </div>
    </section>
  )
}
