const EASTERN_TIME_ZONE = 'America/New_York'

function getDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EASTERN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getPreviousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const utcDate = new Date(Date.UTC(year, month - 1, day))
  utcDate.setUTCDate(utcDate.getUTCDate() - 1)

  const previousYear = utcDate.getUTCFullYear()
  const previousMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
  const previousDay = String(utcDate.getUTCDate()).padStart(2, '0')

  return `${previousYear}-${previousMonth}-${previousDay}`
}

function hashString(value) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function getSeededIndex(dateKey, totalVerses, salt = '') {
  return hashString(`${dateKey}:${salt}`) % totalVerses
}

export function getVerseOfTheDay(verses, now = new Date()) {
  if (!Array.isArray(verses) || verses.length === 0) {
    return null
  }

  if (verses.length === 1) {
    return verses[0]
  }

  const todayKey = getDateKey(now)
  const previousDayKey = getPreviousDateKey(todayKey)

  const previousIndex = getSeededIndex(previousDayKey, verses.length)
  let todayIndex = getSeededIndex(todayKey, verses.length)

  if (todayIndex === previousIndex) {
    const offset = (getSeededIndex(todayKey, verses.length - 1, 'offset') % (verses.length - 1)) + 1
    todayIndex = (todayIndex + offset) % verses.length
  }

  return verses[todayIndex]
}
