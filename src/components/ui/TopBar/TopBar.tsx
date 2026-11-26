import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface TopBarProps {
  /** Text on the left, in upper case: the onboarding step (`1 / 4`) or `← RETOUR`. */
  title: string
  /** What the screen reader says instead of the title, when the title is a symbol (`Étape 1 sur 4`, `Retour`). */
  accessibilityLabel?: string
  /** Makes the title a button, like `← RETOUR`. */
  onPress?: () => void
}

/** The bar at the top of a screen (Figma component "Barre du haut"): a gray title on the left, as a landmark or a back button. */
export function TopBar({ title, accessibilityLabel, onPress }: TopBarProps) {
  const colors = useColors()
  const text = <Text style={[TYPO.label11, { color: colors.muted }]}>{title}</Text>

  return (
    <View style={STYLES.bar}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          hitSlop={6}
          onPress={onPress}
          style={({ pressed }) => [STYLES.button, pressed && STYLES.pressed]}>
          {text}
        </Pressable>
      ) : (
        <Text accessibilityLabel={accessibilityLabel} style={[TYPO.label11, { color: colors.muted }]}>
          {title}
        </Text>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  bar: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 44 high with the hit slop, as a touch target should be
  button: {
    minHeight: 32,
    justifyContent: 'center',
  },
})
