import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Picto } from '~/components/ui/Picto'

import { TYPO, useColors } from '~/styles/theme'

/** Height of the bar in the design. */
const BAR_HEIGHT = 42
/** Touch target of the gear: 44 × 44 around the 22 × 22 picto. */
const GEAR_TARGET = 44
/**
 * The target goes 11 beyond the bar on the right, and 1 above and below (bar 42 high), so that the gear
 * stays where the design puts it. The bar takes this room itself: on Android, a touch outside the
 * parent's bounds is lost, and `hitSlop` cannot reach past them.
 */
const GEAR_OVERFLOW = (GEAR_TARGET - 22) / 2

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
    <View style={[STYLES.bar, settings && STYLES.withSettings]}>
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
        // Expo Go's own button is also read `Réglages`: Maestro finds this one by its testID
        <Pressable
          testID="settings-button"
          accessibilityRole="button"
          accessibilityLabel={settings.label}
          onPress={settings.onPress}
          style={({ pressed }) => [STYLES.gear, pressed && STYLES.pressed]}>
          <Picto name="settings" color={colors.text} />
        </Pressable>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  bar: {
    height: BAR_HEIGHT,
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // the bar holds the whole target of the gear, but takes the same room as without it (GEAR_OVERFLOW)
  withSettings: {
    height: GEAR_TARGET,
    marginVertical: -(GEAR_TARGET - BAR_HEIGHT) / 2,
    marginRight: -GEAR_OVERFLOW,
  },
  gear: {
    width: GEAR_TARGET,
    height: GEAR_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 44 high with the hit slop, as a touch target should be
  button: {
    minHeight: 32,
    justifyContent: 'center',
  },
})
