import type { ImageRequireSource } from 'react-native'

import { STEPS_PER_PIXEL } from '~/lib/rules'

import mushroom from './01-champignon.json'
import star from './02-etoile.json'
import leaf from './03-feuille.json'

/** Number, cells and colors of an image, as written by `pnpm images:convert`. */
interface PixelData {
  /**
   * Order of the image, shown as `01`, and stored in `validations.image_number`.
   * Read from the PNG's file name by the script, so it is never typed by hand.
   */
  number: number
  width: number
  height: number
  /** Colors of the image, `#RRGGBB`. */
  palette: string[]
  /** Palette index of each cell, row by row, from the top left. */
  cells: number[]
}

/** One image of the catalogue, shipped with the app so it works offline. */
export interface CatalogueImage extends PixelData {
  /** Key of the image's name in `fr.json` (`LE CHAMPIGNON`). */
  nameKey: string
  /** The original PNG, shown when the image is finished. */
  source: ImageRequireSource
  /** Steps to reveal the whole image: number of cells × `STEPS_PER_PIXEL`. */
  steps: number
}

function catalogueImage(nameKey: string, data: PixelData, source: ImageRequireSource): CatalogueImage {
  return { ...data, nameKey, source, steps: data.cells.length * STEPS_PER_PIXEL }
}

/** Every image, in the order they are revealed. */
export const CATALOGUE: readonly CatalogueImage[] = Object.freeze([
  catalogueImage('images.mushroom', mushroom, require('../../../assets/images/pixel-art/01-champignon.png')),
  catalogueImage('images.star', star, require('../../../assets/images/pixel-art/02-etoile.png')),
  catalogueImage('images.leaf', leaf, require('../../../assets/images/pixel-art/03-feuille.png')),
])
