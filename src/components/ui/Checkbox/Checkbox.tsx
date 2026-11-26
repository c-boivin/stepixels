import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface CheckboxProps {
  /** Text on the right, also read by the screen reader. */
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A checkbox of the design (Figma "Case"): an 18-point square, orange with a small cream square when checked. */
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  const colors = useColors()

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={({ pressed }) => [STYLES.row, pressed && STYLES.pressed]}>
      <View
        style={[
          STYLES.box,
          checked ? { backgroundColor: colors.accent, borderColor: colors.accent } : { backgroundColor: colors.background, borderColor: colors.text },
        ]}>
        {checked && <View style={[STYLES.mark, { backgroundColor: colors.background }]} />}
      </View>
      <Text style={[TYPO.small13, STYLES.label, { color: colors.text }]}>{label}</Text>
    </Pressable>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  // at least 44 high, as a touch target should be
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  box: { width: 18, height: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 6, height: 6 },
  label: { flex: 1 },
})
