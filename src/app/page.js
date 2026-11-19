import Link from 'next/link'
import { getDailyPassage, passageHref, isNewTestament } from '../lib/bible.mjs'
import { getLanguage } from '../lib/language'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const { language, text } = await getLanguage()
  const { en: verseOfTheDay, es: spanishVerse } = getDailyPassage()

  return (
    <>
      <div className="home-video-hero">
      <video className="home-background-video" id="home-intro-video" muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1}>
        <source src="/media/ministry-ocean-intro.mp4" type="video/mp4" />
      </video>
      <div className="home-video-controls" hidden data-video-controls>
        <button type="button" data-video-sound data-mute={language === 'es' ? 'Silenciar' : 'Mute'} data-unmute={language === 'es' ? 'Activar sonido' : 'Unmute'} aria-controls="home-intro-video">{language === 'es' ? 'Activar sonido' : 'Unmute'}</button>
        <button type="button" data-video-play data-play={language === 'es' ? 'Reproducir' : 'Play'} data-pause={language === 'es' ? 'Pausar' : 'Pause'} aria-controls="home-intro-video">{language === 'es' ? 'Reproducir' : 'Play'}</button>
      </div>
      <div className="top-actions">
        <Link href="/gospel" className="hero-button hero-button-primary">
          {text.home.gospel}
        </Link>

        <Link href="/message" className="hero-button hero-button-secondary">
          {text.home.message}
        </Link>
      </div>

      <section className="hero-section">
        <div className="hero-inner daily-verses">
          <a href={passageHref(spanishVerse.book, spanishVerse.chapter, spanishVerse.verse, 'es')} data-testament={isNewTestament(spanishVerse.book) ? 'new' : 'old'} className="hero-verse-box daily-verse-link" lang="es" aria-labelledby="spanish-verse-title">
            <h2 className="verse-label" id="spanish-verse-title">Verso del Día:</h2>

            <p className="hero-verse">
              &ldquo;{spanishVerse.text}&rdquo;
            </p>

            <span className="hero-verse-ref">
              {spanishVerse.reference} (BES)
            </span>
            <span className="daily-verse-read">Leer el pasaje →</span>
          </a>

          <a href={passageHref(verseOfTheDay.book, verseOfTheDay.chapter, verseOfTheDay.verse, 'en')} data-testament={isNewTestament(verseOfTheDay.book) ? 'new' : 'old'} className="hero-verse-box daily-verse-link" lang="en" aria-labelledby="english-verse-title">
            <h2 className="verse-label" id="english-verse-title">Verse of the Day:</h2>

            <p className="hero-verse">
              &ldquo;{verseOfTheDay.text}&rdquo;
            </p>

            <span className="hero-verse-ref">
              {verseOfTheDay.reference} (BSB)
            </span>
            <span className="daily-verse-read">Read the passage →</span>
          </a>
        </div>
      </section>
      </div>
      <p className="daily-bible-credit">BSB · La Biblia en Español Sencillo · <a href="/gospel">Bible editions / Ediciones bíblicas</a></p>
      <script src="/home-video.js" defer />
    </>
  )
}
