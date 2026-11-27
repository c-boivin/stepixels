import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { TextField } from '~/components/ui/TextField'
import { AccountForm } from '~/components/views/AccountForm'

import { i18n } from '~/lib/i18n'

import type { ComponentRef } from 'react'
import type { TextInput } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

/** Why the user is not signed in, as the screen tells it. */
export type SignInError = 'wrong_credentials' | 'offline' | 'unknown'

export interface SignInForm {
  email: string
  password: string
}

export interface SignInProps {
  /** Signs in: `null` when it worked, otherwise why it did not. */
  onSubmit: (form: SignInForm) => Promise<SignInError | null>
  onSignUp: () => void
  onBack: () => void
}

/** Sign-in (#34): e-mail and password, every error under the password. */
export function SignIn({ onSubmit, onSignUp, onBack }: SignInProps) {
  const colors = useColors()
  const [form, setForm] = useState<SignInForm>({ email: '', password: '' })
  const [error, setError] = useState<SignInError | null>(null)
  const [sending, setSending] = useState(false)
  // `sending` is only read at the next render: a second press in the same frame must not send twice
  const sendingNow = useRef(false)
  const passwordField = useRef<ComponentRef<typeof TextInput>>(null)

  const filled = form.email.trim() !== '' && form.password !== ''

  function onChange(field: keyof SignInForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
    setError(null)
  }

  async function onConnect() {
    if (!filled || sendingNow.current) return
    sendingNow.current = true
    setSending(true)
    try {
      // on success the screen leaves: only an error comes back here
      setError(await onSubmit(form))
    } catch {
      // the screen's action failed after sending: say so rather than nothing
      setError('unknown')
    } finally {
      sendingNow.current = false
      setSending(false)
    }
  }

  return (
    <AccountForm
      title={i18n.t('account.sign_in.title')}
      onBack={onBack}
      button={{
        label: i18n.t(sending ? 'account.sign_in.sending' : 'account.sign_in.button'),
        value: sending ? undefined : i18n.t('account.button_value'),
        disabled: !filled || sending,
        onPress: onConnect,
      }}
      links={
        <View style={STYLES.links}>
          {/* "Forgot password" comes with #40 */}
          <Text style={[TYPO.body15, STYLES.center, { color: colors.muted }]}>{i18n.t('account.sign_in.forgot')}</Text>
          <Pressable accessibilityRole="link" onPress={onSignUp} style={STYLES.link}>
            <Text style={[TYPO.body15, STYLES.center, { color: colors.accentText }]}>{i18n.t('account.sign_in.no_account')}</Text>
          </Pressable>
        </View>
      }>
      {/* the label and the field share the text `E-MAIL`: Maestro finds the field by its testID */}
      <TextField
        testID="sign-in-email"
        label={i18n.t('account.email')}
        value={form.email}
        onChangeText={(value) => onChange('email', value)}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordField.current?.focus()}
      />
      <TextField
        ref={passwordField}
        testID="sign-in-password"
        label={i18n.t('account.password')}
        value={form.password}
        onChangeText={(value) => onChange('password', value)}
        error={error ? i18n.t(`account.error.${error}`) : null}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={onConnect}
      />
    </AccountForm>
  )
}

const STYLES = StyleSheet.create({
  links: { gap: 36, alignItems: 'center' },
  // at least 44 high, as a touch target should be
  link: { minHeight: 44, justifyContent: 'center' },
  center: { textAlign: 'center' },
})
