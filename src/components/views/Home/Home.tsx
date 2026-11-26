import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '~/components/ui/Button'
import { HomeCarousel } from './HomeCarousel'

import { i18n } from '~/lib/i18n'

import type { HomeCarouselItemParams } from './HomeCarousel'

import { TYPO, useColors } from '~/styles/theme'

export interface HomeProps {
  /** The images of the carousel: finished ones, the one being revealed, then the locked one. */
  images: HomeCarouselItemParams[]
}

/**
 * The home screen (#28 for now: the image carousel). The counter, the countdown (#27) and the
 * VALIDER button (#29) come around it.
 */
export function Home({ images }: HomeProps) {
  const colors = useColors()
  // the image being revealed, or the last one once every image is finished
  const revealing = images.findIndex(({ state }) => state === 'current' || state === 'new')
  const currentIndex = revealing >= 0 ? revealing : images.length - 1
  // the card the user swiped to, or `null` when on the image being revealed: if a validation
  // moves the image being revealed, the carousel follows it
  const [browsed, setBrowsed] = useState<number | null>(null)
  const index = browsed ?? currentIndex
  const inFront = images[index]

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[STYLES.screen, { backgroundColor: colors.background }]}>
      <View style={STYLES.content}>
        <HomeCarousel
          items={images}
          index={index}
          onIndexChange={(next) => setBrowsed(next === currentIndex ? null : next)}
        />
        {/* the card's label already reads the title and the steps */}
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={STYLES.footer}>
          <Text style={[TYPO.label11, { color: colors.text }]}>{inFront.title}</Text>
          {inFront.steps !== null && <Text style={[TYPO.label11, { color: colors.text }]}>{inFront.steps}</Text>}
        </View>
      </View>
      <View style={STYLES.bottom}>
        {index !== currentIndex && (
          <Button
            variant="secondary"
            label={i18n.t('home.carousel.back')}
            value={i18n.t('home.carousel.back_value')}
            onPress={() => setBrowsed(null)}
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const STYLES = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 28,
  },
  // centered with a maximum width, so the layout does not stretch on a tablet
  footer: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  // the room of the Figma validation zone (time left, then the button), kept even without a
  // button, so that nothing moves when one appears
  bottom: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    height: 82 + 9,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
})
