import { StyleSheet, View } from 'react-native'

import { Skeleton } from '~/components/ui/Skeleton'

import { OnboardingWelcomeScreen } from './OnboardingWelcomeScreen'

import { i18n } from '~/lib/i18n'

/** Onboarding step 1/4 while the community total loads: the same layout, with the two counter lines pulsing. */
export function OnboardingWelcomeLoading() {
  return (
    <OnboardingWelcomeScreen
      counter={
        <View
          accessible
          accessibilityLabel={i18n.t('onboarding.welcome.loading')}
          accessibilityState={{ busy: true }}
          style={STYLES.counter}>
          <Skeleton style={STYLES.line} />
          <Skeleton style={STYLES.community} />
        </View>
      }
    />
  )
}

const STYLES = StyleSheet.create({
  counter: {
    alignItems: 'center',
    gap: 12,
  },
  // the size of the real lines, so the screen does not move when the total arrives
  line: { width: 250, height: 34 },
  community: { width: 261 },
})
