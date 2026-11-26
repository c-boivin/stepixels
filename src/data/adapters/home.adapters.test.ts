import { homeDayAdapter } from '~/data/adapters/home.adapters'

describe('homeDayAdapter', () => {
  const nextReset = new Date('2026-11-26T19:00:00.000Z')

  it('shows the counter without separator and the lost steps with the French one', () => {
    expect(homeDayAdapter({ stepsAccess: 'granted', stepsToValidate: 4230, lostSteps: 1230, nextReset })).toEqual({
      stepsAccess: 'granted',
      counter: '4230',
      // narrow no-break space, as written by Intl in French
      lostSteps: '1 230',
      nextReset,
    })
  })

  it('keeps no lost steps as null', () => {
    expect(homeDayAdapter({ stepsAccess: 'granted', stepsToValidate: 0, lostSteps: null, nextReset }).lostSteps).toBeNull()
  })

  it('shows no counter when the steps cannot be read', () => {
    const day = homeDayAdapter({ stepsAccess: 'blocked', stepsToValidate: null, lostSteps: null, nextReset })

    expect(day.counter).toBeNull()
    expect(day.stepsAccess).toBe('blocked')
  })
})
