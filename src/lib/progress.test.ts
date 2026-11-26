import { getImagesProgress } from '~/lib/progress'

// three small images: 4, 4 and 9 cells
const IMAGES = [
  { number: 1, cells: [0, 0, 0, 0] },
  { number: 2, cells: [0, 0, 0, 0] },
  { number: 3, cells: [0, 0, 0, 0, 0, 0, 0, 0, 0] },
]

function states(validations: { imageNumber: number; pixels: number }[]) {
  return getImagesProgress(IMAGES, validations).map(({ image, revealed, state }) => [image.number, revealed, state])
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
})
