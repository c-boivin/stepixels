import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

import { validations } from '~/db/schema'
import { db } from '~/lib/db'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { remindersRepository } from '~/repositories/reminders.repository'
import { validationsRepository } from '~/repositories/validations.repository'

// the tests run in the Europe/Paris time zone (test/global-setup.ts): dates without an offset are French times
const at = (iso: string) => new Date(iso)
const NOW = at('2026-11-26T15:00:00')

function grantPermission(granted: boolean) {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted, canAskAgain: true } as never)
}

/** Dates of the planned notifications, in planning order. */
function plannedDates() {
  return jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.map(([{ trigger }]) => (trigger as { date: Date }).date)
}

describe('remindersRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
    db.delete(validations).run()
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear()
    jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mockClear()
  })

  it('asks the question only until the user answered it', async () => {
    expect(await remindersRepository.shouldAsk()).toBe(true)

    await remindersRepository.answer(false)

    expect(await remindersRepository.shouldAsk()).toBe(false)
  })

  it('plans nothing and never asks the system after PLUS TARD', async () => {
    await remindersRepository.answer(false)

    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('plans nothing when the user refuses the system permission', async () => {
    grantPermission(false)
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: false } as never)

    await remindersRepository.answer(true)

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
    expect(await remindersRepository.shouldAsk()).toBe(false)
  })

  it('plans the reminders of the next 7 days, one hour before the reset time', async () => {
    grantPermission(true)

    await remindersRepository.plan(NOW)

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled()
    expect(plannedDates()).toHaveLength(7)
    expect(plannedDates()[0]).toEqual(at('2026-11-26T19:00:00'))
    expect(jest.mocked(Notifications.scheduleNotificationAsync).mock.calls[0][0].content).toEqual({
      title: 'STEPIXELS',
      body: "Plus qu'une heure pour valider tes pas.",
    })
  })

  it('leaves out today once the steps of the day are validated', async () => {
    grantPermission(true)
    validationsRepository.add([{ imageNumber: 1, pixels: 3 }], at('2026-11-26T14:00:00'))

    await remindersRepository.plan(NOW)

    expect(plannedDates()).toHaveLength(6)
    expect(plannedDates()[0]).toEqual(at('2026-11-27T19:00:00'))
  })

  it('follows the reset time', async () => {
    grantPermission(true)
    await preferencesRepository.setResetTime('07:30')

    await remindersRepository.plan(NOW)

    expect(plannedDates()[0]).toEqual(at('2026-11-27T06:30:00'))
  })

  it('plans nothing without the permission', async () => {
    grantPermission(false)

    await remindersRepository.plan(NOW)

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })
})
