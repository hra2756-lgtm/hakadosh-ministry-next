import Link from 'next/link'
import verses from '../data/kjv-nt.json'

export const dynamic = 'force-dynamic'

function getRandomVerse() {
  const index = Math.floor(Math.random() * verses.length)
  return verses[index]
}

export default function HomePage() {
  const randomVerse = getRandomVerse()

  return (
    <section className="hero-section">
      <div className="hero-inner">
        <img
          src="/favicon.png"
          alt="Hakadosh Ministry Logo"
          className="hero-logo"
        />

        <h1 className="hero-title">Hakadosh Ministry</h1>

        <p className="hero-subtitle">
          A place for faith, truth, wisdom, and spiritual growth through Jesus Christ and the Gospel.
        </p>

        <div className="hero-actions">
          <Link href="/gospel" className="hero-button hero-button-primary">
            Read the Gospel
          </Link>

          <Link href="/message" className="hero-button hero-button-secondary">
            Explore the Message
          </Link>
        </div>

        <div className="hero-verse-box">
          <p className="hero-verse">“{randomVerse.text}”</p>
          <span className="hero-verse-ref">{randomVerse.reference} (KJV)</span>
        </div>
      </div>
    </section>
  )
}