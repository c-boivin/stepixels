import AsyncStorage from '@react-native-async-storage/async-storage'
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { AppState, View } from 'react-native'

import HomePage, { ErrorBoundary } from '~/app/index'
import OnboardingWelcomePage from '~/app/onboarding/welcome'
import { CAROUSEL_SLOT } from '~/components/views/Home/HomeCarousel'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { getStepsBetween } from '~/lib/steps'
import { authRepository } from '~/repositories/auth.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { backupRepository } from '~/repositories/backup.repository'
import { validationsRepository } from '~/repositories/validations.repository'

import type { AppStateStatus } from 'react-native'

// the onboarding screen loads the community total: here, only the route choice matters
jest.mock('~/repositories/community.repository', () => ({
  communityRepository: { getTotal: jest.fn().mockResolvedValue(null) },
}))

// the account is read by the home screen: signed in here, so SUIVANT unlocks at once (#35)
jest.mock('~/repositories/auth.repository', () => ({
  authRepository: { getEmail: jest.fn().mockResolvedValue('camille@exemple.fr') },
}))

// a validation is sent at once (ADR-004): here, only that it is asked
jest.mock('~/repositories/backup.repository', () => ({
  backupRepository: { sendPending: jest.fn().mockResolvedValue(undefined) },
}))

// what the phone answers for each period of time: each test sets it
jest.mock('~/lib/steps', () => ({ getStepsBetween: jest.fn() }))

// route tests live here, never in src/app/ (every file there is a route)
const ROUTES = {
  index: { default: HomePage, ErrorBoundary },
  'onboarding/welcome': OnboardingWelcomePage,
  settings: () => <View testID="settings" />,
  'account/sign-up': () => <View testID="save-image" />,
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
      await preferencesRepository.unlockImage(2)

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

    it('shows a "Le saviez-vous ?" from 2 000 steps', async () => {
      mockSteps({ today: 4230, yesterday: 0 })
      // 0.1: not the Moon (1 in 20), then the first message of the tier, the Eiffel Tower
      jest.spyOn(Math, 'random').mockReturnValue(0.1)

      await renderRouter(ROUTES)

      expect(await screen.findByText('LE SAVIEZ-VOUS ?')).toBeTruthy()
      expect(screen.getByText('Tes 3,2 km, c’est 9,7 fois la tour Eiffel.')).toBeTruthy()
    })

    it('shows again the message kept for the same day and tier, whatever the next pick would be', async () => {
      mockSteps({ today: 4230, yesterday: 0 })
      // kept this morning for today (the day ends at tonight's reset)
      await preferencesRepository.setFactChoice({
        day: new Date('2026-11-26T20:00:00').toISOString(),
        tier: 0,
        fact: { landmark: 'eiffel', kind: 'times' },
      })
      jest.spyOn(Math, 'random').mockReturnValue(0.9)

      await renderRouter(ROUTES)

      expect(await screen.findByText('Tes 3,2 km, c’est 9,7 fois la tour Eiffel.')).toBeTruthy()
    })

    it('shows no "Le saviez-vous ?" under 2 000 steps: the block keeps its place', async () => {
      mockSteps({ today: 1999, yesterday: 0 })

      await renderRouter(ROUTES)

      await screen.findByText('1999')
      expect(screen.queryByText('LE SAVIEZ-VOUS ?')).toBeNull()
    })

    it('tells the distance of a finished image when the user swipes to it', async () => {
      // image 01 finished, then a later validation on image 02 (unlocked by SUIVANT)
      validationsRepository.add([{ imageNumber: 1, pixels: 256 }], new Date('2026-11-25T10:00:00'))
      validationsRepository.add([{ imageNumber: 2, pixels: 10 }], new Date('2026-11-25T12:00:00'))
      mockSteps({ today: 0, yesterday: 0 })

      await renderRouter(ROUTES)
      await screen.findByText('EN COURS')
      await swipeTo(0)
      // the image's message fades in (no fact of the day: 0 steps)
      await act(() => jest.advanceTimersByTimeAsync(400))

      // image 01: 25 600 steps × 0,75 m = 19 km, just above a Paris → Versailles (17 km)
      expect(screen.getByText('Cette image : 19 km de marche, plus qu’un Paris → Versailles.')).toBeTruthy()
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

    describe('validation (#29) and finished image (#31)', () => {
      it('disables VALIDER under 100 steps: it would give 0 pixel', async () => {
        mockSteps({ today: 99, yesterday: 0 })

        await renderRouter(ROUTES)

        expect(await screen.findByRole('button', { name: 'VALIDER' })).toBeDisabled()
      })

      it('saves the pixels at once, reveals them, then says how many steps were validated', async () => {
        mockSteps({ today: 4230, yesterday: 0 })
        await renderRouter(ROUTES)

        // the phone has no step after the validation
        jest.mocked(getStepsBetween).mockResolvedValue(0)
        await fireEvent.press(await screen.findByRole('button', { name: 'VALIDER' }))

        // saved before the animation: closing the app now keeps the pixels; the 30 steps left are lost
        expect(validationsRepository.getAll()).toMatchObject([{ imageNumber: 1, pixels: 42, steps: 4200 }])
        expect(backupRepository.sendPending).toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'VALIDATION…' })).toBeTruthy()
        expect(screen.getByText('+42 PIXELS')).toBeTruthy()
        // the fact of the day fades out, then the reveal message fades in
        await act(async () => {
          jest.advanceTimersByTime(400)
        })
        expect(screen.getByText('ÇA SE RÉVÈLE')).toBeTruthy()
        expect(screen.getByText('VALIDATION')).toBeTruthy()

        await act(async () => {
          jest.advanceTimersByTime(3000)
        })

        expect(await screen.findByText('VALIDÉ')).toBeTruthy()
        expect(screen.getByText(`+4${SPACE}200 pas validés. Reviens quand tu veux.`)).toBeTruthy()
        expect(screen.getByLabelText('Compteur du jour : 0 pas à valider')).toBeTruthy()
        expect(screen.getByLabelText('01 - LE CHAMPIGNON, 42 pixels révélés sur 256')).toBeTruthy()
        expect(screen.getByRole('button', { name: 'VALIDER' })).toBeDisabled()
      })

      it('saves a validation once, even when VALIDER is tapped twice', async () => {
        mockSteps({ today: 4230, yesterday: 0 })
        await renderRouter(ROUTES)

        jest.mocked(getStepsBetween).mockResolvedValue(0)
        const button = await screen.findByRole('button', { name: 'VALIDER' })
        await fireEvent.press(button)
        await fireEvent.press(button)
        await act(async () => {
          jest.advanceTimersByTime(3000)
        })
        // a third tap, once the animation is over
        await fireEvent.press(screen.getByRole('button', { name: 'VALIDER' }))

        expect(validationsRepository.getAll()).toHaveLength(1)
      })

      it('shows the image of a restored account unlocked, without SUIVANT', async () => {
        // restored from the account (#64): image 02 was validated after image 01 was finished
        validationsRepository.add([{ imageNumber: 1, pixels: 256 }], new Date('2026-11-23T10:00:00'))
        validationsRepository.add([{ imageNumber: 2, pixels: 10 }], new Date('2026-11-24T10:00:00'))
        mockSteps({ today: 4230, yesterday: 0 })

        await renderRouter(ROUTES)

        expect(await screen.findByLabelText(`02 - L’ÉTOILE, 10 pixels révélés sur 1${SPACE}024`)).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'SUIVANT' })).toBeNull()
        expect(screen.getByRole('button', { name: 'VALIDER' })).not.toBeDisabled()
      })

      it('celebrates a finished image once, then unlocks the next one with the extra pixels', async () => {
        validationsRepository.add([{ imageNumber: 1, pixels: 250 }], new Date('2026-11-24T10:00:00'))
        mockSteps({ today: 1000, yesterday: 0 })
        await renderRouter(ROUTES)

        jest.mocked(getStepsBetween).mockResolvedValue(0)
        await fireEvent.press(await screen.findByRole('button', { name: 'VALIDER' }))
        // 10 pixels: 6 finish image 01, 4 are kept for image 02
        expect(validationsRepository.getAll().slice(1)).toMatchObject([
          { imageNumber: 1, pixels: 6 },
          { imageNumber: 2, pixels: 4 },
        ])
        // no modal before the last pixel appears
        expect(screen.queryByRole('header', { name: 'LE CHAMPIGNON' })).toBeNull()

        await act(async () => {
          jest.advanceTimersByTime(3000)
        })

        // two days with a validation of the image: November 24 and today
        expect(await screen.findByRole('header', { name: 'LE CHAMPIGNON' })).toBeTruthy()
        expect(screen.getByText(`25${SPACE}600 pas · 2 jours · 19 km`)).toBeTruthy()

        // the home screen has its own SUIVANT under the modal: the modal's one comes last
        await fireEvent.press(screen.getAllByRole('button', { name: 'SUIVANT' }).at(-1)!)

        expect(await screen.findByText('NOUVELLE IMAGE')).toBeTruthy()
        expect(screen.getByText('L’image 02 est débloquée. À toi de la révéler.')).toBeTruthy()
        expect(screen.getByLabelText(`02 - L’ÉTOILE, 4 pixels révélés sur 1${SPACE}024`)).toBeTruthy()
        expect(screen.queryByRole('header', { name: 'LE CHAMPIGNON' })).toBeNull()
        expect((await preferencesRepository.getUnlockedImage()).number).toBe(2)
      })

      it('keeps a finished image waiting for SUIVANT after a restart, without the modal', async () => {
        validationsRepository.add([{ imageNumber: 1, pixels: 256 }], new Date('2026-11-24T10:00:00'))
        mockSteps({ today: 4230, yesterday: 0 })

        await renderRouter(ROUTES)

        expect(await screen.findByText('IMAGE TERMINÉE')).toBeTruthy()
        expect(screen.getByText('Le champignon est complet. 19 km de marche, bravo !')).toBeTruthy()
        expect(screen.queryByRole('button', { name: 'VALIDER' })).toBeNull()
        expect(screen.queryByRole('header', { name: 'LE CHAMPIGNON' })).toBeNull()

        await fireEvent.press(screen.getByRole('button', { name: 'SUIVANT' }))

        expect(await screen.findByText('NOUVELLE')).toBeTruthy()
        expect(screen.getByLabelText(`02 - L’ÉTOILE, aucun pixel révélé sur 1${SPACE}024`)).toBeTruthy()
        // the steps of the day can now be validated on image 02
        expect(screen.getByRole('button', { name: 'VALIDER' })).not.toBeDisabled()
      })

      it("asks a guest for an account before unlocking the next image (#35)", async () => {
        jest.mocked(authRepository.getEmail).mockResolvedValueOnce(null)
        validationsRepository.add([{ imageNumber: 1, pixels: 256 }], new Date('2026-11-24T10:00:00'))
        mockSteps({ today: 0, yesterday: 0 })
        await renderRouter(ROUTES)

        await fireEvent.press(await screen.findByRole('button', { name: 'SUIVANT' }))

        expect(await screen.findByTestId('save-image')).toBeTruthy()
        expect(screen).toHavePathname('/account/sign-up')
        expect(screen).toHaveSearchParams({ unlock: '2' })
        // image 02 stays locked until the account exists
        expect((await preferencesRepository.getUnlockedImage()).number).toBe(1)
      })

      it('says the image is saved once the account unlocked the next one (#35)', async () => {
        validationsRepository.add([{ imageNumber: 1, pixels: 256 }], new Date('2026-11-24T10:00:00'))
        await preferencesRepository.unlockSavedImage(2)
        mockSteps({ today: 0, yesterday: 0 })

        await renderRouter(ROUTES)

        expect(await screen.findByText('IMAGE SAUVEGARDÉE')).toBeTruthy()
        expect(screen.getByText('Voici la 02, à toi de jouer.')).toBeTruthy()
      })
    })
  })
})
