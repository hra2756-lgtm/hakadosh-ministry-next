import test from 'node:test'
import assert from 'node:assert/strict'
import { postScriptureQuotations, findScriptureLinks } from '../src/lib/scripture-links.mjs'
const block = (...texts) => ({ _type: 'block', children: texts.map(text => ({ _type: 'span', text, marks: ['strong'] })) })
test('English pasted post with soft breaks and split reference expands only its final section', () => {
  const posts = [block('Story: John 3:16\n\nScript', 'ures: \n\n2', ' Kings 4: 1-7\n\nMatthew 6:8')]
  const quotes = postScriptureQuotations(posts)
  assert.deepEqual(quotes.map(q => q.rows.length), [7, 1])
  assert.equal(quotes[0].rows[0].book, '2KI')
  assert.equal(findScriptureLinks('Story: John 3:16').length, 1)
})
test('Spanish separate blocks, casing, duplicate references and strict heading boundary', () => {
  const quotes = postScriptureQuotations([block('Juan 3:16'), block(' ESCRITURAS: '), block('2 Reyes 4:1-7'), block('Mateo 6:8'), block('Mateo 6:8')], 'es')
  assert.deepEqual(quotes.map(q => q.rows.length), [7, 1])
  for (const heading of ['Escrituras', 'I mention Scriptures:', 'Other heading:']) assert.deepEqual(postScriptureQuotations([block(heading), block('Juan 3:16')], 'es'), [])
  assert.deepEqual(postScriptureQuotations([block('Scriptures: Psalm 91; John 99:1')]), [])
})
