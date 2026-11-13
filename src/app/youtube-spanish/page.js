import YouTubeGallery from '../components/youtube-gallery'

export const metadata = {
  title: 'Youtube Spanish | Hakadosh Ministry',
  description: 'El lugar donde puedes reconciliar tu relación con Cristo Jesús',
}

export default async function SpanishYouTubePage({ searchParams }) {
  return <YouTubeGallery language="es" searchParams={await searchParams} />
}
