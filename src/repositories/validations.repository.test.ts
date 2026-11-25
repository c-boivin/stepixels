import { validationsRepository } from './validations.repository'

import { validations } from '~/db/schema'
import { db } from '~/lib/db'

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

  it('saves one row per image, each with its own id', () => {
    const rows = validationsRepository.add([
      { imageNumber: 1, pixels: 4 },
      { imageNumber: 2, pixels: 3 },
    ])

    expect(rows[0].id).not.toBe(rows[1].id)
    expect(rows[0].validatedAt).toBe(rows[1].validatedAt)
    expect(validationsRepository.getAll().map(({ imageNumber }) => imageNumber)).toEqual([1, 2])
  })

  it('saves nothing when one row of the validation fails', () => {
    // the same id twice breaks the primary key on the second row
    const crypto = jest.requireMock<{ randomUUID: () => string }>('expo-crypto')
    const randomUUID = jest.spyOn(crypto, 'randomUUID').mockReturnValue('same-id')

    expect(() =>
      validationsRepository.add([
        { imageNumber: 1, pixels: 4 },
        { imageNumber: 2, pixels: 3 },
      ]),
    ).toThrow()
    expect(validationsRepository.getAll()).toEqual([])

    randomUUID.mockRestore()
  })

  it('returns the validations oldest first', () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 2 }], new Date('2026-11-26T08:00:00.000Z'))
    validationsRepository.add([{ imageNumber: 1, pixels: 1 }], new Date('2026-11-25T08:00:00.000Z'))

    expect(validationsRepository.getAll().map(({ pixels }) => pixels)).toEqual([1, 2])
  })

  it('keeps the unsynced validations in the queue until they are marked synced', () => {
    const [first] = validationsRepository.add([{ imageNumber: 1, pixels: 2 }])
    const [second] = validationsRepository.add([{ imageNumber: 1, pixels: 5 }])

    validationsRepository.markSynced([first.id])

    expect(validationsRepository.getUnsynced().map(({ id }) => id)).toEqual([second.id])
  })

  it('does nothing when no id is marked synced', () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 2 }])

    validationsRepository.markSynced([])

    expect(validationsRepository.getUnsynced()).toHaveLength(1)
  })

  it('deletes every validation on clear', () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 2 }])

    validationsRepository.clear()

    expect(validationsRepository.getAll()).toEqual([])
  })
})
