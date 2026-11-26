import { settingsAdapter } from '~/data/adapters/settings.adapters'

describe('settingsAdapter', () => {
  it('shows the access as allowed, with nothing to do', () => {
    expect(settingsAdapter({ access: 'granted', resetTime: '20:00', email: null })).toEqual({
      pedometer: 'AUTORISÉ',
      pedometerAction: null,
      resetTime: '20:00',
      email: null,
    })
  })

  it.each([
    ['refused', 'ask'],
    ['undetermined', 'ask'],
    ['blocked', 'settings'],
  ] as const)('shows a %s access as refused, and its row will %s', (access, action) => {
    expect(settingsAdapter({ access, resetTime: '07:30', email: 'camille@exemple.fr' })).toMatchObject({
      pedometer: 'REFUSÉ',
      pedometerAction: action,
    })
  })
})
