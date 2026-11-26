import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { TimeWheel } from '~/components/ui/TimeWheel'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'
import { RESET_TIMES } from '~/lib/rules'
import { DEFAULT_RESET_TIME } from '~/repositories/preferences.repository'

import { TYPO, useColors } from '~/styles/theme'

export interface OnboardingTimeProps {
  /** Called with the chosen time on "CONTINUER": the route saves it and opens the next step. */
  onContinue: (time: string) => void
}

/**
 * Onboarding step 3/4 (#25): the user picks the daily reset time, the deadline to validate
 * the day's steps (R4). 20:00 by default; Settings will let the user change it later (#44).
 */
export function OnboardingTime({ onContinue }: OnboardingTimeProps) {
  const colors = useColors()
  // interaction state: saved only on "CONTINUER"
  const [time, setTime] = useState(DEFAULT_RESET_TIME)

  return (
    <OnboardingStep
      step={i18n.t('onboarding.time.step')}
      stepLabel={i18n.t('onboarding.time.step_label')}
      button={{
        label: i18n.t('onboarding.time.button'),
        value: i18n.t('onboarding.time.button_value'),
        onPress: () => onContinue(time),
      }}>
      <View style={STYLES.content}>
        <TimeWheel
          times={RESET_TIMES}
          value={time}
          onChange={setTime}
          accessibilityLabel={i18n.t('onboarding.time.wheel_label')}
        />
        <View style={STYLES.texts}>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
            {i18n.t('onboarding.time.title')}
          </Text>
          <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>{i18n.t('onboarding.time.description')}</Text>
        </View>
      </View>
    </OnboardingStep>
  )
}

const STYLES = StyleSheet.create({
  content: {
    width: '100%',
    alignItems: 'center',
    gap: 56,
  },
  texts: {
    alignItems: 'center',
    gap: 16,
  },
  text: { textAlign: 'center' },
})
