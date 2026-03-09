export default function HomePage() {
  return (
    <section className="hero-section">
      <div className="hero-inner">
        <img
          src="/favicon.png"
          alt="Hakadosh Ministry Logo"
          className="hero-logo"
        />

        <p className="hero-kicker">Jesus Christ • Truth • Salvation</p>

        <h1 className="hero-title">Hakadosh Ministry</h1>

        <p className="hero-subtitle">
          A place for faith, truth, wisdom, and spiritual growth through Jesus Christ and the Gospel.
        </p>

        <div className="hero-actions">
          <a href="/gospel" className="hero-button hero-button-primary">
            Read the Gospel
          </a>

          <a href="/message" className="hero-button hero-button-secondary">
            Explore the Message
          </a>
        </div>

        <div className="hero-verse-box">
          <p className="hero-verse">
            “I am the light of the world. Whoever follows me will not walk in darkness,
            but will have the light of life.”
          </p>
          <span className="hero-verse-ref">John 8:12</span>
        </div>
      </div>
    </section>
  )
}