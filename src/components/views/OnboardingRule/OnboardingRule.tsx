import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useRef } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { PixelLoader } from '~/components/ui/PixelLoader'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'

import { TYPO, useColors } from '~/styles/theme'

/** Cells filled on the fixed grid of this step, as in the Figma frame: the image reveals itself cell by cell. */
const RULE_FILLED_CELLS = 60

/** Onboarding step 2/4 (#24): the rule of the game, 100 steps reveal 1 pixel (R1). */
export function OnboardingRule() {
  const colors = useColors()
  const router = useRouter()
  // a double tap would open 3/4 twice; allowed again when the user comes back to this screen
  const opening = useRef(false)

  useFocusEffect(
    useCallback(() => {
      opening.current = false
    }, []),
  )

  function onContinue() {
    if (opening.current) return

    opening.current = true
    router.push('/onboarding/time')
  }

  return (
    <OnboardingStep
      step={i18n.t('onboarding.rule.step')}
      stepLabel={i18n.t('onboarding.rule.step_label')}
      button={{
        label: i18n.t('onboarding.rule.button'),
        value: i18n.t('onboarding.rule.button_value'),
        onPress: onContinue,
      }}>
      <View style={STYLES.content}>
        <PixelLoader filled={RULE_FILLED_CELLS} />
        <View style={STYLES.texts}>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
            {i18n.t('onboarding.rule.title')}
          </Text>
          <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>{i18n.t('onboarding.rule.description')}</Text>
        </View>
      </View>
    </OnboardingStep>
  )
}

const STYLES = StyleSheet.create({
  content: {
    alignItems: 'center',
    gap: 48,
  },
  texts: {
    alignItems: 'center',
    gap: 16,
  },
  text: { textAlign: 'center' },
})
