import { Pedometer } from 'expo-sensors'

import { getStepsAccess, getStepsSince, requestStepsAccess } from '~/lib/steps.ios'

type PermissionResponse = Pedometer.PermissionResponse

const { DENIED, GRANTED, UNDETERMINED } = Pedometer.PermissionStatus

/** What iOS answers about the motion permission. */
function permission(response: Partial<PermissionResponse>): PermissionResponse {
  return {
    status: UNDETERMINED,
    granted: false,
    canAskAgain: true,
    expires: 'never',
    ...response,
  } as PermissionResponse
}

describe('steps on iOS', () => {
  beforeEach(() => {
    // restoreMocks resets the answers, not the call history
    jest.clearAllMocks()
    jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(true)
  })

  it.each([
    ['granted', permission({ status: GRANTED, granted: true })],
    ['undetermined', permission({ status: UNDETERMINED })],
    ['refused', permission({ status: DENIED, canAskAgain: true })],
    ['blocked', permission({ status: DENIED, canAskAgain: false })],
  ])('reads the access as %s', async (access, response) => {
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(response)

    expect(await getStepsAccess()).toBe(access)
  })

  it('is blocked when the phone has no motion sensor', async () => {
    jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(false)

    expect(await getStepsAccess()).toBe('blocked')
  })

  it('asks for the access when it was never asked', async () => {
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(permission({}))
    jest
      .mocked(Pedometer.requestPermissionsAsync)
      .mockResolvedValue(permission({ status: GRANTED, granted: true }))

    expect(await requestStepsAccess()).toBe('granted')
  })

  it('returns refused when the user declines', async () => {
    jest.mocked(Pedometer.getPermissionsAsync).mockResolvedValue(permission({}))
    jest
      .mocked(Pedometer.requestPermissionsAsync)
      .mockResolvedValue(permission({ status: DENIED }))

    expect(await requestStepsAccess()).toBe('refused')
  })

  it('does not ask when only the settings can allow it', async () => {
    jest
      .mocked(Pedometer.getPermissionsAsync)
      .mockResolvedValue(permission({ status: DENIED, canAskAgain: false }))

    expect(await requestStepsAccess()).toBe('blocked')
    expect(Pedometer.requestPermissionsAsync).not.toHaveBeenCalled()
  })

  it('returns the steps stored by the phone between the start and now', async () => {
    jest.mocked(Pedometer.getStepCountAsync).mockResolvedValue({ steps: 4230 })
    const start = new Date('2026-11-25T00:00:00')

    expect(await getStepsSince(start)).toBe(4230)
    expect(Pedometer.getStepCountAsync).toHaveBeenCalledWith(start, expect.any(Date))
  })
})
