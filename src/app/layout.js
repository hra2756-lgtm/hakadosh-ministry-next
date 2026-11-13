import './globals.css'
import Link from 'next/link'
import Image from 'next/image'
import { getLanguage } from '../lib/language'

export async function generateMetadata() {
  const { text } = await getLanguage()
  return { title: 'Hakadosh Ministry', description: text.description }
}

export default async function RootLayout({ children }) {
  const { language, text } = await getLanguage()
  return (
    <html lang={language}>
      <body>
        <header className="header">
          <div className="header-top">
            <details className="site-menu" id="site-menu" name="header-menu" data-header-menu>
              <summary className="site-menu-toggle" aria-label={text.navigation} aria-controls="site-navigation">
                <Image
                  src="/favicon.png"
                  alt={text.logo}
                  className="logo"
                  width={80}
                  height={80}
                  priority
                />
                <span className="hamburger-icon" aria-hidden="true"><span /><span /><span /></span>
              </summary>
              <nav className="site-navigation" id="site-navigation" aria-label={text.mainNavigation}>
                <p className="site-navigation-label">{text.explore}</p>
                {Object.entries(text.nav).map(([path, label]) => <Link href={`/${path}`} key={path}>{label}</Link>)}
              </nav>
            </details>
            <h1 className="site-title">
              <Link className="site-home-link" href="/">Hakadosh Ministry</Link>
            </h1>
            <details className="language-menu" id="language-menu" name="header-menu" data-header-menu>
              <summary className="hero-button hero-button-primary language-toggle" aria-label={`${text.languageMenu}: ${text.selectedLanguage}`} aria-controls="language-options">
                <span>{text.selectedLanguage}</span>
                <span className="language-hamburger" aria-hidden="true"><span /><span /><span /></span>
              </summary>
              <div className="language-options" id="language-options" role="group" aria-label={text.languageMenu}>
                {Object.entries(text.languageOptions).map(([code, label]) => (
                  <button type="button" key={code} data-language={code} lang={code} aria-pressed={language === code}>
                    <span>{label}</span><span aria-hidden="true">{language === code ? '✓' : ''}</span>
                  </button>
                ))}
                <noscript><p className="language-help">{text.languageHelp}</p></noscript>
              </div>
            </details>
          </div>
        </header>

        <div className="gold-border"></div>

        <script src="/site-menu.js" defer />

        <main className="page-content">
          {children}
        </main>
      </body>
    </html>
  )
}
