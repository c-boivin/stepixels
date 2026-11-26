import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'

import { Message } from '~/components/views/Message'
import { OnboardingTime } from '~/components/views/OnboardingTime'

import { i18n } from '~/lib/i18n'
import { preferencesRepository } from '~/repositories/preferences.repository'

import type { ErrorBoundaryProps } from 'expo-router'

/**
 * Onboarding step 3/4 (#25): nothing to load, the wheel starts on 20:00.
 * Pre-filling it with a saved time comes with "replay the introduction" (#42, OQ-21).
 */
export default function OnboardingTimePage() {
  const router = useRouter()
  // an error while saving goes to the ErrorBoundary below (wrapped: the reason itself can be empty)
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  // a second tap while the time is saved would save twice and open 4/4 twice
  const saving = useRef(false)

  if (failure) throw failure.error

  async function onContinue(time: string) {
    if (saving.current) return

    saving.current = true
    try {
      await preferencesRepository.setResetTime(time)
      router.push('/onboarding/pedometer')
    } catch (error) {
      setFailure({ error })
    } finally {
      saving.current = false
    }
  }

  return <OnboardingTime onContinue={onContinue} />
}

/** Shown when the time cannot be saved on the phone: "Retry" shows the wheel again. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('common.error.title')}
      description={i18n.t('common.error.description')}
      button={{ label: i18n.t('common.error.button'), onPress: retry }}
    />
  )
}
