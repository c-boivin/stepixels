import AsyncStorage from '@react-native-async-storage/async-storage'
import { renderRouter, screen } from 'expo-router/testing-library'

import HomePage from '~/app/index'
import OnboardingWelcomePage from '~/app/onboarding/welcome'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the onboarding screen loads the community total: here, only the route choice matters
jest.mock('~/repositories/community.repository', () => ({
  communityRepository: { getTotal: jest.fn().mockResolvedValue(null) },
}))

// route tests live here, never in src/app/ (every file there is a route)
const ROUTES = { index: HomePage, 'onboarding/welcome': OnboardingWelcomePage }

describe('first route', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('opens the onboarding on a first launch', async () => {
    await renderRouter(ROUTES)

    expect(await screen.findByLabelText('Étape 1 sur 4')).toBeTruthy()
    expect(screen).toHavePathname('/onboarding/welcome')
  })

  it('opens the home screen once the onboarding is done', async () => {
    await preferencesRepository.setOnboardingDone(true)

    await renderRouter(ROUTES)

    // the launch screen leaves once the choice is read
    await screen.findByTestId('home')
    expect(screen).toHavePathname('/')
  })
})
