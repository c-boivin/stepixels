// import only the Regular weight: the package root would bundle every weight of the font
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular'
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen/400Regular'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useFonts } from 'expo-font'
import { router, Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useState } from 'react'

import { Launch, LAUNCH_MINIMUM_MS } from '~/components/views/Launch'
import { Message } from '~/components/views/Message'

import { useAppActive } from '~/hooks/useAppActive'
import { useReduceMotion } from '~/hooks/useReduceMotion'

import migrations from '~/db/migrations/migrations'
import { db } from '~/lib/db'
import { i18n } from '~/lib/i18n'
import { listenToNotificationTaps, setUpNotifications } from '~/lib/notifications'
import { backupRepository } from '~/repositories/backup.repository'

import type { ErrorBoundaryProps } from 'expo-router'

// keep the native splash screen until the fonts are loaded: the launch screen needs them for its logo
// (called in global scope, as the Expo docs advise)
SplashScreen.preventAutoHideAsync()
// a reminder (#55) that arrives while the app is open shows as a banner too
setUpNotifications()

export default function RootLayout() {
  // the keys are the fontFamily names used in TYPO (src/styles/theme.ts)
  const [fontsLoaded, fontsError] = useFonts({
    Silkscreen: Silkscreen_400Regular,
    DMMono: DMMono_400Regular,
  })
  // the screens read the local database: create or update its tables first (ADR-004)
  const { success: migrated, error: migrationError } = useMigrations(db, migrations)

  // on a font error, show the app anyway with the system fonts rather than a splash screen forever
  const fontsReady = fontsLoaded || fontsError !== null
  // on a cold start, the launch screen stays for one full loop of its loader, so that it is seen;
  // this layout mounts once per launch, so coming back from the background does not wait again
  const reduceMotion = useReduceMotion()
  const [loopShown, setLoopShown] = useState(false)
  const stackShown = fontsReady && migrated && (loopShown || reduceMotion)

  // the offline queue is sent once the local database is ready, then each time the app comes back:
  // the network may be back (ADR-004). A failed send keeps the queue for the next time
  useEffect(() => {
    if (migrated) sendPendingValidations()
  }, [migrated])
  useAppActive(() => {
    if (migrated) sendPendingValidations()
  })

  useEffect(() => {
    if (!fontsReady) return

    SplashScreen.hideAsync()
    const timer = setTimeout(() => setLoopShown(true), LAUNCH_MINIMUM_MS)
    return () => clearTimeout(timer)
  }, [fontsReady])

  // a tap on the reminder (#55) opens the home screen, where the steps are validated: the app may
  // have been left on another screen. Listened once the screens exist, so that there is a place to go;
  // on a cold start, the app opens on the home screen anyway
  useEffect(() => {
    if (!stackShown) return
    return listenToNotificationTaps(() => router.dismissTo('/'))
  }, [stackShown])

  // without its database the app cannot work: the ErrorBoundary below tells the user
  if (migrationError) throw migrationError
  if (!fontsReady) return null
  // our launch screen (#22) while the local database is prepared, and for one loop at least
  // (no wait with "Reduce motion": the loader does not move, there is nothing to see)
  if (!stackShown) return <Launch />

  return <Stack screenOptions={{ headerShown: false }} />
}

/** Sends the validations not sent yet; offline, they simply wait for the next try. */
function sendPendingValidations() {
  backupRepository.sendPending().catch(() => {})
}

/** Shown when the root layout fails, for example when a local database migration fails. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  // the error can happen while the splash screen still hides the app
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <Message
      title={i18n.t('app.error.title')}
      description={i18n.t('app.error.description')}
      button={{ label: i18n.t('app.error.button'), onPress: retry }}
    />
  )
}
