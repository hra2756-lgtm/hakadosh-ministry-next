const fs = require('fs')
const path = require('path')

const sourceDir = path.join(process.cwd(), 'temp-kjv')
const outputFile = path.join(process.cwd(), 'src', 'data', 'kjv-nt.json')

const ntBooks = [
  { book: 'Matthew', file: 'Matthew.json' },
  { book: 'Mark', file: 'Mark.json' },
  { book: 'Luke', file: 'Luke.json' },
  { book: 'John', file: 'John.json' },
  { book: 'Acts', file: 'Acts.json' },
  { book: 'Romans', file: 'Romans.json' },
  { book: '1Corinthians', file: '1Corinthians.json' },
  { book: '2Corinthians', file: '2Corinthians.json' },
  { book: 'Galatians', file: 'Galatians.json' },
  { book: 'Ephesians', file: 'Ephesians.json' },
  { book: 'Philippians', file: 'Philippians.json' },
  { book: 'Colossians', file: 'Colossians.json' },
  { book: '1Thessalonians', file: '1Thessalonians.json' },
  { book: '2Thessalonians', file: '2Thessalonians.json' },
  { book: '1Timothy', file: '1Timothy.json' },
  { book: '2Timothy', file: '2Timothy.json' },
  { book: 'Titus', file: 'Titus.json' },
  { book: 'Philemon', file: 'Philemon.json' },
  { book: 'Hebrews', file: 'Hebrews.json' },
  { book: 'James', file: 'James.json' },
  { book: '1Peter', file: '1Peter.json' },
  { book: '2Peter', file: '2Peter.json' },
  { book: '1John', file: '1John.json' },
  { book: '2John', file: '2John.json' },
  { book: '3John', file: '3John.json' },
  { book: 'Jude', file: 'Jude.json' },
  { book: 'Revelation', file: 'Revelation.json' }
]

let allVerses = []

ntBooks.forEach(({ book, file }) => {
  const filePath = path.join(sourceDir, file)

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`)
  }

  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)

  if (!data.chapters || !Array.isArray(data.chapters)) {
    throw new Error(`Unexpected structure in file: ${file}`)
  }

  data.chapters.forEach(chapterObj => {
    const chapterNumber = Number(chapterObj.chapter)

    if (!chapterObj.verses || !Array.isArray(chapterObj.verses)) {
      return
    }

    chapterObj.verses.forEach(verseObj => {
      const verseNumber = Number(verseObj.verse)
      const text = String(verseObj.text || '').trim()

      if (!text) return

      allVerses.push({
        book,
        chapter: chapterNumber,
        verse: verseNumber,
        reference: `${book} ${chapterNumber}:${verseNumber}`,
        text
      })
    })
  })
})

fs.writeFileSync(outputFile, JSON.stringify(allVerses, null, 2), 'utf8')

console.log('New Testament JSON created.')
console.log('Total verses:', allVerses.length)