import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, type ButtonProps } from '~/components/ui/Button'
import { TopBar } from '~/components/ui/TopBar'

import type { ReactNode } from 'react'

import { useColors } from '~/styles/theme'

export interface OnboardingStepProps {
  /** The step in the top bar (`2 / 4`), and what the screen reader says instead (`Étape 2 sur 4`). Empty bar without it. */
  step?: string
  stepLabel?: string
  /** Picto and texts of the step, centered. */
  children: ReactNode
  /** No button on a screen that moves on by itself ("Podomètre connecté"). */
  button?: ButtonProps
}

/** Layout shared by the onboarding steps (Figma "Onboarding / n"): the step on top, the content centered, the button at the bottom. */
export function OnboardingStep({ step, stepLabel, children, button }: OnboardingStepProps) {
  const colors = useColors()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.page}>
        <TopBar title={step ?? ''} accessibilityLabel={stepLabel} />
        <View style={STYLES.content}>{children}</View>
        {/* an empty block keeps the content in the middle of the screen */}
        {button ? <Button {...button} /> : <View />}
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
  content: { alignItems: 'center' },
})
