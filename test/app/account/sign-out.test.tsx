import AsyncStorage from '@react-native-async-storage/async-storage'
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library'
import { View } from 'react-native'

import SignOutPage from '~/app/account/sign-out'
import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { authRepository } from '~/repositories/auth.repository'
import { backupRepository } from '~/repositories/backup.repository'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the Supabase client needs the .env keys: the session is handled by the repository below
jest.mock('~/lib/supabase', () => ({ supabase: {} }))
jest.mock('~/repositories/auth.repository', () => ({
  ...jest.requireActual('~/repositories/auth.repository'),
  authRepository: { signOut: jest.fn().mockResolvedValue(undefined) },
}))

// the backup reaches Supabase: each test sets whether the send works
jest.mock('~/repositories/backup.repository', () => ({
  backupRepository: { sendPending: jest.fn().mockResolvedValue(undefined) },
}))

const ROUTES = {
  index: () => <View testID="home" />,
  settings: () => <View testID="settings" />,
  'account/sign-out': SignOutPage,
}

describe('sign-out route', () => {
  beforeEach(async () => {
    // forget the calls of the previous test; by default, the send reaches the account
    jest.clearAllMocks()
    jest.mocked(backupRepository.sendPending).mockImplementation(async () => {
      validationsRepository.markSynced(validationsRepository.getUnsynced().map(({ id }) => id))
    })
    await AsyncStorage.clear()
    db.delete(validations).run()
  })

  it('asks before signing out, and says the images stay on the account', async () => {
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    expect(screen.getByRole('header', { name: 'TE\nDÉCONNECTER ?' })).toBeTruthy()
    expect(screen.getByText('Tes images restent sauvegardées.\nReconnecte-toi pour les retrouver.')).toBeTruthy()
  })

  it('signs out, clears the progress but keeps the reset time and the last validation time, then opens home', async () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 5 }], new Date('2026-11-26T10:00:00.000Z'))
    await preferencesRepository.setResetTime('07:30')
    await preferencesRepository.unlockImage(2)
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    await fireEvent.press(screen.getByRole('button', { name: 'SE DÉCONNECTER' }))

    expect(await screen.findByTestId('home')).toBeTruthy()
    // what was not sent yet went to the account before anything left the phone
    expect(backupRepository.sendPending).toHaveBeenCalled()
    expect(authRepository.signOut).toHaveBeenCalled()
    expect(validationsRepository.getAll()).toEqual([])
    expect(await preferencesRepository.getResetTime()).toBe('07:30')
    // back to image 01, as a guest
    expect((await preferencesRepository.getUnlockedImage()).number).toBe(1)
    // the steps validated before the sign-out are not offered again to the guest
    expect(await preferencesRepository.getLastValidatedAt()).toEqual(new Date('2026-11-26T10:00:00.000Z'))
  })

  it('signs nothing out offline when progress is not saved yet, and asks to try again', async () => {
    jest.mocked(backupRepository.sendPending).mockRejectedValueOnce(new Error('Network request failed'))
    validationsRepository.add([{ imageNumber: 1, pixels: 5 }])
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    await fireEvent.press(screen.getByRole('button', { name: 'SE DÉCONNECTER' }))

    expect(await screen.findByText('! Pas de connexion. Réessaie.')).toBeTruthy()
    expect(authRepository.signOut).not.toHaveBeenCalled()
    expect(validationsRepository.getAll()).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'SE DÉCONNECTER' })).toBeEnabled()
  })

  it('deletes nothing when the send could not reach the account (offline, expired session)', async () => {
    // nothing sent, and no error: Supabase could not refresh the session offline
    jest.mocked(backupRepository.sendPending).mockResolvedValueOnce()
    validationsRepository.add([{ imageNumber: 1, pixels: 5 }])
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    await fireEvent.press(screen.getByRole('button', { name: 'SE DÉCONNECTER' }))

    expect(await screen.findByText('! Pas de connexion. Réessaie.')).toBeTruthy()
    expect(authRepository.signOut).not.toHaveBeenCalled()
    expect(validationsRepository.getUnsynced()).toHaveLength(1)
  })

  it('never erases a later kept time of the last validation', async () => {
    await preferencesRepository.setLastValidatedAt(new Date('2026-11-26T10:00:00.000Z'))
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    await fireEvent.press(screen.getByRole('button', { name: 'SE DÉCONNECTER' }))

    expect(await screen.findByTestId('home')).toBeTruthy()
    expect(await preferencesRepository.getLastValidatedAt()).toEqual(new Date('2026-11-26T10:00:00.000Z'))
  })

  it('changes nothing when cancelled', async () => {
    validationsRepository.add([{ imageNumber: 1, pixels: 5 }])
    await renderRouter(ROUTES, { initialUrl: '/account/sign-out' })

    await fireEvent.press(screen.getByRole('button', { name: 'ANNULER' }))

    expect(await screen.findByTestId('settings')).toBeTruthy()
    expect(authRepository.signOut).not.toHaveBeenCalled()
    expect(validationsRepository.getAll()).toHaveLength(1)
  })
})
