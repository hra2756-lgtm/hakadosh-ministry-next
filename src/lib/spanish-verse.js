import verses from '../data/rv1909-nt.json' with { type: 'json' }

// Use the English book ID and passage numbers, never a separate random selection
// or the position of a verse in a translation's dataset.
const key = ({ book, chapter, verse }) => `${book}:${chapter}:${verse}`
const spanishByReference = new Map(verses.map(verse => [key(verse), verse]))

export function getSpanishVerse(englishVerse) {
  const spanishVerse = spanishByReference.get(key(englishVerse))

  if (!spanishVerse) {
    throw new Error(`Missing RV1909 translation for ${englishVerse.reference}`)
  }

  return spanishVerse
}
