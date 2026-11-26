import { formatCountdown, getDayStart, getDayWindows, isWorthShowingLoss } from '~/lib/day'

// the tests run in the Europe/Paris time zone (test/global-setup.ts): dates without an offset are French times
const at = (iso: string) => new Date(iso)

describe('getDayStart', () => {
  it.each([
    ['just before the reset time: the day started yesterday', '2026-11-26T19:59:59', '2026-11-25T20:00:00'],
    ['at the reset time: a new day starts', '2026-11-26T20:00:00', '2026-11-26T20:00:00'],
    ['just after the reset time', '2026-11-26T20:00:01', '2026-11-26T20:00:00'],
    ['after midnight: the day started the evening before', '2026-11-27T00:30:00', '2026-11-26T20:00:00'],
  ])('%s', (_, now, start) => {
    expect(getDayStart('20:00', at(now))).toEqual(at(start))
  })

  it('handles a reset at midnight', () => {
    expect(getDayStart('00:00', at('2026-11-26T23:59:00'))).toEqual(at('2026-11-26T00:00:00'))
    expect(getDayStart('00:00', at('2026-11-27T00:00:00'))).toEqual(at('2026-11-27T00:00:00'))
  })
})

describe('getDayWindows', () => {
  const base = { resetTime: '20:00', lastValidatedAt: null, startedAt: at('2026-11-20T10:00:00') }

  it('counts the steps since the reset time when nothing was validated today', () => {
    const { counter, nextReset } = getDayWindows({ ...base, now: at('2026-11-26T15:00:00') })

    expect(counter).toEqual({ start: at('2026-11-25T20:00:00'), end: at('2026-11-26T15:00:00') })
    expect(nextReset).toEqual(at('2026-11-26T20:00:00'))
  })

  it('counts the steps since the last validation of the day (the remainder is lost)', () => {
    const lastValidatedAt = at('2026-11-26T12:00:00')
    const { counter, lost } = getDayWindows({ ...base, now: at('2026-11-26T15:00:00'), lastValidatedAt })

    expect(counter.start).toEqual(lastValidatedAt)
    // "DOMMAGE" leaves with the first validation of the day
    expect(lost).toBeNull()
  })

  it('starts again from 0 at the reset time: yesterday’s validation does not count', () => {
    const { counter } = getDayWindows({
      ...base,
      now: at('2026-11-26T20:00:05'),
      lastValidatedAt: at('2026-11-26T19:00:00'),
    })

    expect(counter.start).toEqual(at('2026-11-26T20:00:00'))
  })

  it('never starts the counter after now when the last validation is in the future (clock moved back)', () => {
    const now = at('2026-11-26T15:00:00')
    const { counter, lost } = getDayWindows({ ...base, now, lastValidatedAt: at('2026-11-26T18:00:00') })

    expect(counter).toEqual({ start: now, end: now })
    expect(lost).toBeNull()
  })

  it('finds the unvalidated steps of the previous day, after its last validation', () => {
    const { lost } = getDayWindows({
      ...base,
      now: at('2026-11-26T21:00:00'),
      lastValidatedAt: at('2026-11-26T09:00:00'),
    })

    expect(lost).toEqual({ start: at('2026-11-26T09:00:00'), end: at('2026-11-26T20:00:00') })
  })

  it('takes the whole previous day when it had no validation', () => {
    const { lost } = getDayWindows({ ...base, now: at('2026-11-26T15:00:00') })

    expect(lost).toEqual({ start: at('2026-11-24T20:00:00'), end: at('2026-11-25T20:00:00') })
  })

  it('never counts as lost the steps walked before the onboarding', () => {
    const startedAt = at('2026-11-25T15:00:00')
    const { lost } = getDayWindows({ ...base, now: at('2026-11-26T15:00:00'), startedAt })

    expect(lost).toEqual({ start: startedAt, end: at('2026-11-25T20:00:00') })
  })

  it('loses nothing on the first day, or when the start date is unknown', () => {
    const now = at('2026-11-26T15:00:00')

    expect(getDayWindows({ ...base, now, startedAt: at('2026-11-26T10:00:00') }).lost).toBeNull()
    expect(getDayWindows({ ...base, now, startedAt: null }).lost).toBeNull()
  })

  it('lasts 23 hours on the day the clocks go forward, and keeps the reset time', () => {
    // France: 29 March 2026, 02:00 → 03:00
    const { counter, nextReset } = getDayWindows({ ...base, now: at('2026-03-29T12:00:00') })

    expect(counter.start).toEqual(at('2026-03-28T20:00:00'))
    expect(nextReset).toEqual(at('2026-03-29T20:00:00'))
    expect(nextReset.getTime() - counter.start.getTime()).toBe(23 * 3600 * 1000)
  })

  it('lasts 25 hours on the day the clocks go back, and keeps the reset time', () => {
    // France: 25 October 2026, 03:00 → 02:00
    const { counter, nextReset } = getDayWindows({ ...base, now: at('2026-10-25T12:00:00') })

    expect(nextReset).toEqual(at('2026-10-25T20:00:00'))
    expect(nextReset.getTime() - counter.start.getTime()).toBe(25 * 3600 * 1000)
  })
})

describe('isWorthShowingLoss', () => {
  it.each([
    [0, false],
    [99, false],
    [100, true],
    [101, true],
  ])('%p lost steps → %p', (steps, shown) => {
    expect(isWorthShowingLoss(steps)).toBe(shown)
  })
})

describe('formatCountdown', () => {
  const now = at('2026-11-26T13:47:20')

  it('shows hours, minutes and seconds on two digits', () => {
    expect(formatCountdown(at('2026-11-26T20:00:00'), now)).toBe('06:12:40')
  })

  it('reaches 00:00:00 at the reset time, and stays there after', () => {
    expect(formatCountdown(now, now)).toBe('00:00:00')
    expect(formatCountdown(at('2026-11-26T13:47:00'), now)).toBe('00:00:00')
  })

  it('rounds up, so that 00:00:00 only shows at the reset time', () => {
    expect(formatCountdown(new Date(now.getTime() + 400), now)).toBe('00:00:01')
  })

  it('shows 24:00:00 just after the reset', () => {
    expect(formatCountdown(at('2026-11-27T20:00:00'), at('2026-11-26T20:00:00'))).toBe('24:00:00')
  })
})
