import { pixelGridPaths } from '~/components/ui/PixelGrid'

// 3 × 2 cells, two colors: red red blue / blue red blue
const GRID = { width: 3, height: 2, palette: ['#FF0000', '#0000FF'], cells: [0, 0, 1, 1, 0, 1] }

describe('pixelGridPaths', () => {
  it('reveals the cells row by row, from the top left, one path per color', () => {
    const { colors } = pixelGridPaths({ ...GRID, revealed: 4 }, false)

    expect(colors).toEqual([
      { color: '#FF0000', d: 'M0 0h1v1h-1ZM1 0h1v1h-1Z' },
      // the 4th cell is the first one of the second row
      { color: '#0000FF', d: 'M2 0h1v1h-1ZM0 1h1v1h-1Z' },
    ])
  })

  it('draws a dot on every other cell, and leaves the next one to its orange mark', () => {
    expect(pixelGridPaths({ ...GRID, revealed: 4 }, false).dots.match(/M/g)).toHaveLength(2)

    const marked = pixelGridPaths({ ...GRID, revealed: 4 }, true)
    expect(marked.next).toBe(4)
    expect(marked.dots.match(/M/g)).toHaveLength(1)
  })

  it('has no dot and no next cell once every cell is revealed', () => {
    const { dots, next } = pixelGridPaths({ ...GRID, revealed: 6 }, true)

    expect(dots).toBe('')
    expect(next).toBeNull()
  })

  it('draws a 64 × 64 image as one path per color', () => {
    const cells = Array.from({ length: 64 * 64 }, (_, index) => index % 4)
    const { colors } = pixelGridPaths({ width: 64, height: 64, palette: ['#1', '#2', '#3', '#4'], cells, revealed: 4096 }, false)

    expect(colors).toHaveLength(4)
  })
})
