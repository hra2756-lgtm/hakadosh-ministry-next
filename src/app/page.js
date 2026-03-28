import Link from 'next/link'
import verses from '../data/kjv-nt.json'
import { getVerseOfTheDay } from '../lib/verse-of-the-day'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const verseOfTheDay = getVerseOfTheDay(verses)

  return (
    <>
      <div className="top-actions">
        <Link href="/gospel" className="hero-button hero-button-primary">
          Read the Gospel
        </Link>

        <Link href="/message" className="hero-button hero-button-secondary">
          Explore the Message
        </Link>
      </div>

      <section className="hero-section">
        <div className="hero-inner">
          <div className="hero-verse-box">
            <p className="verse-label">Verse of the Day:</p>

            <p className="hero-verse">
              &ldquo;{verseOfTheDay.text}&rdquo;
            </p>

            <span className="hero-verse-ref">
              {verseOfTheDay.reference} (KJV)
            </span>
          </div>
        </div>
      </section>
    </>
  )
}
