import test from 'node:test'
import assert from 'node:assert/strict'
import {readPublishedPosts,selectContent} from '../src/lib/assistant-content.mjs'
const body=text=>[{_type:'block',children:[{text}]}]
const post=(id,text='General teaching')=>({_id:id,slug:{current:id},title:{en:'English title',es:'Titulo español'},body:{en:body(text),es:body('Enseñanza general')},publishedAt:'2026-11-20T12:00:00Z'})
// listQuery already projects slug to a string.
const raw=(id,text)=>({...post(id,text),slug:id})
test('reads beyond 200 posts and excludes draft/version IDs',async()=>{
 const all=Array.from({length:205},(_,i)=>raw(`post-${i}`)); const calls=[]
 const result=await readPublishedPosts(async req=>{calls.push(req.params);assert.match(req.query,/drafts/);return {ok:true,result:{posts:all.slice(req.params.start,req.params.end),total:all.length}}})
 assert.equal(result.posts.length,205);assert.equal(result.complete,true);assert.equal(calls.length,3)
 const failed=await readPublishedPosts(async()=>({ok:false}));assert.equal(failed.complete,false)
})
test('matches a passage near the end of a long post and searches both translations',()=>{
 const p=raw('long-post','Ordinary text. '.repeat(400)+' Patience means remaining steadfast through trials.')
 const result=selectContent({posts:[p],videos:[],message:'Explain patience and trials',language:'es'})
 assert.ok(result.blogSources.some(s=>s.text.includes('Patience means')))
 assert.ok(result.blogSources.some(s=>s.text.includes('language en')))
 assert.ok(result.blogSources.every(s=>s.text.length<=1800))
})
test('latest post selection works in Spanish and preserves title links',()=>{
 const old=raw('old'), recent={...raw('recent'),publishedAt:'2026-11-25T12:00:00Z',title:{en:'New message',es:'Mensaje nuevo'}}
 const result=selectContent({posts:[old,recent],videos:[],message:'Explica la última publicación',language:'es'})
 assert.equal(result.blogSources[0].url,'/blog/recent')
 assert.equal(result.blogSources[0].title,'Mensaje nuevo')
})
test('video titles remain title-only and both channels are searchable',()=>{
 const videos=[{id:'Abcdef_1234',title:'Prayer and hope',language:'en',kind:'videos',publishedAt:'2026-11-20'},{id:'Zbcdef_1234',title:'Fe y esperanza',language:'es',kind:'shorts',publishedAt:'2026-11-21'}]
 const result=selectContent({posts:[],videos,message:'Which video discusses prayer?',language:'es'})
 assert.equal(result.videoSources[0].title,'Prayer and hope')
 assert.match(result.videoSources[0].text,/TITLE ONLY/)
 assert.equal(result.videoSources[0].url,'https://www.youtube.com/watch?v=Abcdef_1234')
})

import {fetchChannelVideos} from '../src/lib/youtube-data.mjs'
test('channel title index uses uploads and excludes private or unrelated videos',async()=>{
 const channelId='approved-channel', calls=[]
 const fetchImpl=async url=>{calls.push(url); const resource=url.pathname.split('/').at(-1)
  const result=resource==='channels'?{items:[{id:channelId,contentDetails:{relatedPlaylists:{uploads:'UUapproved'}}}]}:
   resource==='playlistItems'?{items:[{contentDetails:{videoId:'Abcdef12345'}},{contentDetails:{videoId:'Private1234'}}]}:
   {items:[{id:'Abcdef12345',snippet:{channelId,title:'Public biblical teaching',publishedAt:'2026-11-20'},status:{privacyStatus:'public'}},{id:'Private1234',snippet:{channelId,title:'Private',publishedAt:'2026-11-20'},status:{privacyStatus:'private'}}]}
  return {ok:true,json:async()=>result}
 }
 const result=await fetchChannelVideos({channelId,apiKey:'test-only',fetchImpl})
 assert.equal(result.length,1);assert.equal(result[0].title,'Public biblical teaching')
 assert.equal(calls[1].searchParams.get('playlistId'),'UUapproved')
 assert.ok(calls.every(url=>!url.href.includes('test-only')))
})
test('draft records cannot enter the published index',async()=>{
 const result=await readPublishedPosts(async()=>({ok:true,result:{posts:[raw('drafts.hidden'),raw('versions.hidden'),raw('visible')],total:3}}))
 assert.deepEqual(result.posts.map(p=>p._id),['visible'])
})
