import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'

import { preferencesRepository } from '~/repositories/preferences.repository'

// type-only import: removed at build time, so Metro never loads `steps.ts` on Android
import type { StepsAccess } from '~/lib/steps'

// Android: Health Connect (ADR-005). Needs a development build, not Expo Go.
// This is the only file that imports react-native-health-connect.
// See `steps.ts` for the documentation of each function.

const READ_STEPS = { accessType: 'read', recordType: 'Steps' } as const

export async function getStepsAccess(): Promise<StepsAccess> {
  if (!(await connect())) return 'blocked'
  if (hasReadSteps(await getGrantedPermissions())) return 'granted'

  // Health Connect does not tell whether it was asked before, so we remember it ourselves
  return (await preferencesRepository.getStepsAccessAsked()) ? 'blocked' : 'undetermined'
}

export async function requestStepsAccess(): Promise<StepsAccess> {
  const access = await getStepsAccess()
  if (access !== 'undetermined') return access

  const permissions = await requestPermission([READ_STEPS])
  await preferencesRepository.setStepsAccessAsked(true)

  // Health Connect has no "can ask again": after two refusals it stops showing its dialog
  // without telling us. So a refusal is `blocked`: the Health Connect settings always work.
  return hasReadSteps(permissions) ? 'granted' : 'blocked'
}

export async function getStepsSince(start: Date): Promise<number> {
  if (!(await connect())) throw new Error('Health Connect is not available')

  // the aggregate removes duplicates between the apps that write steps (Samsung Health…),
  // so the total matches the phone's health app
  const result = await aggregateRecord({
    recordType: 'Steps',
    timeRangeFilter: {
      operator: 'between',
      startTime: start.toISOString(),
      endTime: new Date().toISOString(),
    },
  })
  return result.COUNT_TOTAL
}

/**
 * Initializes Health Connect, which must be done before any other call.
 * Returns false when Health Connect is missing or must be updated on the phone.
 */
async function connect(): Promise<boolean> {
  const status = await getSdkStatus()
  return status === SdkAvailabilityStatus.SDK_AVAILABLE && initialize()
}

function hasReadSteps(permissions: { accessType: string; recordType: string }[]): boolean {
  return permissions.some(
    (permission) =>
      permission.accessType === READ_STEPS.accessType &&
      permission.recordType === READ_STEPS.recordType,
  )
}
