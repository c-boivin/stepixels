import { canUnlockImage, getImagesProgress, getUnlockedImageFromValidations, splitPixels } from '~/lib/progress'

// three small images: 4, 4 and 9 cells
const IMAGES = [
  { number: 1, cells: [0, 0, 0, 0] },
  { number: 2, cells: [0, 0, 0, 0] },
  { number: 3, cells: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
]

function states(validations: { imageNumber: number; pixels: number }[], unlockedImage?: number) {
  return getImagesProgress(IMAGES, validations, unlockedImage).map(({ image, revealed, state }) => [image.number, revealed, state])
}

describe('getImagesProgress', () => {
  it('starts with the first image new and the second one locked', () => {
    expect(states([])).toEqual([
      [1, 0, 'new'],
      [2, 0, 'locked'],
    ])
  })

  it('adds up the pixels of every validation of the image being revealed', () => {
    expect(
      states([
        { imageNumber: 1, pixels: 1 },
        { imageNumber: 1, pixels: 2 },
      ]),
    ).toEqual([
      [1, 3, 'current'],
      [2, 0, 'locked'],
    ])
  })

  it('finishes an image when every cell is revealed, and starts the next one', () => {
    expect(states([{ imageNumber: 1, pixels: 4 }])).toEqual([
      [1, 4, 'finished'],
      [2, 0, 'new'],
      [3, 0, 'locked'],
    ])
  })

  it('keeps the finished images on the left of the one being revealed', () => {
    expect(
      states([
        { imageNumber: 1, pixels: 4 },
        { imageNumber: 2, pixels: 4 },
        { imageNumber: 3, pixels: 5 },
      ]),
    ).toEqual([
      [1, 4, 'finished'],
      [2, 4, 'finished'],
      [3, 5, 'current'],
    ])
  })

  it('never reveals more cells than the image has', () => {
    expect(states([{ imageNumber: 1, pixels: 7 }])[0]).toEqual([1, 4, 'finished'])
  })

  it('shows every image finished, and nothing locked, once the catalogue is done', () => {
    expect(
      states([
        { imageNumber: 1, pixels: 4 },
        { imageNumber: 2, pixels: 4 },
        { imageNumber: 3, pixels: 9 },
      ]),
    ).toEqual([
      [1, 4, 'finished'],
      [2, 4, 'finished'],
      [3, 9, 'finished'],
    ])
  })

  it('keeps the next image locked after a finished image until it is unlocked (#31)', () => {
    expect(states([{ imageNumber: 1, pixels: 4 }], 1)).toEqual([
      [1, 4, 'finished'],
      [2, 0, 'locked'],
    ])
  })

  it('keeps the pixels carried to a locked image hidden until it is unlocked', () => {
    const validations = [
      { imageNumber: 1, pixels: 4 },
      { imageNumber: 2, pixels: 3 },
    ]

    expect(states(validations, 1)[1]).toEqual([2, 0, 'locked'])
    expect(states(validations, 2)[1]).toEqual([2, 3, 'current'])
  })
})

describe('splitPixels', () => {
  it('puts every pixel on the image being revealed when it has room', () => {
    expect(splitPixels(IMAGES, [{ imageNumber: 1, pixels: 1 }], 2)).toEqual([{ imageNumber: 1, pixels: 2 }])
  })

  it('fills the image being revealed exactly, with no part for the next one', () => {
    expect(splitPixels(IMAGES, [{ imageNumber: 1, pixels: 1 }], 3)).toEqual([{ imageNumber: 1, pixels: 3 }])
  })

  it('carries the pixels beyond the end of an image to the next ones (OQ-12)', () => {
    expect(splitPixels(IMAGES, [{ imageNumber: 1, pixels: 3 }], 7)).toEqual([
      { imageNumber: 1, pixels: 1 },
      { imageNumber: 2, pixels: 4 },
      { imageNumber: 3, pixels: 2 },
    ])
  })

  it('starts after the pixels already carried to the next image', () => {
    expect(
      splitPixels(
        IMAGES,
        [
          { imageNumber: 1, pixels: 4 },
          { imageNumber: 2, pixels: 1 },
        ],
        2,
      ),
    ).toEqual([{ imageNumber: 2, pixels: 2 }])
  })

  it('drops the pixels beyond the last image (OQ-13)', () => {
    expect(splitPixels(IMAGES, [], 20)).toEqual([
      { imageNumber: 1, pixels: 4 },
      { imageNumber: 2, pixels: 4 },
      { imageNumber: 3, pixels: 9 },
    ])
  })

  it('gives nothing for 0 pixel', () => {
    expect(splitPixels(IMAGES, [], 0)).toEqual([])
  })
})

describe('getUnlockedImageFromValidations', () => {
  const at = (time: string) => new Date(`2026-11-26T${time}:00`)

  it('unlocks only the first image without validation', () => {
    expect(getUnlockedImageFromValidations(IMAGES, [])).toBe(1)
  })

  it('keeps the next image locked when its only pixels were carried by the validation that finished the image', () => {
    const validations = [
      { imageNumber: 1, pixels: 4, validatedAt: at('10:00') },
      { imageNumber: 2, pixels: 2, validatedAt: at('10:00') },
    ]

    expect(getUnlockedImageFromValidations(IMAGES, validations)).toBe(1)
  })

  it('unlocks an image validated after the previous one was finished: SUIVANT was tapped', () => {
    const validations = [
      { imageNumber: 1, pixels: 3, validatedAt: at('09:00') },
      { imageNumber: 1, pixels: 1, validatedAt: at('10:00') },
      { imageNumber: 2, pixels: 4, validatedAt: at('11:00') },
      { imageNumber: 3, pixels: 1, validatedAt: at('12:00') },
    ]

    expect(getUnlockedImageFromValidations(IMAGES, validations)).toBe(3)
  })
})

describe('canUnlockImage', () => {
  const IMAGES = [
    { number: 1, cells: [0, 0, 0, 0] },
    { number: 2, cells: [0, 0, 0, 0] },
  ]

  it('unlocks an image only once the one before is finished', () => {
    expect(canUnlockImage(IMAGES, [{ imageNumber: 1, pixels: 3 }], 2)).toBe(false)
    expect(canUnlockImage(IMAGES, [{ imageNumber: 1, pixels: 3 }, { imageNumber: 1, pixels: 1 }], 2)).toBe(true)
  })

  it('never unlocks an image without one before it', () => {
    expect(canUnlockImage(IMAGES, [], 1)).toBe(false)
  })
})
