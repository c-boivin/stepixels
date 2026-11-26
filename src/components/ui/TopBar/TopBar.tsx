import { Pressable, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { TYPO, useColors } from '~/styles/theme'

/** The settings gear of the Figma "Barre d'actions" (Icône réglages): cells of 2 × 2 on a 22 × 22 grid. */
const GEAR_PATH =
  'M8 0H14V2H8V0ZM2 2H6V4H2V2ZM8 2H14V4H8V2ZM16 2H20V4H16V2ZM2 4H20V6H2V4ZM4 6H8V8H4V6ZM14 6H18V8H14V6ZM0 8H6V14H0V8ZM16 8H22V14H16V8ZM4 14H8V16H4V14ZM14 14H18V16H14V14ZM2 16H20V18H2V16ZM2 18H6V20H2V18ZM8 18H14V20H8V18ZM16 18H20V20H16V18ZM8 20H14V22H8V20Z'
const GEAR_SIZE = 22

export interface TopBarProps {
  /** Text on the left, in upper case: the onboarding step (`1 / 4`) or `← RETOUR`. */
  title: string
  /** What the screen reader says instead of the title, when the title is a symbol (`Étape 1 sur 4`, `Retour`). */
  accessibilityLabel?: string
  /** Makes the title a button, like `← RETOUR`. */
  onPress?: () => void
  /** The settings gear on the right (home screen): `label` is what the screen reader says (`Réglages`). */
  settings?: { label: string; onPress: () => void }
}

/**
 * The bar at the top of a screen (Figma components "Barre du haut" and "Barre d'actions"): a gray title
 * on the left, as a landmark or a back button, and the settings gear on the right when there is one.
 */
export function TopBar({ title, accessibilityLabel, onPress, settings }: TopBarProps) {
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

      {settings && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={settings.label}
          // 22 + 2 × 11 = 44: the touch target a finger needs, without moving the gear
          hitSlop={11}
          onPress={settings.onPress}
          style={({ pressed }) => pressed && STYLES.pressed}>
          <Svg width={GEAR_SIZE} height={GEAR_SIZE} viewBox={`0 0 ${GEAR_SIZE} ${GEAR_SIZE}`}>
            <Path d={GEAR_PATH} fill={colors.text} />
          </Svg>
        </Pressable>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  bar: {
    height: 42,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // 44 high with the hit slop, as a touch target should be
  button: {
    minHeight: 32,
    justifyContent: 'center',
  },
})
