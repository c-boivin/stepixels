import { StyleSheet, Text, View } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface TopBarProps {
  /** Text on the left, in upper case: the onboarding step (`1 / 4`). */
  title: string
  /** What the screen reader says instead of the title, when the title is a symbol (`Étape 1 sur 4`). */
  accessibilityLabel?: string
}

/** The bar at the top of a screen (Figma component "Barre du haut"): a gray title on the left, as a landmark. */
export function TopBar({ title, accessibilityLabel }: TopBarProps) {
  const colors = useColors()

  return (
    <View style={STYLES.bar}>
      <Text accessibilityLabel={accessibilityLabel} style={[TYPO.label11, { color: colors.muted }]}>
        {title}
      </Text>
    </View>
  )
}

const STYLES = StyleSheet.create({
  bar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
