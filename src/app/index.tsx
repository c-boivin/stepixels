import { Redirect } from 'expo-router'
import { Suspense, use } from 'react'
import { View } from 'react-native'

import { Launch } from '~/components/views/Launch'
import { Message } from '~/components/views/Message'

import { useRequest } from '~/hooks/useRequest'

import { getHomePage } from '~/data/get-home-page'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'

export interface HomePageData {
  /** `false` on a first launch: the user starts with the onboarding. */
  onboardingDone: boolean
}

/**
 * The first route (#22): the onboarding the first time, the home screen afterwards.
 * The launch screen stays while the choice is read from the phone.
 */
export default function HomePage() {
  const [, page] = useRequest(getHomePage)

  return (
    <Suspense fallback={<Launch />}>
      <FirstScreen page={page} />
    </Suspense>
  )
}

function FirstScreen({ page }: { page: Promise<HomePageData> }) {
  const { onboardingDone } = use(page)

  if (!onboardingDone) return <Redirect href="/onboarding/welcome" />

  // the home screen comes with #27
  return <View testID="home" />
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Message
      title={i18n.t('common.error.title')}
      description={i18n.t('common.error.description')}
      button={{ label: i18n.t('common.error.button'), onPress: retry }}
    />
  )
}
