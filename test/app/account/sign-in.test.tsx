import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { View } from 'react-native'

import SignInPage from '~/app/account/sign-in'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { AccountError, authRepository } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the Supabase client needs the .env keys: the real errors come from the repository below
jest.mock('~/lib/supabase', () => ({ supabase: {} }))

// Supabase is not reached: each test sets the answer of the sign-in
jest.mock('~/repositories/auth.repository', () => ({
  ...jest.requireActual('~/repositories/auth.repository'),
  authRepository: { signUp: jest.fn(), signIn: jest.fn() },
}))

// the account's progress comes back from Supabase: each test sets if it did
jest.mock('~/repositories/backup.repository', () => ({
  backupRepository: { beforeSignIn: jest.fn(), signInFailed: jest.fn(), restore: jest.fn() },
}))

const ROUTES = { index: () => <View testID="home" />, 'account/sign-in': SignInPage }
const BUTTON = { name: 'SE CONNECTER' }

async function fill(initialUrl = '/account/sign-in') {
  await renderRouter(ROUTES, { initialUrl })
  await fireEvent.changeText(screen.getByLabelText('E-MAIL'), 'camille@exemple.fr')
  await fireEvent.changeText(screen.getByLabelText('MOT DE PASSE'), 'motdepasse')
}

describe('sign-in route', () => {
  beforeEach(async () => {
    jest.mocked(authRepository.signIn).mockReset()
    jest.mocked(backupRepository.restore).mockReset().mockResolvedValue()
    await AsyncStorage.clear()
    db.delete(validations).run()
  })

  it('shows the form, with the button disabled until both fields are filled', async () => {
    await renderRouter(ROUTES, { initialUrl: '/account/sign-in' })

    expect(screen.getByRole('header', { name: 'CONTENT DE\nTE REVOIR' })).toBeTruthy()
    expect(screen.getByRole('button', BUTTON)).toBeDisabled()
  })

  it.each([
    ['wrong_credentials', '! E-mail ou mot de passe incorrect.'],
    ['offline', '! Pas de connexion. Réessaie.'],
  ] as const)('shows the %s error under the password', async (kind, message) => {
    jest.mocked(authRepository.signIn).mockRejectedValue(new AccountError(kind))
    await fill()

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByText(message)).toBeTruthy()
  })

  it('opens the home screen once signed in', async () => {
    jest.mocked(authRepository.signIn).mockResolvedValue()
    await fill()

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect(screen).toHavePathname('/')
  })

  it("unlocks the next image once the account's progress has come back (#35)", async () => {
    jest.mocked(authRepository.signIn).mockResolvedValue()
    validationsRepository.add([{ imageNumber: 1, pixels: 256 }])
    await fill('/account/sign-in?unlock=2')

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect((await preferencesRepository.getUnlockedImage()).number).toBe(2)
    expect(await preferencesRepository.getSavedImage()).toBe(2)
  })

  it("keeps the next image locked when the account's progress could not come back (offline)", async () => {
    jest.mocked(authRepository.signIn).mockResolvedValue()
    jest.mocked(backupRepository.restore).mockRejectedValue(new Error('offline'))
    // the guest's finished image: the account's own progress is not known yet
    validationsRepository.add([{ imageNumber: 1, pixels: 256 }])
    await fill('/account/sign-in?unlock=2')

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect((await preferencesRepository.getUnlockedImage()).number).toBe(1)
    expect(await preferencesRepository.getSavedImage()).toBeNull()
  })
})
