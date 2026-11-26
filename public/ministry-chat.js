(() => {
  const root = document.querySelector('[data-ministry-chat]')
  if (!root || root.dataset.ready) return
  const es = root.dataset.language === 'es'
  const dialog = root.querySelector('dialog'), launch = root.querySelector('.chat-launch')
  const form = root.querySelector('form'), input = root.querySelector('textarea'), send = root.querySelector('.chat-send')
  const log = root.querySelector('.chat-messages'), status = root.querySelector('.chat-status'), scroll = root.querySelector('.chat-scroll')
  let messages = [], pending = false, controller
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let invitationInterval, invitationTimeout
  function stopInvitation() {
    clearInterval(invitationInterval); clearTimeout(invitationTimeout)
    launch.classList.remove('is-inviting')
  }
  function scheduleInvitation() {
    stopInvitation()
    if (reducedMotion.matches || document.hidden || dialog.open) return
    invitationInterval = setInterval(() => {
      if (dialog.open || document.hidden || launch.matches(':hover, :focus-visible')) return
      launch.classList.add('is-inviting')
      invitationTimeout = setTimeout(() => launch.classList.remove('is-inviting'), 6000)
    }, 30000)
  }
  launch.addEventListener('click', () => { stopInvitation(); dialog.showModal(); input.focus() })
  root.querySelector('.chat-close').addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => { launch.focus(); scheduleInvitation() })
  document.addEventListener('visibilitychange', scheduleInvitation)
  reducedMotion.addEventListener('change', scheduleInvitation)
  window.addEventListener('pagehide', stopInvitation)
  window.addEventListener('pageshow', scheduleInvitation)
  scheduleInvitation()
  const moveDown = () => { scroll.scrollTop = scroll.scrollHeight }
  function clear() {
    controller?.abort(); controller = null; pending = false
    messages = []; log.replaceChildren(); status.textContent = ''; input.value = ''; send.disabled = false; input.focus()
  }
  root.querySelector('.chat-clear').addEventListener('click', clear)
  window.addEventListener('pagehide', clear)
  function element(tag, text, className) {
    const node = document.createElement(tag); node.textContent = text
    if (className) node.className = className
    return node
  }
  function link(source) {
    const node = element('a', source.title)
    try {
      const url = new URL(source.url, location.origin)
      const internal = url.origin === location.origin && /^\/(?:$|gospel(?:\/open)?(?:\?|$)|blog(?:\/|$)|contact(?:\?|$))/.test(url.pathname + url.search)
      const external = url.protocol === 'https:' && ['www.youtube.com', 'www.instagram.com', 'x.com'].includes(url.hostname)
      const email = url.href === 'mailto:hriver2756@hakadoshministry.com'
      if (!internal && !external && !email) return element('span', source.title)
      node.href = url.href
      if (external) { node.target = '_blank'; node.rel = 'noopener noreferrer' }
    } catch { return element('span', source.title) }
    return node
  }
  function bubble(role, text) {
    const article = element('article', '', `chat-bubble chat-${role}`)
    article.append(element('p', role === 'user' ? (es ? 'Tú' : 'You') : (es ? 'Asistente IA' : 'AI assistant'), 'chat-role'), element('p', text, 'chat-answer'))
    log.append(article)
    while (log.children.length > 20) log.firstElementChild.remove()
    return article
  }
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const text = input.value.trim()
    if (pending || !text || text.length > 2000) return
    pending = true; send.disabled = true; input.value = ''
    bubble('user', text); status.textContent = es ? 'Buscando en los recursos del ministerio…' : 'Looking through ministry resources…'; moveDown()
    const abort = new AbortController(); controller = abort
    const next = [...messages.slice(-6), { role: 'user', content: text }]
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, language: es ? 'es' : 'en' }), signal: abort.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw Error(data.error === 'limit' ? 'limit' : 'unavailable')
      if (abort.signal.aborted) return
      const article = bubble('assistant', data.answer)
      for (const source of data.quotations || []) {
        const quote = element('blockquote', '')
        quote.append(element('p', source.text), link(source)); article.append(quote)
      }
      if (data.sources?.length) {
        const links = element('div', '', 'chat-sources'); links.setAttribute('aria-label', es ? 'Fuentes' : 'Sources')
        for (const source of data.sources) links.append(link(source))
        article.append(links)
      }
      messages = [...next, { role: 'assistant', content: data.answer.slice(0, 2000) }].slice(-6)
      status.textContent = ''
    } catch (error) {
      if (abort.signal.aborted) return
      const message = error.message === 'limit'
        ? (es ? 'Hemos alcanzado un límite temporal. Intenta más tarde o escribe al ministerio.' : 'We’ve reached a temporary usage limit. Please try later or email the ministry.')
        : (es ? 'No puedo conectarme al asistente en este momento. Inténtalo de nuevo más tarde.\n\nTambién puedes escribir al ministerio.' : 'I can’t connect to the assistant right now. Please try again later.\n\nYou can also email the ministry.')
      const article = bubble('assistant', message)
      const links = element('div', '', 'chat-sources')
      links.append(link({ title: 'hriver2756@hakadoshministry.com', url: 'mailto:hriver2756@hakadoshministry.com' }))
      article.append(links); status.textContent = ''
      // Failed turns do not enter the model's conversation history.
    } finally {
      if (controller === abort) { pending = false; send.disabled = false; controller = null; moveDown(); input.focus() }
    }
  })
  root.querySelectorAll('.chat-starters button').forEach(button => button.addEventListener('click', () => {
    input.value = button.textContent; input.focus()
  }))
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit() }
  })
  root.dataset.ready = 'true'
})()
