// import only the Regular weight: the package root would bundle every weight of the font
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular'
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen/400Regular'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

import migrations from '~/db/migrations/migrations'
import { db } from '~/lib/db'

// keep the splash screen until the fonts and the local database are ready (called in global scope, as the Expo docs advise)
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // the keys are the fontFamily names used in TYPO (src/styles/theme.ts)
  const [fontsLoaded, fontsError] = useFonts({
    Silkscreen: Silkscreen_400Regular,
    DMMono: DMMono_400Regular,
  })
  // the screens read the local database: create or update its tables first (ADR-004)
  const { success: migrated, error: migrationError } = useMigrations(db, migrations)

  // on a font error, show the app anyway with the system fonts rather than a splash screen forever
  const ready = (fontsLoaded || fontsError !== null) && migrated

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  // without its database the app cannot work: let the error show
  if (migrationError) throw migrationError
  if (!ready) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
