import { Pedometer } from 'expo-sensors'
import { Linking } from 'react-native'

// type-only import: removed at build time, so Metro never loads `steps.ts` on iOS
import type { StepsAccess } from '~/lib/steps'

// iOS: CoreMotion through the Expo pedometer (ADR-005). Works in Expo Go.
// See `steps.ts` for the documentation of each function.

export async function getStepsAccess(): Promise<StepsAccess> {
  if (!(await Pedometer.isAvailableAsync())) return 'blocked'

  const permission = await Pedometer.getPermissionsAsync()
  if (permission.granted) return 'granted'
  if (!permission.canAskAgain) return 'blocked'
  return permission.status === Pedometer.PermissionStatus.UNDETERMINED ? 'undetermined' : 'refused'
}

export async function requestStepsAccess(): Promise<StepsAccess> {
  const access = await getStepsAccess()
  if (access === 'granted' || access === 'blocked') return access

  const { granted } = await Pedometer.requestPermissionsAsync()
  return granted ? 'granted' : 'refused'
}

export async function getStepsSince(start: Date): Promise<number> {
  // CoreMotion keeps the last 7 days: an older start only returns what is left
  const { steps } = await Pedometer.getStepCountAsync(start, new Date())
  return steps
}

export async function openStepsSettings(): Promise<void> {
  // the app's page in the iOS settings, where "Motion & Fitness" can be turned on
  await Linking.openSettings()
}
