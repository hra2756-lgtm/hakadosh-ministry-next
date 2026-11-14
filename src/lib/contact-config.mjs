export const MINISTRY_EMAIL = 'hriver2756@hakadoshministry.com'
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/hakadoshministry/',
  x: 'https://x.com/HakadoshMinistr',
}

// Only the site key is public. Never return secrets from a page or API response.
export function getContactConfig(env = process.env) {
  const from = env.CONTACT_FROM_EMAIL?.trim() ?? 'website@contact.hakadoshministry.com'
  const siteKey = env.TURNSTILE_SITE_KEY?.trim() ?? ''
  const ready = Boolean(env.RESEND_API_KEY && env.TURNSTILE_SECRET_KEY && siteKey &&
    /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*hakadoshministry\.com$/.test(from))
  return { from, siteKey, ready }
}
