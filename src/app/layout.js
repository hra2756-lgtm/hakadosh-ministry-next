import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Hakadosh Ministry',
  description: 'Faith, truth, wisdom, and spiritual growth.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>

        {/* HEADER */}
        <header className="header">

          <div className="logo-container">
            <img src="/favicon.png" alt="Hakadosh Logo" className="logo" />
          </div>

        </header>

        {/* GOLD BORDER */}
        <div className="gold-border"></div>

        {/* NAVBAR */}
        <nav className="navbar">

          <Link href="/gospel">Gospel</Link>
          <Link href="/music">Music</Link>
          <Link href="/message">Message</Link>
          <Link href="/store">Store</Link>
          <Link href="/contact">Contact</Link>

        </nav>

        {/* PAGE CONTENT */}
        <main className="page-content">
          {children}
        </main>

      </body>
    </html>
  )
}
