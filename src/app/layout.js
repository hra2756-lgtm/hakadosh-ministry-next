import './globals.css'
import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Hakadosh Ministry',
  description: 'Faith, truth, wisdom, and spiritual growth through Jesus Christ and the Gospel.'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-top">
            <h1 className="site-title">Hakadosh Ministry</h1>

            <div className="logo-container">
              <Image
                src="/favicon.png"
                alt="Hakadosh Ministry Logo"
                className="logo"
                width={80}
                height={80}
                priority
              />
            </div>
          </div>
        </header>

        <div className="gold-border"></div>

        <nav className="navbar">
          <Link href="/gospel">Gospel</Link>
          <Link href="/music">Music</Link>
          <Link href="/blog">Blog</Link>
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
