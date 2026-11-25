// import only the Regular weight: the package root would bundle every weight of the font
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular'
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen/400Regular'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import migrations from '~/db/migrations/migrations'
import { db } from '~/lib/db'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'

import { TYPO, useColors } from '~/styles/theme'

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

  // without its database the app cannot work: the ErrorBoundary below tells the user
  if (migrationError) throw migrationError
  if (!ready) return null

  return <Stack screenOptions={{ headerShown: false }} />
}

/** Shown when the root layout fails, for example when a local database migration fails. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const colors = useColors()

  // the error can happen while the splash screen still hides the app
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <View style={[STYLES.error, { backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
        {i18n.t('app.error.title')}
      </Text>
      <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>{i18n.t('app.error.description')}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={({ pressed }) => [STYLES.button, { backgroundColor: colors.accent }, pressed && STYLES.pressed]}>
        <Text style={[TYPO.button14, { color: colors.surface }]}>{i18n.t('app.error.button')}</Text>
      </Pressable>
    </View>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  text: { textAlign: 'center' },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
})
