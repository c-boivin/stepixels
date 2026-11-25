/**
 * Drawing rules of a pixel art image, and its conversion into the data the app draws (issue #18).
 * Pure functions, no file access: `convert-images.mts` reads and writes the files, Jest tests these.
 */
import type { PNG } from 'pngjs'

/** Allowed sizes, in cells per side (Figma notes): 16 × 16 is kept for image 01. */
export const SIZES = [16, 32, 48, 64]
export const SMALL_SIZE = 16
export const MAX_COLORS = 32

/** Data of one image, as the app reads it. */
export interface PixelImage {
  width: number
  height: number
  /** Colors of the image, `#RRGGBB`, in the order they first appear. */
  palette: string[]
  /** Palette index of each cell, row by row, from the top left. */
  cells: number[]
}

/** What `pnpm images:convert` writes: the image and its number, read from the file name (`03-feuille.png` → 3). */
export interface PixelImageFile extends PixelImage {
  number: number
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
export function formatImage({ number, width, height, palette, cells }: PixelImageFile): string {
  const rows = Array.from({ length: height }, (_, row) => `    ${cells.slice(row * width, (row + 1) * width).join(', ')}`)

  return [
    '{',
    `  "number": ${number},`,
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
