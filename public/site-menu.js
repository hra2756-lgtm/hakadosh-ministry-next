// The native disclosure works without JavaScript; enhance dismissal and focus.
(() => {
  for (const menu of document.querySelectorAll('[data-header-menu]')) {
    if (menu.dataset.ready) continue
    menu.dataset.ready = 'true'
    const toggle = menu.querySelector('summary')

    for (const link of menu.querySelectorAll('a[href]')) {
      if (link.pathname === window.location.pathname) link.setAttribute('aria-current', 'page')
    }
    document.addEventListener('click', (event) => {
      if (!menu.open || !(event.target instanceof Element)) return
      if (!menu.contains(event.target)) menu.open = false
      else if (event.target.closest('a[href]')) menu.open = false
    })
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !menu.open) return
      menu.open = false
      toggle.focus()
    })
    menu.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false
    })
    for (const option of menu.querySelectorAll('button[data-language]')) {
      option.addEventListener('click', () => {
        const language = option.dataset.language
        if (language !== 'en' && language !== 'es') return
        if (language === document.documentElement.lang) {
          menu.open = false
          toggle.focus()
          return
        }
        // Only a non-sensitive language preference is stored; no translation service.
        const secure = window.location.protocol === 'https:' ? '; Secure' : ''
        document.cookie = `site-language=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
        // Request freshly translated HTML while preserving the current page and query.
        window.location.reload()
      })
    }
  }
})()
