import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Hakadosh Ministry',
  description: 'Faith, truth, wisdom, and spiritual growth through Jesus Christ and the Gospel.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="logo-container">
            <img
              src="/favicon.png"
              alt="Hakadosh Ministry Logo"
              className="logo"
            />
          </div>
        </header>

        <div className="gold-border"></div>

        <nav className="navbar">
          <Link href="/gospel">Gospel</Link>
          <Link href="/music">Music</Link>
          <Link href="/message">Message</Link>
          <Link href="/store">Store</Link>
          <Link href="/contact">Contact</Link>
        </nav>

        <main className="page-content">
          {children}
        </main>
      </body>
    </html>
  )
}