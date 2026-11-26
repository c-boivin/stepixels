import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'

import { supabase } from '~/lib/supabase'
import { authRepository, toAccountError } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the Supabase client needs the .env keys and the network: only its answers matter here
jest.mock('~/lib/supabase', () => ({
  supabase: { auth: { signUp: jest.fn(), signInWithPassword: jest.fn() } },
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
})
