// BSB and BES use the same chapter/verse numbering. Unlike KJV -> RV1909,
// no chapter-boundary remapping is needed. BSB's 16 main-text gaps are recorded
// in the source manifest; iterating its verses excludes them from daily pairs.
export function spanishDailyReference(_book, chapter, verse) {
  return [chapter, verse]
}
