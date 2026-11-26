import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

import { removeStoredSession, supabase } from '~/lib/supabase'
import { authRepository, toAccountError } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the Supabase client needs the .env keys and the network: only its answers matter here
jest.mock('~/lib/supabase', () => ({
  supabase: { auth: { signUp: jest.fn(), signInWithPassword: jest.fn(), getSession: jest.fn(), signOut: jest.fn() } },
  removeStoredSession: jest.fn().mockResolvedValue(undefined),
}))

const SESSION = { access_token: 'token' }
const FORM = { firstName: ' Camille ', email: ' camille@exemple.fr ', password: 'motdepasse' }

describe('toAccountError', () => {
  it.each([
    [new AuthApiError('User already registered', 422, 'user_already_exists'), 'email_taken'],
    [new AuthApiError('Email exists', 422, 'email_exists'), 'email_taken'],
    [new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'), 'wrong_credentials'],
    [new AuthRetryableFetchError('Failed to fetch', 0), 'offline'],
    [new TypeError("Cannot read properties of undefined (reading 'session')"), 'unknown'],
    [new AuthApiError('Over request rate limit', 429, 'over_request_rate_limit'), 'unknown'],
    [new Error('anything'), 'unknown'],
  ])('%s → %s', (error, kind) => {
    expect(toAccountError(error).kind).toBe(kind)
  })
})

describe('authRepository', () => {
  beforeEach(async () => {
    // only the Supabase answers: AsyncStorage's test double must keep working
    jest.mocked(supabase.auth.signUp).mockReset()
    jest.mocked(supabase.auth.signInWithPassword).mockReset()
    await AsyncStorage.clear()
  })

  it('signs up with the trimmed first name and e-mail, and the reset time chosen in the onboarding', async () => {
    await preferencesRepository.setResetTime('07:30')
    jest.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: {}, session: SESSION }, error: null } as never)

    await authRepository.signUp(FORM)

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'camille@exemple.fr',
      password: 'motdepasse',
      options: { data: { first_name: 'Camille', reset_time: '07:30' } },
    })
  })

  it('refuses a sign-up that leaves the user signed out (e-mail confirmation on)', async () => {
    jest.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: {}, session: null }, error: null } as never)

    await expect(authRepository.signUp(FORM)).rejects.toMatchObject({ kind: 'unknown' })
  })

  it('tells when the e-mail already has an account', async () => {
    const error = new AuthApiError('User already registered', 422, 'user_already_exists')
    jest.mocked(supabase.auth.signUp).mockResolvedValue({ data: { user: null, session: null }, error } as never)

    await expect(authRepository.signUp(FORM)).rejects.toMatchObject({ kind: 'email_taken' })
  })

  it('signs in with the trimmed e-mail', async () => {
    jest.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)

    await authRepository.signIn({ email: ' camille@exemple.fr ', password: 'motdepasse' })

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'camille@exemple.fr', password: 'motdepasse' })
  })

  it('tells a wrong password apart from no network', async () => {
    const wrong = new AuthApiError('Invalid login credentials', 400, 'invalid_credentials')
    jest.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({ data: {}, error: wrong } as never)
    await expect(authRepository.signIn(FORM)).rejects.toMatchObject({ kind: 'wrong_credentials' })

    jest.mocked(supabase.auth.signInWithPassword).mockResolvedValueOnce({ data: {}, error: new AuthRetryableFetchError('Failed to fetch', 0) } as never)
    await expect(authRepository.signIn(FORM)).rejects.toMatchObject({ kind: 'offline' })
  })

  it('gives the e-mail of the signed-in user, or null for a guest', async () => {
    jest.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: { user: { email: 'camille@exemple.fr' } } } } as never)
    expect(await authRepository.getEmail()).toBe('camille@exemple.fr')

    jest.mocked(supabase.auth.getSession).mockResolvedValueOnce({ data: { session: null } } as never)
    expect(await authRepository.getEmail()).toBeNull()
  })

  it('keeps the e-mail at sign-in, for when Supabase cannot be reached', async () => {
    jest.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as never)

    await authRepository.signIn({ email: ' camille@exemple.fr ', password: 'motdepasse' })

    expect(await preferencesRepository.getAccountEmail()).toBe('camille@exemple.fr')
  })

  it('gives the kept e-mail offline, when the expired session cannot be refreshed', async () => {
    await preferencesRepository.setAccountEmail('camille@exemple.fr')
    const offline = new AuthRetryableFetchError('Failed to fetch', 0)
    jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: offline } as never)

    expect(await authRepository.getEmail()).toBe('camille@exemple.fr')
  })

  it('gives no e-mail to a guest, even with an e-mail kept from an older account', async () => {
    await preferencesRepository.setAccountEmail('camille@exemple.fr')
    jest.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null } as never)

    expect(await authRepository.getEmail()).toBeNull()
  })

  it('signs out of this phone only, and forgets the kept e-mail', async () => {
    await preferencesRepository.setAccountEmail('camille@exemple.fr')
    jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)

    await authRepository.signOut()

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(await preferencesRepository.getAccountEmail()).toBeNull()
  })

  it('signs out offline too: Supabase answers the network error, the e-mail is still forgotten', async () => {
    await preferencesRepository.setAccountEmail('camille@exemple.fr')
    jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: new AuthRetryableFetchError('Failed to fetch', 0) } as never)

    await expect(authRepository.signOut()).resolves.toBeUndefined()
    expect(await preferencesRepository.getAccountEmail()).toBeNull()
  })

  describe('on a slow network', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.mocked(removeStoredSession).mockClear().mockResolvedValue(undefined)
    })
    afterEach(() => jest.useRealTimers())

    it('does not wait for a server that never answers, and removes the session itself', async () => {
      jest.mocked(supabase.auth.signOut).mockReturnValue(new Promise(() => {}) as never)

      const signOut = authRepository.signOut()
      await jest.advanceTimersByTimeAsync(2_000)

      await expect(signOut).resolves.toBeUndefined()
      expect(removeStoredSession).toHaveBeenCalled()
    })

    it('leaves the session to Supabase when it answers in time, with no timer left', async () => {
      jest.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never)

      await authRepository.signOut()

      expect(removeStoredSession).not.toHaveBeenCalled()
      expect(jest.getTimerCount()).toBe(0)
    })
  })
})
