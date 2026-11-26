import { useMemo } from 'react'
import Svg, { Defs, FeGaussianBlur, Filter, Path, Rect } from 'react-native-svg'

import { useColors } from '~/styles/theme'

// sizes in cells, measured on the Figma card (32 × 32 cells in 293 px)
/** Unrevealed cell: a small centered dot. */
const DOT = 0.3
/** Next pixel: an orange outlined square, with its bottom filled. */
const NEXT = 0.64
const NEXT_BAR = 0.19
/** Outline of the next pixel, in points. */
const NEXT_STROKE = 1.5
/** Blur of the neighbour cards, in points (Figma layer blur 6 = a standard deviation of 3). */
const BLUR = 3

export interface PixelGridParams {
  /** Cells per row and per column. */
  width: number
  height: number
  /** Colors of the image, `#RRGGBB`. */
  palette: readonly string[]
  /** Palette index of each cell, row by row, from the top left. */
  cells: readonly number[]
  /** Revealed cells, from the top left, row by row. */
  revealed: number
}

export interface PixelGridProps extends PixelGridParams {
  /** Side of the square, in points. */
  size: number
  /** Mark the next cell to reveal (the image being revealed). */
  showNext?: boolean
  /** Blurred, like the cards next to the one in front. */
  blurred?: boolean
}

function cellPath(index: number, width: number, inset: number, side: number): string {
  return `M${(index % width) + inset} ${Math.floor(index / width) + inset}h${side}v${side}h-${side}Z`
}

/**
 * The paths of a grid, in cells: one per palette color for the revealed cells (so that a
 * 64 × 64 image is a few paths, not 4 096 views), one for the dots of the others, and the
 * next cell to reveal when it is marked (`null` when not marked or when every cell is revealed).
 */
export function pixelGridPaths({ width, palette, cells, revealed }: PixelGridParams, markNext: boolean) {
  const next = markNext && revealed < cells.length ? revealed : null
  const byColor = new Map<string, string[]>()
  const dots: string[] = []

  cells.forEach((colorIndex, index) => {
    if (index < revealed) {
      const color = palette[colorIndex]
      const paths = byColor.get(color) ?? []
      paths.push(cellPath(index, width, 0, 1))
      byColor.set(color, paths)
    } else if (index !== next) {
      dots.push(cellPath(index, width, (1 - DOT) / 2, DOT))
    }
  })

  return {
    colors: [...byColor].map(([color, paths]) => ({ color, d: paths.join('') })),
    dots: dots.join(''),
    next,
  }
}

/**
 * A pixel art image as one drawing: revealed cells in their colors, the others as dots,
 * and the next cell outlined in orange. Decorative: the card around it carries the label.
 */
export function PixelGrid({ width, height, palette, cells, revealed, size, showNext = false, blurred = false }: PixelGridProps) {
  const colors = useColors()
  // 4 096 cells for a 64 × 64 image: computed again only when the image or its progress changes
  const paths = useMemo(
    () => pixelGridPaths({ width, height, palette, cells, revealed }, showNext),
    [width, height, palette, cells, revealed, showNext],
  )
  // points → cells: the drawing is in cells, scaled to `size` by the viewBox
  const point = width / size
  const { next } = paths
  // on each shape: react-native-svg applies filters to shapes, not to a group (iOS)
  const filter = blurred ? 'url(#blur)' : undefined

  return (
    <Svg width={size} height={(size * height) / width} viewBox={`0 0 ${width} ${height}`}>
      {blurred && (
        <Defs>
          <Filter id="blur" x="-10%" y="-10%" width="120%" height="120%">
            <FeGaussianBlur stdDeviation={BLUR * point} />
          </Filter>
        </Defs>
      )}
        <Rect width={width} height={height} fill={colors.surface} filter={filter} />
        {paths.colors.map(({ color, d }) => (
          <Path key={color} d={d} fill={color} filter={filter} />
        ))}
        <Path d={paths.dots} fill={colors.control} filter={filter} />
        {next !== null && (
          <>
            <Rect
              x={(next % width) + (1 - NEXT) / 2}
              y={Math.floor(next / width) + (1 - NEXT) / 2}
              width={NEXT}
              height={NEXT}
              fill="none"
              stroke={colors.accent}
              strokeWidth={NEXT_STROKE * point}
              filter={filter}
            />
            <Rect
              x={(next % width) + (1 - NEXT) / 2}
              y={Math.floor(next / width) + (1 + NEXT) / 2 - NEXT_BAR}
              width={NEXT}
              height={NEXT_BAR}
              fill={colors.accent}
              filter={filter}
            />
          </>
        )}
    </Svg>
  )
}
