/* eslint-disable @next/next/no-img-element -- Sanity CDN URLs are validated; images need no browser JavaScript. */
import { safeHttpsUrl } from '../../lib/blog-data.mjs'
import { scriptureSegments } from '../../lib/scripture-links.mjs'

export function BlogImage({ post, priority = false }) {
  return post.image ? <img className="blog-image" src={post.image} alt={post.alt} loading={priority ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" /> : null
}

export function BlogDate({ post, language }) {
  return <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat(language === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(post.publishedAt))}</time>
}

function spans(block, language) {
  return scriptureSegments(block, language).map((segment, segmentIndex) => {
    const content = segment.children.map((span, index) => {
      let node = span.text.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)
      for (const mark of span.marks || []) {
        if (mark === 'strong') node = <strong>{node}</strong>
        else if (mark === 'em') node = <em>{node}</em>
        else if (mark === 'inlineQuote') node = <q className="blog-inline-quote">{node}</q>
        else {
          const definition = block.markDefs?.find(item => item._key === mark && item._type === 'link')
          const href = safeHttpsUrl(definition?.href)
          if (href) node = <a href={href} rel="noopener noreferrer">{node}</a>
        }
      }
      return <span key={span._key || index}>{node}</span>
    })
    return segment.href ? <a className="scripture-link" href={segment.href} key={segmentIndex}>{content}</a> : <span key={segmentIndex}>{content}</span>
  })
}

export function BlogBody({ blocks, language = 'en' }) {
  const elements = []
  // Render only supported Portable Text nodes. Never interpret author text as HTML.
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block._type !== 'block') continue
    if (block.listItem === 'bullet' || block.listItem === 'number') {
      const items = []
      const kind = block.listItem
      do { items.push(<li key={i}>{spans(blocks[i], language)}</li>); i++ }
      while (i < blocks.length && blocks[i]._type === 'block' && blocks[i].listItem === kind)
      i--
      const List = kind === 'number' ? 'ol' : 'ul'
      elements.push(<List key={`list-${i}`}>{items}</List>)
    } else {
      const Tag = ['h2', 'h3', 'blockquote'].includes(block.style) ? block.style : 'p'
      elements.push(<Tag key={block._key || i}>{spans(block, language)}</Tag>)
    }
  }
  return <div className="blog-prose">{elements}</div>
}
