import Link from 'next/link'
import verses from '../data/kjv-nt.json'

export const dynamic = 'force-dynamic'

function getVerseOfTheDay() {
  const today = new Date()
  const dayNumber = Math.floor(today.getTime() / (1000 * 60 * 60 * 24))
  const index = dayNumber % verses.length
  return verses[index]
}

export default function HomePage() {
  const verseOfTheDay = getVerseOfTheDay()

  return (
    <>
      {/* BUTTONS SECTION (moved up) */}
      <div className="top-actions">
        <Link href="/gospel" className="hero-button hero-button-primary">
          Read the Gospel
        </Link>

        <Link href="/message" className="hero-button hero-button-secondary">
          Explore the Message
        </Link>
      </div>

      {/* HERO / VERSE SECTION */}
      <section className="hero-section">
        <div className="hero-inner">

          <div className="hero-verse-box">
            <p className="verse-label">Verse of the Day:</p>

            <p className="hero-verse">
              “{verseOfTheDay.text}”
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