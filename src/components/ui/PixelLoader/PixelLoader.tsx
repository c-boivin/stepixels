import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Svg, { Path, Rect } from 'react-native-svg'

import { useReduceMotion } from '~/hooks/useReduceMotion'

import { useColors } from '~/styles/theme'

/** 12 × 12 cells of 8 px, like every picto of the design (96 × 96). */
const GRID = 12
const CELL = 8
const SIZE = GRID * CELL
export const LOADER_CELLS = GRID * GRID

/** One more cell every 10 ms: about 1.4 s for the whole grid (Figma note "animation du loader"). */
export const LOADER_STEP_MS = 10

/** With "Reduce motion" on, the grid stays half filled, without moving. */
export const REDUCED_MOTION_FILLED = LOADER_CELLS / 2

/**
 * Filled cells `elapsed` ms after the loader started: they fill row by row, then everything
 * clears and starts again (0 to 144 filled cells, then 0).
 */
export function loaderFilledAt(elapsed: number): number {
  return Math.floor(elapsed / LOADER_STEP_MS) % (LOADER_CELLS + 1)
}

/** One path for many cells: `M x y h 8 v 8 h -8 Z` per cell, in reading order. */
function cellsPath(from: number, to: number): string {
  return Array.from({ length: Math.max(0, to - from) }, (_, offset) => {
    const index = from + offset
    return `M${(index % GRID) * CELL} ${Math.floor(index / GRID) * CELL}h${CELL}v${CELL}h-${CELL}Z`
  }).join('')
}

export interface PixelLoaderProps {
  /** Fixed number of filled cells (onboarding 2/4 shows 60). Without it, the grid is animated. */
  filled?: number
  /** Side of the square, in points. Default: 96, as in the design. */
  size?: number
}

/**
 * The pixel loader of the design: filled cells in orange, empty ones in beige, the next cell outlined.
 * Animated on the launch screen, fixed when `filled` is given or when "Reduce motion" is on.
 * Decorative: hidden from the screen reader, the screen around it says what is loading.
 */
export function PixelLoader({ filled, size = SIZE }: PixelLoaderProps) {
  const colors = useColors()
  const reduceMotion = useReduceMotion()
  const animated = filled === undefined && !reduceMotion
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!animated) return

    // computed from the time elapsed at each frame of the screen, not from a 10 ms timer:
    // the screen redraws 60 times a second at most, so a faster timer would only waste work
    const start = Date.now()
    let frame = requestAnimationFrame(function onFrame() {
      setStep(loaderFilledAt(Date.now() - start))
      frame = requestAnimationFrame(onFrame)
    })
    return () => cancelAnimationFrame(frame)
  }, [animated])

  const count = filled ?? (reduceMotion ? REDUCED_MOTION_FILLED : step)
  const current = count < LOADER_CELLS ? count : null

  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Path d={cellsPath(0, count)} fill={colors.accent} />
        <Path d={cellsPath(count + 1, LOADER_CELLS)} fill={colors.control} />
        {current !== null && (
          // the next cell stays empty, outlined inside its square (1.5 px, as in Figma)
          <Rect
            testID="pixel-loader-current"
            x={(current % GRID) * CELL + 0.75}
            y={Math.floor(current / GRID) * CELL + 0.75}
            width={CELL - 1.5}
            height={CELL - 1.5}
            stroke={colors.accent}
            strokeWidth={1.5}
            fill="none"
          />
        )}
      </Svg>
    </View>
  )
}
