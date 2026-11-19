// Full-page links are the no-JavaScript fallback under the strict script CSP.
/* eslint-disable @next/next/no-img-element */
import { youtubeChannels } from '../../lib/youtube-channels.mjs'
import { getPlaylist, getChannelStatistics } from '../../lib/youtube'
import { getLanguage } from '../../lib/language'

export default async function YouTubeGallery({ language, searchParams = {} }) {
  const { language: uiLanguage, text: siteText } = await getLanguage()
  const text = siteText.youtube
  const channel = youtubeChannels[language]
  const kind = searchParams.playlist === 'shorts' ? 'shorts' : 'videos'
  const [result, statistics] = await Promise.all([
    getPlaylist(channel[kind], channel.channelId), getChannelStatistics(channel.channelId),
  ])
  const videos = result.videos
  const selected = videos.find(video => video.id === searchParams.v) || videos[0]
  const path = language === 'es' ? '/youtube-spanish' : '/youtube-english'
  const channelUrl = `https://www.youtube.com/${channel.handle}`
  const channelName = text.channelNames[language]
  const numberFormat = new Intl.NumberFormat(uiLanguage === 'es' ? 'es-MX' : 'en-US')
  const dateFormat = new Intl.DateTimeFormat(uiLanguage === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'long', timeZone: 'UTC' })
  const watchUrl = selected ? `https://www.youtube.com/watch?v=${selected.id}` : null
  const embedUrl = selected ? `https://www.youtube-nocookie.com/embed/${selected.id}?hl=${uiLanguage}&playsinline=1` : null
  return <section className="youtube-shell" lang={uiLanguage}>
    <script src="/youtube-player.js" defer />
    <header className="youtube-channel-header">
      <a className="youtube-channel-logo" href={channelUrl} target="_blank" rel="noopener noreferrer" aria-label={channelName}>
        <img src="/favicon.png" alt="" width="160" height="160" />
      </a>
      <div className="youtube-channel-copy">
        <h1><a href={channelUrl} target="_blank" rel="noopener noreferrer">{channelName}</a></h1>
        <div className="youtube-channel-meta">
          <span>{channel.handle}</span>
          {statistics?.subscribers != null && <span>{numberFormat.format(statistics.subscribers)} {text.subscribers}</span>}
          {statistics?.videos != null && <span>{numberFormat.format(statistics.videos)} {text.videoCount}</span>}
        </div>
        {!statistics && <p className="youtube-statistics-note">{text.statisticsUnavailable}</p>}
        <p className="youtube-channel-description">{text.subtitle}</p>
        <a className="youtube-channel-url" href={channelUrl} target="_blank" rel="noopener noreferrer">youtube.com/{channel.handle} ↗</a>
        <nav className="youtube-channel-actions" aria-label={text.queue}>
          {['videos', 'shorts'].map(tab => <a key={tab} className={`hero-button ${kind === tab ? 'hero-button-primary' : 'hero-button-secondary'}`} aria-current={kind === tab ? 'page' : undefined} href={`${path}?playlist=${tab}#youtube-watch`}>{text[tab]}</a>)}
          <a className="hero-button hero-button-secondary youtube-subscribe" href={`https://www.youtube.com/channel/${channel.channelId}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer">{text.subscribe} ↗</a>
        </nav>
      </div>
    </header>
    {selected ? <div className={`youtube-watch-layout youtube-watch-${kind}`} id="youtube-watch" data-youtube-watch data-language={uiLanguage}>
      <article className="youtube-featured" aria-label={text.playing}>
        <details className="youtube-player" hidden={!selected.embeddable}>
          <summary aria-label={`${text.watch}: ${selected.title}`} data-open-label={text.watch} data-close-label={text.close}>
            <span className="youtube-preview">
              <img data-featured-thumbnail src={selected.thumbnail || '/favicon.png'} alt="" width="1280" height="720" fetchPriority="high" />
              <span className="youtube-play-label">▶ {text.watch}</span>
            </span>
            <span className="youtube-close">{text.close}</span>
          </summary>
          <iframe data-youtube-src={embedUrl} title={selected.title} allow="encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
        </details>
        <a className="youtube-preview youtube-external-preview" data-external-preview href={watchUrl} target="_blank" rel="noopener noreferrer" hidden={selected.embeddable}>
          <img data-featured-thumbnail src={selected.thumbnail || '/favicon.png'} alt="" width="1280" height="720" />
          <span className="youtube-play-label">{text.youtube} ↗</span>
        </a>
        <div className="youtube-featured-copy">
          <h2 data-featured-title lang={language}>{selected.title}</h2>
          <time data-featured-date dateTime={selected.publishedAt}>{dateFormat.format(new Date(selected.publishedAt))}</time>
          <a data-featured-link href={watchUrl} target="_blank" rel="noopener noreferrer">{text.youtube} ↗</a>
        </div>
        <p className="visually-hidden" data-player-status role="status" aria-live="polite" />
      </article>
      <aside className="youtube-queue" aria-labelledby="youtube-queue-title">
        <div className="youtube-queue-heading">
          <h2 id="youtube-queue-title">{text[kind]}</h2>
          <p>{channelName} · <span data-queue-position>{videos.indexOf(selected) + 1}</span> / {videos.length}</p>
          <span>{text.latest}</span>
        </div>
        <ol className="youtube-queue-list">
          {videos.map((video, index) => <li key={video.id}>
            <a className="youtube-queue-item" href={`${path}?${new URLSearchParams({ playlist: kind, v: video.id })}#youtube-watch`} aria-current={video.id === selected.id ? 'true' : undefined}
              data-queue-video={video.id} data-embeddable={String(video.embeddable)} data-video-title={video.title} data-video-thumbnail={video.thumbnail || '/favicon.png'}
              data-video-date={video.publishedAt} data-date-label={dateFormat.format(new Date(video.publishedAt))} data-position={index + 1}>
              <span className="youtube-queue-number" aria-hidden="true">{index + 1}</span>
              <span className="youtube-queue-thumbnail"><img src={video.thumbnail || '/favicon.png'} alt="" width="160" height="90" loading="lazy" />{video.duration && <span>{video.duration}</span>}</span>
              <span className="youtube-queue-copy"><strong lang={language}>{video.title}</strong><span>{channelName}</span><time dateTime={video.publishedAt}>{dateFormat.format(new Date(video.publishedAt))}</time></span>
            </a>
          </li>)}
        </ol>
        <a className="youtube-playlist-link" href={`https://www.youtube.com/playlist?list=${channel[kind]}`} target="_blank" rel="noopener noreferrer">{text.playlist} ↗</a>
      </aside>
    </div> : <div className="youtube-empty-playlist" id="youtube-watch"><p className="youtube-notice">{result.unavailable ? text.unavailable : text.empty}</p><a className="youtube-playlist-link" href={`https://www.youtube.com/playlist?list=${channel[kind]}`} target="_blank" rel="noopener noreferrer">{text.playlist} ↗</a></div>}
  </section>
}
