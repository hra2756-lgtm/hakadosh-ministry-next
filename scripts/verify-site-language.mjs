import assert from 'node:assert/strict'
import { translations } from '../src/lib/translations.mjs'

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
    for (const label of Object.values(translations[language].nav)) assert.ok(html.includes(label), `Missing translated menu: ${label}`)
    if (route === '/') {
      home[language] = html
      assert.ok(html.includes(translations[language].home.gospel), 'Wrong homepage button')
    } else if (route.startsWith('/youtube-')) {
      assert.ok(html.includes(translations[language].youtube.videos), 'Wrong gallery labels')
      assert.ok(html.includes(translations[language].youtube.subtitle), 'Wrong gallery description')
      const channel = route.endsWith('spanish') ? 'HakadoshMinistry_ES' : 'HakadoshMinistry_EN'
      assert.ok(html.includes(channel), 'Changing UI language must not change the selected channel')
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
console.log('Passed: translation coverage, 18 localized pages, language defaults, private caching, channel identity, and unchanged verse panels.')
