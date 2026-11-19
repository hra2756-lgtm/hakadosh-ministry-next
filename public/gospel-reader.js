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
  const validRanges = (ranges, length = 20000) => Array.isArray(ranges) ? ranges.filter(r => Array.isArray(r) && r.length === 2 && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] >= 0 && r[1] > r[0] && r[1] <= length).slice(0, 100) : []
  try {
    const stored = sessionStorage.getItem(key)
    if (stored && stored.length <= 200000) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) for (const [id, ranges] of Object.entries(parsed).slice(0, 500)) {
        if (/^[A-Z0-9]{3}\.\d{1,3}\.\d{1,3}(?:-\d{1,3})?$/.test(id)) marks[id] = validRanges(ranges)
      }
    }
  } catch { status.textContent = tools.dataset.storage }

  function render() {
    for (const element of elements) {
      const text = originals.get(element.dataset.verseText)
      const ranges = validRanges(marks[element.dataset.verseText], text.length).sort((a, b) => a[0] - b[0])
      const merged = []
      for (const range of ranges) {
        const previous = merged.at(-1)
        if (previous && previous[1] >= range[0]) previous[1] = Math.max(previous[1], range[1])
        else merged.push([...range])
      }
      const fragment = document.createDocumentFragment()
      let offset = 0
      for (const [start, end] of merged) {
        fragment.append(document.createTextNode(text.slice(offset, start)))
        const mark = document.createElement('mark')
        mark.textContent = text.slice(start, end)
        fragment.append(mark)
        offset = end
      }
      fragment.append(document.createTextNode(text.slice(offset)))
      element.replaceChildren(fragment)
    }
  }
  function save(message) {
    status.textContent = message
    try { sessionStorage.setItem(key, JSON.stringify(marks)) }
    catch { status.textContent = tools.dataset.storage }
  }
  // Capture selection before a toolbar click moves focus, including touch/keyboard selections.
  document.addEventListener('pointerdown', event => {
    if (!tools.contains(event.target)) pending = []
  })
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) return
    const range = selection.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) { pending = []; return }
    pending = []
    for (const element of elements) {
      if (!range.intersectsNode(element)) continue
      const text = originals.get(element.dataset.verseText)
      const before = document.createRange()
      before.selectNodeContents(element)
      let start = 0, end = text.length
      if (element.contains(range.startContainer)) {
        before.setEnd(range.startContainer, range.startOffset)
        start = before.toString().length
      }
      if (element.contains(range.endContainer)) {
        before.selectNodeContents(element)
        before.setEnd(range.endContainer, range.endOffset)
        end = before.toString().length
      }
      if (end > start) pending.push([element.dataset.verseText, start, end])
    }
  })
  tools.querySelector('[data-highlight-add]').addEventListener('click', () => {
    if (!pending.length) { status.textContent = tools.dataset.selectFirst; return }
    const updated = { ...marks }
    for (const [id, start, end] of pending) updated[id] = [...(updated[id] || []), [start, end]]
    if (Object.keys(updated).length > 500 || Object.values(updated).some(r => r.length > 100) || JSON.stringify(updated).length > 200000) { status.textContent = tools.dataset.limit; return }
    marks = updated
    pending = []
    window.getSelection()?.removeAllRanges()
    render()
    save(tools.dataset.saved)
  })
  tools.querySelector('[data-highlight-clear]').addEventListener('click', () => {
    marks = Object.create(null)
    pending = []
    render()
    save(tools.dataset.cleared)
  })
  render()
})()
