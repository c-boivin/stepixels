import { StyleSheet, View } from 'react-native'

import { Picto } from '~/components/ui/Picto'
import { Skeleton } from '~/components/ui/Skeleton'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'

/** Onboarding step 4/4 while the steps access is read: the gray feet, the texts pulsing, no button yet. */
export function OnboardingPedometerLoading() {
  return (
    <OnboardingStep step={i18n.t('onboarding.pedometer.step')} stepLabel={i18n.t('onboarding.pedometer.step_label')}>
      <View
        accessible
        accessibilityLabel={i18n.t('onboarding.pedometer.loading')}
        accessibilityState={{ busy: true }}
        style={STYLES.content}>
        <Picto name="feet" active={false} />
        <View style={STYLES.texts}>
          <Skeleton style={STYLES.title} />
          <Skeleton style={STYLES.description} />
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
  // the size of the real texts, so the screen does not move once the access is read
  title: { width: 240, height: 64 },
  description: { width: 320, height: 40 },
})
