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
  })

  it('reads back what was saved', async () => {
    await preferencesRepository.setOnboardingDone(true)
    await preferencesRepository.setResetTime('07:30')
    await preferencesRepository.setCommunityTotal(1_250_000)

    expect(await preferencesRepository.getOnboardingDone()).toBe(true)
    expect(await preferencesRepository.getResetTime()).toBe('07:30')
    expect(await preferencesRepository.getCommunityTotal()).toBe(1_250_000)
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
