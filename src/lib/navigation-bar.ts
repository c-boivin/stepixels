import { NavigationBar } from 'expo-navigation-bar'
import { Platform } from 'react-native'

import type { ColorSchemeName } from 'react-native'

/**
 * Matches the Android navigation bar buttons to the theme: dark buttons on the cream background,
 * light buttons on the dark one. The app background shows behind them (`enforceContrast` false
 * in app.json). iOS has no navigation bar: nothing to do.
 */
export function matchNavigationBarToTheme(scheme: ColorSchemeName | null) {
  if (Platform.OS !== 'android') return

  // in expo-navigation-bar, `dark` means dark buttons (for a light background)
  NavigationBar.setStyle(scheme === 'dark' ? 'light' : 'dark')
}
