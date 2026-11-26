import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js'

import { supabase } from '~/lib/supabase'
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
    } catch (error) {
      throw toAccountError(error)
    }
  },

  async signIn({ email, password }: SignInForm): Promise<void> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
    } catch (error) {
      throw toAccountError(error)
    }
  },
}
