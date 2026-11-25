import { asc, sql } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'

import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { STEPS_PER_PIXEL } from '~/lib/rules'

export type Validation = typeof validations.$inferSelect

/** Pixels revealed on one image by a validation. */
export interface ValidationPart {
  /** Number of the image in the catalogue (01, 02…). */
  imageNumber: number
  /** A whole number above 0. */
  pixels: number
}

/**
 * The validations stored on the phone (ADR-004). The phone is the source of truth:
 * progress is computed from these rows, and the unsynced ones wait to be sent to Supabase.
 */
export const validationsRepository = {
  /** Every validation, oldest first; the rows of one validation keep their saving order. */
  getAll(): Validation[] {
    return db
      .select()
      .from(validations)
      .orderBy(asc(validations.validatedAt), asc(sql`rowid`))
      .all()
  },

  /**
   * Saves a validation, unsynced: one row per image it touches (pixels carried to the
   * next image make a second row), all at the same time, or none if one fails.
   * Throws a `RangeError` when a part has no whole number of pixels above 0: Supabase
   * would refuse it, and it would stay in the offline queue forever.
   */
  add(parts: ValidationPart[], validatedAt = new Date()): Validation[] {
    for (const { imageNumber, pixels } of parts) {
      if (!Number.isInteger(pixels) || pixels <= 0) {
        throw new RangeError(`Image ${imageNumber}: ${pixels} pixels, expected a whole number above 0`)
      }
    }

    const rows = parts.map(({ imageNumber, pixels }) => ({
      id: randomUUID(),
      imageNumber,
      pixels,
      steps: pixels * STEPS_PER_PIXEL,
      validatedAt: validatedAt.toISOString(),
      synced: false,
    }))

    db.transaction((tx) => {
      for (const row of rows) tx.insert(validations).values(row).run()
    })

    return rows
  },
}
