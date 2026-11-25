import { convertImage, formatImage, MAX_COLORS } from './pixel-image'

type Rgba = [number, number, number, number]

const CREAM: Rgba = [0xfb, 0xf7, 0xee, 255]
const INK: Rgba = [0x3b, 0x24, 0x18, 255]

/** A decoded PNG of `width × height` pixels, each one given by `pixel(x, y)`. */
function png(width: number, height: number, pixel: (x: number, y: number) => Rgba = () => CREAM) {
  const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(pixel(x, y), (y * width + x) * 4)
  }
  return { width, height, data }
}

/** A color per index, so that `count` different colors can be drawn. */
function color(index: number): Rgba {
  return [index, 0, 0, 255]
}

describe('convertImage', () => {
  it('builds the palette in reading order and gives each cell its palette index', () => {
    // first row cream, then ink: cream is met first, so it is color 0
    const result = convertImage(png(32, 32, (_x, y) => (y === 0 ? CREAM : INK)), { smallAllowed: false })

    expect(result).toEqual({
      image: {
        width: 32,
        height: 32,
        palette: ['#FBF7EE', '#3B2418'],
        cells: [...Array(32).fill(0), ...Array(32 * 31).fill(1)],
      },
    })
  })

  it('gives the same data for the same PNG', () => {
    const drawing = png(32, 32, (x, y) => ((x + y) % 2 === 0 ? CREAM : INK))

    expect(convertImage(drawing, { smallAllowed: false })).toEqual(convertImage(drawing, { smallAllowed: false }))
  })

  it.each([32, 48, 64])('accepts %i × %i', (size) => {
    expect(convertImage(png(size, size), { smallAllowed: false })).toHaveProperty('image')
  })

  it('accepts 16 × 16 for image 01 only', () => {
    expect(convertImage(png(16, 16), { smallAllowed: true })).toHaveProperty('image')
    expect(convertImage(png(16, 16), { smallAllowed: false })).toEqual({
      errors: ['size is 16 × 16, expected 32 × 32, 48 × 48, 64 × 64'],
    })
  })

  it.each([
    [17, 17],
    [31, 31],
    [16, 32],
    [32, 48],
  ])('refuses %i × %i', (width, height) => {
    expect(convertImage(png(width, height), { smallAllowed: true })).toEqual({
      errors: [`size is ${width} × ${height}, expected 16 × 16, 32 × 32, 48 × 48, 64 × 64`],
    })
  })

  it('refuses a PNG with one pixel that is not fully opaque', () => {
    const result = convertImage(png(32, 32, (x, y) => (x === 5 && y === 5 ? [0x3b, 0x24, 0x18, 254] : CREAM)), {
      smallAllowed: false,
    })

    expect(result).toEqual({ errors: ['1 transparent pixel(s), the image must be fully opaque'] })
  })

  it(`accepts ${MAX_COLORS} colors and refuses ${MAX_COLORS + 1}`, () => {
    const withColors = (count: number) => png(32, 32, (x, y) => color((y * 32 + x) % count))

    expect(convertImage(withColors(MAX_COLORS), { smallAllowed: false })).toHaveProperty('image')
    expect(convertImage(withColors(MAX_COLORS + 1), { smallAllowed: false })).toEqual({
      errors: [`${MAX_COLORS + 1} colors, maximum ${MAX_COLORS}`],
    })
  })

  it('reports every broken rule at once', () => {
    const result = convertImage(png(17, 17, () => [0, 0, 0, 0]), { smallAllowed: false })

    expect(result).toHaveProperty('errors', [
      'size is 17 × 17, expected 32 × 32, 48 × 48, 64 × 64',
      '289 transparent pixel(s), the image must be fully opaque',
    ])
  })
})

describe('formatImage', () => {
  it('writes one line per row of cells, and reads back as the same data', () => {
    const image = { width: 16, height: 16, palette: ['#FBF7EE', '#3B2418'], cells: Array.from({ length: 256 }, (_, i) => i % 2) }
    const json = formatImage(image)

    expect(JSON.parse(json)).toEqual(image)
    // the cells are written as 16 lines of 16 numbers
    const rows = json.split('\n').filter((line) => /^ {4}\d/.test(line))
    expect(rows).toHaveLength(16)
    expect(rows.every((row) => row.split(',').filter((cell) => cell.trim() !== '').length === 16)).toBe(true)
  })
})
