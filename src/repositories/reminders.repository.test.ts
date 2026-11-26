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

/** The user said OUI to the reminder question. */
async function accept() {
  await preferencesRepository.setReminderAnswer('accepted')
}

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
    // restoreMocks does not empty the calls of the jest.fn() of test/setup.ts: each test starts from none
    jest.clearAllMocks()
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
    await accept()
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
    await accept()
    grantPermission(true)
    validationsRepository.add([{ imageNumber: 1, pixels: 3 }], at('2026-11-26T14:00:00'))

    await remindersRepository.plan(NOW)

    expect(plannedDates()).toHaveLength(6)
    expect(plannedDates()[0]).toEqual(at('2026-11-27T19:00:00'))
  })

  it('follows the reset time', async () => {
    await accept()
    grantPermission(true)
    await preferencesRepository.setResetTime('07:30')

    await remindersRepository.plan(NOW)

    expect(plannedDates()[0]).toEqual(at('2026-11-27T06:30:00'))
  })

  it('plans nothing without the permission', async () => {
    await accept()
    grantPermission(false)

    await remindersRepository.plan(NOW)

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('plans nothing after PLUS TARD, even when the system already allows notifications', async () => {
    grantPermission(true)
    await remindersRepository.answer(false)

    await remindersRepository.plan(NOW)

    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('plans after OUI once the permission is granted', async () => {
    grantPermission(true)

    await remindersRepository.answer(true)

    expect(plannedDates().length).toBeGreaterThan(0)
  })

  it('plans one after the other: two plans at once never add the same reminder twice', async () => {
    await accept()
    grantPermission(true)

    await Promise.all([remindersRepository.plan(NOW), remindersRepository.plan(NOW)])

    // each plan cancels the previous reminders first: 7 at the end, not 14 interleaved
    const calls = jest.mocked(Notifications.scheduleNotificationAsync).mock.invocationCallOrder
    const lastCancel = Math.max(...jest.mocked(Notifications.cancelAllScheduledNotificationsAsync).mock.invocationCallOrder)
    expect(calls.filter((order) => order > lastCancel)).toHaveLength(7)
  })
})
