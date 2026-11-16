import 'server-only'
import { cache } from 'react'
import { blogConfig, fetchBlog, listQuery, postQuery, validSlug } from './blog-data.mjs'

export const getBlogPage = cache(async page => {
  const response = await fetchBlog(blogConfig(), listQuery(page))
  if (!response.ok || !Array.isArray(response.result?.posts)) return { ok: false, posts: [], total: 0 }
  return { ok: true, ...response.result }
})

export const getBlogPost = cache(async slug => validSlug(slug)
  ? fetchBlog(blogConfig(), postQuery(slug)) : { ok: true, result: null })
