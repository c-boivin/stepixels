import { use } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { OnboardingWelcomeScreen } from './OnboardingWelcomeScreen'

import { i18n } from '~/lib/i18n'

import { TYPO, useColors } from '~/styles/theme'

export interface OnboardingWelcomeProps {
  /** `communityTotal` is already formatted (`1 284 302`), or `null` when no total is known yet. */
  page: Promise<{ communityTotal: string | null }>
}

/**
 * Onboarding step 1/4 (#23): the steps already revealed by the community, to make the user want to join.
 * Without any known total (first launch offline), the sentence is hidden: the button still works.
 */
export function OnboardingWelcome({ page }: OnboardingWelcomeProps) {
  const colors = useColors()
  const { communityTotal } = use(page)

  return (
    <OnboardingWelcomeScreen
      counter={
        communityTotal !== null && (
          // read as one sentence by the screen reader, not as three pieces
          <View accessible accessibilityLabel={i18n.t('onboarding.welcome.summary', { total: communityTotal })} style={STYLES.counter}>
            <View style={STYLES.line}>
              <Text style={[TYPO.body15, { color: colors.muted }]}>{i18n.t('onboarding.welcome.before')}</Text>
              <View style={[STYLES.pill, { backgroundColor: colors.pill }]}>
                <Text style={[TYPO.body15, { color: colors.accentText }]}>{communityTotal}</Text>
              </View>
              <Text style={[TYPO.body15, { color: colors.muted }]}>{i18n.t('onboarding.welcome.after')}</Text>
            </View>
            <Text style={[TYPO.body15, { color: colors.muted }]}>{i18n.t('onboarding.welcome.community')}</Text>
          </View>
        )
      }
    />
  )
}

const STYLES = StyleSheet.create({
  counter: {
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
})
