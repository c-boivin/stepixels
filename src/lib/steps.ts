import { Linking } from 'react-native'

// Step source shared by every screen (ADR-005).
// Metro picks the platform file: `steps.ios.ts` on iOS, `steps.android.ts` on Android.
// This file is the fallback for the other platforms (web): there is no step source there.
// TypeScript reads this file, so the platform files must keep the same exports and signatures.

/**
 * Access to the phone's steps, for the screens to switch on (`docs/conventions.md`):
 * - `undetermined`: never asked yet, explain the benefit then call `requestStepsAccess()`;
 * - `granted`: the steps can be read;
 * - `refused`: just declined, the system can still ask again;
 * - `blocked`: only the settings can allow it. Also returned in the very rare case where the
 *   phone has no step source (Health Connect missing or outdated, no motion sensor): it is built
 *   into Android 14+, our minimum, and every recent iPhone has the sensor, so no separate state.
 */
export type StepsAccess = 'undetermined' | 'granted' | 'refused' | 'blocked'

/** Reads the current access, without asking the user. */
export async function getStepsAccess(): Promise<StepsAccess> {
  return 'blocked'
}

/** Asks the user for the access when the system still can, and returns the result. */
export async function requestStepsAccess(): Promise<StepsAccess> {
  return 'blocked'
}

/**
 * Returns the steps stored by the phone between `start` and now, including the steps
 * walked while the app was closed. Throws when the steps cannot be read (no access).
 */
export async function getStepsSince(start: Date): Promise<number> {
  throw new Error('No step source on this platform')
}

/** Opens the settings where the user can allow the steps, for a `blocked` access. */
export async function openStepsSettings(): Promise<void> {
  await Linking.openSettings()
}
