import { Stack, useRouter } from 'expo-router'
import { use, useEffect, useRef, useState } from 'react'
import { AppState, BackHandler, StyleSheet, Text, View } from 'react-native'

import { Picto } from '~/components/ui/Picto'
import { OnboardingStep } from '~/components/views/OnboardingStep'

import { i18n } from '~/lib/i18n'
import { openStepsSettings, requestStepsAccess, type StepsAccess } from '~/lib/steps'

import { TYPO, useColors } from '~/styles/theme'

/** Time the "Podomètre connecté" screen stays before the home screen (OQ-9). */
export const PEDOMETER_CONNECTED_MS = 1500

export interface OnboardingPedometerProps {
  /** The steps access when the screen opens. */
  page: Promise<{ access: StepsAccess }>
  /** Reads the access again, back from the settings: the route loads the data (ADR-002). */
  readAccess: () => Promise<StepsAccess>
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
export function OnboardingPedometer({ page, readAccess, onGranted }: OnboardingPedometerProps) {
  const colors = useColors()
  const router = useRouter()
  const [access, setAccess] = useState(use(page).access)
  // an error goes to the route's ErrorBoundary, like a loading error (wrapped: the reason can be empty)
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  // the permission dialog sends the app to the background and back: no re-read while it is open,
  // and a second tap does not ask twice
  const asking = useRef(false)

  // back from the settings, the user may have allowed the steps: read the access again
  useEffect(() => {
    if (access === 'granted') return

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !asking.current) readAccess().then(setAccess, (error: unknown) => setFailure({ error }))
    })
    return () => subscription.remove()
  }, [access, readAccess])

  useEffect(() => {
    if (access !== 'granted') return

    let cancelled = false
    // the onboarding is done only once the access is granted, saved before the home screen opens
    const saved = onGranted()
    saved.catch((error: unknown) => {
      if (!cancelled) setFailure({ error })
    })
    const timer = setTimeout(() => {
      saved.then(
        () => {
          if (cancelled) return
          // the onboarding steps leave the history: "back" on the home screen does not return here
          router.dismissAll()
          router.replace('/')
        },
        () => {},
      )
    }, PEDOMETER_CONNECTED_MS)
    // the onboarding is already saved: no way back to 4/4 during the pause (Android back button)
    const back = BackHandler.addEventListener('hardwareBackPress', () => true)

    return () => {
      cancelled = true
      clearTimeout(timer)
      back.remove()
    }
  }, [access, onGranted, router])

  if (failure) throw failure.error

  async function onAllow() {
    if (asking.current) return

    asking.current = true
    try {
      setAccess(await requestStepsAccess())
    } catch (error) {
      setFailure({ error })
    } finally {
      asking.current = false
    }
  }

  if (access === 'granted') {
    return (
      <OnboardingStep>
        {/* no swipe back during the pause (iOS): the onboarding is already saved */}
        <Stack.Screen options={{ gestureEnabled: false }} />
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
                openStepsSettings().catch((error: unknown) => setFailure({ error }))
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
