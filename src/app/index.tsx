import { Redirect } from 'expo-router'
import { Suspense, use } from 'react'

import { Home, type HomeDayParams } from '~/components/views/Home'
import { Launch } from '~/components/views/Launch'
import { Message } from '~/components/views/Message'

import { useAppActive } from '~/hooks/useAppActive'
import { useRequest } from '~/hooks/useRequest'

import { getHomePage } from '~/data/get-home-page'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'
import type { HomeCarouselItemParams } from '~/components/views/Home/HomeCarousel'

/** `onboardingDone` is `false` on a first launch: the user starts with the onboarding. */
export type HomePageData =
  | { onboardingDone: false }
  | {
      onboardingDone: true
      /** The images of the home carousel, from the validations saved on the phone. */
      images: HomeCarouselItemParams[]
      /** The steps of the day, the lost steps and the next reset. */
      day: HomeDayParams
    }

/**
 * The first route (#22): the onboarding the first time, the home screen afterwards.
 * The launch screen stays while the choice is read from the phone.
 */
export default function HomePage() {
  const [, page, refresh] = useRequest(getHomePage)

  // the steps are read when the app opens and when it comes back, never live (R12)
  useAppActive(refresh)

  return (
    <Suspense fallback={<Launch />}>
      <FirstScreen page={page} onDayEnd={refresh} />
    </Suspense>
  )
}

function FirstScreen({ page, onDayEnd }: { page: Promise<HomePageData>; onDayEnd: () => void }) {
  const data = use(page)

  if (!data.onboardingDone) return <Redirect href="/onboarding/welcome" />

  // a new day starts at the reset time: the steps are read again from it (#30)
  return <Home images={data.images} {...data.day} onDayEnd={onDayEnd} />
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
