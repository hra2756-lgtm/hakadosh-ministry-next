import YouTubeGallery from '../components/youtube-gallery'
import { getPageMetadata } from '../../lib/language'

export async function generateMetadata() {
  return getPageMetadata('youtube-english')
}

export default async function EnglishYouTubePage({ searchParams }) {
  return <YouTubeGallery language="en" searchParams={await searchParams} />
}
