import { formatDistance, homeDayAdapter, homeRevealAdapter } from '~/data/adapters/home.adapters'

// Intl writes French thousands with a narrow no-break space (U+202F)
const SPACE = ' '

describe('homeDayAdapter', () => {
  const nextReset = new Date('2026-11-26T19:00:00.000Z')

  it('shows the counter without separator, and the steps of the button with the French one', () => {
    expect(homeDayAdapter({ stepsAccess: 'granted', stepsToValidate: 4230, message: null, nextReset })).toEqual({
      stepsAccess: 'granted',
      counter: '4230',
      message: null,
      validateValue: `4${SPACE}230 PAS`,
      nextReset,
    })
  })

  it('shows no counter when the steps cannot be read', () => {
    const day = homeDayAdapter({ stepsAccess: 'blocked', stepsToValidate: null, message: null, nextReset })

    expect(day.counter).toBeNull()
    expect(day.stepsAccess).toBe('blocked')
    expect(day.validateValue).toBe('0 PAS')
  })

  it.each([
    [{ kind: 'lost', steps: 1230 } as const, 'DOMMAGE', `Hier, 1${SPACE}230 pas n’ont pas été validés.`],
    [{ kind: 'validated', steps: 4200 } as const, 'VALIDÉ', `+4${SPACE}200 pas validés. Reviens quand tu veux.`],
    [{ kind: 'new_image', number: 2 } as const, 'NOUVELLE IMAGE', 'L’image 02 est débloquée. À toi de la révéler.'],
    [
      { kind: 'finished', textKey: 'images.mushroom', steps: 25_600 } as const,
      'IMAGE TERMINÉE',
      'Le champignon est complet. 19 km de marche, bravo !',
    ],
  ])('writes the message %o', (message, title, description) => {
    expect(homeDayAdapter({ stepsAccess: 'granted', stepsToValidate: 0, message, nextReset }).message).toEqual({
      title,
      description,
    })
  })
})

describe('homeRevealAdapter', () => {
  it.each([
    [1, '+1 PIXEL'],
    [42, '+42 PIXELS'],
  ])('writes %i pixels as %p', (pixels, label) => {
    const reveal = { imageNumber: 1, steps: 4230, pixels, revealedFrom: 0, revealedTo: pixels, finished: null }

    expect(homeRevealAdapter(reveal).pixels).toBe(label)
  })
})

describe('formatDistance', () => {
  it.each([
    [100, '0,1 km'],
    [4230, '3,2 km'],
    // 9.975 km rounds up to 10: no decimal from there
    [13_300, '10 km'],
    [25_600, '19 km'],
  ])('turns %i steps into %p (0.75 m a step, one decimal under 10 km)', (steps, distance) => {
    expect(formatDistance(steps)).toBe(distance)
  })
})
