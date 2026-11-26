import AsyncStorage from '@react-native-async-storage/async-storage'

/** Daily reset time used until the user picks one, as in the Supabase profiles table. */
export const DEFAULT_RESET_TIME = '20:00'

/** `HH:MM`, 00:00 to 23:59. */
const RESET_TIME_FORMAT = /^([01]\d|2[0-3]):[0-5]\d$/

const KEYS = {
  onboardingDone: 'stepixels.onboarding_done',
  startedAt: 'stepixels.started_at',
  resetTime: 'stepixels.reset_time',
  communityTotal: 'stepixels.community_total',
  stepsAccessAsked: 'stepixels.steps_access_asked',
  accountEmail: 'stepixels.account_email',
  restorePendingSince: 'stepixels.restore_pending_since',
}

/**
 * The small preferences stored on the phone (ADR-004): AsyncStorage, not encrypted,
 * so never a secret here (the session goes to SecureStore).
 */
export const preferencesRepository = {
  async getOnboardingDone(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.onboardingDone)) === 'true'
  },

  /**
   * Saves whether the onboarding is done. The first time it is done, also saves when, so that
   * the "DOMMAGE" message never counts the steps walked before the user had the app
   * (replaying the introduction later keeps the first date).
   */
  async setOnboardingDone(done: boolean, at = new Date()) {
    await AsyncStorage.setItem(KEYS.onboardingDone, String(done))
    if (done && (await AsyncStorage.getItem(KEYS.startedAt)) === null) {
      await this.setStartedAt(at)
    }
  },

  /** Saves when the onboarding was done, and returns it. */
  async setStartedAt(at: Date): Promise<Date> {
    await AsyncStorage.setItem(KEYS.startedAt, at.toISOString())
    return at
  },

  /** When the onboarding was first done; `null` before, or if the stored value is unreadable. */
  async getStartedAt(): Promise<Date | null> {
    const value = await AsyncStorage.getItem(KEYS.startedAt)
    const date = value === null ? null : new Date(value)

    return date !== null && Number.isFinite(date.getTime()) ? date : null
  },

  /** Reset time, `HH:MM` (00:00 to 23:30, in 30-minute steps); the default if the stored value is unreadable. */
  async getResetTime(): Promise<string> {
    const value = await AsyncStorage.getItem(KEYS.resetTime)

    // a malformed time would give an invalid date, then an error on every load
    return value !== null && RESET_TIME_FORMAT.test(value) ? value : DEFAULT_RESET_TIME
  },

  async setResetTime(time: string) {
    await AsyncStorage.setItem(KEYS.resetTime, time)
  },

  /** Last community total received, shown offline (OQ-7). `null` before the first one, or if the stored value is unreadable. */
  async getCommunityTotal(): Promise<number | null> {
    const value = await AsyncStorage.getItem(KEYS.communityTotal)
    const total = value === null ? NaN : Number(value)

    // the onboarding hides its sentence on null: never show "NaN"
    return Number.isFinite(total) ? total : null
  },

  /** Throws a `RangeError` when `total` is not a finite number. */
  async setCommunityTotal(total: number) {
    if (!Number.isFinite(total)) throw new RangeError(`Community total: ${total}, expected a finite number`)

    await AsyncStorage.setItem(KEYS.communityTotal, String(total))
  },

  /**
   * Whether the app already asked for the steps access. Only Android needs it: Health Connect
   * does not tell whether it was asked before (see `src/lib/steps.android.ts`).
   */
  async getStepsAccessAsked(): Promise<boolean> {
    return (await AsyncStorage.getItem(KEYS.stepsAccessAsked)) === 'true'
  },

  /**
   * E-mail of the account signed in on this phone, kept for when Supabase cannot be reached
   * (Settings offline). Not a secret: the session itself stays in SecureStore.
   */
  async getAccountEmail(): Promise<string | null> {
    return AsyncStorage.getItem(KEYS.accountEmail)
  },

  /** `null` forgets it (sign-out). */
  async setAccountEmail(email: string | null) {
    if (email === null) await AsyncStorage.removeItem(KEYS.accountEmail)
    else await AsyncStorage.setItem(KEYS.accountEmail, email)
  },

  /**
   * When the sign-in whose account progress has not come back yet started (#36): nothing is sent
   * until it does. `null` when no restore is due, or if the stored value is unreadable.
   */
  async getRestorePendingSince(): Promise<Date | null> {
    const value = await AsyncStorage.getItem(KEYS.restorePendingSince)
    const date = value === null ? null : new Date(value)

    return date !== null && Number.isFinite(date.getTime()) ? date : null
  },

  /** `null` once the restore is done, or when the sign-in failed. */
  async setRestorePendingSince(at: Date | null) {
    if (at === null) await AsyncStorage.removeItem(KEYS.restorePendingSince)
    else await AsyncStorage.setItem(KEYS.restorePendingSince, at.toISOString())
  },

  async setStepsAccessAsked(asked: boolean) {
    await AsyncStorage.setItem(KEYS.stepsAccessAsked, String(asked))
  },
}
