import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { validationsRepository } from '~/repositories/validations.repository'

describe('validationsRepository', () => {
  // each test starts from an empty table
  beforeEach(() => {
    db.delete(validations).run()
  })

  it('saves a validation unsynced, with 100 steps per pixel', () => {
    const validatedAt = new Date('2026-11-25T18:00:00.000Z')
    validationsRepository.add([{ imageNumber: 1, pixels: 12 }], validatedAt)

    expect(validationsRepository.getAll()).toEqual([
      {
        id: expect.any(String),
        imageNumber: 1,
        pixels: 12,
        steps: 1200,
        validatedAt: '2026-11-25T18:00:00.000Z',
        synced: false,
      },
    ])
  })

  it('saves one row per image, each with its own id, in the given order', () => {
    const rows = validationsRepository.add([
      { imageNumber: 2, pixels: 4 },
      { imageNumber: 1, pixels: 3 },
    ])

    expect(rows[0].id).not.toBe(rows[1].id)
    expect(rows[0].validatedAt).toBe(rows[1].validatedAt)
    expect(validationsRepository.getAll().map(({ imageNumber }) => imageNumber)).toEqual([2, 1])
  })

  it.each([0, -3, 1.5, NaN])('refuses %p pixels and saves nothing', (pixels) => {
    expect(() =>
      validationsRepository.add([
        { imageNumber: 1, pixels: 4 },
        { imageNumber: 2, pixels },
      ]),
    ).toThrow(RangeError)
    expect(validationsRepository.getAll()).toEqual([])
  })

  it('refuses in the database a row Supabase would refuse', () => {
    const row = { id: 'id', imageNumber: 1, validatedAt: '2026-11-25T18:00:00.000Z' }

    expect(() => db.insert(validations).values({ ...row, pixels: 0, steps: 0 }).run()).toThrow()
    expect(() => db.insert(validations).values({ ...row, pixels: 2, steps: 150 }).run()).toThrow()
  })

  it('saves nothing when one row of the validation fails', () => {
    // the same id twice breaks the primary key on the second row
    const crypto = jest.requireMock<{ randomUUID: () => string }>('expo-crypto')
    jest.spyOn(crypto, 'randomUUID').mockReturnValue('same-id')

    expect(() =>
      validationsRepository.add([
        { imageNumber: 1, pixels: 4 },
        { imageNumber: 2, pixels: 3 },
      ]),
    ).toThrow()
    expect(validationsRepository.getAll()).toEqual([])
  })

  it('returns the validations oldest first', () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 2 }], new Date('2026-11-26T08:00:00.000Z'))
    validationsRepository.add([{ imageNumber: 1, pixels: 1 }], new Date('2026-11-25T08:00:00.000Z'))

    expect(validationsRepository.getAll().map(({ pixels }) => pixels)).toEqual([1, 2])
  })
})
