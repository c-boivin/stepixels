import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  openHealthConnectSettings,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'

import { getStepsAccess, getStepsBetween, getStepsSince, openStepsSettings, requestStepsAccess } from '~/lib/steps.android'

const READ_STEPS = { accessType: 'read', recordType: 'Steps' } as const

describe('steps on Android', () => {
  beforeEach(async () => {
    // each test starts with no answer and no call from Health Connect, and an empty storage
    // (not resetAllMocks: it would also erase the AsyncStorage mock that the test needs)
    for (const mock of [aggregateRecord, getGrantedPermissions, getSdkStatus, initialize, requestPermission]) {
      jest.mocked(mock).mockReset()
    }
    await AsyncStorage.clear()

    // by default Health Connect is installed and up to date
    jest.mocked(getSdkStatus).mockResolvedValue(SdkAvailabilityStatus.SDK_AVAILABLE)
    jest.mocked(initialize).mockResolvedValue(true)
  })

  it('reads the access as granted when the steps permission is granted', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([READ_STEPS])

    expect(await getStepsAccess()).toBe('granted')
  })

  it('reads the access as undetermined when it was never asked', async () => {
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

  it('remembers a refusal: blocked on the next launch, without asking again', async () => {
    jest.mocked(getGrantedPermissions).mockResolvedValue([])
    jest.mocked(requestPermission).mockResolvedValue([])
    await requestStepsAccess()

    expect(await getStepsAccess()).toBe('blocked')
    expect(await requestStepsAccess()).toBe('blocked')
    expect(requestPermission).toHaveBeenCalledTimes(1)
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

  it('returns the total steps between two dates, for a day already over', async () => {
    jest.mocked(aggregateRecord).mockResolvedValue({ COUNT_TOTAL: 1230, dataOrigins: [] } as never)

    expect(await getStepsBetween(new Date('2026-11-24T19:00:00Z'), new Date('2026-11-25T19:00:00Z'))).toBe(1230)
    expect(aggregateRecord).toHaveBeenCalledWith({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: '2026-11-24T19:00:00.000Z',
        endTime: '2026-11-25T19:00:00.000Z',
      },
    })
  })

  it('throws when Health Connect is not available', async () => {
    jest.mocked(getSdkStatus).mockResolvedValue(SdkAvailabilityStatus.SDK_UNAVAILABLE)

    await expect(getStepsSince(new Date())).rejects.toThrow('Health Connect is not available')
  })

  it('opens the Health Connect settings, where the steps permission lives', async () => {
    await openStepsSettings()

    expect(openHealthConnectSettings).toHaveBeenCalled()
  })
})
