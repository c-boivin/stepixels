import { asc, eq, inArray } from 'drizzle-orm'
import { randomUUID } from 'expo-crypto'

import { validations } from '~/db/schema'
import { db } from '~/lib/db'

/** Steps needed to reveal one pixel (R1). */
export const STEPS_PER_PIXEL = 100

export type Validation = typeof validations.$inferSelect

/** Pixels revealed on one image by a validation. */
export interface ValidationPart {
  /** Number of the image in the catalogue (01, 02…). */
  imageNumber: number
  pixels: number
}

/**
 * The validations stored on the phone (ADR-004). The phone is the source of truth:
 * progress is computed from these rows, and the unsynced ones wait to be sent to Supabase.
 */
export const validationsRepository = {
  /** Every validation, oldest first. */
  getAll(): Validation[] {
    return db.select().from(validations).orderBy(asc(validations.validatedAt)).all()
  },

  /** The offline queue: validations Supabase does not have yet, oldest first. */
  getUnsynced(): Validation[] {
    return db
      .select()
      .from(validations)
      .where(eq(validations.synced, false))
      .orderBy(asc(validations.validatedAt))
      .all()
  },

  /**
   * Saves a validation, unsynced: one row per image it touches (pixels carried to the
   * next image make a second row), all at the same time, or none if one fails.
   */
  add(parts: ValidationPart[], validatedAt = new Date()): Validation[] {
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

  /** Marks the validations Supabase has accepted, so they are not sent again. */
  markSynced(ids: string[]) {
    if (ids.length === 0) return

    db.update(validations).set({ synced: true }).where(inArray(validations.id, ids)).run()
  },

  /** Deletes every validation: on sign-out, the local progress is cleared (OQ-19). */
  clear() {
    db.delete(validations).run()
  },
}
