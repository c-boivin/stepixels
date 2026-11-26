import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { act, renderRouter, screen } from 'expo-router/testing-library'
import { AccessibilityInfo } from 'react-native'

import RootLayout, { ErrorBoundary } from '~/app/_layout'
import HomePage from '~/app/index'
import { LAUNCH_MINIMUM_MS } from '~/components/views/Launch'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'

// the migrations run on the in-memory database elsewhere: here, only their result matters
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({ useMigrations: jest.fn() }))

// the home screen reads the steps of the day: here, only the screen that opens matters
jest.mock('~/lib/steps', () => ({ getStepsBetween: jest.fn().mockResolvedValue(0) }))

// the account is read by the home screen: signed in here, so SUIVANT unlocks at once (#35)
jest.mock('~/repositories/auth.repository', () => ({
  authRepository: { getEmail: jest.fn().mockResolvedValue('camille@exemple.fr') },
}))

// the backup reaches Supabase: here, only when the layout asks for it matters
jest.mock('~/repositories/backup.repository', () => ({
  backupRepository: { sendPending: jest.fn().mockResolvedValue(undefined) },
}))

const ROUTES = { _layout: { default: RootLayout, ErrorBoundary }, index: HomePage }
const LAUNCH_LABEL = 'Stepixels se prépare'
// the home screen: its first image, nothing validated yet
const HOME_LABEL = '01 - LE CHAMPIGNON, aucun pixel révélé sur 256'

describe('root layout', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    // onboarding done: once open, the first route stays on the home screen
    await preferencesRepository.setOnboardingDone(true)
  })

  // a test that fails halfway must not leave the fake timers to the next ones
  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows the launch screen while the local database is prepared', async () => {
    jest.mocked(useMigrations).mockReturnValue({ success: false, error: undefined })

    await renderRouter(ROUTES)

    expect(screen.getByLabelText(LAUNCH_LABEL)).toBeTruthy()
  })

  it('keeps the launch screen for one loop of the loader on a cold start, then opens the app', async () => {
    jest.useFakeTimers()
    jest.mocked(useMigrations).mockReturnValue({ success: true, error: undefined })

    await renderRouter(ROUTES)

    // the database is ready at once, but the loop is not over
    await act(() => jest.advanceTimersByTimeAsync(LAUNCH_MINIMUM_MS - 10))
    expect(screen.getByLabelText(LAUNCH_LABEL)).toBeTruthy()

    await act(() => jest.advanceTimersByTimeAsync(20))
    expect(await screen.findByLabelText(HOME_LABEL)).toBeTruthy()
    expect(screen).toHavePathname('/')
    expect(screen.queryByRole('button', { name: 'RÉESSAYER' })).toBeNull()
  })

  it('opens the app without waiting when "Reduce motion" is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest.mocked(useMigrations).mockReturnValue({ success: true, error: undefined })

    await renderRouter(ROUTES)

    // well before the end of a loop
    expect(await screen.findByLabelText(HOME_LABEL, {}, { timeout: LAUNCH_MINIMUM_MS / 2 })).toBeTruthy()
  })

  it('shows an error screen with a retry button when a migration fails', async () => {
    // React logs the caught error: keep the test output readable
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.mocked(useMigrations).mockReturnValue({ success: false, error: new Error('migration failed') })

    await renderRouter(ROUTES)

    expect(screen.getByRole('header', { name: 'OUPS' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'RÉESSAYER' })).toBeTruthy()
  })

  it('sends the validations waiting for the network once the local database is ready', async () => {
    jest.mocked(useMigrations).mockReturnValue({ success: true, error: undefined })

    await renderRouter(ROUTES)

    expect(backupRepository.sendPending).toHaveBeenCalled()
  })
})
