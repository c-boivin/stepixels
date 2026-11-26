import { CATALOGUE } from '~/data/images/catalogue'
import fr from '~/data/messages/fr.json'
import { STEPS_PER_PIXEL } from '~/lib/rules'

/** The text of an i18n key (`images.mushroom.name`) in fr.json, or undefined when it is missing. */
function frText(key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], fr)
}

describe('CATALOGUE', () => {
  it('has at least 3 images, numbered from 1 in order', () => {
    expect(CATALOGUE.length).toBeGreaterThanOrEqual(3)
    expect(CATALOGUE.map(({ number }) => number)).toEqual(CATALOGUE.map((_, index) => index + 1))
  })

  it('starts with image 01 in 16 × 16, so that it is finished during the demo week (25 600 steps)', () => {
    expect(CATALOGUE[0]).toMatchObject({ width: 16, height: 16, steps: 25_600 })
  })

  it.each(CATALOGUE.map((image) => [image.number, image]))('image %i has one cell per pixel', (_number, image) => {
    expect(image.cells).toHaveLength(image.width * image.height)
  })

  it.each(CATALOGUE.map((image) => [image.number, image]))('image %i only uses colors of its palette', (_number, image) => {
    expect(image.palette.every((color) => /^#[0-9A-F]{6}$/.test(color))).toBe(true)
    expect(image.cells.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < image.palette.length)).toBe(true)
  })

  it.each(CATALOGUE.map((image) => [image.number, image]))('image %i needs 100 steps per cell (R1)', (_number, image) => {
    expect(image.steps).toBe(image.cells.length * STEPS_PER_PIXEL)
  })

  it.each(CATALOGUE.map((image) => [image.number, image]))('image %i has a name and a sentence in fr.json and its PNG', (_number, image) => {
    expect(typeof frText(`${image.textKey}.name`)).toBe('string')
    expect(typeof frText(`${image.textKey}.complete`)).toBe('string')
    expect(image.source).toBeDefined()
  })
})
