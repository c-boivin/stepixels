import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
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

  /** Deletes every validation of the phone: after a sign-out, the app starts again as a guest (#41). */
  clear() {
    db.delete(validations).run()
  },

  /** Time of the last validation, `null` before the first one: the daily counter starts after it (R3). */
  getLastValidatedAt(): Date | null {
    const last = db
      .select({ validatedAt: validations.validatedAt })
      .from(validations)
      .orderBy(desc(validations.validatedAt))
      .limit(1)
      .get()

    return last ? new Date(last.validatedAt) : null
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

  /** The offline queue: the validations not sent to Supabase yet, oldest first. */
  getUnsynced(): Validation[] {
    return db
      .select()
      .from(validations)
      .where(eq(validations.synced, false))
      .orderBy(asc(validations.validatedAt), asc(sql`rowid`))
      .all()
  },

  /** Marks these validations as sent: they leave the offline queue. */
  markSynced(ids: string[]) {
    if (ids.length === 0) return
    db.update(validations).set({ synced: true }).where(inArray(validations.id, ids)).run()
  },

  /**
   * Replaces every validation of the phone with these ones (restored after a sign-in: the
   * account's progress wins), all at once or not at all. Each row keeps its `synced` state.
   */
  replaceAll(rows: Validation[]) {
    db.transaction((tx) => {
      tx.delete(validations).run()
      for (const row of rows) tx.insert(validations).values(row).run()
    })
  },
}
