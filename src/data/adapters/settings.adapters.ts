import { i18n } from '~/lib/i18n'

import type { SettingsParams } from '~/components/views/Settings'
import type { StepsAccess } from '~/lib/steps'

export interface SettingsRaw {
  access: StepsAccess
  /** `HH:MM` */
  resetTime: string
  /** `null` for a guest. */
  email: string | null
}

/**
 * The settings, ready to display: the pedometer access in words, and what its row does
 * (course slides 76–79, permissions): ask again when the phone still can, otherwise open its settings.
 */
export function settingsAdapter({ access, resetTime, email }: SettingsRaw): SettingsParams {
  const granted = access === 'granted'

  return {
    pedometer: i18n.t(granted ? 'settings.pedometer.granted' : 'settings.pedometer.refused'),
    pedometerAction: granted ? null : access === 'blocked' ? 'settings' : 'ask',
    resetTime,
    email,
  }
}
