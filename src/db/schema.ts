import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// same columns as the Supabase validations table (supabase/migrations), except user_id:
// one phone = one user, the account is added when the row is sent (see "Local storage" in docs/specs.md)
export const validations = sqliteTable('validations', {
  // created on the phone: a resent validation has the same id and the server ignores it
  id: text().primaryKey(),
  // number of the image in the app's catalogue (01, 02…)
  imageNumber: integer('image_number').notNull(),
  pixels: integer().notNull(),
  // always pixels × 100 (R1), as checked by the Supabase table
  steps: integer().notNull(),
  // ISO 8601, phone time: a validation sent later keeps its own time
  validatedAt: text('validated_at').notNull(),
  // false until Supabase has the row: the unsynced rows are the offline queue
  synced: integer({ mode: 'boolean' }).notNull().default(false),
})
