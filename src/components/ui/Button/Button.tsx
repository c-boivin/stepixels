import { Pressable, StyleSheet, Text } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface ButtonProps {
  /** Text of the button, already in upper case in `fr.json` (Silkscreen). */
  label: string
  /** Shown on the right, like the arrow of `CONTINUER →`; the label then moves to the left. Not read by the screen reader. */
  value?: string
  onPress?: () => void
  /** Read by the screen reader when the result of the action is not obvious. */
  accessibilityHint?: string
  /** `primary` (default): orange. `secondary`: outlined, on the background (`REVENIR À L’IMAGE EN COURS`). */
  variant?: 'primary' | 'secondary'
}

/** The button of the design: full width, 56 high (Figma component "Bouton"), orange or outlined. */
export function Button({ label, value, onPress, accessibilityHint, variant = 'primary' }: ButtonProps) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [
        STYLES.button,
        value !== undefined && STYLES.withValue,
        variant === 'primary'
          ? { backgroundColor: colors.accent }
          : [STYLES.secondary, { backgroundColor: colors.background, borderColor: colors.text }],
        pressed && STYLES.pressed,
      ]}>
      <Text style={[TYPO.button14, { color: colors.text }]}>{label}</Text>
      {value !== undefined && <Text style={[TYPO.button14, { color: colors.text }]}>{value}</Text>}
    </Pressable>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  button: {
    width: '100%',
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: { borderWidth: 1 },
  withValue: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
})
