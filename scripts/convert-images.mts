/**
 * Converts the pixel art PNGs into the JSON the app draws (issue #18).
 *
 * Run with `pnpm images:convert`: every PNG of `assets/images/pixel-art/` gives a
 * JSON with the same name in `src/data/images/`. A PNG that breaks a drawing rule
 * (size, transparency, number of colors) is refused with a message.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { PNG } from 'pngjs'

const SOURCE_DIR = 'assets/images/pixel-art'
const OUTPUT_DIR = 'src/data/images'

/** Allowed sizes, in cells per side (Figma notes): 16 × 16 is kept for image 01. */
const SIZES = [16, 32, 48, 64]
const MAX_COLORS = 32

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
 */
export function convertImage({ width, height, data }: Pick<PNG, 'width' | 'height' | 'data'>): ConversionResult {
  const errors: string[] = []

  if (width !== height || !SIZES.includes(width)) {
    errors.push(`size is ${width} × ${height}, expected ${SIZES.map((size) => `${size} × ${size}`).join(', ')}`)
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
    const result = convertImage(PNG.sync.read(readFileSync(join(SOURCE_DIR, file))))

    if ('errors' in result) {
      refused++
      for (const error of result.errors) console.error(`✗ ${file}: ${error}`)
      continue
    }

    const output = join(OUTPUT_DIR, `${basename(file, '.png')}.json`)
    writeFileSync(output, formatImage(result.image))
    console.log(`✓ ${file} → ${output} (${result.image.width} × ${result.image.height}, ${result.image.palette.length} colors)`)
  }

  console.log(`${files.length - refused} converted, ${refused} refused`)
  if (refused > 0) process.exitCode = 1
}

if (import.meta.main) main()
