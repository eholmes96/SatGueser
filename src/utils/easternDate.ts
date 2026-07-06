// Date-key helpers for the daily challenge. All calendar-day logic is
// expressed in terms of "Eastern local time" (America/New_York, DST-aware),
// not UTC and not a fixed UTC-5 offset — the challenge rotates at midnight
// wall-clock time on the US East Coast year-round.

const EASTERN_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// Returns the current (or given) instant's Eastern calendar date as
// 'YYYY-MM-DD'. 'en-CA' formats dates in that order directly. This is
// DST-aware because Intl resolves the IANA zone's actual offset for the
// given instant, rather than assuming a fixed UTC-5.
export function getEasternDateKey(date: Date = new Date()): string {
  return EASTERN_DATE_FORMATTER.format(date)
}

function parseDateKey(dateKey: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateKey.split('-').map(Number)
  return { y, m, d }
}

function formatDateKey(utcMs: number): string {
  const d = new Date(utcMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Returns the calendar day immediately before the given date key. This is
// plain calendar arithmetic on an already-resolved 'YYYY-MM-DD' label (UTC
// is just used as a neutral anchor for the subtraction), not a second
// timezone lookup — so it's safe regardless of DST.
export function previousDateKey(dateKey: string): string {
  const { y, m, d } = parseDateKey(dateKey)
  return formatDateKey(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000)
}

// Whole-day difference between two 'YYYY-MM-DD' keys (b - a).
export function daysBetween(dateKeyA: string, dateKeyB: string): number {
  const a = parseDateKey(dateKeyA)
  const b = parseDateKey(dateKeyB)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / msPerDay)
}
