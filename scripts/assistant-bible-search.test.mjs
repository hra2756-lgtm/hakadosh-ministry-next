import test from 'node:test'
import assert from 'node:assert/strict'
import { rankedBibleReferences } from '../src/lib/assistant-bible-search.mjs'
import { bibleSources } from '../src/lib/assistant-data.mjs'
import { searchBible } from '../src/lib/bible.mjs'
test('full-canon retrieval finds a lesser-known person beyond leading question words',()=>{
 const refs=rankedBibleReferences('Could you please tell me who Bezalel was and what work he did?', 'en')
 assert.ok(refs.some(r=>searchBible(r,'en').rows.some(v=>v.text.includes('Bezalel'))))
 assert.ok(refs.length<=2)
})
test('Spanish retrieval is accent insensitive and always returns real source text',()=>{
 const refs=rankedBibleReferences('¿Quién era Moisés y qué pasó con la zarza?', 'es')
 assert.ok(refs.length)
 for(const r of refs) assert.ok(searchBible(r,'es').rows.length)
 assert.deepEqual(rankedBibleReferences('zzzzunknownword','es'),[])
})
test('explicit references retain priority and bounded trusted quotations',()=>{
 const sources=bibleSources('Explain John 3:16','en')
 assert.ok(sources.some(s=>s.id==='bible-jhn-3-16'))
 assert.ok(sources.length<=6)
 assert.ok(sources.every(s=>s.text.length<=1600))
})
