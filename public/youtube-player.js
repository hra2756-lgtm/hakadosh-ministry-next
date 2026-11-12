// Native details provide keyboard-accessible controls without inline scripts.
// Create the YouTube connection only after opening a player, and stop playback
// when it closes (including when another player in the group is opened).
if (!window.hakadoshYouTubePlayer) {
  window.hakadoshYouTubePlayer = true
  document.addEventListener('toggle', function (event) {
    const details = event.target
    if (!(details instanceof HTMLDetailsElement) || !details.classList.contains('youtube-player')) return
    const frame = details.querySelector('iframe[data-youtube-src]')
    const summary = details.querySelector('summary')
    if (!frame) return
    if (details.open) {
      frame.src = frame.dataset.youtubeSrc
      summary.setAttribute('aria-label', summary.dataset.closeLabel)
    } else {
      frame.removeAttribute('src')
      summary.setAttribute('aria-label', summary.dataset.openLabel)
    }
  }, true)
}
