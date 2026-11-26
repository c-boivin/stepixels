import { Redirect, useRouter } from 'expo-router'
import { Suspense, use, useState } from 'react'

import { Home, type HomeDayParams, type HomeRevealParams } from '~/components/views/Home'
import { Launch } from '~/components/views/Launch'
import { Message } from '~/components/views/Message'

import { useAppActive } from '~/hooks/useAppActive'
import { useRequest } from '~/hooks/useRequest'

import { getHomePage } from '~/data/get-home-page'
import { i18n } from '~/lib/i18n'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { ErrorBoundaryProps } from 'expo-router'
import type { HomeCarouselItemParams } from '~/components/views/Home/HomeCarousel'
import type { ProgressValidation } from '~/lib/progress'

export interface HomePageData {
  /** The home screen; `null` on a first launch: the user starts with the onboarding. */
  home: {
    /** The images of the home carousel, from the validations saved on the phone. */
    images: HomeCarouselItemParams[]
    /** The steps of the day, the message above the carousel and the next reset. */
    day: HomeDayParams
    /** What `VALIDER` saves (#29); `null` when there is nothing to validate (under 100 steps, no steps access, image waiting for `SUIVANT`). */
    validation: {
      /** One row per image the pixels go to. */
      parts: ProgressValidation[]
      /** Time of the validation: when the steps were read, so that no step walked since is lost. */
      readAt: Date
      reveal: HomeRevealParams
    } | null
    /** Number of the image `SUIVANT` unlocks, when the image being revealed is finished (#31); `null` otherwise. */
    unlock: number | null
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
  const router = useRouter()
  // an error while saving goes to the ErrorBoundary below (wrapped: the reason itself can be empty)
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)

  if (failure) throw failure.error
  if (home === null) return <Redirect href="/onboarding/welcome" />

  const { validation } = home

  // saved before the animation starts: closing the app during it keeps the pixels (#29)
  function onValidate(): boolean {
    if (validation === null) return false

    try {
      validationsRepository.add(validation.parts, validation.readAt)
    } catch (error) {
      setFailure({ error })
      return false
    }
    // read again at once: the counter, the images and the message change under the animation
    onChange()
    return true
  }

  function onUnlock(number: number) {
    preferencesRepository.unlockImage(number).then(onChange, (error: unknown) => setFailure({ error }))
  }

  // a new day starts at the reset time: the steps are read again from it (#30)
  return (
    <Home
      images={home.images}
      {...home.day}
      reveal={validation?.reveal ?? null}
      unlock={home.unlock}
      onValidate={onValidate}
      onUnlock={onUnlock}
      onDayEnd={onChange}
      onStepsAccessChange={onChange}
      // the gear of the top bar (#65) opens the settings (#37)
      onSettingsPress={() => router.push('/settings')}
    />
  )
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
