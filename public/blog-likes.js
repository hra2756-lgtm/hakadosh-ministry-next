(() => {
  let initialRead = Promise.resolve()
  document.querySelectorAll('[data-blog-likes]').forEach(widget => {
    if (widget.dataset.ready) return
    widget.dataset.ready = 'true'
    widget.hidden = false
    const button = widget.querySelector('button')
    const label = widget.querySelector('[data-like-label]')
    const count = widget.querySelector('[data-like-count]')
    const status = widget.querySelector('[data-like-status]')
    const text = widget.dataset
    let known = false
    let liked = false
    let busy = false

    async function update(writing = false) {
      if (busy) return
      busy = true
      button.disabled = true
      widget.setAttribute('aria-busy', 'true')
      try {
        const response = await fetch(text.endpoint, {
          method: writing ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
          signal: AbortSignal.timeout(25000),
          ...(writing ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ liked: !liked }) } : {}),
        })
        if (!response.ok) throw new Error(response.status === 429 ? 'limited' : 'unavailable')
        const result = await response.json()
        if (!Number.isSafeInteger(result.count) || result.count < 0 || typeof result.liked !== 'boolean') throw new Error('invalid')
        liked = result.liked
        known = true
        button.setAttribute('aria-pressed', String(liked))
        button.setAttribute('aria-label', liked ? text.unlike : text.label)
        label.textContent = liked ? text.liked : text.like
        count.textContent = new Intl.NumberFormat(document.documentElement.lang).format(result.count)
        button.setAttribute('aria-label', `${liked ? text.unlike : text.label}: ${count.textContent} ${result.count === 1 ? text.singular : text.plural}`)
        status.classList.add('blog-status-hidden')
        status.textContent = writing ? (liked ? text.saved : text.removed) : ''
      } catch (error) {
        // A failed response may have followed a successful write. Refresh before another change.
        known = false
        count.textContent = '—'
        label.textContent = text.retry
        button.setAttribute('aria-label', text.retry)
        status.classList.remove('blog-status-hidden')
        status.textContent = error.message === 'limited' ? text.limited : text.error
      } finally {
        busy = false
        button.disabled = false
        widget.setAttribute('aria-busy', 'false')
      }
    }
    button.addEventListener('click', () => { void update(known) })
    // One read on page load, no continuous polling or sharing analytics.
    // Establish the HttpOnly visitor cookie before initializing other cards.
    initialRead = initialRead.then(() => update())
  })
})()
