import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { AppState, View } from 'react-native'

import HomePage, { ErrorBoundary } from '~/app/index'
import OnboardingWelcomePage from '~/app/onboarding/welcome'
import { CAROUSEL_SLOT } from '~/components/views/Home/HomeCarousel'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { getStepsBetween } from '~/lib/steps'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { AppStateStatus } from 'react-native'

// the onboarding screen loads the community total: here, only the route choice matters
jest.mock('~/repositories/community.repository', () => ({
  communityRepository: { getTotal: jest.fn().mockResolvedValue(null) },
}))

// what the phone answers for each period of time: each test sets it
jest.mock('~/lib/steps', () => ({ getStepsBetween: jest.fn() }))

// route tests live here, never in src/app/ (every file there is a route)
const ROUTES = {
  index: { default: HomePage, ErrorBoundary },
  'onboarding/welcome': OnboardingWelcomePage,
  settings: () => <View testID="settings" />,
}
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

// French times (test/global-setup.ts), with the default reset time 20:00
const NOW = new Date('2026-11-26T13:47:20')
const STARTED_AT = new Date('2026-11-20T10:00:00')

/** The phone answers `today` for the current day and `yesterday` for the previous one. */
function mockSteps({ today, yesterday }: { today: number; yesterday: number }) {
  jest.mocked(getStepsBetween).mockImplementation(async (_, end) => (end.getTime() > NOW.getTime() - 1000 ? today : yesterday))
}

describe('first route', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    db.delete(validations).run()
    jest.mocked(getStepsBetween).mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('opens the onboarding on a first launch, without reading the steps', async () => {
    await renderRouter(ROUTES)

    expect(await screen.findByLabelText('Étape 1 sur 4')).toBeTruthy()
    expect(screen).toHavePathname('/onboarding/welcome')
    expect(getStepsBetween).not.toHaveBeenCalled()
  })

  describe('once the onboarding is done', () => {
    beforeEach(async () => {
      await preferencesRepository.setOnboardingDone(true)
      // the carousel does not depend on the steps of the day
      jest.mocked(getStepsBetween).mockResolvedValue(0)
    })

    it('shows the first image, new, and the next one locked', async () => {
      await renderRouter(ROUTES)

      expect(await screen.findByLabelText('01 - LE CHAMPIGNON, aucun pixel révélé sur 256')).toBeTruthy()
      expect(screen.getByText('NOUVELLE')).toBeTruthy()
      expect(screen.getByLabelText('02 - L’ÉTOILE, verrouillée')).toBeTruthy()
      expect(screen).toHavePathname('/')
    })

    it('opens the settings from the gear of the top bar', async () => {
      await renderRouter(ROUTES)

      await fireEvent.press(await screen.findByRole('button', { name: 'Réglages' }))

      expect(await screen.findByTestId('settings')).toBeTruthy()
      expect(screen).toHavePathname('/settings')
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

  describe('home screen', () => {
    beforeEach(async () => {
      jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] })
      await preferencesRepository.setOnboardingDone(true, STARTED_AT)
    })

    it('shows the steps to validate and the time left before the reset', async () => {
      mockSteps({ today: 4230, yesterday: 0 })

      await renderRouter(ROUTES)

      expect(await screen.findByText('4230')).toBeTruthy()
      expect(screen.getByLabelText('Compteur du jour : 4230 pas à valider')).toBeTruthy()
      expect(screen.getByText('06:12:40')).toBeTruthy()
      expect(screen).toHavePathname('/')
      // the day started at yesterday's reset time
      expect(getStepsBetween).toHaveBeenCalledWith(new Date('2026-11-25T20:00:00'), NOW)
    })

    it('counts only the steps after the last validation of the day', async () => {
      validationsRepository.add([{ imageNumber: 1, pixels: 42 }], new Date('2026-11-26T09:00:00'))
      mockSteps({ today: 300, yesterday: 0 })

      await renderRouter(ROUTES)

      expect(await screen.findByText('300')).toBeTruthy()
      expect(getStepsBetween).toHaveBeenCalledTimes(1)
      expect(getStepsBetween).toHaveBeenCalledWith(new Date('2026-11-26T09:00:00'), NOW)
    })

    it('says "DOMMAGE" when steps were lost at the last reset', async () => {
      mockSteps({ today: 4230, yesterday: 1230 })

      await renderRouter(ROUTES)

      expect(await screen.findByText('DOMMAGE')).toBeTruthy()
      expect(screen.getByText('Hier, 1 230 pas n’ont pas été validés.')).toBeTruthy()
    })

    it('says nothing about a loss under 100 steps, which could not be validated', async () => {
      mockSteps({ today: 4230, yesterday: 99 })

      await renderRouter(ROUTES)

      await screen.findByText('4230')
      expect(screen.queryByText('DOMMAGE')).toBeNull()
    })

    it('starts a new day at the reset time: the counter goes back to 0', async () => {
      jest.setSystemTime(new Date('2026-11-26T19:59:58'))
      jest.mocked(getStepsBetween).mockResolvedValue(4230)

      await renderRouter(ROUTES)
      expect(await screen.findByText('00:00:02')).toBeTruthy()

      // at 20:00, the phone has no step yet for the new day
      jest.mocked(getStepsBetween).mockResolvedValue(0)
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })

      expect(await screen.findByText('0')).toBeTruthy()
      expect(screen.getByText('24:00:00')).toBeTruthy()
      expect(getStepsBetween).toHaveBeenCalledWith(new Date('2026-11-26T20:00:00'), expect.any(Date))
    })

    it('reads the steps again when the app comes back to the foreground', async () => {
      const listeners: ((state: AppStateStatus) => void)[] = []
      jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
        listeners.push(listener)
        return { remove: jest.fn() }
      })
      jest.mocked(getStepsBetween).mockResolvedValue(4230)

      await renderRouter(ROUTES)
      await screen.findByText('4230')

      jest.mocked(getStepsBetween).mockResolvedValue(5120)
      await act(async () => {
        for (const listener of listeners) listener('active')
      })

      expect(await screen.findByText('5120')).toBeTruthy()
    })

    it('offers to retry when the steps cannot be read, and reads them again on retry', async () => {
      // React logs the caught error: keep the test output readable
      jest.spyOn(console, 'error').mockImplementation(() => {})
      jest.mocked(getStepsBetween).mockRejectedValue(new Error('Health Connect is not available'))

      await renderRouter(ROUTES)
      expect(await screen.findByRole('header', { name: 'OUPS' })).toBeTruthy()

      jest.mocked(getStepsBetween).mockResolvedValue(4230)
      await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }))

      expect(await screen.findByText('4230')).toBeTruthy()
    })
  })
})
