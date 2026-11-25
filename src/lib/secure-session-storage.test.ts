import * as SecureStore from 'expo-secure-store'

import { secureSessionStorage } from '~/lib/secure-session-storage'

const KEY = 'sb-project-auth-token'
const store = jest.requireMock<{ __store: Map<string, string> }>('expo-secure-store').__store

describe('secureSessionStorage', () => {
  beforeEach(() => {
    store.clear()
  })

  it('splits a session larger than 2 KB into chunks of at most 2048 bytes, and reads it back', async () => {
    // a real session is about 2 300 characters (ADR-003: some iOS versions refuse values above 2048 bytes)
    const session = JSON.stringify({ access_token: 'x'.repeat(2_200), user: { first_name: 'Élise' } })

    await secureSessionStorage.setItem(KEY, session)

    expect(Number(store.get(`${KEY}.count`))).toBeGreaterThan(1)
    expect([...store.values()].every((value) => new TextEncoder().encode(value).length <= 2_048)).toBe(true)
    expect(await secureSessionStorage.getItem(KEY)).toBe(session)
  })

  it('keeps a short value in one chunk', async () => {
    await secureSessionStorage.setItem(KEY, 'short')

    expect(store.get(`${KEY}.count`)).toBe('1')
    expect(await secureSessionStorage.getItem(KEY)).toBe('short')
  })

  it('replaces a longer value without leaving its old chunks', async () => {
    await secureSessionStorage.setItem(KEY, 'x'.repeat(2_500))
    await secureSessionStorage.setItem(KEY, 'short')

    expect([...store.keys()].sort()).toEqual([`${KEY}.0`, `${KEY}.count`])
  })

  it('removes every chunk', async () => {
    await secureSessionStorage.setItem(KEY, 'x'.repeat(2_500))
    await secureSessionStorage.removeItem(KEY)

    expect(store.size).toBe(0)
    expect(await secureSessionStorage.getItem(KEY)).toBeNull()
  })

  it('returns no session before the first sign-in', async () => {
    expect(await secureSessionStorage.getItem(KEY)).toBeNull()
  })

  it('keeps every chunk under 2048 bytes even when the session is full of 4-byte characters', async () => {
    const session = '🥾'.repeat(1_200)

    await secureSessionStorage.setItem(KEY, session)

    expect([...store.values()].every((value) => new TextEncoder().encode(value).length <= 2_048)).toBe(true)
    // no chunk starts or ends in the middle of an emoji
    expect([...store.entries()].filter(([key]) => !key.endsWith('.count')).every(([, value]) => value.isWellFormed())).toBe(true)
    expect(await secureSessionStorage.getItem(KEY)).toBe(session)
  })

  it('never mixes the chunks of two writes made at the same time', async () => {
    const first = 'a'.repeat(1_600)
    const second = 'b'.repeat(1_100)
    // the keychain takes a variable time: here the first session is written more slowly
    jest.spyOn(SecureStore, 'setItemAsync').mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, value.startsWith('a') ? 20 : 0))
      store.set(key, value)
    })

    await Promise.all([secureSessionStorage.setItem(KEY, first), secureSessionStorage.setItem(KEY, second)])

    expect(await secureSessionStorage.getItem(KEY)).toBe(second)
  })

  it('returns no session when a chunk is missing, rather than half of it', async () => {
    await secureSessionStorage.setItem(KEY, 'x'.repeat(2_500))
    await SecureStore.deleteItemAsync(`${KEY}.1`)

    expect(await secureSessionStorage.getItem(KEY)).toBeNull()
  })
})
