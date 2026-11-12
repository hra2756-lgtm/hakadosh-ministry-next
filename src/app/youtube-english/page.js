import YouTubeGallery from '../components/youtube-gallery'

export const metadata = {
  title: 'Youtube English | Hakadosh Ministry',
  description: 'The place where you can reconcile your relationship with Jesus Christ',
}

export default async function EnglishYouTubePage({ searchParams }) {
  return <YouTubeGallery language="en" searchParams={await searchParams} />
}
