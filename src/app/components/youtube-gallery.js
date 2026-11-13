import Image from 'next/image'
import { youtubeChannels } from '../../lib/youtube-channels.mjs'
import { visibleCount } from '../../lib/youtube-data.mjs'
import { getPlaylist } from '../../lib/youtube'
import { getLanguage } from '../../lib/language'

function VideoCard({ video, language, contentLanguage, kind, text }) {
  const watchUrl = `https://www.youtube.com/watch?v=${video.id}`
  return (
    <article className={`youtube-card youtube-card-${kind}`}>
      {video.embeddable ? (
        <details className="youtube-player" name="youtube-player">
          <summary aria-label={`${text.watch}: ${video.title}`} data-open-label={`${text.watch}: ${video.title}`} data-close-label={`${text.close}: ${video.title}`}>
            <span className="youtube-preview">
              {video.thumbnail && <Image src={video.thumbnail} alt="" width={480} height={360} unoptimized loading="lazy" />}
              <span className="youtube-play-label">▶ {text.watch}</span>
            </span>
            <span className="youtube-close">{text.close}</span>
          </summary>
          <iframe
            data-youtube-src={`https://www.youtube-nocookie.com/embed/${video.id}?hl=${language}&playsinline=1`}
            title={video.title}
            loading="lazy"
            allow="encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </details>
      ) : (
        <a className="youtube-preview" href={watchUrl} target="_blank" rel="noopener noreferrer">
          {video.thumbnail && <Image src={video.thumbnail} alt="" width={480} height={360} unoptimized loading="lazy" />}
          <span className="youtube-play-label">{text.youtube}</span>
        </a>
      )}
      <div className="youtube-card-copy">
        <h3 lang={contentLanguage}>{video.title}</h3>
        <time dateTime={video.publishedAt}>
          {new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', {
            dateStyle: 'long', timeZone: 'UTC',
          }).format(new Date(video.publishedAt))}
        </time>
        <a href={watchUrl} target="_blank" rel="noopener noreferrer">{text.youtube} ↗</a>
      </div>
    </article>
  )
}

export default async function YouTubeGallery({ language, searchParams }) {
  const { language: uiLanguage, text: siteText } = await getLanguage()
  const text = siteText.youtube
  const channel = youtubeChannels[language]
  const [videos, shorts] = await Promise.all([
    getPlaylist(channel.videos, channel.channelId), getPlaylist(channel.shorts, channel.channelId),
  ])
  const counts = { videos: visibleCount(searchParams.videos, videos.videos.length), shorts: visibleCount(searchParams.shorts, shorts.videos.length) }
  const path = language === 'es' ? '/youtube-spanish' : '/youtube-english'
  return (
    <section className="youtube-shell" lang={uiLanguage}>
      <script src="/youtube-player.js" defer />
      <header className="youtube-intro">
        <span className="content-eyebrow">Hakadosh Ministry · YouTube</span>
        <h1 className="content-title">{siteText.nav[path.slice(1)]}</h1>
        <p className="content-copy">{text.subtitle}</p>
        <a className="hero-button hero-button-secondary" href={`https://www.youtube.com/${channel.handle}`} target="_blank" rel="noopener noreferrer">
          {text.channel} ↗
        </a>
      </header>
      <div className="youtube-columns">
        {[['videos', videos], ['shorts', shorts]].map(([kind, result]) => {
          const next = new URLSearchParams({ videos: String(counts.videos), shorts: String(counts.shorts), [kind]: String(counts[kind] + 6) })
          return (
            <section className={`youtube-column youtube-column-${kind}`} id={kind} key={kind} aria-labelledby={`${kind}-title`}>
              <div className="youtube-column-heading">
                <h2 id={`${kind}-title`}>{text[kind]}</h2>
                <p>{text.latest}</p>
              </div>
              <div className="youtube-list">
                {result.videos.slice(0, counts[kind]).map(video => <VideoCard key={video.id} video={video} language={uiLanguage} contentLanguage={language} kind={kind} text={text} />)}
              </div>
              {!result.videos.length && <p className="youtube-notice">{result.unavailable ? text.unavailable : text.empty}</p>}
              {counts[kind] < result.videos.length && (
                <a className="hero-button hero-button-secondary youtube-more" href={`${path}?${next}#${kind}`}>{text.more}</a>
              )}
              <a className="youtube-playlist-link" href={`https://www.youtube.com/playlist?list=${channel[kind]}`} target="_blank" rel="noopener noreferrer">{text.playlist} ↗</a>
            </section>
          )
        })}
      </div>
    </section>
  )
}
