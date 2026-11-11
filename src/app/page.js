import Link from 'next/link'
import verses from '../data/kjv-nt.json'
import { getVerseOfTheDay } from '../lib/verse-of-the-day'
import { getSpanishVerse } from '../lib/spanish-verse'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const verseOfTheDay = getVerseOfTheDay(verses)
  const spanishVerse = getSpanishVerse(verseOfTheDay)

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
        <div className="hero-inner daily-verses">
          <section className="hero-verse-box" lang="es" aria-labelledby="spanish-verse-title">
            <h2 className="verse-label" id="spanish-verse-title">Verso del Día:</h2>

            <p className="hero-verse">
              &ldquo;{spanishVerse.text}&rdquo;
            </p>

            <span className="hero-verse-ref">
              {spanishVerse.reference} (RV1909)
            </span>
            {spanishVerse.kjvReference && (
              <p className="verse-numbering-note">
                Mismo pasaje que {spanishVerse.kjvReference} en KJV.
              </p>
            )}
          </section>

          <section className="hero-verse-box" lang="en" aria-labelledby="english-verse-title">
            <h2 className="verse-label" id="english-verse-title">Verse of the Day:</h2>

            <p className="hero-verse">
              &ldquo;{verseOfTheDay.text}&rdquo;
            </p>

            <span className="hero-verse-ref">
              {verseOfTheDay.reference} (KJV)
            </span>
          </section>
        </div>
      </section>
    </>
  )
}
