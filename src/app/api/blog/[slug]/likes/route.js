import { handleLikes } from '../../../../../lib/blog-likes.mjs'
import { getBlogPost } from '../../../../../lib/blog'
import { localizePost } from '../../../../../lib/blog-data.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function handler(request, context) {
  const { slug } = await context.params
  return handleLikes(request, slug, {
    lookupPost: async value => {
      const response = await getBlogPost(value)
      return { ok: response.ok, id: localizePost(response.result)?.id }
    },
  })
}

export const GET = handler
export const POST = handler
