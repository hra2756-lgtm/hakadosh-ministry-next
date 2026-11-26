import 'server-only'
import { fetchBlog, blogConfig } from './blog-data.mjs'
import { getChannelVideos } from './youtube'
import { youtubeChannels } from './youtube-channels.mjs'
import { bibleSources, ministrySources } from './assistant-data.mjs'
import { readPublishedPosts, selectContent } from './assistant-content.mjs'

export async function assistantKnowledge(message, language) {
  const config = blogConfig()
  const entries = Object.entries(youtubeChannels).map(([lang, channel]) => ({language:lang,kind:'video or Short',channelId:channel.channelId}))
  const [blog, ...playlists] = await Promise.all([
    readPublishedPosts(request => fetchBlog(config,request)),
    ...entries.map(async entry => ({...entry,...await getChannelVideos(entry.channelId)})),
  ])
  const videos = [...new Map(playlists.flatMap(p => p.videos.map(v => ({...v,language:p.language,kind:p.kind}))).map(v => [v.id,v])).values()]
  const {blogSources,videoSources} = selectContent({posts:blog.posts,videos,message,language,config})
  const status = {id:'library-status',kind:'ministry',title:'Ministry public library',url:'/blog',
    text:`Public blog search: ${blog.complete ? 'complete published collection searched' : 'temporarily incomplete; do not claim absence of a post'}, ${blog.posts.length} posts loaded with available English/Spanish text. Video title search: ${playlists.some(p=>p.unavailable) ? 'partly unavailable' : 'both public ministry channel uploads searched'}, ${videos.length} titles available. Only selected relevant excerpts/titles follow; no drafts, private posts, future plans or video transcripts. If the requested title is not supplied, ask for its title or a distinctive phrase; do not invent it.`}
  const sources = [...ministrySources(language), status, ...blogSources, ...videoSources]
  const scriptureContext = [message, ...blogSources.map(s => s.text)].join('\n')
  return [...sources, ...bibleSources(scriptureContext,language).slice(0,16-sources.length)]
}
