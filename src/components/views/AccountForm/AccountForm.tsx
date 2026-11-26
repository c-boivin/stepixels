import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { TopBar } from '~/components/ui/TopBar'

import { useKeyboardVisible } from '~/hooks/useKeyboardVisible'

import { i18n } from '~/lib/i18n'

import type { ReactNode } from 'react'
import type { ButtonProps } from '~/components/ui/Button'

import { TYPO, useColors } from '~/styles/theme'

export interface AccountFormProps {
  /** `CRÉE\nTON COMPTE` */
  title: string
  subtitle?: string
  /** The fields, and what goes right under them (terms). */
  children: ReactNode
  /** Links under the form (`J’ai déjà un compte`): hidden while the keyboard is open, as in the design. */
  links?: ReactNode
  button: ButtonProps
  onBack: () => void
}

/**
 * The layout shared by the account screens (#33, #34): `← RETOUR`, title, fields, links, and the
 * button at the bottom, which stays above the keyboard.
 */
export function AccountForm({ title, subtitle, children, links, button, onBack }: AccountFormProps) {
  const colors = useColors()
  const keyboardVisible = useKeyboardVisible()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior="padding" style={STYLES.page}>
        <TopBar title={i18n.t('account.back')} accessibilityLabel={i18n.t('account.back_label')} onPress={onBack} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={STYLES.content}>
          <View style={STYLES.texts}>
            <Text accessibilityRole="header" style={[TYPO.title26, STYLES.center, { color: colors.text }]}>
              {title}
            </Text>
            {subtitle && <Text style={[TYPO.body15, STYLES.center, { color: colors.muted }]}>{subtitle}</Text>}
          </View>
          <View style={STYLES.form}>{children}</View>
          {!keyboardVisible && links}
        </ScrollView>
        <View style={STYLES.bottom}>
          <Button {...button} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  // centered with a maximum width, so the layout does not stretch on a tablet
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
  },
  content: { paddingTop: 80, paddingBottom: 24, gap: 36 },
  texts: { gap: 14 },
  center: { textAlign: 'center' },
  form: { gap: 24 },
  bottom: { paddingTop: 12, paddingBottom: 9 },
})
