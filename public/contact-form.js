(() => {
  function init() {
    const form = document.getElementById('contact-form')
    if (!form || form.dataset.initialized) return
    form.dataset.initialized = 'true'
    const button = form.querySelector('button[type="submit"]')
    const status = document.getElementById('contact-status')
    let sending = false
    let submissionId
    const show = code => {
      const message = form.querySelector(`[data-contact-status="${code}"]`)
      status.textContent = message?.textContent || form.querySelector('[data-contact-status="failed"]').textContent
    }
    button.disabled = form.dataset.ready !== 'true'
    form.addEventListener('submit', async event => {
      event.preventDefault()
      if (sending || form.dataset.ready !== 'true') return
      if (!form.reportValidity()) return
      const data = new FormData(form)
      const token = data.get('cf-turnstile-response')
      if (!token) { show('verification'); return }
      submissionId ||= crypto.randomUUID()
      sending = true
      button.disabled = true
      button.textContent = form.dataset.sending
      form.setAttribute('aria-busy', 'true')
      status.textContent = ''
      try {
        const response = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({ name: data.get('name'), email: data.get('email'), topic: data.get('topic'), message: data.get('message'), website: data.get('website'), token, submissionId }),
        })
        const outcome = await response.json()
        if (response.ok && outcome.code === 'sent') {
          form.reset()
          submissionId = undefined
          show('sent')
        } else {
          show(['invalid', 'verification', 'unavailable', 'failed'].includes(outcome.code) ? outcome.code : 'failed')
        }
      } catch { show('failed') }
      finally {
        sending = false
        button.disabled = false
        button.textContent = form.dataset.send + ' ↗'
        form.removeAttribute('aria-busy')
        if (window.turnstile) window.turnstile.reset()
        status.focus()
      }
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
  else init()
})()
