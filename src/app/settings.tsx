import { useFocusEffect, useRouter } from 'expo-router'
import { Suspense, useCallback, useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { Message } from '~/components/views/Message'
import { Settings, SettingsLoading } from '~/components/views/Settings'

import { useRequest } from '~/hooks/useRequest'

import { getSettingsPage } from '~/data/get-settings-page'
import { i18n } from '~/lib/i18n'
import { openStepsSettings, requestStepsAccess } from '~/lib/steps'

import type { SettingsParams } from '~/components/views/Settings'
import type { ErrorBoundaryProps } from 'expo-router'

export interface SettingsPageData {
  /** `AUTORISÉ` or `REFUSÉ` */
  pedometer: string
  pedometerAction: SettingsParams['pedometerAction']
  /** `HH:MM` */
  resetTime: string
  /** `null` for a guest. */
  email: string | null
}

/** Settings (#37), opened from the gear of the home screen (#27). */
export default function SettingsPage() {
  const router = useRouter()
  const [, page, refresh] = useRequest(getSettingsPage)
  const firstFocus = useRef(true)

  // back from the account screens: the user may now be signed in
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false
        return
      }
      refresh()
    }, [refresh]),
  )

  // back from the phone's settings: the pedometer access may have changed
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [refresh])

  async function onPedometerPress(action: 'ask' | 'settings') {
    if (action === 'settings') {
      await openStepsSettings()
      return
    }
    // the system dialog sends the app to the background and back: the AppState refresh reads the answer,
    // and this one covers a phone that answers without leaving the app
    await requestStepsAccess()
    refresh()
  }

  function onBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/')
  }

  return (
    <Suspense fallback={<SettingsLoading onBack={onBack} />}>
      <Settings
        page={page}
        onBack={onBack}
        onPedometerPress={onPedometerPress}
        onSignUp={() => router.push('/account/sign-up')}
        onSignIn={() => router.push('/account/sign-in')}
      />
    </Suspense>
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
