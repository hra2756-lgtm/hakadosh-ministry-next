import { createElement } from 'react'

export function InlineQuoteIcon() {
  return createElement('span', {
    'aria-hidden': true,
    style: { fontFamily: 'Georgia, serif', fontSize: '1.25em', lineHeight: 1 },
  }, '“ ”')
}

export function InlineQuote({ children }) {
  return createElement('q', {
    // Keep author punctuation: automatic quotation marks would repeat around bold spans.
    style: {
      quotes: 'none', fontStyle: 'italic',
      backgroundColor: 'rgba(200, 169, 75, 0.15)', borderBottom: '1px solid #c8a94b',
    },
  }, children)
}
