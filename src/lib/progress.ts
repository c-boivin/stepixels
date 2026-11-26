/**
 * Where each image stands, from the pixels validated so far (pure: no storage, no display).
 * - `finished`: every cell is revealed;
 * - `current`: the image being revealed, with some pixels already (tag `EN COURS`);
 * - `new`: the image being revealed, with no pixel yet (tag `NOUVELLE`);
 * - `locked`: the image after the current one, shown but not reachable yet.
 */
export type ImageState = 'finished' | 'current' | 'new' | 'locked'

/** The part of a catalogue image the progress needs: its number and its cells. */
export interface ProgressImage {
  number: number
  cells: readonly number[]
}

/** The part of a validation the progress needs: which image, how many pixels. */
export interface ProgressValidation {
  imageNumber: number
  pixels: number
}

export interface ImageProgress<T extends ProgressImage> {
  image: T
  /** Revealed cells, from the top left, row by row: at most the number of cells. */
  revealed: number
  state: ImageState
}

/**
 * The images to show, in catalogue order: the finished ones, then the one being revealed,
 * then the next one, locked. Images after it are not shown. When every image is finished,
 * there is no image being revealed and nothing is locked.
 */
export function getImagesProgress<T extends ProgressImage>(
  images: readonly T[],
  validations: readonly ProgressValidation[],
): ImageProgress<T>[] {
  const pixelsByImage = new Map<number, number>()
  for (const { imageNumber, pixels } of validations) {
    pixelsByImage.set(imageNumber, (pixelsByImage.get(imageNumber) ?? 0) + pixels)
  }

  const progress: ImageProgress<T>[] = []
  for (const image of images) {
    if (progress.length > 0 && progress.at(-1)?.state !== 'finished') {
      // the image after the one being revealed: shown locked, nothing revealed, and the last one shown
      progress.push({ image, revealed: 0, state: 'locked' })
      break
    }

    const revealed = Math.min(pixelsByImage.get(image.number) ?? 0, image.cells.length)
    const state = revealed === image.cells.length ? 'finished' : revealed > 0 ? 'current' : 'new'
    progress.push({ image, revealed, state })
  }

  return progress
}
