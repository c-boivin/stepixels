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
 *
 * An image is only revealed once it is unlocked (#31): after a finished image, the next one
 * stays locked until the user taps `SUIVANT`, even if it already has pixels (carried over by
 * the validation that finished the previous image, OQ-12).
 * @param unlockedImage number of the last unlocked image; every image is unlocked by default.
 */
export function getImagesProgress<T extends ProgressImage>(
  images: readonly T[],
  validations: readonly ProgressValidation[],
  unlockedImage = Infinity,
): ImageProgress<T>[] {
  const pixelsByImage = sumPixelsByImage(validations)

  const progress: ImageProgress<T>[] = []
  for (const image of images) {
    if (progress.length > 0 && (progress.at(-1)?.state !== 'finished' || image.number > unlockedImage)) {
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

/**
 * Splits the pixels of a validation between the images (R1, OQ-12): the image being revealed
 * first, then the pixels beyond its end go to the next images, in catalogue order, even locked.
 * Pixels beyond the last image are dropped: finishing the catalogue is out of V1 (OQ-13).
 * Returns one part per image touched, never a part of 0 pixel.
 */
export function splitPixels(
  images: readonly ProgressImage[],
  validations: readonly ProgressValidation[],
  pixels: number,
): ProgressValidation[] {
  const pixelsByImage = sumPixelsByImage(validations)
  const parts: ProgressValidation[] = []
  let left = pixels

  for (const image of images) {
    if (left <= 0) break

    const room = image.cells.length - Math.min(pixelsByImage.get(image.number) ?? 0, image.cells.length)
    const taken = Math.min(room, left)
    if (taken > 0) parts.push({ imageNumber: image.number, pixels: taken })
    left -= taken
  }

  return parts
}

function sumPixelsByImage(validations: readonly ProgressValidation[]): Map<number, number> {
  const pixelsByImage = new Map<number, number>()
  for (const { imageNumber, pixels } of validations) {
    pixelsByImage.set(imageNumber, (pixelsByImage.get(imageNumber) ?? 0) + pixels)
  }
  return pixelsByImage
}

/** A validation with its time: needed to know whether an image was unlocked. */
export interface TimedValidation extends ProgressValidation {
  validatedAt: Date
}

/**
 * The last unlocked image, as the validations show it (#31): image N+1 is unlocked when it has a
 * validation made after the one that finished image N, since validating it needed `SUIVANT`.
 * Pixels carried over by the validation that finished image N have the same time: they do not
 * unlock it. Brings the unlocked image back with the validations restored from an account (#64);
 * only a `SUIVANT` with no validation since is not in the validations.
 * @param validations oldest first.
 */
export function getUnlockedImageFromValidations(images: readonly ProgressImage[], validations: readonly TimedValidation[]): number {
  let unlocked = images[0]?.number ?? 1

  for (const [index, image] of images.entries()) {
    const next = images[index + 1]
    const finishedAt = getFinishedAt(image, validations)
    if (next === undefined || finishedAt === null) break

    const validatedAfter = validations.some(
      ({ imageNumber, validatedAt }) => imageNumber === next.number && validatedAt > finishedAt,
    )
    if (!validatedAfter) break
    unlocked = next.number
  }

  return unlocked
}

/** Time of the validation that revealed the last cell of `image`; `null` while it is not finished. */
function getFinishedAt(image: ProgressImage, validations: readonly TimedValidation[]): Date | null {
  let revealed = 0
  for (const { imageNumber, pixels, validatedAt } of validations) {
    if (imageNumber !== image.number) continue
    revealed += pixels
    if (revealed >= image.cells.length) return validatedAt
  }
  return null
}

/**
 * Whether image `number` may be unlocked (#35): the image before it exists and every one of its
 * cells is revealed by these validations.
 */
export function canUnlockImage(images: readonly ProgressImage[], validations: readonly ProgressValidation[], number: number): boolean {
  const previous = images.find((image) => image.number === number - 1)
  if (previous === undefined) return false

  const revealed = validations
    .filter(({ imageNumber }) => imageNumber === previous.number)
    .reduce((sum, { pixels }) => sum + pixels, 0)
  return revealed >= previous.cells.length
}
