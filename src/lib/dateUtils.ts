export function parseSafeDate(d: Date | string): Date {
  if (d instanceof Date) return d
  if (typeof d === 'string') {
    if (d.includes('T')) {
      return new Date(d)
    }
    const parts = d.split('-').map(Number)
    if (parts.length === 3) {
      // YYYY-MM-DD at midday to avoid any local timezone shift
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
    }
    return new Date(d)
  }
  return new Date()
}

export function formatLocalizedDate(
  d: Date | string,
  lang: 'es' | 'eu' | 'en',
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  const dateObj = parseSafeDate(d)
  const locale = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES'
  return dateObj.toLocaleDateString(locale, options)
}

export function formatWeekdayDayMonth(d: Date | string, lang: 'es' | 'eu' | 'en', short = false): string {
  const dateObj = parseSafeDate(d)
  const locale = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES'
  return dateObj.toLocaleDateString(locale, {
    weekday: short ? 'short' : 'long',
    day: 'numeric',
    month: short ? 'short' : 'long'
  })
}

export function formatDateTime(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const dateObj = parseSafeDate(d)
  const locale = lang === 'eu' ? 'eu-ES' : lang === 'en' ? 'en-US' : 'es-ES'
  return dateObj.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
