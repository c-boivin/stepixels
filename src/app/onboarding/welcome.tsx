import { Suspense } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { OnboardingWelcome, OnboardingWelcomeLoading } from '~/components/views/OnboardingWelcome'

import { useRequest } from '~/hooks/useRequest'

import { getOnboardingWelcomePage } from '~/data/get-onboarding-welcome-page'
import { i18n } from '~/lib/i18n'

import type { ErrorBoundaryProps } from 'expo-router'

import { TYPO, useColors } from '~/styles/theme'

export interface OnboardingWelcomePageData {
  /** Steps revealed by the community, formatted (`1 284 302`); `null` on a first launch without network. */
  communityTotal: string | null
}

/** Onboarding step 1/4 (#23). */
export default function OnboardingWelcomePage() {
  const [, page] = useRequest(getOnboardingWelcomePage)

  return (
    <Suspense fallback={<OnboardingWelcomeLoading />}>
      <OnboardingWelcome page={page} />
    </Suspense>
  )
}

/** Shown when the screen cannot load, for example when the phone cannot read its storage: "Retry" loads it again. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const colors = useColors()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.message}>
        <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
          {i18n.t('onboarding.welcome.error.title')}
        </Text>
        <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>{i18n.t('onboarding.welcome.error.description')}</Text>
      </View>
      <Button label={i18n.t('onboarding.welcome.error.button')} onPress={retry} />
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: { textAlign: 'center' },
})
