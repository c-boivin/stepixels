import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'

import HomePage from '~/app/index'
import OnboardingWelcomePage from '~/app/onboarding/welcome'
import { CAROUSEL_SLOT } from '~/components/views/Home/HomeCarousel'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the onboarding screen loads the community total: here, only the route choice matters
jest.mock('~/repositories/community.repository', () => ({
  communityRepository: { getTotal: jest.fn().mockResolvedValue(null) },
}))

// route tests live here, never in src/app/ (every file there is a route)
const ROUTES = { index: HomePage, 'onboarding/welcome': OnboardingWelcomePage }
// the title and steps under the card are hidden from the screen reader (the card reads them)
const HIDDEN = { includeHiddenElements: true }
// Intl writes French thousands with a narrow no-break space (U+202F)
const SPACE = '\u202F'

/** Swipes the carousel to the card at `index`, as a finger would. */
async function swipeTo(index: number) {
  await fireEvent(screen.getByLabelText('Tes images'), 'momentumScrollEnd', {
    nativeEvent: { contentOffset: { x: index * CAROUSEL_SLOT, y: 0 } },
  })
}

describe('first route', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    db.delete(validations).run()
  })

  it('opens the onboarding on a first launch', async () => {
    await renderRouter(ROUTES)

    expect(await screen.findByLabelText('Étape 1 sur 4')).toBeTruthy()
    expect(screen).toHavePathname('/onboarding/welcome')
  })

  describe('once the onboarding is done', () => {
    beforeEach(async () => {
      await preferencesRepository.setOnboardingDone(true)
    })

    it('shows the first image, new, and the next one locked', async () => {
      await renderRouter(ROUTES)

      expect(await screen.findByLabelText('01 - LE CHAMPIGNON, aucun pixel révélé sur 256')).toBeTruthy()
      expect(screen.getByText('NOUVELLE')).toBeTruthy()
      expect(screen.getByLabelText('02 - L’ÉTOILE, verrouillée')).toBeTruthy()
      expect(screen).toHavePathname('/')
    })

    it('shows the image being revealed with the pixels of every validation', async () => {
      validationsRepository.add([{ imageNumber: 1, pixels: 40 }])
      validationsRepository.add([{ imageNumber: 1, pixels: 2 }])

      await renderRouter(ROUTES)

      expect(await screen.findByLabelText('01 - LE CHAMPIGNON, 42 pixels révélés sur 256')).toBeTruthy()
      expect(screen.getByText('EN COURS')).toBeTruthy()
      // nothing to come back to: the image being revealed is already in front
      expect(screen.queryByRole('button', { name: 'REVENIR À L’IMAGE EN COURS' })).toBeNull()
    })

    it('browses a finished image, then comes back to the image being revealed', async () => {
      validationsRepository.add([
        { imageNumber: 1, pixels: 256 },
        { imageNumber: 2, pixels: 10 },
      ])

      await renderRouter(ROUTES)
      expect(await screen.findByText('02 - L’ÉTOILE', HIDDEN)).toBeTruthy()

      await swipeTo(0)
      expect(screen.getByText('TERMINÉE')).toBeTruthy()
      expect(screen.getByText('01 - LE CHAMPIGNON', HIDDEN)).toBeTruthy()
      // the steps of the finished image, on the right of its title
      expect(screen.getByText(`25${SPACE}600`, HIDDEN)).toBeTruthy()

      await fireEvent.press(screen.getByRole('button', { name: 'REVENIR À L’IMAGE EN COURS' }))
      expect(screen.getByText('EN COURS')).toBeTruthy()
      expect(screen.getByText('02 - L’ÉTOILE', HIDDEN)).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'REVENIR À L’IMAGE EN COURS' })).toBeNull()
    })

    it('shows the locked image whole, then comes back to the image being revealed', async () => {
      await renderRouter(ROUTES)
      await screen.findByText('NOUVELLE')

      await swipeTo(1)
      expect(screen.getByText('02 - L’ÉTOILE', HIDDEN)).toBeTruthy()

      await fireEvent.press(screen.getByRole('button', { name: 'REVENIR À L’IMAGE EN COURS' }))
      expect(screen.getByText('01 - LE CHAMPIGNON', HIDDEN)).toBeTruthy()
    })

    it('stops on the last card when swiped too far', async () => {
      await renderRouter(ROUTES)
      await screen.findByText('NOUVELLE')

      await swipeTo(5)
      expect(screen.getByText('02 - L’ÉTOILE', HIDDEN)).toBeTruthy()
    })
  })
})
