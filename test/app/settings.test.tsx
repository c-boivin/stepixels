import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { AppState, View } from 'react-native'

import SettingsPage from '~/app/settings'
import { getStepsAccess, openStepsSettings, requestStepsAccess } from '~/lib/steps'
import { authRepository } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the Supabase client needs the .env keys: the account comes from the repository below
jest.mock('~/lib/supabase', () => ({ supabase: {} }))
jest.mock('~/repositories/auth.repository', () => ({
  ...jest.requireActual('~/repositories/auth.repository'),
  authRepository: { getEmail: jest.fn() },
}))
// the permission comes from the phone: each test sets it
jest.mock('~/lib/steps', () => ({
  getStepsAccess: jest.fn(),
  requestStepsAccess: jest.fn(),
  openStepsSettings: jest.fn().mockResolvedValue(undefined),
}))

const ROUTES = { index: () => <View />, settings: SettingsPage, 'account/sign-up': () => <View testID="sign-up" /> }

async function openSettings() {
  await renderRouter(ROUTES, { initialUrl: '/settings' })
  await screen.findByRole('header', { name: 'RÉGLAGES' })
}

describe('settings route', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    await AsyncStorage.clear()
    jest.mocked(getStepsAccess).mockResolvedValue('granted')
    jest.mocked(authRepository.getEmail).mockResolvedValue(null)
  })

  it('shows the guest list, with the chosen reset time', async () => {
    await preferencesRepository.setResetTime('07:30')

    await openSettings()

    expect(screen.getByLabelText('Accès podomètre, AUTORISÉ')).toBeTruthy()
    expect(screen.getByLabelText('Heure de remise à zéro, 07:30')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Créer un compte' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeTruthy()
    expect(screen.queryByText('Supprimer mon compte')).toBeNull()
  })

  it('shows the account list once signed in', async () => {
    jest.mocked(authRepository.getEmail).mockResolvedValue('camille@exemple.fr')

    await openSettings()

    expect(screen.getByLabelText('Compte, camille@exemple.fr')).toBeTruthy()
    expect(screen.getByText('Supprimer mon compte')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Se connecter' })).toBeNull()
  })

  it('opens the phone settings when only they can allow the pedometer', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('blocked')

    await openSettings()
    await fireEvent.press(screen.getByRole('button', { name: 'Accès podomètre, REFUSÉ' }))

    expect(openStepsSettings).toHaveBeenCalled()
    expect(requestStepsAccess).not.toHaveBeenCalled()
  })

  it('asks for the pedometer again when the phone still can, then shows the answer', async () => {
    jest.mocked(getStepsAccess).mockResolvedValueOnce('refused').mockResolvedValue('granted')
    jest.mocked(requestStepsAccess).mockResolvedValue('granted')

    await openSettings()
    await fireEvent.press(screen.getByRole('button', { name: 'Accès podomètre, REFUSÉ' }))

    expect(requestStepsAccess).toHaveBeenCalled()
    expect(await screen.findByLabelText('Accès podomètre, AUTORISÉ')).toBeTruthy()
    expect(openStepsSettings).not.toHaveBeenCalled()
  })

  it('reads the settings again once when the app comes back, not in a loop', async () => {
    const listeners: ((state: string) => void)[] = []
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      listeners.push(listener as (state: string) => void)
      return { remove: () => {} } as never
    })

    await openSettings()
    const before = jest.mocked(getStepsAccess).mock.calls.length
    await act(async () => listeners.at(-1)?.('active'))
    // the page is shown again: a refresh loop would have read the access more than once by now
    await screen.findByLabelText('Accès podomètre, AUTORISÉ')
    await act(async () => {})

    expect(jest.mocked(getStepsAccess).mock.calls.length).toBe(before + 1)
  })

  it('opens the sign-up', async () => {
    await openSettings()

    await fireEvent.press(screen.getByRole('button', { name: 'Créer un compte' }))

    expect(await screen.findByTestId('sign-up')).toBeTruthy()
  })
})
