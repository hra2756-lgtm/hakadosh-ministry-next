import PlaceholderPage from '../components/placeholder-page'
import { getPageMetadata } from '../../lib/language'

export async function generateMetadata() {
  return getPageMetadata('gospel')
}

export default function Page() {
  return <PlaceholderPage page="gospel" />
}
