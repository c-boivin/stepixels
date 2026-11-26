import { imageCardAdapter, imageFinishedAdapter } from '~/data/adapters/images.adapters'
import { CATALOGUE } from '~/data/images/catalogue'

const MUSHROOM = CATALOGUE[0]
// Intl writes French thousands with a narrow no-break space (U+202F)
const SPACE = '\u202F'

describe('imageCardAdapter', () => {
  it('names the image with its two-digit number', () => {
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'new' }).title).toBe('01 - LE CHAMPIGNON')
  })

  it('tags the image by its state', () => {
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'new' }).tag).toBe('NOUVELLE')
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 42, state: 'current' }).tag).toBe('EN COURS')
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 256, state: 'finished' }).tag).toBe('TERMINÉE')
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'locked' }).tag).toBeNull()
  })

  it('gives the steps of a finished image only, with French thousands separators', () => {
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 256, state: 'finished' }).steps).toBe(`25${SPACE}600`)
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 42, state: 'current' }).steps).toBeNull()
  })

  it('sums up the card for the screen reader', () => {
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'new' }).summary).toBe(
      '01 - LE CHAMPIGNON, aucun pixel révélé sur 256',
    )
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 1, state: 'current' }).summary).toBe(
      '01 - LE CHAMPIGNON, 1 pixel révélé sur 256',
    )
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 42, state: 'current' }).summary).toBe(
      '01 - LE CHAMPIGNON, 42 pixels révélés sur 256',
    )
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 256, state: 'finished' }).summary).toBe(
      `01 - LE CHAMPIGNON, terminée en 25${SPACE}600 pas`,
    )
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'locked' }).summary).toBe('01 - LE CHAMPIGNON, verrouillée')
  })

  it('reveals nothing of the locked image', () => {
    expect(imageCardAdapter({ image: MUSHROOM, revealed: 0, state: 'locked' }).revealed).toBe(0)
  })
})

describe('imageFinishedAdapter', () => {
  it('shows the whole image, its name, and its steps, days and distance', () => {
    expect(imageFinishedAdapter({ image: MUSHROOM, days: 4, next: 2 })).toMatchObject({
      revealed: 256,
      name: 'LE CHAMPIGNON',
      summary: `25${SPACE}600 pas · 4 jours · 19 km`,
      next: 2,
    })
  })

  it('writes a single day in the singular', () => {
    expect(imageFinishedAdapter({ image: MUSHROOM, days: 1, next: 2 }).summary).toBe(`25${SPACE}600 pas · 1 jour · 19 km`)
  })
})
