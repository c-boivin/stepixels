import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'

import { Picto } from '~/components/ui/Picto'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'

import type { ReactNode } from 'react'

import { TYPO, useColors } from '~/styles/theme'

export interface OnboardingWelcomeScreenProps {
  /** The community counter, or its skeleton while it loads. */
  counter: ReactNode
}

/** Content of the onboarding step 1/4, shared by the screen and its loading state (Figma "Onboarding / 1 · Lettre"). */
export function OnboardingWelcomeScreen({ counter }: OnboardingWelcomeScreenProps) {
  const colors = useColors()
  const router = useRouter()

  return (
    <OnboardingStep
      step={i18n.t('onboarding.welcome.step')}
      stepLabel={i18n.t('onboarding.welcome.step_label')}
      button={{ label: i18n.t('onboarding.welcome.button'), onPress: () => router.push('/onboarding/rule') }}>
      <View style={STYLES.content}>
        <View style={STYLES.counter}>
          <Picto name="heart" />
          {counter}
        </View>
        <Text accessibilityRole="header" style={[TYPO.title26, STYLES.title, { color: colors.text }]}>
          {i18n.t('onboarding.welcome.title')}
        </Text>
      </View>
    </OnboardingStep>
  )
}

const STYLES = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 64,
  },
  counter: {
    alignItems: 'center',
    gap: 12,
  },
  title: { textAlign: 'center' },
})
