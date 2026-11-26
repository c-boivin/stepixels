import { getReminderDates } from '~/lib/day'
import { i18n } from '~/lib/i18n'
import { getNotificationsAccess, requestNotificationsAccess, scheduleNotifications } from '~/lib/notifications'
import { REMINDER_DAYS } from '~/lib/rules'
import { preferencesRepository } from '~/repositories/preferences.repository'
import { validationsRepository } from '~/repositories/validations.repository'

/**
 * The plan running, or the last one. Plans run one after the other: two at once (the app comes
 * back from the permission prompt while `OUI` plans) would each cancel, then add, the same reminders.
 */
let planning: Promise<void> = Promise.resolve()

/**
 * The validation reminders (#55), planned on the phone one hour before each reset time.
 * They are planned for a few days ahead and planned again from the reset time and the last
 * validation each time the home screen is read: a validation removes today's reminder, a new
 * reset time moves them all.
 */
export const remindersRepository = {
  /** Whether to ask the reminder question: only once, after the first validation. */
  async shouldAsk(): Promise<boolean> {
    return (await preferencesRepository.getReminderAnswer()) === null
  },

  /**
   * Saves the answer to the reminder question. `OUI` asks the system permission, then plans the
   * reminders if it is granted; `PLUS TARD` or a refusal plans nothing, and the question never comes back.
   */
  async answer(accepted: boolean) {
    await preferencesRepository.setReminderAnswer(accepted ? 'accepted' : 'declined')
    if (!accepted) return

    const access = await requestNotificationsAccess(i18n.t('reminder.channel_name'))
    if (access === 'granted') await this.plan()
  },

  /**
   * Plans the reminders of the next days again, after the plan already running. Does nothing
   * unless the user said `OUI` and the system permission is granted (it can be removed in the
   * system settings, or already granted to Expo Go before `PLUS TARD`).
   */
  plan(now = new Date()): Promise<void> {
    // a failed plan must not stop the next ones
    planning = planning.catch(() => {}).then(() => planNow(now))
    return planning
  },
}

async function planNow(now: Date) {
  if ((await preferencesRepository.getReminderAnswer()) !== 'accepted') return
  if ((await getNotificationsAccess()) !== 'granted') return

  const dates = getReminderDates({
    resetTime: await preferencesRepository.getResetTime(),
    now,
    lastValidatedAt: validationsRepository.getLastValidatedAt(),
    days: REMINDER_DAYS,
  })
  await scheduleNotifications(
    dates,
    { title: i18n.t('reminder.notification.title'), body: i18n.t('reminder.notification.body') },
    i18n.t('reminder.channel_name'),
  )
}
