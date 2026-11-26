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

export interface HomePageData {
  /** The home screen; `null` on a first launch: the user starts with the onboarding. */
  home: {
    /** The images of the home carousel, from the validations saved on the phone. */
    images: HomeCarouselItemParams[]
    /** The steps of the day, the lost steps and the next reset. */
    day: HomeDayParams
  } | null
}

/**
 * The first route (#22): the onboarding the first time, the home screen afterwards.
 * The launch screen stays while the choice is read from the phone.
 */
export default function HomePage() {
  const [refreshing, page, refresh] = useRequest(getHomePage)

  // one read at a time: back after a reset in the background, the app and the countdown both ask
  function refreshOnce() {
    if (!refreshing) refresh()
  }

  // the steps (and their access) are read when the app opens and when it comes back, never live (R12)
  useAppActive(refreshOnce)

  return (
    <Suspense fallback={<Launch />}>
      <FirstScreen page={page} onChange={refreshOnce} />
    </Suspense>
  )
}

function FirstScreen({ page, onChange }: { page: Promise<HomePageData>; onChange: () => void }) {
  const { home } = use(page)

  if (home === null) return <Redirect href="/onboarding/welcome" />

  // a new day starts at the reset time: the steps are read again from it (#30)
  return <Home images={home.images} {...home.day} onDayEnd={onChange} onStepsAccessChange={onChange} />
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
