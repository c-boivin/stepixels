import { Animated, Platform, StyleSheet, Text, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { PixelGrid } from '~/components/ui/PixelGrid'

import type { PixelGridParams } from '~/components/ui/PixelGrid'

import { TYPO, useColors } from '~/styles/theme'

// the SVG blur is computed by the CPU on Android: too slow while swiping (checked on a Samsung S22),
// so the neighbour cards are only smaller and faded there
const CAN_BLUR = Platform.OS !== 'android'

/** The padlock of the design: 5 × 7 cells of 3 px, on a card 240 wide (Figma "Cadenas"), in the middle of the card. */
const LOCK_PATH = 'M3 0h9v3h3v6H0V3h3zM3 3v6h9V3zM0 9h15v12H0zM6 12v6h3v-6z'
const LOCK_WIDTH = 15
const LOCK_HEIGHT = 21
const LOCK_CARD = 240

export interface ImageCardProps extends PixelGridParams {
  /** Side of the card, in points. */
  size: number
  /** Tag on the top left (`EN COURS`), shown on the card in front only. */
  tag?: string
  /** The image after the current one: a padlock in the middle, nothing revealed yet. */
  locked?: boolean
  /** Mark the next cell to reveal. */
  showNext?: boolean
  /**
   * How much the card is in front: 1 sharp with its tag, 0 blurred without it, like the cards
   * next to the one in front. An animated value lets the card follow the finger while it swipes.
   */
  focus?: number | Animated.AnimatedInterpolation<number>
}

/**
 * A card of the home carousel: the pixel art grid on a white square, with its tag or its padlock.
 * Decorative pieces only: the carousel gives each card its accessibility label.
 */
export function ImageCard({ size, tag, locked = false, showNext, focus = 1, ...grid }: ImageCardProps) {
  const colors = useColors()
  // the padlock keeps its Figma size on a 240 card, and scales with the card
  const lockScale = size / LOCK_CARD
  // a blur cannot follow the finger: the blurred drawing fades in over the sharp one instead
  const blurOpacity = typeof focus === 'number' ? 1 - focus : Animated.subtract(1, focus)

  return (
    <View style={{ width: size, height: size }}>
      {/* each drawing is kept as a GPU texture: while swiping, only its opacity changes */}
      {(focus !== 0 || !CAN_BLUR) && (
        <View renderToHardwareTextureAndroid shouldRasterizeIOS>
          <PixelGrid {...grid} size={size} showNext={showNext} />
        </View>
      )}
      {focus !== 1 && CAN_BLUR && (
        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid
          shouldRasterizeIOS
          style={[StyleSheet.absoluteFill, { opacity: blurOpacity }]}>
          <PixelGrid {...grid} size={size} showNext={showNext} blurred />
        </Animated.View>
      )}
      {tag !== undefined && (
        <Animated.View style={[STYLES.tag, { backgroundColor: colors.background, opacity: focus }]}>
          <View style={[STYLES.tagSquare, { backgroundColor: colors.accent }]} />
          <Text style={[TYPO.label11, { color: colors.text }]}>{tag}</Text>
        </Animated.View>
      )}
      {locked && (
        // sharp, above the blur: the padlock says the card is locked, even next to the card in front
        <View style={STYLES.lock}>
          <Svg width={LOCK_WIDTH * lockScale} height={LOCK_HEIGHT * lockScale} viewBox={`0 0 ${LOCK_WIDTH} ${LOCK_HEIGHT}`}>
            <Path d={LOCK_PATH} fill={colors.text} fillRule="evenodd" />
          </Svg>
        </View>
      )}
    </View>
  )
}

const STYLES = StyleSheet.create({
  tag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tagSquare: { width: 6, height: 6 },
  lock: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
