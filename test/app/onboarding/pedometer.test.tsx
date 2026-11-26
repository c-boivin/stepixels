import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { AppState, type AppStateStatus } from 'react-native'

import HomePage from '~/app/index'
import OnboardingPedometerPage, { ErrorBoundary } from '~/app/onboarding/pedometer'
import { getStepsAccess, openStepsSettings, requestStepsAccess } from '~/lib/steps'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the permission answers come from the phone: each test sets them
jest.mock('~/lib/steps', () => ({
  getStepsAccess: jest.fn(),
  requestStepsAccess: jest.fn(),
  openStepsSettings: jest.fn().mockResolvedValue(undefined),
}))

const ROUTES = {
  index: HomePage,
  'onboarding/pedometer': { default: OnboardingPedometerPage, ErrorBoundary },
}

/** The "connected" screen stays 1.5 s: wait a bit longer for the home screen. */
const CONNECTED_TIMEOUT = { timeout: 3000 }

async function openScreen() {
  await renderRouter(ROUTES, { initialUrl: '/onboarding/pedometer' })
}

describe('onboarding pedometer route', () => {
  beforeEach(async () => {
    // forget the calls of the previous test, keep the answers set above
    jest.clearAllMocks()
    await AsyncStorage.clear()
  })

  it('explains what is read before asking, when the access was never asked', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('undetermined')

    await openScreen()

    expect(await screen.findByRole('header', { name: 'TON PODOMÈTRE\nFAIT LE RESTE' })).toBeTruthy()
    expect(screen.getByLabelText('Étape 4 sur 4')).toBeTruthy()
    expect(screen.getByText('Ton téléphone compte déjà tes pas.\nOn lit juste ce compteur.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'AUTORISER LE PODOMÈTRE' })).toBeTruthy()
    expect(requestStepsAccess).not.toHaveBeenCalled()
  })

  it('granted: shows "Podomètre connecté", ends the onboarding, then opens home', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('undetermined')
    jest.mocked(requestStepsAccess).mockResolvedValue('granted')

    await openScreen()
    await fireEvent.press(await screen.findByRole('button', { name: 'AUTORISER LE PODOMÈTRE' }))

    expect(await screen.findByRole('header', { name: 'PODOMÈTRE\nCONNECTÉ' })).toBeTruthy()

    expect(await screen.findByTestId('home', {}, CONNECTED_TIMEOUT)).toBeTruthy()
    expect(screen).toHavePathname('/')
    expect(await preferencesRepository.getOnboardingDone()).toBe(true)
  })

  it('refused: explains why the steps are needed and offers to ask again', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('undetermined')
    jest.mocked(requestStepsAccess).mockResolvedValueOnce('refused').mockResolvedValueOnce('granted')

    await openScreen()
    await fireEvent.press(await screen.findByRole('button', { name: 'AUTORISER LE PODOMÈTRE' }))

    expect(await screen.findByRole('header', { name: 'ON A BESOIN\nDE TES PAS' })).toBeTruthy()
    expect(screen.getByText('Juste le nombre, rien d’autre.\nSans lui, rien ne se révèle.')).toBeTruthy()
    expect(await preferencesRepository.getOnboardingDone()).toBe(false)

    await fireEvent.press(screen.getByRole('button', { name: 'AUTORISER LE PODOMÈTRE' }))

    expect(await screen.findByRole('header', { name: 'PODOMÈTRE\nCONNECTÉ' })).toBeTruthy()
    expect(requestStepsAccess).toHaveBeenCalledTimes(2)
  })

  it('blocked: the button opens the settings, and the screen stays (no way around it)', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('blocked')

    await openScreen()
    await fireEvent.press(await screen.findByRole('button', { name: 'OUVRIR LES RÉGLAGES' }))

    expect(openStepsSettings).toHaveBeenCalled()
    expect(requestStepsAccess).not.toHaveBeenCalled()
    expect(screen.getByRole('header', { name: 'ON A BESOIN\nDE TES PAS' })).toBeTruthy()
    expect(await preferencesRepository.getOnboardingDone()).toBe(false)
  })

  it('back from the settings with the access allowed: reads it again, then "connected" and home', async () => {
    const listeners: ((state: AppStateStatus) => void)[] = []
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      listeners.push(listener)
      return { remove: () => {} }
    })
    jest.mocked(getStepsAccess).mockResolvedValueOnce('blocked').mockResolvedValue('granted')

    await openScreen()
    await screen.findByRole('button', { name: 'OUVRIR LES RÉGLAGES' })
    await act(async () => listeners.at(-1)?.('active'))

    expect(await screen.findByRole('header', { name: 'PODOMÈTRE\nCONNECTÉ' })).toBeTruthy()
    expect(await screen.findByTestId('home', {}, CONNECTED_TIMEOUT)).toBeTruthy()
  })

  it('shows "connected" at once when the access is already granted', async () => {
    jest.mocked(getStepsAccess).mockResolvedValue('granted')

    await openScreen()

    expect(await screen.findByRole('header', { name: 'PODOMÈTRE\nCONNECTÉ' })).toBeTruthy()
    expect(requestStepsAccess).not.toHaveBeenCalled()
  })

  it('shows an error with a retry button when the access cannot be read', async () => {
    // React logs the caught error: keep the test output readable
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.mocked(getStepsAccess).mockRejectedValueOnce(new Error('Health Connect crashed')).mockResolvedValue('undetermined')

    await openScreen()

    expect(await screen.findByRole('header', { name: 'OUPS' })).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }))

    expect(await screen.findByRole('button', { name: 'AUTORISER LE PODOMÈTRE' })).toBeTruthy()
  })
})
