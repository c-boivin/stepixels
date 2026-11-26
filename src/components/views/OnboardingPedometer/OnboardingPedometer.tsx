import { useRouter } from 'expo-router'
import { use, useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet, Text, View } from 'react-native'

import { Picto } from '~/components/ui/Picto'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'
import { getStepsAccess, openStepsSettings, requestStepsAccess, type StepsAccess } from '~/lib/steps'

import { TYPO, useColors } from '~/styles/theme'

/** Time the "Podomètre connecté" screen stays before the home screen (OQ-9). */
export const PEDOMETER_CONNECTED_MS = 1500

export interface OnboardingPedometerProps {
  /** The steps access when the screen opens. */
  page: Promise<{ access: StepsAccess }>
  /** Called once the access is granted: the route marks the onboarding as done. */
  onGranted: () => Promise<void>
}

/**
 * Onboarding step 4/4 (#26): asks for the steps, the hardware feature the app cannot work without.
 * - `undetermined`: explains what is read, then asks;
 * - `refused`: explains why the steps are needed, and asks again once;
 * - `blocked`: same texts, the button opens the settings (blocking screen: no way around it);
 * - `granted`: "Podomètre connecté", then the home screen.
 */
export function OnboardingPedometer({ page, onGranted }: OnboardingPedometerProps) {
  const colors = useColors()
  const router = useRouter()
  const [access, setAccess] = useState(use(page).access)
  // an error while saving goes to the route's ErrorBoundary, like a loading error
  const [error, setError] = useState<unknown>(null)
  // the permission dialog sends the app to the background and back: no re-read while it is open
  const asking = useRef(false)

  // back from the settings, the user may have allowed the steps: read the access again
  useEffect(() => {
    if (access === 'granted') return

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !asking.current) getStepsAccess().then(setAccess, setError)
    })
    return () => subscription.remove()
  }, [access])

  useEffect(() => {
    if (access !== 'granted') return

    let cancelled = false
    // the onboarding is done only once the access is granted, saved before the home screen opens
    Promise.all([onGranted(), wait(PEDOMETER_CONNECTED_MS)]).then(
      () => {
        if (cancelled) return
        // the onboarding steps leave the history: "back" on the home screen does not return here
        router.dismissAll()
        router.replace('/')
      },
      (reason: unknown) => {
        if (!cancelled) setError(reason)
      },
    )
    return () => {
      cancelled = true
    }
  }, [access, onGranted, router])

  if (error) throw error

  async function onAllow() {
    asking.current = true
    try {
      setAccess(await requestStepsAccess())
    } catch (reason) {
      setError(reason)
    } finally {
      asking.current = false
    }
  }

  if (access === 'granted') {
    return (
      <OnboardingStep>
        <View style={STYLES.content}>
          <Picto name="feet" />
          <Text
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
            {i18n.t('onboarding.pedometer.connected')}
          </Text>
        </View>
      </OnboardingStep>
    )
  }

  const asked = access !== 'undetermined'

  return (
    <OnboardingStep
      step={i18n.t('onboarding.pedometer.step')}
      stepLabel={i18n.t('onboarding.pedometer.step_label')}
      button={
        access === 'blocked'
          ? {
              label: i18n.t('onboarding.pedometer.settings_button'),
              value: i18n.t('onboarding.pedometer.button_value'),
              accessibilityHint: i18n.t('onboarding.pedometer.settings_hint'),
              onPress: () => {
                openStepsSettings().catch(setError)
              },
            }
          : {
              label: i18n.t('onboarding.pedometer.allow_button'),
              value: i18n.t('onboarding.pedometer.button_value'),
              onPress: onAllow,
            }
      }>
      <View style={STYLES.content}>
        <Picto name="feet" active={false} />
        <View style={STYLES.texts}>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
            {i18n.t(asked ? 'onboarding.pedometer.denied_title' : 'onboarding.pedometer.title')}
          </Text>
          <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>
            {i18n.t(asked ? 'onboarding.pedometer.denied_description' : 'onboarding.pedometer.description')}
          </Text>
        </View>
      </View>
    </OnboardingStep>
  )
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
