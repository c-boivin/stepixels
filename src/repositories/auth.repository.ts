import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'

import { removeStoredSession, supabase } from '~/lib/supabase'
import { preferencesRepository } from '~/repositories/preferences.repository'

/**
 * Why an account action failed, as the screens tell it:
 * - `email_taken`: the e-mail already has an account (sign-up);
 * - `wrong_credentials`: wrong e-mail or password (sign-in);
 * - `offline`: Supabase could not be reached;
 * - `unknown`: anything else.
 */
export type AccountErrorKind = 'email_taken' | 'wrong_credentials' | 'offline' | 'unknown'

export class AccountError extends Error {
  constructor(
    readonly kind: AccountErrorKind,
    options?: { cause?: unknown },
  ) {
    super(`Account action failed: ${kind}`, options)
    this.name = 'AccountError'
  }
}

/**
 * Longest wait for the server at sign-out. The session is removed before the revoke request,
 * unless Supabase first has to refresh an expired token: on a very slow network, that refresh
 * can outlast this wait.
 */
const SIGN_OUT_WAIT_MS = 2_000

/** Turns what Supabase Auth throws or returns into one of the cases the screens show. */
export function toAccountError(error: unknown): AccountError {
  if (error instanceof AccountError) return error
  // supabase-js wraps a failed fetch (no network, airplane mode) in this error
  if (isAuthRetryableFetchError(error)) return new AccountError('offline', { cause: error })
  if (isAuthApiError(error)) {
    if (error.code === 'user_already_exists' || error.code === 'email_exists') return new AccountError('email_taken', { cause: error })
    if (error.code === 'invalid_credentials') return new AccountError('wrong_credentials', { cause: error })
  }
  return new AccountError('unknown', { cause: error })
}

export interface SignUpForm {
  firstName: string
  email: string
  password: string
}

export interface SignInForm {
  email: string
  password: string
}

/**
 * The user's account, with Supabase Auth (ADR-003). The session is kept in SecureStore by the
 * Supabase client; the profile row is created by the `handle_new_user` trigger from the sign-up data.
 * Every failure is thrown as an `AccountError`.
 */
export const authRepository = {
  /** Creates the account, signed in at once (no e-mail confirmation in V1), with the reset time chosen in the onboarding. */
  async signUp({ firstName, email, password }: SignUpForm): Promise<void> {
    try {
      const resetTime = await preferencesRepository.getResetTime()
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { first_name: firstName.trim(), reset_time: resetTime } },
      })
      if (error) throw error
      // no session: the Supabase project asks for an e-mail confirmation, which V1 does not handle
      if (!data.session) throw new AccountError('unknown')
      await preferencesRepository.setAccountEmail(email.trim())
    } catch (error) {
      throw toAccountError(error)
    }
  },

  /**
   * E-mail of the signed-in user, or `null` for a guest, from the session kept on the phone,
   * or from the e-mail kept at sign-in when the session cannot be refreshed offline.
   */
  async getEmail(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession()
    if (data.session) return data.session.user.email ?? null
    // offline with an expired token, Supabase cannot refresh the session it still keeps: the user
    // is signed in all the same, so the e-mail kept at sign-in is used
    if (error && isAuthRetryableFetchError(error)) return preferencesRepository.getAccountEmail()
    return null
  },

  /**
   * Signs out of this phone (#41): the session leaves SecureStore at once, even offline
   * (`scope: 'local'`), and the e-mail kept for offline use is forgotten; the server is told
   * when it can be reached. Never throws.
   */
  async signOut(): Promise<void> {
    // on a slow network, the request to the server is not waited for more than SIGN_OUT_WAIT_MS
    const request = supabase.auth.signOut({ scope: 'local' }).then(
      () => true,
      () => true,
    )
    let timer: ReturnType<typeof setTimeout> | undefined
    const answered = await Promise.race([
      request,
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), SIGN_OUT_WAIT_MS)
      }),
    ])
    clearTimeout(timer)
    // Supabase first refreshes an expired session over the network, and only then removes it: until
    // then, a send would still go to this account. So the session leaves the phone now
    if (!answered) await removeStoredSession().catch(() => {})
    // signed out already: a failed write only keeps an e-mail that a guest never reads
    await preferencesRepository.setAccountEmail(null).catch(() => {})
  },

  async signIn({ email, password }: SignInForm): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      await preferencesRepository.setAccountEmail(email.trim())
    } catch (error) {
      throw toAccountError(error)
    }
  },
}
