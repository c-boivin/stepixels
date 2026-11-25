import AsyncStorage from '@react-native-async-storage/async-storage'

import { DEFAULT_RESET_TIME, preferencesRepository } from './preferences.repository'

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
})
