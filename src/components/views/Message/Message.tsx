import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'

import { TYPO, useColors } from '~/styles/theme'

export interface MessageProps {
  title: string
  description: string
  /** An action under the message, like "Retry" on an error screen. */
  button?: { label: string; onPress: () => void }
}

/** A full-screen message (error, empty state), as in the teacher's example repository: title, text, one button. */
export function Message({ title, description, button }: MessageProps) {
  const colors = useColors()

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.page}>
        <View style={STYLES.message}>
          <Text accessibilityRole="header" style={[TYPO.title26, STYLES.text, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[TYPO.body15, STYLES.text, { color: colors.muted }]}>{description}</Text>
        </View>
        {button && <Button label={button.label} onPress={button.onPress} />}
      </View>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  // centered with a maximum width, so the layout does not stretch on a tablet
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
  message: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: { textAlign: 'center' },
})
