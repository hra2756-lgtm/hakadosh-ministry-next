(() => {
  // Render the visible, trusted passage locally: personal highlights never leave
  // the browser and are never put into publicly cached social-preview URLs.
  async function passagePhoto(tools) {
    const panel = tools.closest('.bible-reading-panel')
    const verses = [...(panel?.querySelectorAll('.bible-verse') || [])]
    if (!verses.length) throw new Error('passage')
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 1920
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1080, 1920)
    ctx.beginPath(); ctx.roundRect(24, 24, 1032, 1872, 64)
    ctx.fillStyle = '#f4eedf'; ctx.fill()
    ctx.strokeStyle = '#a48c50'; ctx.lineWidth = 4; ctx.stroke()
    ctx.fillStyle = '#29251d'; ctx.textBaseline = 'top'
    ctx.font = '48px Georgia'
    const title = panel.querySelector('.bible-chapter-heading h3, .bible-chapter-heading h1')?.textContent || tools.dataset.title
    let y = 76, line = ''
    for (const word of title.split(/\s+/)) {
      if (ctx.measureText(`${line} ${word}`).width > 936 && line) { ctx.fillText(line, 72, y); y += 60; line = '' }
      line += `${line ? ' ' : ''}${word}`
      if (y > 196) break
    }
    ctx.fillText(line, 72, y); y += 76
    ctx.font = '25px Arial'; ctx.fillStyle = '#625845'
    ctx.fillText(panel.querySelector('.bible-chapter-heading > p')?.textContent || tools.dataset.title, 72, y, 936)
    y += 54; ctx.fillStyle = '#a48c50'; ctx.fillRect(72, y, 936, 2); y += 46
    ctx.font = '40px Georgia'
    let excerpt = false
    outer: for (const verse of verses) {
      const p = verse.querySelector('p')
      if (!p) continue
      const number = verse.querySelector('.bible-verse-number, span')?.textContent || ''
      const chars = [...`${number}  `].map(char => ({ char, marked: false }))
      const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) for (const char of walker.currentNode.textContent) chars.push({ char, marked: !!walker.currentNode.parentElement.closest('mark') })
      let x = 72
      for (let i = 0; i < chars.length; i++) {
        // Wrap whole words where possible, retaining per-character highlight ranges.
        if (i === 0 || /\s/.test(chars[i - 1].char)) {
          let word = '', j = i
          while (j < chars.length && !/\s/.test(chars[j].char)) word += chars[j++].char
          if (x > 72 && x + ctx.measureText(word).width > 1008) { x = 72; y += 58 }
        }
        const { char, marked } = chars[i], width = ctx.measureText(char).width
        if (x + width > 1008) { x = 72; y += 58 }
        if (y > 1590) { excerpt = true; break outer }
        if (x === 72 && /\s/.test(char)) continue
        if (marked) { ctx.fillStyle = '#e6c76b'; ctx.fillRect(x, y - 2, width + 1, 48) }
        ctx.fillStyle = '#29251d'; ctx.fillText(char, x, y); x += width
      }
      y += 86
    }
    const spanish = panel.closest('[lang="es"]') || panel.querySelector('[data-language="es"]')
    if (excerpt) { ctx.font = '24px Arial'; ctx.fillStyle = '#625845'; ctx.fillText(spanish ? 'Extracto · Lee el pasaje completo en nuestro sitio' : 'Excerpt · Read the full passage on our website', 72, 1660) }
    ctx.fillStyle = '#a48c50'; ctx.fillRect(72, 1720, 936, 2)
    const logo = new Image(); logo.src = '/favicon.png'; await logo.decode()
    ctx.drawImage(logo, 492, 1740, 96, 96)
    ctx.font = '28px Arial'; ctx.fillStyle = '#29251d'; ctx.textAlign = 'center'
    ctx.fillText('www.hakadoshministry.com', 540, 1850)
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('image')), 'image/png'))
  }
  for (const tools of document.querySelectorAll('[data-scripture-share]')) {
    if (tools.dataset.ready) continue
    tools.dataset.ready = 'true'
    const button = tools.querySelector('[data-instagram-share]')
    const status = tools.querySelector('[data-share-status]')
    let busy = false
    const camera = tools.querySelector('.scripture-camera')
    const handle = async (event, instagram) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      if (busy) return
      busy = true
      button.setAttribute('aria-busy', 'true')
      status.textContent = tools.dataset.preparing
      try {
        const blob = await passagePhoto(tools)
        if (!blob.size || blob.size > 10000000) throw new Error('image')
        const file = new File([blob], 'hakadosh-scripture.png', { type: 'image/png' })
        if (instagram && navigator.share && navigator.canShare?.({ files: [file] })) {
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
        status.textContent = instagram ? tools.dataset.instagramHelp : ''
      } catch { status.textContent = tools.dataset.failed }
      finally { busy = false; button.removeAttribute('aria-busy') }
    }
    button.addEventListener('click', event => handle(event, true))
    camera.addEventListener('click', event => handle(event, false))
  }
})()
