import { render, screen } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'

import { LOADER_CELLS, LOADER_STEP_MS, loaderFilledAt, PixelLoader, REDUCED_MOTION_FILLED } from '~/components/ui/PixelLoader'

// the grid is decorative, hidden from the screen reader: the queries must include hidden elements
const HIDDEN = { includeHiddenElements: true }

/** Top-left corner of the outlined cell, in the 96 × 96 grid of 8 px cells. */
function currentCell() {
  const { x, y } = screen.getByTestId('pixel-loader-current', HIDDEN).props
  return { column: Math.round((Number(x) - 0.75) / 8), row: Math.round((Number(y) - 0.75) / 8) }
}

describe('loaderFilledAt', () => {
  it.each([
    [0, 0],
    [LOADER_STEP_MS - 1, 0],
    [LOADER_STEP_MS, 1],
    [LOADER_STEP_MS * 60, 60],
    [LOADER_STEP_MS * LOADER_CELLS, LOADER_CELLS],
  ])('fills one cell every 10 ms: %i ms → %i cells', (elapsed, filled) => {
    expect(loaderFilledAt(elapsed)).toBe(filled)
  })

  it('clears the grid and starts again once every cell is filled', () => {
    expect(loaderFilledAt(LOADER_STEP_MS * (LOADER_CELLS + 1))).toBe(0)
    expect(loaderFilledAt(LOADER_STEP_MS * (LOADER_CELLS + 2))).toBe(1)
  })
})

describe('PixelLoader', () => {
  it('outlines the next cell after the filled ones: 60 filled → row 6, first column', async () => {
    await render(<PixelLoader filled={60} />)

    expect(currentCell()).toEqual({ column: 0, row: 5 })
  })

  it('outlines no cell when the whole grid is filled', async () => {
    await render(<PixelLoader filled={LOADER_CELLS} />)

    expect(screen.queryByTestId('pixel-loader-current', HIDDEN)).toBeNull()
  })

  it('stays half filled, without moving, when "Reduce motion" is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)

    await render(<PixelLoader />)

    // 72 filled cells: the outlined one starts the 7th row
    await screen.findByTestId('pixel-loader-current', HIDDEN)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(REDUCED_MOTION_FILLED).toBe(72)
    expect(currentCell()).toEqual({ column: 0, row: 6 })
  })
})
