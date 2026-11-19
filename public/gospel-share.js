(() => {
  for (const tools of document.querySelectorAll('[data-scripture-share]')) {
    if (tools.dataset.ready) continue
    tools.dataset.ready = 'true'
    const button = tools.querySelector('[data-instagram-share]')
    const status = tools.querySelector('[data-share-status]')
    let busy = false
    button.addEventListener('click', async event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      if (busy) return
      busy = true
      button.setAttribute('aria-busy', 'true')
      status.textContent = tools.dataset.preparing
      try {
        const response = await fetch(tools.dataset.image)
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw new Error('image')
        const blob = await response.blob()
        if (!blob.size || blob.size > 10000000) throw new Error('image')
        const file = new File([blob], 'hakadosh-scripture.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: tools.dataset.title })
            status.textContent = tools.dataset.shareHelp
            return
          } catch (error) {
            if (error.name === 'AbortError') { status.textContent = ''; return }
            // Some devices cannot pass files to Instagram or lose user activation
            // while generating the image. A normal download remains available.
          }
        }
        const url = URL.createObjectURL(blob)
        const download = document.createElement('a')
        download.href = url
        download.download = file.name
        document.body.append(download)
        download.click()
        download.remove()
        setTimeout(() => URL.revokeObjectURL(url), 60000)
        status.textContent = tools.dataset.instagramHelp
      } catch { status.textContent = tools.dataset.failed }
      finally { busy = false; button.removeAttribute('aria-busy') }
    })
  }
})()
