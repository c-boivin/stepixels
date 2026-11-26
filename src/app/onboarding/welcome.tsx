import { Suspense } from 'react'

import { Message } from '~/components/views/Message'
import { OnboardingWelcome, OnboardingWelcomeLoading } from '~/components/views/OnboardingWelcome'

import { useRequest } from '~/hooks/useRequest'

import { getOnboardingWelcomePage } from '~/data/get-onboarding-welcome-page'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'

export interface OnboardingWelcomePageData {
  /** Steps revealed by the community, formatted (`1 284 302`); `null` on a first launch without network. */
  communityTotal: string | null
}

/** Onboarding step 1/4 (#23). */
export default function OnboardingWelcomePage() {
  const [, page] = useRequest(getOnboardingWelcomePage)

  return (
    <Suspense fallback={<OnboardingWelcomeLoading />}>
      <OnboardingWelcome page={page} />
    </Suspense>
  )
}

/** Shown when the screen cannot load, for example when the phone cannot read its storage: "Retry" loads it again. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('common.error.title')}
      description={i18n.t('common.error.description')}
      button={{ label: i18n.t('common.error.button'), onPress: retry }}
    />
  )
}
