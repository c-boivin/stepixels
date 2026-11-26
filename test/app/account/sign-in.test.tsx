import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { View } from 'react-native'

import SignInPage from '~/app/account/sign-in'
import { AccountError, authRepository } from '~/repositories/auth.repository'

// the Supabase client needs the .env keys: the real errors come from the repository below
jest.mock('~/lib/supabase', () => ({ supabase: {} }))

// Supabase is not reached: each test sets the answer of the sign-in
jest.mock('~/repositories/auth.repository', () => ({
  ...jest.requireActual('~/repositories/auth.repository'),
  authRepository: { signUp: jest.fn(), signIn: jest.fn() },
}))

const ROUTES = { index: () => <View testID="home" />, 'account/sign-in': SignInPage }
const BUTTON = { name: 'SE CONNECTER' }

async function fill() {
  await renderRouter(ROUTES, { initialUrl: '/account/sign-in' })
  await fireEvent.changeText(screen.getByLabelText('E-MAIL'), 'camille@exemple.fr')
  await fireEvent.changeText(screen.getByLabelText('MOT DE PASSE'), 'motdepasse')
}

describe('sign-in route', () => {
  beforeEach(() => {
    jest.mocked(authRepository.signIn).mockReset()
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
})
