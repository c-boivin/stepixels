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

  it('saves a start date for an install that finished the onboarding before it existed', async () => {
    const at = new Date('2026-11-26T15:00:00.000Z')

    expect(await preferencesRepository.setStartedAt(at)).toEqual(at)
    expect(await preferencesRepository.getStartedAt()).toEqual(at)
  })

  it.each(['abc', '25:00', '20:60', '8:00', ''])('returns the default reset time when the stored value is %p', async (value) => {
    await AsyncStorage.setItem('stepixels.reset_time', value)

    expect(await preferencesRepository.getResetTime()).toBe(DEFAULT_RESET_TIME)
  })

  it('returns no community total when the stored value is not a number', async () => {
    await AsyncStorage.setItem('stepixels.community_total', 'abc')

    expect(await preferencesRepository.getCommunityTotal()).toBeNull()
  })

  it.each([NaN, Infinity])('refuses to save %p as the community total', async (total) => {
    await expect(preferencesRepository.setCommunityTotal(total)).rejects.toThrow(RangeError)
    expect(await preferencesRepository.getCommunityTotal()).toBeNull()
  })

  it('unlocks only the first image on a first launch', async () => {
    expect(await preferencesRepository.getUnlockedImage()).toEqual({ number: 1, unlockedAt: null })
  })

  it('remembers the unlocked image and when, and never goes back', async () => {
    await preferencesRepository.unlockImage(2, new Date('2026-11-26T18:00:00.000Z'))
    // a second tap on SUIVANT, or an older image: nothing changes
    await preferencesRepository.unlockImage(2, new Date('2026-11-26T18:00:05.000Z'))
    await preferencesRepository.unlockImage(1)

    expect(await preferencesRepository.getUnlockedImage()).toEqual({
      number: 2,
      unlockedAt: new Date('2026-11-26T18:00:00.000Z'),
    })
  })

  it('says an image is saved only when the account unlocked it (#35)', async () => {
    await preferencesRepository.unlockImage(2)
    // the sign-in screen opened again with the same image: it was already unlocked
    await preferencesRepository.unlockSavedImage(2)
    expect(await preferencesRepository.getSavedImage()).toBeNull()

    await preferencesRepository.unlockSavedImage(3)
    expect(await preferencesRepository.getSavedImage()).toBe(3)
  })

  it('falls back to the first image when the stored value is unreadable', async () => {
    await AsyncStorage.setItem('stepixels.unlocked_image', 'abc')

    expect(await preferencesRepository.getUnlockedImage()).toEqual({ number: 1, unlockedAt: null })
  })
})

