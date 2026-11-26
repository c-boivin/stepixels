import { use } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { SettingsRow } from '~/components/ui/SettingsRow'
import { TopBar } from '~/components/ui/TopBar'

import { i18n } from '~/lib/i18n'

import type { ReactNode } from 'react'

import { TYPO, useColors } from '~/styles/theme'

export interface SettingsParams {
  /** `AUTORISÉ` or `REFUSÉ` */
  pedometer: string
  /** Not allowed: `ask` asks again, `settings` opens the phone's settings (only they can allow it). */
  pedometerAction: 'ask' | 'settings' | null
  /** `20:00` */
  resetTime: string
  /** `null` for a guest. */
  email: string | null
}

export interface SettingsProps {
  page: Promise<SettingsParams>
  onBack: () => void
  /** Asks for the access again, or opens the phone's settings, as `pedometerAction` says. */
  onPedometerPress: (action: 'ask' | 'settings') => void
  onSignUp: () => void
  onSignIn: () => void
}

/**
 * Settings (#37): one list, different for a guest and for a signed-in user. The rows of screens
 * not built yet are shown without action: introduction (#46), reset time (#44), password (#45),
 * sign-out (#41), data and privacy (#43), account deletion (#42).
 */
export function Settings({ page, onBack, onPedometerPress, onSignUp, onSignIn }: SettingsProps) {
  const { pedometer, pedometerAction, resetTime, email } = use(page)
  const arrow = i18n.t('settings.arrow')

  return (
    <SettingsScreen onBack={onBack}>
      <SettingsRow
        label={i18n.t('settings.pedometer.label')}
        value={pedometer}
        accessibilityLabel={i18n.t('settings.row_label', { label: i18n.t('settings.pedometer.label'), value: pedometer })}
        // allowed in orange, refused in gray (no Figma frame for it: agreed in the review of #62)
        tone={pedometerAction ? 'off' : 'highlight'}
        onPress={pedometerAction ? () => onPedometerPress(pedometerAction) : undefined}
        accessibilityHint={pedometerAction ? i18n.t(`settings.pedometer.hint_${pedometerAction}`) : undefined}
      />
      <SettingsRow label={i18n.t('settings.introduction')} value={arrow} />
      <SettingsRow
        label={i18n.t('settings.reset_time')}
        value={resetTime}
        accessibilityLabel={i18n.t('settings.row_label', { label: i18n.t('settings.reset_time'), value: resetTime })}
      />
      {email === null ? (
        <>
          <SettingsRow label={i18n.t('settings.sign_up')} value={arrow} onPress={onSignUp} />
          <SettingsRow label={i18n.t('settings.sign_in')} value={arrow} onPress={onSignIn} />
          <SettingsRow label={i18n.t('settings.privacy')} value={arrow} />
        </>
      ) : (
        <>
          <SettingsRow
            label={i18n.t('settings.account')}
            value={email}
            accessibilityLabel={i18n.t('settings.row_label', { label: i18n.t('settings.account'), value: email })}
            tone="quiet"
          />
          <SettingsRow label={i18n.t('settings.password')} value={arrow} />
          <SettingsRow label={i18n.t('settings.sign_out')} value={arrow} />
          <SettingsRow label={i18n.t('settings.privacy')} value={arrow} />
          <SettingsRow label={i18n.t('settings.delete_account')} value={arrow} tone="danger" />
        </>
      )}
    </SettingsScreen>
  )
}

/** The frame of the settings, shared with their skeleton: `← RETOUR`, the title, then the list. */
export function SettingsScreen({ children, onBack }: { children: ReactNode; onBack: () => void }) {
  const colors = useColors()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.page}>
        <TopBar title={i18n.t('account.back')} accessibilityLabel={i18n.t('account.back_label')} onPress={onBack} />
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={STYLES.content}>
          <Text accessibilityRole="header" style={[TYPO.screenTitle40, STYLES.title, { color: colors.text }]}>
            {i18n.t('settings.title')}
          </Text>
          <View>{children}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  // centered with a maximum width, so the layout does not stretch on a tablet
  page: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20 },
  // the list sits in the middle of the screen, as in the Figma frames
  content: { flexGrow: 1, justifyContent: 'center', gap: 20, paddingBottom: 9 },
  title: { textAlign: 'center' },
})
