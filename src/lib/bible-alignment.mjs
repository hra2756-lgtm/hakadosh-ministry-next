// KJV -> RV1909 numbering, checked against the complete UBS USX edition.
// [book, English chapter/start/end, Spanish chapter/start/end].
// Equal-length ranges map verse by verse. Unequal groups are excluded from the
// daily pool so each daily card always contains one complete, authentic verse.
export const alignmentRules = [
  ['NUM', 12, 16, 16, 13, 1, 1], ['NUM', 13, 1, 33, 13, 2, 34],
  ['NUM', 29, 40, 40, 30, 1, 1], ['NUM', 30, 1, 16, 30, 2, 17],
  ['JDG', 14, 18, 18, 14, 18, 19], ['JDG', 14, 19, 20, 14, 20, 21],
  ['1SA', 20, 42, 42, 20, 42, 43],
  ['1SA', 23, 29, 29, 24, 1, 1], ['1SA', 24, 1, 22, 24, 2, 23],
  ['2SA', 20, 25, 26, 20, 25, 25],
  ['1KI', 22, 43, 43, 22, 43, 44], ['1KI', 22, 44, 53, 22, 45, 54],
  ['1CH', 21, 15, 15, 21, 15, 16], ['1CH', 21, 16, 30, 21, 17, 31],
  ['2CH', 16, 14, 14, 16, 14, 15],
  ['2CH', 33, 10, 11, 33, 10, 10], ['2CH', 33, 12, 25, 33, 11, 24],
  ['JOB', 35, 15, 16, 35, 15, 15],
  ['JOB', 38, 39, 41, 39, 1, 3], ['JOB', 39, 1, 30, 39, 4, 33],
  ['JOB', 40, 1, 5, 39, 34, 38], ['JOB', 40, 6, 24, 40, 1, 19],
  ['HOS', 11, 12, 12, 12, 1, 1], ['HOS', 12, 1, 14, 12, 2, 15],
  ['JON', 1, 17, 17, 2, 1, 1], ['JON', 2, 1, 10, 2, 2, 11],
  ['ZEC', 11, 15, 16, 11, 15, 15], ['ZEC', 11, 17, 17, 11, 16, 16],
  ['ACT', 19, 40, 41, 19, 40, 40],
  ['2CO', 13, 12, 13, 13, 12, 12], ['2CO', 13, 14, 14, 13, 13, 13],
  ['3JN', 1, 14, 14, 1, 14, 15],
]
const mappings = new Map()
for (const [book, ec, start, end, sc, ss, se] of alignmentRules) {
  for (let v = start; v <= end; v++) mappings.set(`${book}.${ec}.${v}`, end - start === se - ss ? [sc, ss + v - start] : null)
}
export function spanishDailyReference(book, chapter, verse) {
  const key = `${book}.${chapter}.${verse}`
  return mappings.has(key) ? mappings.get(key) : [chapter, verse]
}
