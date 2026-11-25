import type { ImageRequireSource } from 'react-native'

import { STEPS_PER_PIXEL } from '~/lib/rules'

import mushroom from './01-champignon.json'
import star from './02-etoile.json'
import leaf from './03-feuille.json'

/** Cells and colors of an image, as written by `pnpm images:convert`. */
interface PixelData {
  width: number
  height: number
  /** Colors of the image, `#RRGGBB`. */
  palette: string[]
  /** Palette index of each cell, row by row, from the top left. */
  cells: number[]
}

/** One image of the catalogue, shipped with the app so it works offline. */
export interface CatalogueImage extends PixelData {
  /** Order of the image, shown as `01`, and stored in `validations.image_number`. */
  number: number
  /** Key of the image's name in `fr.json` (`LE CHAMPIGNON`). */
  nameKey: string
  /** The original PNG, shown when the image is finished. */
  source: ImageRequireSource
  /** Steps to reveal the whole image: number of cells × `STEPS_PER_PIXEL`. */
  steps: number
}

function catalogueImage(number: number, nameKey: string, data: PixelData, source: ImageRequireSource): CatalogueImage {
  return { number, nameKey, ...data, source, steps: data.cells.length * STEPS_PER_PIXEL }
}

/** Every image, in the order they are revealed. */
export const CATALOGUE: readonly CatalogueImage[] = Object.freeze([
  catalogueImage(1, 'images.mushroom', mushroom, require('../../../assets/images/pixel-art/01-champignon.png')),
  catalogueImage(2, 'images.star', star, require('../../../assets/images/pixel-art/02-etoile.png')),
  catalogueImage(3, 'images.leaf', leaf, require('../../../assets/images/pixel-art/03-feuille.png')),
])
