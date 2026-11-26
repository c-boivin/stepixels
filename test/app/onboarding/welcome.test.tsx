import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'

import OnboardingRulePage from '~/app/onboarding/rule'
import OnboardingWelcomePage, { ErrorBoundary } from '~/app/onboarding/welcome'
import { communityRepository } from '~/repositories/community.repository'

// the total comes from Supabase or from the phone: here, only the screen is tested
jest.mock('~/repositories/community.repository', () => ({ communityRepository: { getTotal: jest.fn() } }))

const ROUTES = { 'onboarding/welcome': { default: OnboardingWelcomePage, ErrorBoundary }, 'onboarding/rule': OnboardingRulePage }

describe('onboarding welcome route', () => {
  it('shows the community total, the title and the button', async () => {
    jest.mocked(communityRepository.getTotal).mockResolvedValue(1_284_302)

    await renderRouter(ROUTES, { initialUrl: '/onboarding/welcome' })

    expect(await screen.findByLabelText('Déjà 1 284 302 pas révélés par la communauté des Stepixs')).toBeTruthy()
    expect(screen.getByRole('header', { name: 'TU VEUX EN FAIRE\nPARTIE ?' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'C’EST PARTI' })).toBeTruthy()
    expect(screen.getByLabelText('Étape 1 sur 4')).toBeTruthy()
  })

  it('hides the sentence when no total is known (first launch offline), but keeps the button', async () => {
    jest.mocked(communityRepository.getTotal).mockResolvedValue(null)

    await renderRouter(ROUTES, { initialUrl: '/onboarding/welcome' })

    expect(await screen.findByRole('button', { name: 'C’EST PARTI' })).toBeTruthy()
    expect(screen.queryByText('déjà')).toBeNull()
    expect(screen.queryByText('par la communauté des Stepixs')).toBeNull()
  })

  it('opens onboarding 2/4 on "C’EST PARTI"', async () => {
    jest.mocked(communityRepository.getTotal).mockResolvedValue(null)

    await renderRouter(ROUTES, { initialUrl: '/onboarding/welcome' })
    await fireEvent.press(await screen.findByRole('button', { name: 'C’EST PARTI' }))

    expect(await screen.findByLabelText('Étape 2 sur 4')).toBeTruthy()
    expect(screen).toHavePathname('/onboarding/rule')
  })

  it('shows an error with a retry button when the screen cannot load, and loads it again on retry', async () => {
    // React logs the caught error: keep the test output readable
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.mocked(communityRepository.getTotal).mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValue(42)

    await renderRouter(ROUTES, { initialUrl: '/onboarding/welcome' })

    expect(await screen.findByRole('header', { name: 'OUPS' })).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }))

    expect(await screen.findByLabelText('Déjà 42 pas révélés par la communauté des Stepixs')).toBeTruthy()
  })
})
