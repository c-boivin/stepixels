import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { join } from 'node:path'

// expo-sqlite only runs on a phone: the tests use the same migrations on an in-memory SQLite database
export const db = drizzle(new Database(':memory:'))

// relative to this file, so the tests work from any folder (terminal, editor)
migrate(db, { migrationsFolder: join(__dirname, '../src/db/migrations') })
