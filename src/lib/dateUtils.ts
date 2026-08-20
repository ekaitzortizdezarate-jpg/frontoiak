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

const BASQUE_DAYS_LONG = ['Igandea', 'Astelehena', 'Asteartea', 'Asteazkena', 'Osteguna', 'Ostirala', 'Larunbata']
const BASQUE_DAYS_SHORT = ['Ig', 'Al', 'Ar', 'Az', 'Og', 'Ol', 'La']
const BASQUE_MONTHS_LONG = [
  'urtarrila', 'otsaila', 'martxoa', 'apirila', 'maiatza', 'ekaina',
  'uztaila', 'abuztua', 'iraila', 'urria', 'azaroa', 'abendua'
]
const BASQUE_MONTHS_SHORT = [
  'urt.', 'ots.', 'mar.', 'api.', 'mai.', 'eka.',
  'uzt.', 'abu.', 'ira.', 'urr.', 'aza.', 'abe.'
]

const SPANISH_DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const SPANISH_DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const SPANISH_MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
]
const SPANISH_MONTHS_SHORT = [
  'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
  'jul.', 'ago.', 'sep.', 'oct.', 'nov.', 'dic.'
]

const ENGLISH_DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const ENGLISH_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ENGLISH_MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const ENGLISH_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

// 1. Formato completo: "Osteguna, 2026ko abuztuak 20" / "Jueves, 20 de agosto de 2026" / "Thursday, August 20, 2026"
export function formatFullDateWithWeekday(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const dayOfWeek = date.getDay()
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  if (lang === 'eu') {
    return `${BASQUE_DAYS_LONG[dayOfWeek]}, ${year}ko ${BASQUE_MONTHS_LONG[month]}ak ${day}`
  } else if (lang === 'en') {
    return `${ENGLISH_DAYS_LONG[dayOfWeek]}, ${ENGLISH_MONTHS_LONG[month]} ${day}, ${year}`
  } else {
    return `${SPANISH_DAYS_LONG[dayOfWeek]}, ${day} de ${SPANISH_MONTHS_LONG[month]} de ${year}`
  }
}

// 2. Día de la semana y fecha: "Osteguna, abuztuak 20" / "Jueves, 20 de agosto" / "Thursday, August 20"
export function formatWeekdayAndDayMonth(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const dayOfWeek = date.getDay()
  const day = date.getDate()
  const month = date.getMonth()

  if (lang === 'eu') {
    return `${BASQUE_DAYS_LONG[dayOfWeek]}, ${BASQUE_MONTHS_LONG[month]}ak ${day}`
  } else if (lang === 'en') {
    return `${ENGLISH_DAYS_LONG[dayOfWeek]}, ${ENGLISH_MONTHS_LONG[month]} ${day}`
  } else {
    return `${SPANISH_DAYS_LONG[dayOfWeek]}, ${day} de ${SPANISH_MONTHS_LONG[month]}`
  }
}

// 3. Vista previa de 3 días: "Osteguna, abu. 20" / "Jueves, 20 ago." / "Thursday, Aug 20"
export function formatPreviewDay(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const dayOfWeek = date.getDay()
  const day = date.getDate()
  const month = date.getMonth()

  if (lang === 'eu') {
    return `${BASQUE_DAYS_LONG[dayOfWeek]}, ${BASQUE_MONTHS_SHORT[month]} ${day}`
  } else if (lang === 'en') {
    return `${ENGLISH_DAYS_LONG[dayOfWeek]}, ${ENGLISH_MONTHS_SHORT[month]} ${day}`
  } else {
    return `${SPANISH_DAYS_LONG[dayOfWeek]}, ${day} ${SPANISH_MONTHS_SHORT[month]}`
  }
}

// 4. Celda del calendario mensual: "Og, abu. 20" / "Jue, 20 ago." / "Thu, Aug 20"
export function formatCalendarCellDay(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const dayOfWeek = date.getDay()
  const day = date.getDate()
  const month = date.getMonth()

  if (lang === 'eu') {
    return `${BASQUE_DAYS_SHORT[dayOfWeek]}, ${BASQUE_MONTHS_SHORT[month]} ${day}`
  } else if (lang === 'en') {
    return `${ENGLISH_DAYS_SHORT[dayOfWeek]}, ${ENGLISH_MONTHS_SHORT[month]} ${day}`
  } else {
    return `${SPANISH_DAYS_SHORT[dayOfWeek]}, ${day} ${SPANISH_MONTHS_SHORT[month]}`
  }
}

// 5. Rango de fechas o fecha corta: "Abu. 20" / "20 ago." / "Aug 20"
export function formatShortMonthDay(d: Date | string, lang: 'es' | 'eu' | 'en', withYear = false): string {
  const date = parseSafeDate(d)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  if (lang === 'eu') {
    return withYear ? `${year}ko ${BASQUE_MONTHS_SHORT[month]} ${day}` : `${BASQUE_MONTHS_SHORT[month]} ${day}`
  } else if (lang === 'en') {
    return withYear ? `${ENGLISH_MONTHS_SHORT[month]} ${day}, ${year}` : `${ENGLISH_MONTHS_SHORT[month]} ${day}`
  } else {
    return withYear ? `${day} ${SPANISH_MONTHS_SHORT[month]} ${year}` : `${day} ${SPANISH_MONTHS_SHORT[month]}`
  }
}

// 6. Fecha con hora corta (incidencias, logs): "Abu. 20, 18:30" / "20 ago., 18:30" / "Aug 20, 18:30"
export function formatShortDateWithTime(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const day = date.getDate()
  const month = date.getMonth()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  if (lang === 'eu') {
    return `${BASQUE_MONTHS_SHORT[month]} ${day}, ${timeStr}`
  } else if (lang === 'en') {
    return `${ENGLISH_MONTHS_SHORT[month]} ${day}, ${timeStr}`
  } else {
    return `${day} ${SPANISH_MONTHS_SHORT[month]}, ${timeStr}`
  }
}

// 7. Fecha con hora larga: "2026ko abuztuak 20, 18:30" / "20 de agosto de 2026, 18:30" / "August 20, 2026, 18:30"
export function formatLongDateWithTime(d: Date | string, lang: 'es' | 'eu' | 'en'): string {
  const date = parseSafeDate(d)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const timeStr = `${hours}:${minutes}`

  if (lang === 'eu') {
    return `${year}ko ${BASQUE_MONTHS_LONG[month]}ak ${day}, ${timeStr}`
  } else if (lang === 'en') {
    return `${ENGLISH_MONTHS_LONG[month]} ${day}, ${year}, ${timeStr}`
  } else {
    return `${day} de ${SPANISH_MONTHS_LONG[month]} de ${year}, ${timeStr}`
  }
}
