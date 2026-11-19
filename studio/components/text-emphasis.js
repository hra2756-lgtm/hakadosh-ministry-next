import { createElement } from 'react'

export function HighlightIcon() {
  return createElement('span', { 'aria-hidden': true, style: { background: '#e6c76b', color: '#29251d', padding: '0 3px' } }, 'H')
}

export function Highlight({ children }) {
  return createElement('mark', { style: { backgroundColor: '#e6c76b', color: '#29251d', padding: '0 .08em' } }, children)
}

export function GoldUnderline({ children }) {
  return createElement('u', { style: { textDecorationColor: '#d3ab37', textUnderlineOffset: '.18em', textShadow: '0 0 6px #d3ab3799' } }, children)
}
