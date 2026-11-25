import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

// expo-sqlite only runs on a phone: the tests use the same migrations on an in-memory SQLite database
export const db = drizzle(new Database(':memory:'))

migrate(db, { migrationsFolder: 'src/db/migrations' })
