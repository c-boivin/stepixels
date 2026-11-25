import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { Picto } from '~/components/ui/Picto'
import { TopBar } from '~/components/ui/TopBar'

import { i18n } from '~/lib/i18n'

import type { ReactNode } from 'react'

import { TYPO, useColors } from '~/styles/theme'

export interface OnboardingWelcomeScreenProps {
  /** The community counter, or its skeleton while it loads. */
  counter: ReactNode
}

/** Layout of the onboarding step 1/4, shared by the screen and its loading state (Figma "Onboarding / 1 · Lettre"). */
export function OnboardingWelcomeScreen({ counter }: OnboardingWelcomeScreenProps) {
  const colors = useColors()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.page}>
        <TopBar title={i18n.t('onboarding.welcome.step')} accessibilityLabel={i18n.t('onboarding.welcome.step_label')} />

        <View style={STYLES.content}>
          <View style={STYLES.counter}>
            <Picto name="heart" />
            {counter}
          </View>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.title, { color: colors.text }]}>
            {i18n.t('onboarding.welcome.title')}
          </Text>
        </View>

        {/* Onboarding 2/4 comes with #24: the button is wired there */}
        <Button label={i18n.t('onboarding.welcome.button')} />
      </View>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  // centered with a maximum width, so the layout does not stretch on a tablet
  page: {
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
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
