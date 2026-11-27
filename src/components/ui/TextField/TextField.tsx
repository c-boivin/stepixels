import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'

import type { ComponentRef, Ref } from 'react'
import type { TextInputProps } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

export interface TextFieldProps
  extends Pick<
    TextInputProps,
    'autoCapitalize' | 'autoComplete' | 'keyboardType' | 'onBlur' | 'onSubmitEditing' | 'returnKeyType' | 'secureTextEntry' | 'testID' | 'textContentType'
  > {
  /** Label above the field, in upper case (`E-MAIL`): also its accessibility label. */
  label: string
  value: string
  onChangeText: (value: string) => void
  /** Error under the field, with its `!` from fr.json (`! Cet e-mail a déjà un compte.`): the field turns orange. */
  error?: string | null
  /** To focus the field from the previous one (`returnKeyType="next"`). */
  ref?: Ref<ComponentRef<typeof TextInput>>
}

/**
 * A form field of the design (Figma component "Champ"): label, value in DM Mono, underline.
 * Label and underline turn orange while the field is focused or has an error.
 */
export function TextField({ label, value, onChangeText, error, ref, onBlur, ...input }: TextFieldProps) {
  const colors = useColors()
  const [focused, setFocused] = useState(false)
  const highlighted = focused || Boolean(error)

  return (
    <View style={STYLES.field}>
      <Text style={[TYPO.label11, { color: highlighted ? colors.accentText : colors.muted }]}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error ?? undefined}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        autoCorrect={false}
        selectionColor={colors.accent}
        style={[
          TYPO.fact17,
          STYLES.input,
          highlighted ? STYLES.underlineStrong : STYLES.underline,
          { color: colors.text, borderBottomColor: highlighted ? colors.accent : colors.text },
        ]}
        {...input}
      />
      {error && (
        <Text accessibilityLiveRegion="polite" style={[TYPO.small13, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  field: { gap: 10 },
  input: { paddingTop: 0, paddingBottom: 10, paddingHorizontal: 0 },
  underline: { borderBottomWidth: 1 },
  // 2 points when focused, as in Figma: one point less padding, so the text does not move
  underlineStrong: { borderBottomWidth: 2, paddingBottom: 9 },
})
