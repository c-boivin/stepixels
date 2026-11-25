import { renderRouter, screen } from 'expo-router/testing-library'

import HomePage from '~/app/index'

// example of a screen test: route tests live here, never in src/app/ (every file there is a route)
describe('home route', () => {
  it('opens on the home screen', async () => {
    await renderRouter({ index: HomePage })

    expect(screen).toHavePathname('/')
  })
})
