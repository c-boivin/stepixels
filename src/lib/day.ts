import { STEPS_PER_PIXEL } from '~/lib/rules'

/**
 * The game day (R4): it starts and ends at the reset time chosen by the user, not at midnight.
 * Every date is in the phone's time zone, so a reset at 20:00 stays at 20:00 after a time change.
 */

/** A period of time, `start` included and `end` excluded. */
export interface StepsWindow {
  start: Date
  end: Date
}

export interface DayWindows {
  /** Steps shown by the daily counter (R3): since the last validation, in the current day. */
  counter: StepsWindow
  /**
   * Steps of the previous day that were never validated, for the "DOMMAGE" message (R4).
   * `null` when nothing can be lost: a validation was already made today, or the user had not
   * finished the onboarding yet during the previous day.
   */
  lost: StepsWindow | null
  /** End of the current day: the countdown reaches 0 here (R5). */
  nextReset: Date
}

export interface DayWindowsInput {
  /** Reset time, `HH:MM`. */
  resetTime: string
  now: Date
  /** Time of the last validation, `null` before the first one. */
  lastValidatedAt: Date | null
  /** When the user finished the onboarding: no step before it can be lost. `null` when unknown. */
  startedAt: Date | null
}

/** Finds which steps the home screen reads: the daily counter, the lost steps and the next reset. */
export function getDayWindows({ resetTime, now, lastValidatedAt, startedAt }: DayWindowsInput): DayWindows {
  const dayStart = getDayStart(resetTime, now)
  const previousDayStart = shiftDay(dayStart, -1, resetTime)
  const validatedToday = lastValidatedAt !== null && lastValidatedAt >= dayStart

  // the remainder of a validation is lost (R1): the counter starts again after it. A validation
  // in the future (phone clock moved back) starts at `now`: a start after the end cannot be read
  const counter = { start: validatedToday ? earliest(lastValidatedAt, now) : dayStart, end: now }

  // "DOMMAGE" stays until the first validation of the day (OQ-25), and never blames the user
  // for the steps walked before they had the app; an unknown start date loses nothing
  let lost: StepsWindow | null = null
  if (!validatedToday && startedAt !== null && startedAt < dayStart) {
    const start = latest([previousDayStart, startedAt, lastValidatedAt])
    lost = { start, end: dayStart }
  }

  return { counter, lost, nextReset: shiftDay(dayStart, 1, resetTime) }
}

/** Lost steps are only shown from 100: under it, the user could not validate them anyway (OQ-11). */
export function isWorthShowingLoss(steps: number): boolean {
  return steps >= STEPS_PER_PIXEL
}

/** Start of the current day: the last reset time at or before `now`. */
export function getDayStart(resetTime: string, now: Date): Date {
  const today = atResetTime(now, resetTime)
  return today <= now ? today : shiftDay(today, -1, resetTime)
}

/** Time left before `target`, as `HH:MM:SS` (`06:12:40`); `00:00:00` once it has passed. */
export function formatCountdown(target: Date, now: Date): string {
  const seconds = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 1000))
  // a day can last 25 hours when the clocks go back: hours are not limited to 24
  const parts = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]

  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}

/** The reset time on the same calendar day as `date`. */
function atResetTime(date: Date, resetTime: string): Date {
  const [hours, minutes] = resetTime.split(':').map(Number)
  const result = new Date(date)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * The reset time `days` calendar days later (or earlier). Moving by calendar day, not by
 * 24 hours, keeps the same hour when the clocks change: such a day lasts 23 or 25 hours.
 */
function shiftDay(date: Date, days: number, resetTime: string): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return atResetTime(result, resetTime)
}

function earliest(a: Date, b: Date): Date {
  return a < b ? a : b
}

function latest(dates: (Date | null)[]): Date {
  const times = dates.filter((date) => date !== null).map((date) => date.getTime())
  return new Date(Math.max(...times))
}
