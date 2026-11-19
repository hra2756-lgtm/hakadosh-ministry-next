import test from 'node:test'
import assert from 'node:assert/strict'
import { blogConfig, fetchBlog, listQuery, postQuery, localizePost, safeHttpsUrl, youtubeUrl, imageUrl, pageNumber } from '../src/lib/blog-data.mjs'
import { blogText } from '../src/lib/blog-translations.mjs'

const config = { projectId: '2a3jhsqe', dataset: 'development' }
const body = [{ _type: 'block', children: [{ _type: 'span', text: 'A reflection.' }] }]
const post = { _id: 'reflection-1', slug: 'a-new-day', title: { en: 'A new day' }, body: { en: body }, publishedAt: '2026-11-14T12:00:00Z' }

test('local development is isolated; deployed builds require an explicit dataset', () => {
  assert.deepEqual(blogConfig({}), config)
  assert.equal(blogConfig({ VERCEL: '1' }), null)
  assert.equal(blogConfig({ SANITY_DATASET: '../production' }), null)
  assert.equal(blogConfig({ SANITY_PROJECT_ID: 'evil.com/path' }), null)
  assert.equal(blogConfig({ VERCEL: '1', SANITY_DATASET: 'production' }).dataset, 'production')
})

test('read requests use published perspective, separate parameters, and no token', async () => {
  const dangerousSlug = 'x" || _type == "secret'
  const response = await fetchBlog(config, postQuery(dangerousSlug), async (url, options) => {
    assert.equal(url.origin, 'https://2a3jhsqe.api.sanity.io')
    assert.equal(url.searchParams.get('perspective'), 'published')
    assert.equal(JSON.parse(url.searchParams.get('$slug')), dangerousSlug)
    assert.ok(!url.searchParams.get('query').includes(dangerousSlug))
    assert.equal(options.headers, undefined)
    assert.equal(options.next.revalidate, 60)
    return Response.json({ result: null })
  })
  assert.deepEqual(response, { ok: true, result: null })
  assert.deepEqual(listQuery(2).params, { start: 12, end: 24 })
})

test('drafts, release versions, unsafe slugs and incomplete content cannot render', () => {
  for (const id of ['drafts.reflection-1', 'versions.release.reflection-1']) assert.equal(localizePost({ ...post, _id: id }), null)
  assert.equal(localizePost({ ...post, slug: '../contact' }), null)
  assert.equal(localizePost({ ...post, body: { en: [] } }), null)
  assert.equal(localizePost({ ...post, publishedAt: 'invalid' }), null)
  const translated = localizePost(post, 'es', config)
  assert.equal(translated.language, 'en')
  assert.equal(translated.title, 'A new day')
  assert.equal(localizePost({ ...post, title: { ...post.title, es: 'Un nuevo día' }, body: { en: body, es: body } }, 'es', config).language, 'es')
})

test('Scripture quotations default on for existing posts and respect an explicit per-post opt-out', () => {
  assert.equal(localizePost(post).automaticScriptureQuotes, true)
  assert.equal(localizePost({ ...post, automaticScriptureQuotes: false }).automaticScriptureQuotes, false)
  assert.equal(localizePost({ ...post, automaticScriptureQuotes: true }).automaticScriptureQuotes, true)
  assert.ok(postQuery(post.slug).query.includes('automaticScriptureQuotes'))
  assert.ok(listQuery(1).query.includes('automaticScriptureQuotes'))
})

test('links and images cannot introduce executable URLs or arbitrary media origins', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', 'http://example.com', 'https://user:password@example.com']) assert.equal(safeHttpsUrl(value), null)
  assert.equal(youtubeUrl('https://youtube.com.evil.example/watch?v=123'), null)
  assert.equal(youtubeUrl('https://youtu.be/example'), 'https://youtu.be/example')
  assert.equal(imageUrl({ _ref: 'https://evil.example/image.png' }, config), null)
  assert.equal(imageUrl({ _ref: 'image-abcd-1200x800-svg' }, config), null)
  assert.match(imageUrl({ _ref: 'image-abcd-1200x800-jpg' }, config), /^https:\/\/cdn.sanity.io\/images\/2a3jhsqe\/development\//)
})

test('outages are distinct from empty results and do not expose provider errors', async () => {
  for (const fetcher of [async () => { throw new Error('private details') }, async () => new Response('private details', { status: 403 }), async () => Response.json({ error: 'private details' })]) {
    assert.deepEqual(await fetchBlog(config, listQuery(1), fetcher), { ok: false, result: null })
  }
  assert.equal(pageNumber('-4'), 1)
  assert.equal(pageNumber(['2', '3']), 1)
  assert.equal(pageNumber('2'), 2)
  assert.deepEqual(Object.keys(blogText.en), Object.keys(blogText.es))
})
