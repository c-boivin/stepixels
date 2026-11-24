// import only the Regular weight: the package root would bundle every weight of the font
import { DMMono_400Regular } from '@expo-google-fonts/dm-mono/400Regular'
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen/400Regular'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'

// keep the splash screen until the fonts are ready (called in global scope, as the Expo docs advise)
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // the keys are the fontFamily names used in TYPO (src/styles/theme.ts)
  const [loaded, error] = useFonts({
    Silkscreen: Silkscreen_400Regular,
    DMMono: DMMono_400Regular,
  })

  // on error, show the app anyway with the system fonts rather than a splash screen forever
  const ready = loaded || error !== null

  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  if (!ready) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
