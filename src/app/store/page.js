import PlaceholderPage from '../components/placeholder-page'
import { getPageMetadata } from '../../lib/language'

export async function generateMetadata() {
  return getPageMetadata('store')
}

export default function Page() {
  return <PlaceholderPage page="store" />
}
