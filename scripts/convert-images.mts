/**
 * Converts the pixel art PNGs into the JSON the app draws (issue #18).
 *
 * Run with `pnpm images:convert`: every PNG of `assets/images/pixel-art/` gives a
 * JSON with the same name in `src/data/images/`. A PNG that breaks a rule (file
 * name, size, transparency, number of colors) or cannot be read is refused with a message.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const SOURCE_DIR = 'assets/images/pixel-art'
const OUTPUT_DIR = 'src/data/images'

/** Allowed sizes, in cells per side (Figma notes): 16 × 16 is kept for image 01. */
const SIZES = [16, 32, 48, 64]
const SMALL_SIZE = 16
const MAX_COLORS = 32
/** `<two-digit number>-<name>.png`, for example `01-champignon.png`. */
const FILE_NAME = /^\d{2}-[a-z0-9-]+\.png$/i

/** Data of one image, as the app reads it. */
export interface PixelImage {
  width: number
  height: number
  /** Colors of the image, `#RRGGBB`, in the order they first appear. */
  palette: string[]
  /** Palette index of each cell, row by row, from the top left. */
  cells: number[]
}

export type ConversionResult = { image: PixelImage } | { errors: string[] }

/**
 * Checks the drawing rules and builds the palette and the cells of a decoded PNG.
 * The palette is filled in reading order, so the same PNG always gives the same data.
 * `smallAllowed`: whether 16 × 16 is allowed (image 01 only).
 */
export function convertImage(
  { width, height, data }: Pick<PNG, 'width' | 'height' | 'data'>,
  { smallAllowed }: { smallAllowed: boolean },
): ConversionResult {
  const errors: string[] = []
  const sizes = smallAllowed ? SIZES : SIZES.filter((size) => size !== SMALL_SIZE)

  if (width !== height || !sizes.includes(width)) {
    errors.push(`size is ${width} × ${height}, expected ${sizes.map((size) => `${size} × ${size}`).join(', ')}`)
  }

  const palette: string[] = []
  const cells: number[] = []
  let transparent = 0

  for (let offset = 0; offset < width * height * 4; offset += 4) {
    if (data[offset + 3] !== 255) transparent++

    const color = `#${[data[offset], data[offset + 1], data[offset + 2]]
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()}`
    let index = palette.indexOf(color)
    if (index === -1) index = palette.push(color) - 1
    cells.push(index)
  }

  if (transparent > 0) errors.push(`${transparent} transparent pixel(s), the image must be fully opaque`)
  if (palette.length > MAX_COLORS) errors.push(`${palette.length} colors, maximum ${MAX_COLORS}`)

  return errors.length > 0 ? { errors } : { image: { width, height, palette, cells } }
}

/** JSON with one line per row of cells, so that a change is easy to read in a diff. */
function formatImage({ width, height, palette, cells }: PixelImage): string {
  const rows = Array.from({ length: height }, (_, row) => `    ${cells.slice(row * width, (row + 1) * width).join(', ')}`)

  return [
    '{',
    `  "width": ${width},`,
    `  "height": ${height},`,
    `  "palette": ${JSON.stringify(palette)},`,
    '  "cells": [',
    rows.join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n')
}

function main() {
  const files = readdirSync(SOURCE_DIR)
    .filter((file) => file.toLowerCase().endsWith('.png'))
    .sort()
  let refused = 0
  mkdirSync(OUTPUT_DIR, { recursive: true })

  for (const file of files) {
    const errors = convertFile(file)

    if (errors.length > 0) {
      refused++
      for (const error of errors) console.error(`✗ ${file}: ${error}`)
    }
  }

  // A JSON whose PNG was renamed or deleted is not removed: warn, so it is not imported by mistake
  const names = new Set(files.map(withoutExtension))
  for (const json of readdirSync(OUTPUT_DIR).filter((file) => file.endsWith('.json'))) {
    if (!names.has(withoutExtension(json))) console.warn(`! ${join(OUTPUT_DIR, json)} has no PNG in ${SOURCE_DIR}`)
  }

  console.log(`${files.length - refused} converted, ${refused} refused`)
  if (refused > 0) process.exitCode = 1
}

/** Converts one PNG of `SOURCE_DIR` and writes its JSON. Returns the broken rules, empty when it is written. */
function convertFile(file: string): string[] {
  if (!FILE_NAME.test(file)) return ['name must be <two-digit number>-<name>.png, for example 01-champignon.png']

  let png: PNG
  try {
    png = PNG.sync.read(readFileSync(join(SOURCE_DIR, file)))
  } catch (error) {
    return [`not a readable PNG (${error instanceof Error ? error.message : String(error)})`]
  }

  const result = convertImage(png, { smallAllowed: file.startsWith('01-') })
  if ('errors' in result) return result.errors

  const output = join(OUTPUT_DIR, `${withoutExtension(file)}.json`)
  writeFileSync(output, formatImage(result.image))
  console.log(`✓ ${file} → ${output} (${result.image.width} × ${result.image.height}, ${result.image.palette.length} colors)`)
  return []
}

/** `01-champignon.PNG` → `01-champignon`, whatever the case of the extension. */
function withoutExtension(file: string): string {
  return file.replace(/\.(png|json)$/i, '')
}

// Run only when started by Node (`pnpm images:convert`), not when imported by a test.
// `import.meta.main` would be simpler, but only exists from Node 24.2.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
