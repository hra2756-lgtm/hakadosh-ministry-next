// Progressive enhancement: every queue entry and playlist tab is also a real
// server-rendered link. No inline scripts, API credentials, or HTML injection.
if (!window.hakadoshYouTubePlayer) {
  window.hakadoshYouTubePlayer = true
  function updatePlayer(details) {
    const frame = details.querySelector('iframe[data-youtube-src]')
    const summary = details.querySelector('summary')
    if (!frame || !summary) return
    if (details.open && !details.hidden) {
      if (frame.getAttribute('src') !== frame.dataset.youtubeSrc) frame.src = frame.dataset.youtubeSrc
      summary.setAttribute('aria-label', `${summary.dataset.closeLabel}: ${frame.title}`)
    } else {
      frame.removeAttribute('src')
      summary.setAttribute('aria-label', `${summary.dataset.openLabel}: ${frame.title}`)
    }
  }
  document.addEventListener('toggle', function (event) {
    if (event.target instanceof HTMLDetailsElement && event.target.classList.contains('youtube-player')) updatePlayer(event.target)
  }, true)
  document.addEventListener('click', function (event) {
    const link = event.target.closest?.('a[data-queue-video]')
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const root = link.closest('[data-youtube-watch]')
    const details = root?.querySelector('.youtube-player')
    const id = link.dataset.queueVideo
    if (!details || !/^[A-Za-z0-9_-]{11}$/.test(id)) return
    event.preventDefault()
    const frame = details.querySelector('iframe')
    const watch = `https://www.youtube.com/watch?v=${id}`
    frame.removeAttribute('src')
    frame.dataset.youtubeSrc = `https://www.youtube-nocookie.com/embed/${id}?hl=${root.dataset.language === 'es' ? 'es' : 'en'}&playsinline=1`
    frame.title = link.dataset.videoTitle
    root.querySelector('[data-featured-title]').textContent = link.dataset.videoTitle
    const date = root.querySelector('[data-featured-date]')
    date.dateTime = link.dataset.videoDate
    date.textContent = link.dataset.dateLabel
    root.querySelector('[data-featured-link]').href = watch
    const external = root.querySelector('[data-external-preview]')
    external.href = watch
    external.hidden = link.dataset.embeddable === 'true'
    details.hidden = !external.hidden
    root.querySelectorAll('[data-featured-thumbnail]').forEach(image => { image.src = link.dataset.videoThumbnail })
    root.querySelectorAll('[data-queue-video]').forEach(item => item.removeAttribute('aria-current'))
    link.setAttribute('aria-current', 'true')
    root.querySelector('[data-queue-position]').textContent = link.dataset.position
    root.querySelector('[data-player-status]').textContent = link.dataset.videoTitle
    details.open = !details.hidden
    updatePlayer(details)
    // Keep a shareable URL without introducing duplicate browser-history entries.
    window.history.replaceState(null, '', link.href)
  })
}
