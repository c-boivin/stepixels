import { StyleSheet, Text, View } from 'react-native'

import { LOADER_CELLS, LOADER_STEP_MS, PixelLoader } from '~/components/ui/PixelLoader'

import { i18n } from '~/lib/i18n'

import { TYPO, useColors } from '~/styles/theme'

/** On a cold start, the launch screen stays at least this long: one full loop of the loader (≈ 1.4 s). */
export const LAUNCH_MINIMUM_MS = LOADER_CELLS * LOADER_STEP_MS

/**
 * The launch screen (#22, Figma "Système / Chargement"): the animated pixel loader and the logo,
 * while the app prepares its data. Read as one "loading" label by the screen reader.
 */
export function Launch() {
  const colors = useColors()

  return (
    <View
      accessible
      accessibilityLabel={i18n.t('launch.loading')}
      accessibilityState={{ busy: true }}
      style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <PixelLoader />
      <Text style={[TYPO.logo32, { color: colors.accent }]}>{i18n.t('launch.logo')}</Text>
    </View>
  )
}

const STYLES = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
  },
})
