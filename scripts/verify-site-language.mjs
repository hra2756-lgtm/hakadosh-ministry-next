import assert from 'node:assert/strict'
import { translations } from '../src/lib/translations.mjs'
import { youtubeChannels } from '../src/lib/youtube-channels.mjs'
import { MINISTRY_EMAIL, SOCIAL_LINKS } from '../src/lib/contact-config.mjs'

const base = new URL(process.argv[2] ?? 'http://localhost:3100')
assert.ok(['localhost', '127.0.0.1'].includes(base.hostname), 'Use a local verification server')

function textKeys(object, prefix = '') {
  return Object.entries(object).flatMap(([key, value]) => {
    const path = `${prefix}.${key}`
    if (typeof value === 'object') return textKeys(value, path)
    assert.ok(typeof value === 'string' && value.trim(), `Missing translation at ${path}`)
    return [path]
  }).sort()
}
assert.deepEqual(textKeys(translations.en), textKeys(translations.es), 'Translations must cover the same content')

async function page(path, language) {
  const response = await fetch(new URL(path, base), {
    headers: language === undefined ? {} : { Cookie: `site-language=${language}` },
  })
  assert.equal(response.status, 200, `Page failed: ${path}`)
  return { html: await response.text(), cache: response.headers.get('cache-control') }
}

const home = {}
for (const language of ['en', 'es']) {
  for (const route of ['/', ...Object.keys(translations[language].nav).map(key => `/${key}`)]) {
    const { html, cache } = await page(route, language)
    assert.ok(html.includes(`<html lang="${language}"`), `Wrong document language: ${route}`)
    assert.ok(html.includes(`>${translations[language].selectedLanguage}</span>`), 'Wrong selected-language marker')
    assert.ok(cache?.includes('private') || cache?.includes('no-store'), 'Personalized pages must not be publicly cached')
    const navigation = html.match(/<nav class="site-navigation"[\s\S]*?<\/nav>/)?.[0]
    assert.ok(navigation, 'Missing main navigation')
    const youtubeLinks = [...navigation.matchAll(/href="(\/youtube-[^"]+)"/g)]
    assert.equal(youtubeLinks.length, 1, 'Show exactly one YouTube menu entry')
    assert.equal(youtubeLinks[0][1], language === 'es' ? '/youtube-spanish' : '/youtube-english')
    assert.ok(navigation.includes('>YouTube</a>'), 'Use the single YouTube menu label')
    for (const [path, label] of Object.entries(translations[language].nav)) {
      if (!path.startsWith('youtube-')) assert.ok(navigation.includes(label), `Missing translated menu: ${label}`)
    }
    assert.ok(navigation.indexOf('href="/blog"') < navigation.indexOf('href="/contact"') && navigation.indexOf('href="/contact"') < navigation.indexOf('href="/message"'), 'Connect with Us belongs after Blog')
    if (route === '/contact') {
      assert.ok(html.includes(translations[language].pages.contact.title), 'Wrong welcome heading')
      assert.ok(html.includes(translations[language].contact.formTitle), 'Wrong form language')
      for (const url of Object.values(SOCIAL_LINKS)) assert.ok(html.includes(`href="${url}"`), 'Wrong social destination')
      assert.ok(html.includes(`href="mailto:${MINISTRY_EMAIL}"`), 'Missing ministry email')
      assert.ok(html.indexOf('social-card-instagram') < html.indexOf('social-card-x'), 'Instagram precedes X')
      assert.ok(html.includes('action="/api/contact"'), 'Form must use the server endpoint')
    } else if (route === '/') {
      home[language] = html
      assert.ok(html.includes(translations[language].home.gospel), 'Wrong homepage button')
    } else if (route.startsWith('/youtube-')) {
      assert.ok(html.includes(translations[language].youtube.videos), 'Wrong gallery labels')
      assert.ok(html.includes(translations[language].youtube.subtitle), 'Wrong gallery description')
      const channel = route.endsWith('spanish') ? 'es' : 'en'
      assert.ok(html.includes(`list=${youtubeChannels[channel].videos}`), 'Direct gallery routes must retain their own playlists')
      const channelActions = html.match(/<div class="youtube-channel-actions"[\s\S]*?<\/div>/)?.[0]
      assert.ok(channelActions, 'Missing channel buttons')
      for (const code of ['en', 'es']) {
        assert.ok(channelActions.includes(`href="https://www.youtube.com/${youtubeChannels[code].handle}"`), 'Wrong external channel destination')
        assert.ok(channelActions.includes(translations[language].youtube.channels[code]), 'Wrong translated channel label')
      }
    } else {
      assert.ok(html.includes(translations[language].pages[route.slice(1)].title), 'Wrong page content')
    }
  }
}
const versePanels = html => html.match(/<section class="hero-verse-box"[\s\S]*?<\/section>/g)
assert.equal(versePanels(home.en)?.length, 2)
assert.deepEqual(versePanels(home.en), versePanels(home.es), 'Both verse boxes must remain unchanged')
for (const cookie of [undefined, 'fr', 'invalid']) {
  assert.ok((await page('/', cookie)).html.includes('<html lang="en"'), 'Default and invalid preferences must use English')
}
console.log('Passed: 18 localized pages, one language-aware YouTube menu link, both translated channel buttons, defaults, private caching, playlist identity, and unchanged verse panels.')
