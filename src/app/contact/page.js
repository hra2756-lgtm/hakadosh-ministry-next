import { getLanguage, getPageMetadata } from '../../lib/language'
import { getContactConfig, MINISTRY_EMAIL, SOCIAL_LINKS } from '../../lib/contact-config.mjs'

export async function generateMetadata() {
  return getPageMetadata('contact')
}

function PlatformIcon({ platform }) {
  return platform === 'instagram' ? (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="38" height="38" rx="11" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="24" r="9" stroke="currentColor" strokeWidth="3" />
      <circle cx="35" cy="13" r="2.5" fill="currentColor" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933Zm-1.29 19.49h2.039L6.487 3.24H4.3l13.31 17.403Z" />
    </svg>
  )
}

export default async function Page() {
  const { language, text } = await getLanguage()
  const t = text.contact
  const config = getContactConfig()
  return (
    <div className="connect-shell">
      <header className="connect-intro">
        <p className="content-eyebrow">{text.nav.contact}</p>
        <h2 className="connect-title">{text.pages.contact.title}</h2>
        <p className="content-copy">{text.pages.contact.body}</p>
        <span className="connect-divider" aria-hidden="true" />
        <p className="connect-motto">{t.community}</p>
      </header>
      <section className="social-grid" aria-label={t.socialTitle}>
        {['instagram', 'x'].map(platform => (
          <a className={`social-card social-card-${platform}`} href={SOCIAL_LINKS[platform]} target="_blank" rel="noopener noreferrer" key={platform}>
            <span className="social-arrow" aria-hidden="true">↗</span>
            <span className="social-icon"><PlatformIcon platform={platform} /></span>
            <h3>{platform === 'instagram' ? 'Instagram' : 'X'}</h3>
            <p className="social-handle">{platform === 'instagram' ? '@hakadoshministry' : '@HakadoshMinistr'}</p>
            <p className="social-description">{t[platform]}</p>
            <span className="social-cta">{t.follow} <span aria-hidden="true">↗</span></span>
            <span className="sr-only"> ({t.newTab})</span>
          </a>
        ))}
      </section>
      <section className="contact-panel" aria-labelledby="contact-form-title">
        <div className="contact-panel-heading">
          <h2 id="contact-form-title">{t.formTitle}</h2>
          <p>{t.formIntro}</p>
        </div>
        <form id="contact-form" action="/api/contact" method="post" data-ready={String(config.ready)} data-sending={t.sending} data-send={t.send}>
          <div className="contact-fields">
            <label>{t.name}<input name="name" autoComplete="name" required maxLength={100} /></label>
            <label>{t.email}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
          </div>
          <label>{t.topic}<select name="topic" required defaultValue="prayer">
            {Object.entries(t.topics).map(([key, value]) => <option value={key} key={key}>{value}</option>)}
          </select></label>
          <label>{t.message}<textarea name="message" rows={6} minLength={10} maxLength={5000} required aria-describedby="message-hint" /></label>
          <p className="contact-hint" id="message-hint">{t.messageHint}</p>
          <div className="contact-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          {config.ready && <div className="cf-turnstile" data-sitekey={config.siteKey} data-action="contact" data-theme="dark" data-language={language} data-size="flexible" />}
          <p className="contact-privacy">{t.privacy}</p>
          <button className="hero-button hero-button-primary contact-submit" type="submit" disabled>{t.send} <span aria-hidden="true">↗</span></button>
          <p id="contact-status" className="contact-status" role="status" aria-live="polite" tabIndex={-1}>{config.ready ? '' : t.statuses.unavailable}</p>
          {Object.entries(t.statuses).map(([key, value]) => <span key={key} hidden data-contact-status={key}>{value}</span>)}
          <noscript><p className="contact-status">{t.noScript}</p></noscript>
        </form>
      </section>
      <section className="contact-email-card" aria-labelledby="contact-email-title">
        <svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="3" y="6" width="26" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" /><path d="m4 8 12 9L28 8" stroke="currentColor" strokeWidth="1.5" /></svg>
        <h2 id="contact-email-title">{t.emailTitle}</h2>
        <p>{t.emailBody}</p>
        <a className="contact-email-address" href={`mailto:${MINISTRY_EMAIL}`}>{MINISTRY_EMAIL}</a>
        <span className="contact-hint">{t.emailAction} <span aria-hidden="true">↗</span></span>
      </section>
      <script src="/contact-form.js" defer />
      {config.ready && <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" defer />}
    </div>
  )
}
