import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { renderRouter, screen } from 'expo-router/testing-library'

import RootLayout, { ErrorBoundary } from '~/app/_layout'
import HomePage from '~/app/index'

// the migrations run on the in-memory database elsewhere: here, only their result matters
jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({ useMigrations: jest.fn() }))

const ROUTES = { _layout: { default: RootLayout, ErrorBoundary }, index: HomePage }

describe('root layout', () => {
  it('opens the app once the local database is ready', async () => {
    jest.mocked(useMigrations).mockReturnValue({ success: true, error: undefined })

    await renderRouter(ROUTES)

    expect(screen).toHavePathname('/')
    expect(screen.queryByRole('button', { name: 'RÉESSAYER' })).toBeNull()
  })

  it('shows an error screen with a retry button when a migration fails', async () => {
    // React logs the caught error: keep the test output readable
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.mocked(useMigrations).mockReturnValue({ success: false, error: new Error('migration failed') })

    await renderRouter(ROUTES)

    expect(screen.getByRole('header', { name: 'OUPS' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'RÉESSAYER' })).toBeTruthy()
  })
})
