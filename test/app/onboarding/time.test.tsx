import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'

import OnboardingPedometerPage from '~/app/onboarding/pedometer'
import OnboardingTimePage, { ErrorBoundary } from '~/app/onboarding/time'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the next step reads the steps access: here, only the way to it matters
jest.mock('~/lib/steps', () => ({ getStepsAccess: jest.fn().mockResolvedValue('undetermined') }))

const ROUTES = {
  'onboarding/time': { default: OnboardingTimePage, ErrorBoundary },
  'onboarding/pedometer': OnboardingPedometerPage,
}

/** Swipes the wheel like the screen reader does: `increment` = next time. */
async function adjustWheel(actionName: 'increment' | 'decrement') {
  await fireEvent(screen.getByRole('adjustable', { name: 'Heure de remise à zéro' }), 'accessibilityAction', {
    nativeEvent: { actionName },
  })
}

describe('onboarding time route', () => {
  beforeEach(async () => {
    // forget the calls of the previous test, keep the answers set above
    jest.clearAllMocks()
    await AsyncStorage.clear()
  })

  it('shows the wheel on 20:00, the title and the button', async () => {
    await renderRouter(ROUTES, { initialUrl: '/onboarding/time' })

    expect(screen.getByLabelText('Étape 3 sur 4')).toBeTruthy()
    expect(screen.getByRole('adjustable', { name: 'Heure de remise à zéro' })).toHaveAccessibilityValue({ text: '20:00' })
    expect(screen.getByRole('header', { name: 'TON HEURE' })).toBeTruthy()
    expect(screen.getByText('Le moment où ton compteur\nse remet à zéro.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'CONTINUER' })).toBeTruthy()
  })

  it('moves by 30 minutes', async () => {
    await renderRouter(ROUTES, { initialUrl: '/onboarding/time' })

    await adjustWheel('increment')
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ text: '20:30' })

    await adjustWheel('decrement')
    await adjustWheel('decrement')
    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ text: '19:30' })
  })

  it('selects the time the wheel stops on when it is scrolled', async () => {
    await renderRouter(ROUTES, { initialUrl: '/onboarding/time' })

    // 40 points per time: 2 rows down from the top = 01:00
    await fireEvent.scroll(screen.getByText('20:00'), { nativeEvent: { contentOffset: { x: 0, y: 80 } } })

    expect(screen.getByRole('adjustable')).toHaveAccessibilityValue({ text: '01:00' })
  })

  it('saves the chosen time and opens onboarding 4/4 on "CONTINUER"', async () => {
    await renderRouter(ROUTES, { initialUrl: '/onboarding/time' })

    await adjustWheel('increment')
    await fireEvent.press(screen.getByRole('button', { name: 'CONTINUER' }))

    expect(await screen.findByLabelText('Étape 4 sur 4')).toBeTruthy()
    expect(screen).toHavePathname('/onboarding/pedometer')
    expect(await preferencesRepository.getResetTime()).toBe('20:30')
  })

  it('shows an error with a retry button when the time cannot be saved', async () => {
    // React logs the caught error: keep the test output readable
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(preferencesRepository, 'setResetTime').mockRejectedValueOnce(new Error('storage unavailable'))

    await renderRouter(ROUTES, { initialUrl: '/onboarding/time' })
    await fireEvent.press(screen.getByRole('button', { name: 'CONTINUER' }))

    expect(await screen.findByRole('header', { name: 'OUPS' })).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }))

    expect(await screen.findByRole('header', { name: 'TON HEURE' })).toBeTruthy()
  })
})
