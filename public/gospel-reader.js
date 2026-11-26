// Progressive enhancement: reading, search and navigation also work without JS.
// No HTML from storage is ever inserted; highlights are bounded character offsets.
(() => {
  const book = document.getElementById('bible-book')
  const chapter = document.getElementById('bible-chapter')
  const chapterMenu = document.getElementById('bible-chapter-menu')
  const chapterToggle = document.querySelector('.bible-chapter-toggle')
  const calendar = chapterMenu?.querySelector('.bible-chapter-calendar')
  if (book && chapter) {
    const sync = () => calendar?.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.chapter === chapter.value)))
    const update = () => {
      chapter.max = book.selectedOptions[0].dataset.chapters
      if (Number(chapter.value) > Number(chapter.max)) chapter.value = '1'
      if (calendar) {
        calendar.replaceChildren(...Array.from({length: Number(chapter.max)}, (_, i) => {
          const button = document.createElement('button')
          button.type = 'button'
          button.textContent = String(i + 1)
          button.dataset.chapter = String(i + 1)
          return button
        }))
        sync()
      }
      document.querySelector('.bible-search-panel').dataset.testament = book.selectedOptions[0].dataset.testament
    }
    update()
    book.addEventListener('change', update)
    chapter.addEventListener('input', sync)
    if (chapterMenu && chapterToggle && typeof chapterMenu.showPopover === 'function') {
      chapterToggle.hidden = false
      chapterMenu.addEventListener('toggle', event => {
        chapterToggle.setAttribute('aria-expanded', String(event.newState === 'open'))
        if (event.newState !== 'open') return
        const rect = chapter.getBoundingClientRect()
        chapterMenu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - chapterMenu.offsetWidth - 8))}px`
        const below = innerHeight - rect.bottom - 12
        const above = rect.top - 12
        const available = below >= Math.min(330, above) ? below : above
        chapterMenu.style.maxHeight = `${Math.min(330, Math.max(80, available))}px`
        chapterMenu.style.top = `${below >= Math.min(330, above) ? rect.bottom + 6 : Math.max(8, rect.top - chapterMenu.offsetHeight - 6)}px`
        const selected = calendar.querySelector('[aria-pressed="true"]') || calendar.querySelector('button')
        selected?.focus({ preventScroll: true })
        selected?.scrollIntoView({ block: 'nearest' })
      })
      calendar.addEventListener('click', event => {
        const button = event.target.closest('button[data-chapter]')
        if (!button) return
        chapter.value = button.dataset.chapter
        sync()
        chapterMenu.hidePopover()
        chapterToggle.focus()
      })
      calendar.addEventListener('keydown', event => {
        const buttons = [...calendar.querySelectorAll('button')]
        const index = buttons.indexOf(event.target)
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[event.key]
        if (index < 0 || !step) return
        event.preventDefault()
        buttons[Math.max(0, Math.min(buttons.length - 1, index + step))].focus()
      })
    }
  }
  const container = document.querySelector('[data-bible-passages]')
  const tools = document.querySelector('[data-highlight-tools]')
  if (!container || !tools || tools.dataset.ready) return
  tools.dataset.ready = 'true'
  tools.hidden = false
  const key = container.dataset.language === 'es' ? 'hakadosh-bible-highlights-v3-bes-2026' : 'hakadosh-bible-highlights-v3-bsb'
  const status = tools.querySelector('[data-highlight-status]')
  const elements = [...container.querySelectorAll('[data-verse-text]')]
  const originals = new Map(elements.map(el => [el.dataset.verseText, el.textContent]))
  let marks = Object.create(null)
  let pending = []
  let markSelected = false

  const colors = ['yellow','pink','blue','green']
  const popup = tools.querySelector('[data-highlight-popup]')
  const validRanges = (ranges, length = 20000) => Array.isArray(ranges) ? ranges.filter(r => Array.isArray(r) && [2,3].includes(r.length) && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] > r[0] && r[1] <= length && (r.length === 2 || colors.includes(r[2]))).slice(0,100).map(r => [r[0],r[1],r[2] || 'yellow']) : []
  function overlay(ranges, start, end, color) {
    const next = ranges.flatMap(([a,b,c]) => b <= start || a >= end ? [[a,b,c]] : [...(a < start ? [[a,start,c]] : []), ...(b > end ? [[end,b,c]] : [])])
    if (color) next.push([start,end,color])
    const merged = []
    for (const range of next.sort((a,b) => a[0]-b[0])) {
      const last = merged.at(-1)
      if (last && last[1] === range[0] && last[2] === range[2]) last[1] = range[1]
      else merged.push(range)
    }
    return merged
  }
  try {
    const stored = sessionStorage.getItem(key)
    if (stored && stored.length <= 200000) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) for (const [id,ranges] of Object.entries(parsed).slice(0,500)) {
        if (/^[A-Z0-9]{3}\.\d{1,3}\.\d{1,3}(?:-\d{1,3})?$/.test(id)) marks[id] = validRanges(ranges).reduce((all,[a,b,c]) => overlay(all,a,b,c), [])
      }
    }
  } catch { status.textContent = tools.dataset.storage }
  function render() {
    for (const element of elements) {
      const text = originals.get(element.dataset.verseText)
      const fragment = document.createDocumentFragment()
      let offset = 0
      for (const [start,end,color] of validRanges(marks[element.dataset.verseText],text.length)) {
        fragment.append(document.createTextNode(text.slice(offset,start)))
        const mark = document.createElement('mark')
        mark.textContent = text.slice(start,end)
        mark.dataset.highlightColor = color
        mark.dataset.start = start; mark.dataset.end = end
        fragment.append(mark); offset = end
      }
      fragment.append(document.createTextNode(text.slice(offset)))
      element.replaceChildren(fragment)
    }
  }
  function hide() { popup.hidden = true; pending = []; markSelected = false }
  function show(rect) {
    popup.hidden = false
    popup.style.left = Math.max(8,Math.min(rect.left + rect.width/2-popup.offsetWidth/2,innerWidth-popup.offsetWidth-8))+'px'
    popup.style.top = Math.max(8,Math.min(rect.bottom+10,innerHeight-popup.offsetHeight-8))+'px'
  }
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      if (!markSelected && !popup.contains(document.activeElement)) hide()
      return
    }
    const range = selection.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) { hide(); return }
    pending = []
    for (const element of elements) {
      if (!range.intersectsNode(element)) continue
      const before = document.createRange()
      before.selectNodeContents(element)
      let start = 0, end = originals.get(element.dataset.verseText).length
      if (element.contains(range.startContainer)) { before.setEnd(range.startContainer,range.startOffset); start = before.toString().length }
      if (element.contains(range.endContainer)) { before.selectNodeContents(element); before.setEnd(range.endContainer,range.endOffset); end = before.toString().length }
      if (end > start) pending.push([element.dataset.verseText,start,end])
    }
    if (pending.length) show(range.getBoundingClientRect())
    else hide()
  })
  container.addEventListener('click', event => {
    const mark = event.target.closest('mark')
    if (!mark || !window.getSelection()?.isCollapsed) return
    pending = [[mark.closest('[data-verse-text]').dataset.verseText,Number(mark.dataset.start),Number(mark.dataset.end)]]
    markSelected = true
    show(mark.getBoundingClientRect())
  })
  popup.addEventListener('pointerdown', event => event.preventDefault())
  popup.addEventListener('click', event => {
    const button = event.target.closest('button')
    if (!button || !pending.length) return
    const color = button.dataset.highlightColor
    if (color && !colors.includes(color)) return
    const updated = {...marks}
    for (const [id,start,end] of pending) {
      updated[id] = overlay(validRanges(updated[id]),start,end,color)
      if (!updated[id].length) delete updated[id]
    }
    if (Object.keys(updated).length > 500 || Object.values(updated).some(r => r.length > 100) || JSON.stringify(updated).length > 200000) { status.textContent = tools.dataset.limit; return }
    marks = updated
    hide(); window.getSelection()?.removeAllRanges(); render()
    status.textContent = color ? tools.dataset.saved : tools.dataset.cleared
    try { sessionStorage.setItem(key,JSON.stringify(marks)) } catch { status.textContent = tools.dataset.storage }
  })
  document.addEventListener('pointerdown', event => { if (!popup.contains(event.target)) hide() })
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hide() })
  window.addEventListener('resize',hide)
  window.addEventListener('scroll',hide,true)
  render()
})()
