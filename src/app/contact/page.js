import PlaceholderPage from '../components/placeholder-page'
import { getPageMetadata } from '../../lib/language'

export async function generateMetadata() {
  return getPageMetadata('contact')
}

export default function Page() {
  return <PlaceholderPage page="contact" />
}
