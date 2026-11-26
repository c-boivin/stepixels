import { chooseFact, closestLandmark, distanceMeters, factTier, factValue, pickFact } from '~/lib/facts'

/** A `Math.random` that always answers the same number. */
const always = (value: number) => () => value

describe('factTier', () => {
  it.each([
    [0, null],
    [1_999, null],
    [2_000, 0],
    [4_999, 0],
    [5_000, 1],
    [9_999, 1],
    [10_000, 2],
    [19_999, 2],
    [20_000, 3],
    [80_000, 3],
  ])('%i steps → tier %s', (steps, tier) => {
    expect(factTier(steps)).toBe(tier)
  })
})

describe('pickFact', () => {
  it('talks about the Moon 1 time in 20', () => {
    expect(pickFact(0, always(0.04))).toEqual({ landmark: 'moon', kind: 'percent' })
    expect(pickFact(0, always(0.05)).landmark).not.toBe('moon')
  })

  it('picks one of the messages of the tier', () => {
    expect(pickFact(0, always(0.1))).toEqual({ landmark: 'eiffel', kind: 'times' })
    expect(pickFact(3, always(0.99))).toEqual({ landmark: 'earth', kind: 'percent' })
  })
})

describe('factValue', () => {
  it('compares the distance of the day to the landmark (4 230 steps = 3,2 km)', () => {
    const meters = distanceMeters(4_230)

    expect(meters).toBeCloseTo(3_172.5)
    expect(factValue({ landmark: 'eiffel', kind: 'times' }, meters)).toBeCloseTo(9.61, 2)
    expect(factValue({ landmark: 'versailles', kind: 'percent' }, meters)).toBeCloseTo(18.66, 2)
    expect(factValue({ landmark: 'versailles', kind: 'whole' }, meters)).toBeNull()
  })
})

describe('chooseFact', () => {
  const DAY = '2026-11-26T19:00:00.000Z'

  it('gives no message under 2 000 steps', () => {
    expect(chooseFact(1_999, DAY, null)).toBeNull()
  })

  it('keeps the message of the day while the steps stay in the same tier', () => {
    const first = chooseFact(2_500, DAY, null, always(0.1))

    expect(chooseFact(4_000, DAY, first, always(0.9))).toBe(first)
  })

  it('picks a new message in the next tier, or on a new day', () => {
    const first = chooseFact(2_500, DAY, null, always(0.1))

    expect(chooseFact(5_000, DAY, first, always(0.9))?.tier).toBe(1)
    expect(chooseFact(2_500, '2026-11-27T19:00:00.000Z', first, always(0.9))?.fact).toEqual({
      landmark: 'channel',
      kind: 'percent',
    })
  })
})

describe('closestLandmark', () => {
  it('finds the landmark closest to a finished image, and whether it is above it', () => {
    // image 01: 256 cells × 100 steps × 0,75 m = 19,2 km
    expect(closestLandmark(distanceMeters(25_600))).toEqual({ landmark: 'versailles', above: true })
    expect(closestLandmark(16_000)).toEqual({ landmark: 'versailles', above: false })
    expect(closestLandmark(30_000)).toEqual({ landmark: 'channel', above: false })
  })
})
