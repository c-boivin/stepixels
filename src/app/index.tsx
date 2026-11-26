import { Redirect } from 'expo-router'
import { Suspense, use } from 'react'

import { Home } from '~/components/views/Home'
import { Launch } from '~/components/views/Launch'
import { Message } from '~/components/views/Message'

import { useRequest } from '~/hooks/useRequest'

import { getHomePage } from '~/data/get-home-page'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'
import type { HomeCarouselItemParams } from '~/components/views/Home/HomeCarousel'

export interface HomePageData {
  /** `false` on a first launch: the user starts with the onboarding. */
  onboardingDone: boolean
  /** The images of the home carousel, from the validations saved on the phone. */
  images: HomeCarouselItemParams[]
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
  const { onboardingDone, images } = use(page)

  if (!onboardingDone) return <Redirect href="/onboarding/welcome" />

  return <Home images={images} />
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
