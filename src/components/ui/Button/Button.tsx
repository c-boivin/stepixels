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
  /** Beige with gray text, and does nothing when pressed (a form not filled yet, or being sent). */
  disabled?: boolean
}

/** The button of the design: full width, 56 high (Figma component "Bouton"), orange or outlined. */
export function Button({ label, value, onPress, accessibilityHint, variant = 'primary', disabled = false }: ButtonProps) {
  const colors = useColors()
  const textColor = disabled ? colors.muted : variant === 'primary' ? colors.onAccent : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        STYLES.button,
        value !== undefined && STYLES.withValue,
        disabled
          ? { backgroundColor: colors.control }
          : variant === 'primary'
            ? { backgroundColor: colors.accent }
            : [STYLES.secondary, { backgroundColor: colors.background, borderColor: colors.text }],
        pressed && STYLES.pressed,
      ]}>
      <Text style={[TYPO.button14, { color: textColor }]}>{label}</Text>
      {value !== undefined && <Text style={[TYPO.button14, { color: textColor }]}>{value}</Text>}
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
