import { RESET_TIMES } from '~/lib/rules'

describe('reset times (R4)', () => {
  it('goes from 00:00 to 23:30, every 30 minutes', () => {
    expect(RESET_TIMES).toHaveLength(48)
    expect(RESET_TIMES[0]).toBe('00:00')
    expect(RESET_TIMES[1]).toBe('00:30')
    expect(RESET_TIMES.at(-1)).toBe('23:30')
  })

  it('writes the hours with two digits', () => {
    expect(RESET_TIMES).toContain('09:30')
    expect(RESET_TIMES).toContain('20:00')
  })
})
