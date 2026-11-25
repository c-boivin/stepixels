import { communityTotalAdapter } from '~/data/adapters/community.adapters'

// Intl writes French thousands with a narrow no-break space (U+202F)
const SPACE = ' '

describe('communityTotalAdapter', () => {
  it('formats the total with French thousands separators', () => {
    expect(communityTotalAdapter(1_284_302)).toBe(`1${SPACE}284${SPACE}302`)
  })

  it.each([
    [0, '0'],
    [999, '999'],
    [1_000, `1${SPACE}000`],
  ])('formats %i as "%s"', (total, label) => {
    expect(communityTotalAdapter(total)).toBe(label)
  })

  it('keeps null when no total is known, so that the screen hides its sentence', () => {
    expect(communityTotalAdapter(null)).toBeNull()
  })
})
