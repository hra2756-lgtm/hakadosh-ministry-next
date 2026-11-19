(() => {
  const video = document.getElementById('home-intro-video')
  const controls = document.querySelector('[data-video-controls]')
  if (!video || !controls) return
  const sound = controls.querySelector('[data-video-sound]')
  const play = controls.querySelector('[data-video-play]')
  video.muted = true
  video.loop = false
  const holdAt = 6 // Last fully visible logo frame, before the source fades out.
  let held = false
  const update = () => {
    sound.textContent = video.muted ? sound.dataset.unmute : sound.dataset.mute
    play.textContent = video.paused ? play.dataset.play : play.dataset.pause
    play.hidden = held || video.ended
  }
  controls.hidden = false
  sound.addEventListener('click', () => { video.muted = !video.muted; update() })
  play.addEventListener('click', () => {
    if (held || video.ended) return
    if (video.paused) video.play().catch(update)
    else video.pause()
  })
  for (const event of ['play', 'pause', 'ended', 'volumechange']) video.addEventListener(event, update)
  const holdFrame = () => {
    if (held || video.currentTime < holdAt) return
    held = true
    video.pause()
    video.currentTime = holdAt
    update()
  }
  video.addEventListener('timeupdate', holdFrame)
  video.addEventListener('ended', holdFrame)
  // Frame callbacks stop before the fade, with timeupdate as a fallback for
  // older browsers and background tabs whose frame callbacks were throttled.
  if (video.requestVideoFrameCallback) {
    const onFrame = () => {
      holdFrame()
      if (!held) video.requestVideoFrameCallback(onFrame)
    }
    video.requestVideoFrameCallback(onFrame)
  }
  video.addEventListener('error', () => { controls.hidden = true })
  update()
  // Respect reduced motion and autoplay restrictions; offer manual playback.
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) video.play().catch(update)
})()
