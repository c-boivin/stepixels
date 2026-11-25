import AsyncStorage from '@react-native-async-storage/async-storage'

/** Daily reset time used until the user picks one, as in the Supabase profiles table. */
export const DEFAULT_RESET_TIME = '20:00'

const KEYS = {
  onboardingDone: 'stepixels.onboarding_done',
  resetTime: 'stepixels.reset_time',
  communityTotal: 'stepixels.community_total',
}

/**
 * The small preferences stored on the phone (ADR-004): AsyncStorage, not encrypted,
 * so never a secret here (the session goes to SecureStore).
 */
export const preferencesRepository = {
  async getOnboardingDone(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.onboardingDone)) === 'true'
  },

  async setOnboardingDone(done: boolean) {
    await AsyncStorage.setItem(KEYS.onboardingDone, String(done))
  },

  /** Reset time, `HH:MM` (00:00 to 23:30, in 30-minute steps). */
  async getResetTime(): Promise<string> {
    return (await AsyncStorage.getItem(KEYS.resetTime)) ?? DEFAULT_RESET_TIME
  },

  async setResetTime(time: string) {
    await AsyncStorage.setItem(KEYS.resetTime, time)
  },

  /** Last community total received, shown offline (OQ-7). `null` before the first one. */
  async getCommunityTotal(): Promise<number | null> {
    const value = await AsyncStorage.getItem(KEYS.communityTotal)

    return value === null ? null : Number(value)
  },

  async setCommunityTotal(total: number) {
    await AsyncStorage.setItem(KEYS.communityTotal, String(total))
  },
}
