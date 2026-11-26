import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { View } from 'react-native'

import SignUpPage from '~/app/account/sign-up'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { AccountError, authRepository } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the Supabase client needs the .env keys: the real errors come from the repository below
jest.mock('~/lib/supabase', () => ({ supabase: {} }))

// Supabase is not reached: each test sets the answer of the sign-up
jest.mock('~/repositories/auth.repository', () => ({
  ...jest.requireActual('~/repositories/auth.repository'),
  authRepository: { signUp: jest.fn(), signIn: jest.fn() },
}))

const ROUTES = { index: () => <View testID="home" />, 'account/sign-up': SignUpPage }
const BUTTON = { name: 'CRÉER MON COMPTE' }

async function fill({ password = 'motdepasse', terms = true } = {}) {
  await renderRouter(ROUTES, { initialUrl: '/account/sign-up' })
  await fireEvent.changeText(screen.getByLabelText('PRÉNOM'), 'Camille')
  await fireEvent.changeText(screen.getByLabelText('E-MAIL'), 'camille@exemple.fr')
  await fireEvent.changeText(screen.getByLabelText('MOT DE PASSE'), password)
  if (terms) await fireEvent.press(screen.getByRole('checkbox'))
}

describe('sign-up route', () => {
  beforeEach(async () => {
    jest.mocked(authRepository.signUp).mockReset()
    await AsyncStorage.clear()
    db.delete(validations).run()
  })

  it('keeps the button disabled until the terms are accepted', async () => {
    await fill({ terms: false })
    expect(screen.getByRole('button', BUTTON)).toBeDisabled()

    await fireEvent.press(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', BUTTON)).toBeEnabled()
  })

  it('asks for 8 characters once the user leaves a too short password', async () => {
    await fill({ password: '1234567' })
    await fireEvent(screen.getByLabelText('MOT DE PASSE'), 'blur')

    expect(screen.getByText('! 8 caractères minimum.')).toBeTruthy()
    expect(screen.getByRole('button', BUTTON)).toBeDisabled()
  })

  it('tells when the e-mail already has an account, under the e-mail', async () => {
    jest.mocked(authRepository.signUp).mockRejectedValue(new AccountError('email_taken'))
    await fill()

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByText('! Cet e-mail a déjà un compte.')).toBeTruthy()
    expect(authRepository.signUp).toHaveBeenCalledWith({ firstName: 'Camille', email: 'camille@exemple.fr', password: 'motdepasse' })
  })

  it('tells when there is no network', async () => {
    jest.mocked(authRepository.signUp).mockRejectedValue(new AccountError('offline'))
    await fill()

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByText('! Pas de connexion. Réessaie.')).toBeTruthy()
  })

  it('leaves the screen once the account is created', async () => {
    jest.mocked(authRepository.signUp).mockResolvedValue()
    await fill()

    await fireEvent.press(screen.getByRole('button', BUTTON))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect(screen).toHavePathname('/')
  })

  it('saves a guest\'s image: its own texts, then the next image is unlocked (#35)', async () => {
    jest.mocked(authRepository.signUp).mockResolvedValue()
    validationsRepository.add([{ imageNumber: 1, pixels: 256 }])
    await renderRouter(ROUTES, { initialUrl: '/account/sign-up?unlock=2' })

    expect(screen.getByRole('header', { name: 'GARDE\nTON IMAGE' })).toBeTruthy()
    expect(screen.getByText('Crée un compte pour sauvegarder\ntes images et débloquer la 02.')).toBeTruthy()
    await fireEvent.changeText(screen.getByLabelText('PRÉNOM'), 'Camille')
    await fireEvent.changeText(screen.getByLabelText('E-MAIL'), 'camille@exemple.fr')
    await fireEvent.changeText(screen.getByLabelText('MOT DE PASSE'), 'motdepasse')
    await fireEvent.press(screen.getByRole('checkbox'))
    await fireEvent.press(screen.getByRole('button', { name: 'CRÉER ET DÉBLOQUER' }))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect((await preferencesRepository.getUnlockedImage()).number).toBe(2)
    expect(await preferencesRepository.getSavedImage()).toBe(2)
  })
})
