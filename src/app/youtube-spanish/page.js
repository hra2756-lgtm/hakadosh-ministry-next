import YouTubeGallery from '../components/youtube-gallery'
import { getPageMetadata } from '../../lib/language'

export async function generateMetadata() {
  return getPageMetadata('youtube-spanish')
}

export default async function SpanishYouTubePage({ searchParams }) {
  return <YouTubeGallery language="es" searchParams={await searchParams} />
}
