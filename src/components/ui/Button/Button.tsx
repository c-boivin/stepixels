import { Pressable, StyleSheet, Text } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface ButtonProps {
  /** Text of the button, already in upper case in `fr.json` (Silkscreen). */
  label: string
  onPress?: () => void
  /** Read by the screen reader when the result of the action is not obvious. */
  accessibilityHint?: string
}

/** The primary button of the design: orange, full width, 56 high (Figma component "Bouton", type Primaire). */
export function Button({ label, onPress, accessibilityHint }: ButtonProps) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [STYLES.button, { backgroundColor: colors.accent }, pressed && STYLES.pressed]}>
      <Text style={[TYPO.button14, { color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  button: {
    width: '100%',
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
