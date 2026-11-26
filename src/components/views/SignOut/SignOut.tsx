import { useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { TopBar } from '~/components/ui/TopBar'

import { i18n } from '~/lib/i18n'

import { TYPO, useColors } from '~/styles/theme'

export interface SignOutProps {
  /** Signs out, then leaves the screen; `offline` when the progress could not be saved first. */
  onConfirm: () => Promise<'offline' | null>
  onCancel: () => void
}

/** Sign-out confirmation (#41, Figma "Confirmer déconnexion"): the images stay saved on the account. */
export function SignOut({ onConfirm, onCancel }: SignOutProps) {
  const colors = useColors()
  const [sending, setSending] = useState(false)
  const [offline, setOffline] = useState(false)
  // a second tap before the next render must not sign out twice
  const sendingNow = useRef(false)

  async function onSignOut() {
    if (sendingNow.current) return
    sendingNow.current = true
    setSending(true)
    setOffline(false)
    try {
      setOffline((await onConfirm()) === 'offline')
    } finally {
      sendingNow.current = false
      setSending(false)
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.page}>
        {/* nothing to cancel once the sign-out has started */}
        <TopBar
          title={i18n.t('sign_out.back')}
          accessibilityLabel={i18n.t('sign_out.back_label')}
          onPress={sending ? undefined : onCancel}
        />
        <View style={STYLES.content}>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.center, { color: colors.text }]}>
            {i18n.t('sign_out.title')}
          </Text>
          <Text style={[TYPO.body15, STYLES.center, { color: colors.muted }]}>{i18n.t('sign_out.description')}</Text>
          {offline && (
            <Text accessibilityLiveRegion="polite" style={[TYPO.small13, STYLES.center, { color: colors.error }]}>
              {i18n.t('account.error.offline')}
            </Text>
          )}
        </View>
        <View style={STYLES.bottom}>
          <Button
            label={i18n.t('sign_out.confirm')}
            value={i18n.t('sign_out.confirm_value')}
            disabled={sending}
            onPress={onSignOut}
          />
          <Button
            variant="secondary"
            label={i18n.t('sign_out.cancel')}
            value={i18n.t('sign_out.cancel_value')}
            disabled={sending}
            onPress={onCancel}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  // centered with a maximum width, so the layout does not stretch on a tablet
  page: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20 },
  content: { flex: 1, paddingTop: 80, gap: 16 },
  center: { textAlign: 'center' },
  // 34 between the two buttons, as in Figma
  bottom: { gap: 34, paddingBottom: 9 },
})
