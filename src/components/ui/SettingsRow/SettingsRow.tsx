import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface SettingsRowProps {
  /** On the left: `Accès podomètre`. */
  label: string
  /** On the right: `AUTORISÉ`, `20:00`, `→`, or the account's e-mail. */
  value: string
  /**
   * - `default`: the value in pixel letters;
   * - `highlight`: the value in orange (`AUTORISÉ`);
   * - `quiet`: the value small and gray (the account's e-mail);
   * - `danger`: label and value in orange (`Supprimer mon compte`).
   */
  tone?: 'default' | 'highlight' | 'quiet' | 'danger'
  /** Without it, the row is only read, not pressed. */
  onPress?: () => void
  /** Read by the screen reader instead of the label alone, when the value matters (`Accès podomètre, AUTORISÉ`). */
  accessibilityLabel?: string
  /** Read by the screen reader when the result of the press is not obvious. */
  accessibilityHint?: string
}

/** A row of the settings list (Figma "Ligne"): 60 high, a line above it. */
export function SettingsRow({ label, value, tone = 'default', onPress, accessibilityLabel = label, accessibilityHint }: SettingsRowProps) {
  const colors = useColors()
  const labelColor = tone === 'danger' ? colors.accentText : colors.text
  const valueColor = tone === 'highlight' || tone === 'danger' ? colors.accentText : tone === 'quiet' ? colors.muted : colors.text

  const content = (
    <>
      <Text style={[TYPO.body15, STYLES.label, { color: labelColor }]}>{label}</Text>
      <Text numberOfLines={1} style={[tone === 'quiet' ? TYPO.small13 : TYPO.button14, STYLES.value, { color: valueColor }]}>
        {value}
      </Text>
    </>
  )

  return (
    <View style={[STYLES.row, { borderTopColor: colors.border }]}>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          onPress={onPress}
          style={({ pressed }) => [STYLES.content, pressed && STYLES.pressed]}>
          {content}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={accessibilityLabel} style={STYLES.content}>
          {content}
        </View>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  pressed: { opacity: 0.75 },
  row: { borderTopWidth: 1 },
  // 60 high as in Figma, taller when a large system font makes the label wrap
  content: { minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  label: { flexShrink: 1 },
  value: { flexShrink: 1, textAlign: 'right' },
})
