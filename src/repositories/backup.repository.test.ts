import AsyncStorage from '@react-native-async-storage/async-storage'

import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { supabase } from '~/lib/supabase'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the Supabase client needs the .env keys and the network: each test sets what it answers
jest.mock('~/lib/supabase', () => ({ supabase: { auth: { getSession: jest.fn() }, from: jest.fn() } }))

const USER_ID = '11111111-1111-1111-1111-111111111111'

function signedIn(userId: string | null) {
  jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: userId ? { user: { id: userId } } : null } } as never)
}

/** Answers of the two tables: `validations` (upsert, select) and `profiles` (reset time). */
function tables({
  upsertError = null,
  remote = [] as object[],
  resetTime = '20:00:00' as string | null,
}: { upsertError?: object | null; remote?: object[]; resetTime?: string | null } = {}) {
  const upsert = jest.fn().mockResolvedValue({ error: upsertError })
  jest.mocked(supabase.from).mockImplementation(((table: string) =>
    table === 'validations'
      ? { upsert, select: () => ({ order: () => Promise.resolve({ data: remote, error: null }) }) }
      : {
          select: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: resetTime ? { reset_time: resetTime } : null, error: null }) }),
          }),
        }) as never)
  return { upsert }
}

describe('backupRepository', () => {
  beforeEach(async () => {
    db.delete(validations).run()
    await AsyncStorage.clear()
  })

  describe('sendPending', () => {
    it('sends the queue with the account id, ignoring ids Supabase already has, then empties it', async () => {
      signedIn(USER_ID)
      const { upsert } = tables()
      const [row] = validationsRepository.add([{ imageNumber: 1, pixels: 3 }], new Date('2026-11-25T18:00:00.000Z'))

      await backupRepository.sendPending()

      expect(upsert).toHaveBeenCalledWith(
        [{ id: row.id, user_id: USER_ID, image_number: 1, pixels: 3, steps: 300, validated_at: '2026-11-25T18:00:00.000Z' }],
        { onConflict: 'id', ignoreDuplicates: true },
      )
      expect(validationsRepository.getUnsynced()).toEqual([])
    })

    it('sends nothing for a guest: the queue waits for an account', async () => {
      signedIn(null)
      const { upsert } = tables()
      validationsRepository.add([{ imageNumber: 1, pixels: 3 }])

      await backupRepository.sendPending()

      expect(upsert).not.toHaveBeenCalled()
      expect(validationsRepository.getUnsynced()).toHaveLength(1)
    })

    it('keeps the queue when Supabase cannot be reached, and sends it once the next time', async () => {
      signedIn(USER_ID)
      tables({ upsertError: { message: 'Network request failed' } })
      validationsRepository.add([{ imageNumber: 1, pixels: 3 }])

      await expect(backupRepository.sendPending()).rejects.toBeTruthy()
      expect(validationsRepository.getUnsynced()).toHaveLength(1)

      const { upsert } = tables()
      await backupRepository.sendPending()
      await backupRepository.sendPending()

      expect(upsert).toHaveBeenCalledTimes(1)
      expect(validationsRepository.getUnsynced()).toEqual([])
    })
  })

  describe('restore', () => {
    it("replaces the guest's progress with the account's, and takes back its reset time", async () => {
      signedIn(USER_ID)
      tables({
        remote: [{ id: 'from-account', image_number: 2, pixels: 4, steps: 400, validated_at: '2026-11-20T18:00:00+00:00' }],
        resetTime: '07:30:00',
      })
      validationsRepository.add([{ imageNumber: 1, pixels: 5 }])

      await backupRepository.restore()

      expect(validationsRepository.getAll()).toEqual([
        { id: 'from-account', imageNumber: 2, pixels: 4, steps: 400, validatedAt: '2026-11-20T18:00:00.000Z', synced: true },
      ])
      expect(await preferencesRepository.getResetTime()).toBe('07:30')
    })

    it("sends the guest's progress to an account that has none yet", async () => {
      signedIn(USER_ID)
      const { upsert } = tables({ remote: [] })
      validationsRepository.add([{ imageNumber: 1, pixels: 5 }])

      await backupRepository.restore()

      expect(upsert).toHaveBeenCalledTimes(1)
      expect(validationsRepository.getAll()).toHaveLength(1)
      expect(validationsRepository.getUnsynced()).toEqual([])
    })

    it("restores before any send when a sign-in's restore failed: the guest's rows never reach the account", async () => {
      signedIn(USER_ID)
      await backupRepository.beforeSignIn()
      validationsRepository.add([{ imageNumber: 1, pixels: 5 }])
      const { upsert } = tables({
        remote: [{ id: 'from-account', image_number: 2, pixels: 4, steps: 400, validated_at: '2026-11-20T18:00:00+00:00' }],
      })

      await backupRepository.sendPending()

      expect(upsert).not.toHaveBeenCalled()
      expect(validationsRepository.getAll().map(({ id }) => id)).toEqual(['from-account'])

      // once restored, the next sends are normal sends
      await backupRepository.sendPending()
      expect(upsert).not.toHaveBeenCalled()
    })
  })
})
