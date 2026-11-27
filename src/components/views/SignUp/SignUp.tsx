import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'

import { Checkbox } from '~/components/ui/Checkbox'
import { TextField } from '~/components/ui/TextField'
import { AccountForm } from '~/components/views/AccountForm'

import { isEmailValid, isFirstNameValid, isPasswordValid } from '~/lib/account'
import { i18n } from '~/lib/i18n'

import type { ComponentRef } from 'react'
import type { TextInput } from 'react-native'

import { TYPO, useColors } from '~/styles/theme'

/** Why the account was not created, as the screen tells it. */
export type SignUpError = 'email_taken' | 'offline' | 'unknown'

export interface SignUpForm {
  firstName: string
  email: string
  password: string
}

/** The texts of the sign-up when it saves a guest's image (#35): `GARDE TON IMAGE`. */
export interface SignUpTexts {
  title: string
  subtitle: string
  button: string
}

export interface SignUpProps {
  /** Other texts than the plain sign-up (#35); the fields and the rules stay the same. */
  texts?: SignUpTexts
  /** Creates the account: `null` when it worked, otherwise why it did not. */
  onSubmit: (form: SignUpForm) => Promise<SignUpError | null>
  onSignIn: () => void
  onBack: () => void
}

/**
 * Sign-up (#33): first name, e-mail, password and the terms. The button stays beige until
 * everything is valid; "8 caractères minimum" shows once the user leaves a too short password.
 */
export function SignUp({ texts, onSubmit, onSignIn, onBack }: SignUpProps) {
  const colors = useColors()
  const [form, setForm] = useState<SignUpForm>({ firstName: '', email: '', password: '' })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [passwordLeft, setPasswordLeft] = useState(false)
  const [error, setError] = useState<SignUpError | null>(null)
  const [sending, setSending] = useState(false)
  // `sending` is only read at the next render: a second press in the same frame must not send twice
  const sendingNow = useRef(false)
  const emailField = useRef<ComponentRef<typeof TextInput>>(null)
  const passwordField = useRef<ComponentRef<typeof TextInput>>(null)

  const passwordTooShort = passwordLeft && form.password !== '' && !isPasswordValid(form.password)
  const valid = isFirstNameValid(form.firstName) && isEmailValid(form.email) && isPasswordValid(form.password) && termsAccepted

  function onChange(field: keyof SignUpForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }))
    // the error is about what was sent: it goes as soon as the user changes the form
    setError(null)
  }

  async function onCreate() {
    if (!valid || sendingNow.current) return
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
      title={texts?.title ?? i18n.t('account.sign_up.title')}
      subtitle={texts?.subtitle ?? i18n.t('account.sign_up.subtitle')}
      onBack={onBack}
      button={{
        label: sending ? i18n.t('account.sign_up.sending') : (texts?.button ?? i18n.t('account.sign_up.button')),
        value: sending ? undefined : i18n.t('account.button_value'),
        disabled: !valid || sending,
        onPress: onCreate,
      }}
      links={
        <Pressable accessibilityRole="link" onPress={onSignIn} style={STYLES.link}>
          <Text style={[TYPO.body15, STYLES.center, { color: colors.accentText }]}>{i18n.t('account.sign_up.has_account')}</Text>
        </Pressable>
      }>
      {/* the labels and the fields share their text (`E-MAIL`): Maestro finds the fields by their testID */}
      <TextField
        testID="sign-up-first-name"
        label={i18n.t('account.first_name')}
        value={form.firstName}
        onChangeText={(value) => onChange('firstName', value)}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        onSubmitEditing={() => emailField.current?.focus()}
      />
      <TextField
        ref={emailField}
        testID="sign-up-email"
        label={i18n.t('account.email')}
        value={form.email}
        onChangeText={(value) => onChange('email', value)}
        error={error === 'email_taken' ? i18n.t('account.error.email_taken') : null}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        onSubmitEditing={() => passwordField.current?.focus()}
      />
      <TextField
        ref={passwordField}
        testID="sign-up-password"
        label={i18n.t('account.password')}
        value={form.password}
        onChangeText={(value) => onChange('password', value)}
        onBlur={() => setPasswordLeft(true)}
        error={
          passwordTooShort
            ? i18n.t('account.error.password_too_short')
            : error === 'offline' || error === 'unknown'
              ? i18n.t(`account.error.${error}`)
              : null
        }
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={onCreate}
      />
      <Checkbox label={i18n.t('account.sign_up.terms')} checked={termsAccepted} onChange={setTermsAccepted} />
    </AccountForm>
  )
}

const STYLES = StyleSheet.create({
  // at least 44 high, as a touch target should be
  link: { minHeight: 44, justifyContent: 'center' },
  center: { textAlign: 'center' },
})
