import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'

import { getStepsAccess, getStepsSince, requestStepsAccess } from '~/lib/steps.android'

const READ_STEPS = { accessType: 'read', recordType: 'Steps' } as const

describe('steps on Android', () => {
  // by default Health Connect is installed and up to date
  beforeEach(() => {
    // restoreMocks resets the answers, not the call history
    jest.clearAllMocks()
    jest.mocked(getSdkStatus).mockResolvedValue(SdkAvailabilityStatus.SDK_AVAILABLE)
    jest.mocked(initialize).mockResolvedValue(true)
  })

  it('reads the access as granted when the steps permission is granted', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([READ_STEPS])

    expect(await getStepsAccess()).toBe('granted')
  })

  it('reads the access as undetermined when another permission is granted', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([{ accessType: 'write', recordType: 'Steps' }])

    expect(await getStepsAccess()).toBe('undetermined')
  })

  it.each([
    SdkAvailabilityStatus.SDK_UNAVAILABLE,
    SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
  ])('is blocked when Health Connect is not available (status %p)', async (status) => {
    jest.mocked(getSdkStatus).mockResolvedValue(status)

    expect(await getStepsAccess()).toBe('blocked')
    expect(initialize).not.toHaveBeenCalled()
  })

  it('asks for the steps permission and returns granted', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([])
    jest.mocked(requestPermission).mockResolvedValue([READ_STEPS])

    expect(await requestStepsAccess()).toBe('granted')
    expect(requestPermission).toHaveBeenCalledWith([READ_STEPS])
  })

  it('returns blocked after a refusal: Health Connect cannot tell if it may ask again', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([])
    jest.mocked(requestPermission).mockResolvedValue([])

    expect(await requestStepsAccess()).toBe('blocked')
  })

  it('does not ask again when the permission is already granted', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([READ_STEPS])

    expect(await requestStepsAccess()).toBe('granted')
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('returns the total steps between the start and now', async () => {
    jest.mocked(aggregateRecord).mockResolvedValue({ COUNT_TOTAL: 4230, dataOrigins: [] } as never)
    const start = new Date('2026-11-25T00:00:00Z')

    expect(await getStepsSince(start)).toBe(4230)
    expect(aggregateRecord).toHaveBeenCalledWith({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: '2026-11-25T00:00:00.000Z',
        endTime: expect.any(String),
      },
    })
  })

  it('throws when Health Connect is not available', async () => {
    jest.mocked(getSdkStatus).mockResolvedValue(SdkAvailabilityStatus.SDK_UNAVAILABLE)

    await expect(getStepsSince(new Date())).rejects.toThrow('Health Connect is not available')
  })
})
