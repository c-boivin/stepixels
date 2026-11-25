import * as SecureStore from 'expo-secure-store'

/**
 * Characters per stored chunk. Some iOS versions refuse SecureStore values above about
 * 2048 bytes, and a Supabase session is often larger (ADR-003). A character takes up to
 * 4 bytes in UTF-8 (a name with accents or an emoji in the user metadata): 500 characters
 * stay under 2048 bytes in every case.
 */
const CHUNK_SIZE = 500

/** Key that holds how many chunks a value has. Written last, so a value cut halfway reads as absent. */
function countKey(key: string): string {
  return `${key}.count`
}

function chunkKey(key: string, index: number): string {
  return `${key}.${index}`
}

// Supabase may read and write the session at the same time (auto-refresh during a sign-in):
// operations on one key run one after the other, so their chunks never mix
const queues = new Map<string, Promise<unknown>>()

function inQueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const result = (queues.get(key) ?? Promise.resolve()).then(operation, operation)
  queues.set(
    key,
    result.catch(() => {}),
  )
  return result
}

async function readValue(key: string): Promise<string | null> {
  const count = await SecureStore.getItemAsync(countKey(key))
  if (count === null) return null

  const chunks = await Promise.all(
    Array.from({ length: Number(count) }, (_, index) => SecureStore.getItemAsync(chunkKey(key, index))),
  )
  return chunks.some((chunk) => chunk === null) ? null : chunks.join('')
}

async function removeValue(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(countKey(key)))
  await SecureStore.deleteItemAsync(countKey(key))
  await Promise.all(Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(chunkKey(key, index))))
}

async function writeValue(key: string, value: string): Promise<void> {
  await removeValue(key)

  // cut between whole characters: an emoji is two UTF-16 units, and half of one is not valid text
  const characters = Array.from(value)
  const chunks = Array.from({ length: Math.ceil(characters.length / CHUNK_SIZE) }, (_, index) =>
    characters.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE).join(''),
  )
  await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk)))
  await SecureStore.setItemAsync(countKey(key), String(chunks.length))
}

/**
 * Storage for the Supabase session: SecureStore only, never AsyncStorage or SQLite (ADR-003).
 * A value is split into chunks of `CHUNK_SIZE` characters, one SecureStore entry each.
 */
export const secureSessionStorage = {
  getItem: (key: string): Promise<string | null> => inQueue(key, () => readValue(key)),
  setItem: (key: string, value: string): Promise<void> => inQueue(key, () => writeValue(key, value)),
  removeItem: (key: string): Promise<void> => inQueue(key, () => removeValue(key)),
}
