import { handleContact } from '../../../lib/contact-handler.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request) {
  return handleContact(request)
}
