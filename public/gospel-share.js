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

    const palette = {yellow:'#eed77e',pink:'#efb0c8',blue:'#a9c9f3',green:'#b9d59b'}
    const spanish = panel.closest('[lang="es"]') || panel.querySelector('[data-language="es"]')
    const heading = panel.querySelector('.bible-chapter-heading')
    const title = heading?.querySelector('h3,h1')?.textContent || (spanish ? 'Escrituras' : 'Scriptures')
    const version = heading?.querySelector('p')?.textContent || tools.dataset.title.match(/\(([^)]+)\)$/)?.[1] || ''
    const ink = '#29251d'
    const colorFor = verse => verse.dataset.testament === 'new' ? '#793044' : '#27466a'
    ctx.textBaseline = 'top'
    function wrap(chars,size,width=920) {
      ctx.font = size+'px Georgia'
      const lines = []; let line = [], used = 0
      for (let i=0;i<chars.length;i++) {
        if(chars[i].paragraphBreak){if(line.length)lines.push(line);lines.push([]);line=[];used=0;continue}
        if (i === 0 || /\s/.test(chars[i-1].char)) {
          let word='',j=i
          while(j<chars.length && !/\s/.test(chars[j].char)) word+=chars[j++].char
          if(used && used+ctx.measureText(word).width>width){lines.push(line);line=[];used=0}
        }
        const item=chars[i]
        ctx.font=(item.sup ? size*.52 : size)+'px Georgia'
        const w=ctx.measureText(item.char).width
        ctx.font=size+'px Georgia'
        if(used+w>width && line.length){lines.push(line);line=[];used=0}
        if(!line.length && /\s/.test(item.char))continue
        line.push({...item,width:w});used+=w
      }
      if(line.length)lines.push(line)
      return lines
    }
    const plain = text => [...text].map(char=>({char}))
    let titleSize=116, titleLines=wrap(plain(title),titleSize)
    while(titleLines.length>2 && titleSize>72){titleSize-=4;titleLines=wrap(plain(title),titleSize)}
    let y=80
    ctx.font=titleSize+'px Georgia';ctx.fillStyle=colorFor(verses[0])
    for(const line of titleLines){ctx.fillText(line.map(c=>c.char).join(''),80,y);y+=titleSize*1.16}
    y+=20;ctx.font='30px Arial';ctx.fillStyle='#625845';ctx.fillText(version,80,y,920)
    y+=64;ctx.fillStyle='#a48c50';ctx.fillRect(80,y,920,2);y+=46
    const top=y,bottom=1600
    const groups = [...panel.querySelectorAll('[data-passage-title]')]
    const entries=(groups.length ? groups : verses).map(group=>{
      const chars=[]
      const members=groups.length ? [...group.querySelectorAll('.bible-verse')] : [group]
      for(const verse of members){
        for(const char of verse.querySelector('.bible-verse-number')?.textContent || '')chars.push({char,sup:true})
        chars.push({char:' '})
        const walker=document.createTreeWalker(verse.querySelector('p'),NodeFilter.SHOW_TEXT)
        while(walker.nextNode())for(const char of walker.currentNode.textContent){const mark=walker.currentNode.parentElement.closest('mark');chars.push({char,color:mark ? palette[mark.dataset.highlightColor] || palette.yellow : null})}
        if(verse !== members.at(-1))chars.push({char:' ',paragraphBreak:true})
      }
      return {chars,reference:group.dataset.passageTitle || '',color:colorFor(group)}
    })
    function layout(size){return entries.map(entry=>({...entry,lines:wrap(entry.chars,size),refLines:!heading && entry.reference ? wrap(plain(entry.reference),size+10):[]}))}
    const height=(rows,size)=>rows.reduce((sum,e)=>sum+e.refLines.length*(size+10)*1.2+e.lines.reduce((h,line)=>h+size*(line.length ? 1.42 : .65),0)+size*.65,0)
    let size=104, rows=layout(size)
    while(size>60 && height(rows,size)>bottom-top){size-=2;rows=layout(size)}
    const excerpt=height(rows,size)>bottom-top
    if(!excerpt)y+=Math.max(0,(bottom-top-height(rows,size))/2)
    let cropped=false
    outer:for(const entry of rows){
      if(y+entry.refLines.length*(size+10)*1.2+size*1.42>bottom){cropped=true;break}
      ctx.font=(size+10)+'px Georgia';ctx.fillStyle=entry.color
      for(const line of entry.refLines){if(y+(size+10)*1.2>bottom){cropped=true;break outer}ctx.fillText(line.map(c=>c.char).join(''),80,y);y+=(size+10)*1.2}
      ctx.font=size+'px Georgia'
      for(const line of entry.lines){
        if(!line.length){y+=size*.65;continue}
        if(y+size*1.42>bottom){cropped=true;break outer}
        let x=80
        for(const item of line){if(item.color){ctx.fillStyle=item.color;ctx.fillRect(x,y+4,item.width+1,size*1.08)}ctx.fillStyle=ink;ctx.font=(item.sup ? size*.52 : size)+'px Georgia';ctx.fillText(item.char,x,y+(item.sup ? 0 : size*.12));x+=item.width}
        y+=size*1.42
      }
      y+=size*.65
    }
    if(cropped){ctx.font='48px Georgia';ctx.fillStyle=ink;ctx.fillText('…',80,1605)}
    if(cropped){ctx.font='26px Arial';ctx.fillStyle='#625845';ctx.fillText(spanish ? 'Extracto · Lee el pasaje completo en nuestro sitio' : 'Excerpt · Read the full passage on our website',80,1670,920)}
    ctx.fillStyle='#a48c50';ctx.fillRect(80,1720,920,2)
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
