(() => {
  document.querySelectorAll('[data-copy-blog]').forEach(button => {
    if (!navigator.clipboard || button.dataset.ready) return
    button.dataset.ready = 'true'
    button.hidden = false
    button.addEventListener('click', async () => {
      const status = button.closest('.blog-share').querySelector('.blog-copy-status')
      try { await navigator.clipboard.writeText(button.dataset.copyBlog); status.textContent = button.dataset.copied }
      catch { status.textContent = button.dataset.failed }
    })
  })
})()
