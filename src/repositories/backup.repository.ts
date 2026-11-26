import { supabase } from '~/lib/supabase'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { Validation } from '~/repositories/validations.repository'

/** A validation as the Supabase table stores it (ADR-003): the same columns as the phone, plus the account. */
interface RemoteValidation {
  id: string
  user_id: string
  image_number: number
  pixels: number
  steps: number
  validated_at: string
}

async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

function toRemote(userId: string, { id, imageNumber, pixels, steps, validatedAt }: Validation): RemoteValidation {
  return { id, user_id: userId, image_number: imageNumber, pixels, steps, validated_at: validatedAt }
}

// one backup operation at a time: a send started when the app comes back must not run in the
// middle of a restore, or the guest's rows would reach an account that already has progress
let queue: Promise<unknown> = Promise.resolve()

function oneAtATime<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result.catch(() => {})
  return result
}

async function send(userId: string): Promise<void> {
  const pending = validationsRepository.getUnsynced()
  if (pending.length === 0) return

  const { error } = await supabase
    .from('validations')
    .upsert(
      pending.map((validation) => toRemote(userId, validation)),
      { onConflict: 'id', ignoreDuplicates: true },
    )
  if (error) throw error

  validationsRepository.markSynced(pending.map(({ id }) => id))
}

async function restore(userId: string): Promise<void> {
  const [validations, profile] = await Promise.all([
    supabase
      .from('validations')
      .select('id, image_number, pixels, steps, validated_at')
      // RLS already limits the rows to the account: this keeps it right if a policy changes
      .eq('user_id', userId)
      .order('validated_at', { ascending: true }),
    supabase.from('profiles').select('reset_time').eq('id', userId).maybeSingle(),
  ])
  if (validations.error) throw validations.error
  if (profile.error) throw profile.error

  // Postgres gives `20:00:00`: the app keeps `HH:MM`
  if (profile.data?.reset_time) await preferencesRepository.setResetTime(profile.data.reset_time.slice(0, 5))

  if (validations.data.length > 0) {
    // the validations made after the sign-in, while the restore waited (offline), belong to the
    // account and were never sent: they stay, the guest's ones (before the sign-in) are replaced
    const signInAt = await preferencesRepository.getRestorePendingSince()
    const madeAfterSignIn = validationsRepository
      .getUnsynced()
      .filter(({ validatedAt }) => signInAt !== null && new Date(validatedAt) >= signInAt)

    validationsRepository.replaceAll([
      ...validations.data.map((row) => ({
        id: row.id,
        imageNumber: row.image_number,
        pixels: row.pixels,
        steps: row.steps,
        validatedAt: new Date(row.validated_at).toISOString(),
        synced: true,
      })),
      ...madeAfterSignIn,
    ])
  }

  await preferencesRepository.setRestorePendingSince(null)
  // the guest's progress to an account that has none, or the validations kept above
  await send(userId)
}

/**
 * The account's backup (#36, ADR-004): the validations saved on the phone are sent to Supabase,
 * and come back after a sign-in on another phone. The phone stays the source of truth while
 * the user plays; a guest keeps the queue until an account exists.
 */
export const backupRepository = {
  /**
   * Call before signing in: until the account's progress has come back, nothing is sent, so the
   * guest's rows never reach an account that already has progress. Saves when, so that the
   * validations made after the sign-in are kept by the restore.
   */
  async beforeSignIn(at = new Date()): Promise<void> {
    await preferencesRepository.setRestorePendingSince(at)
  },

  /** Call when a sign-in failed: the guest stays a guest, its queue can be sent again later. */
  async signInFailed(): Promise<void> {
    await preferencesRepository.setRestorePendingSince(null)
  },

  /**
   * Sends the validations not sent yet, then marks them as sent. A validation Supabase already
   * has is ignored (same id), so a send retried after a network error never makes a duplicate.
   * Does nothing for a guest. If a sign-in's restore is still due, it runs first.
   * Throws when Supabase cannot be reached: the queue stays as it was.
   */
  sendPending(): Promise<void> {
    return oneAtATime(async () => {
      const userId = await getUserId()
      if (userId === null) return
      if ((await preferencesRepository.getRestorePendingSince()) !== null) return restore(userId)
      return send(userId)
    })
  },

  /**
   * After a sign-in: brings back the account's validations and reset time. When the account
   * already has progress, it replaces the guest's (OQ-17), except the validations made after the
   * sign-in, which are kept and sent; when it has none, the guest's progress is sent to it instead. Throws when Supabase cannot be reached: it is tried again
   * at the next send, before anything is sent.
   */
  restore(): Promise<void> {
    return oneAtATime(async () => {
      const userId = await getUserId()
      if (userId === null) return
      return restore(userId)
    })
  },
}
