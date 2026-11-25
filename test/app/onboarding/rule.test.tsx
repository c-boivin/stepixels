import { renderRouter, screen } from 'expo-router/testing-library'

import OnboardingRulePage from '~/app/onboarding/rule'

describe('onboarding rule route', () => {
  it('explains that 100 steps reveal 1 pixel, with a button to go on', async () => {
    await renderRouter({ 'onboarding/rule': OnboardingRulePage }, { initialUrl: '/onboarding/rule' })

    expect(screen.getByLabelText('Étape 2 sur 4')).toBeTruthy()
    expect(screen.getByRole('header', { name: '100 PAS\n= 1 PIXEL' })).toBeTruthy()
    expect(screen.getByText('Tous les 100 pas, une case\nde l’image se révèle.')).toBeTruthy()
    // the arrow is shown but not read: the button is named by its label only
    expect(screen.getByRole('button', { name: 'CONTINUER' })).toBeTruthy()
  })
})
