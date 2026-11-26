import { settingsAdapter } from '~/data/adapters/settings.adapters'
import { getStepsAccess } from '~/lib/steps'
import { authRepository } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

import type { SettingsPageData } from '~/app/settings'

/** Load the settings (#37): pedometer access, reset time and account, all read on the phone. */
export async function getSettingsPage(): Promise<SettingsPageData> {
  const [access, resetTime, email] = await Promise.all([
    getStepsAccess(),
    preferencesRepository.getResetTime(),
    authRepository.getEmail(),
  ])

  return settingsAdapter({ access, resetTime, email })
}
