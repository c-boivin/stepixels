import AsyncStorage from '@react-native-async-storage/async-storage'

import { DEFAULT_RESET_TIME, preferencesRepository } from '~/repositories/preferences.repository'

describe('preferencesRepository', () => {
  // each test starts from an empty storage
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('returns the defaults on a first launch', async () => {
    expect(await preferencesRepository.getOnboardingDone()).toBe(false)
    expect(await preferencesRepository.getResetTime()).toBe(DEFAULT_RESET_TIME)
    expect(await preferencesRepository.getCommunityTotal()).toBeNull()
    expect(await preferencesRepository.getStepsAccessAsked()).toBe(false)
    expect(await preferencesRepository.getStartedAt()).toBeNull()
  })

  it('reads back what was saved', async () => {
    await preferencesRepository.setOnboardingDone(true)
    await preferencesRepository.setResetTime('07:30')
    await preferencesRepository.setCommunityTotal(1_250_000)
    await preferencesRepository.setStepsAccessAsked(true)

    expect(await preferencesRepository.getOnboardingDone()).toBe(true)
    expect(await preferencesRepository.getResetTime()).toBe('07:30')
    expect(await preferencesRepository.getCommunityTotal()).toBe(1_250_000)
    expect(await preferencesRepository.getStepsAccessAsked()).toBe(true)
  })

  it('remembers when the onboarding was first done, even when the introduction is replayed', async () => {
    await preferencesRepository.setOnboardingDone(true, new Date('2026-11-25T15:00:00.000Z'))
    await preferencesRepository.setOnboardingDone(true, new Date('2026-11-28T09:00:00.000Z'))

    expect(await preferencesRepository.getStartedAt()).toEqual(new Date('2026-11-25T15:00:00.000Z'))
  })

  it('returns no start date when the stored value is not a date', async () => {
    await AsyncStorage.setItem('stepixels.started_at', 'abc')

    expect(await preferencesRepository.getStartedAt()).toBeNull()
  })

  it('returns no community total when the stored value is not a number', async () => {
    await AsyncStorage.setItem('stepixels.community_total', 'abc')

    expect(await preferencesRepository.getCommunityTotal()).toBeNull()
  })

  it.each([NaN, Infinity])('refuses to save %p as the community total', async (total) => {
    await expect(preferencesRepository.setCommunityTotal(total)).rejects.toThrow(RangeError)
    expect(await preferencesRepository.getCommunityTotal()).toBeNull()
  })
})
