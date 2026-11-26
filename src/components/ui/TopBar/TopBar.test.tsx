import { fireEvent, render, screen } from '@testing-library/react-native'

import { TopBar } from '~/components/ui/TopBar'

describe('TopBar', () => {
  it('shows only the title when there is no settings action', async () => {
    await render(<TopBar title="STEPIXELS" />)

    expect(screen.getByText('STEPIXELS')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows the settings gear as a button, read with its label', async () => {
    const onPress = jest.fn()
    await render(<TopBar title="STEPIXELS" settings={{ label: 'Réglages', onPress }} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Réglages' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('gives the gear a 44 × 44 target inside the bar, so that Android receives the whole touch', async () => {
    await render(<TopBar title="STEPIXELS" settings={{ label: 'Réglages', onPress: jest.fn() }} />)

    expect(screen.getByRole('button', { name: 'Réglages' })).toHaveStyle({ width: 44, height: 44 })
  })
})
