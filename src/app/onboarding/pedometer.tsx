import { Suspense } from 'react'

import { Message } from '~/components/views/Message'
import { OnboardingPedometer, OnboardingPedometerLoading } from '~/components/views/OnboardingPedometer'

import { useRequest } from '~/hooks/useRequest'

import { getOnboardingPedometerPage } from '~/data/get-onboarding-pedometer-page'
import { i18n } from '~/lib/i18n'
import { preferencesRepository } from '~/repositories/preferences.repository'

import type { StepsAccess } from '~/lib/steps'
import type { ErrorBoundaryProps } from 'expo-router'

export interface OnboardingPedometerPageData {
  access: StepsAccess
}

/** Onboarding step 4/4 (#26). */
export default function OnboardingPedometerPage() {
  const [, page] = useRequest(getOnboardingPedometerPage)

  return (
    <Suspense fallback={<OnboardingPedometerLoading />}>
      <OnboardingPedometer page={page} readAccess={readAccess} onGranted={onGranted} />
    </Suspense>
  )
}

/** Reads the access again (back from the settings), with the same getter as the first load. */
async function readAccess() {
  return (await getOnboardingPedometerPage()).access
}

/** The onboarding ends when the steps can be read: the next launches open the home screen. */
async function onGranted() {
  await preferencesRepository.setOnboardingDone(true)
}

/** Shown when the access cannot be read or the onboarding cannot be saved: "Retry" loads the screen again. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('common.error.title')}
      description={i18n.t('common.error.description')}
      button={{ label: i18n.t('common.error.button'), onPress: retry }}
    />
  )
}
