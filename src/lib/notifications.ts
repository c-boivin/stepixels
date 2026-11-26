import {
  AndroidImportance,
  addNotificationResponseReceivedListener,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications'
import { Platform } from 'react-native'

// Local notifications (#55): planned on the phone, no server, no push, so they work offline (R15)
// and in Expo Go. Screens never import expo-notifications: they go through this file.

/** Android channel of the reminder: the user can turn it off alone in the system settings. */
const REMINDER_CHANNEL_ID = 'reminder'

/**
 * Access to the notifications, for the screens to switch on (`docs/conventions.md`):
 * - `undetermined`: never asked yet, explain the benefit then call `requestNotificationsAccess()`;
 * - `granted`: notifications can be shown;
 * - `refused`: just declined;
 * - `blocked`: only the settings can allow it (also on the web, where the app plans nothing).
 */
export type NotificationsAccess = 'undetermined' | 'granted' | 'refused' | 'blocked'

/** What a notification shows. */
export interface NotificationText {
  title: string
  body: string
}

/**
 * Shows the notifications even while the app is open, as a banner (no badge: the app has no
 * counter to show on its icon). Called once at launch, before any notification can arrive.
 */
export function setUpNotifications() {
  if (Platform.OS === 'web') return

  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      // on Android, no sound also hides the banner
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

/**
 * Calls `onOpen` each time the user taps a notification of the app. Returns the function that
 * stops listening.
 */
export function listenToNotificationTaps(onOpen: () => void): () => void {
  if (Platform.OS === 'web') return () => {}

  const subscription = addNotificationResponseReceivedListener(onOpen)
  return () => subscription.remove()
}

/** Reads the current access, without asking the user. */
export async function getNotificationsAccess(): Promise<NotificationsAccess> {
  if (Platform.OS === 'web') return 'blocked'

  const permission = await getPermissionsAsync()
  if (permission.granted) return 'granted'
  return permission.canAskAgain ? 'undetermined' : 'blocked'
}

/** Asks the user for the access when the system still can, and returns the result. */
export async function requestNotificationsAccess(channelName: string): Promise<NotificationsAccess> {
  if (Platform.OS === 'web') return 'blocked'

  // Android 13+ shows the permission prompt only once a channel exists
  await createReminderChannel(channelName)

  const permission = await getPermissionsAsync()
  if (permission.granted) return 'granted'
  if (!permission.canAskAgain) return 'blocked'

  const { granted } = await requestPermissionsAsync()
  return granted ? 'granted' : 'refused'
}

/**
 * Replaces every planned notification of the app by one `text` at each of `dates`.
 * On Android, a notification can arrive a few minutes late: the system groups alarms to save battery.
 */
export async function scheduleNotifications(dates: readonly Date[], text: NotificationText, channelName: string) {
  if (Platform.OS === 'web') return

  // created again each time: the permission may have been given later, from the system settings
  await createReminderChannel(channelName)
  await cancelAllScheduledNotificationsAsync()
  for (const date of dates) {
    await scheduleNotificationAsync({
      content: { title: text.title, body: text.body },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date, channelId: REMINDER_CHANNEL_ID },
    })
  }
}

/** Creates the Android channel of the reminder, or updates its name; nothing on iOS. */
async function createReminderChannel(name: string) {
  if (Platform.OS !== 'android') return

  await setNotificationChannelAsync(REMINDER_CHANNEL_ID, { name, importance: AndroidImportance.HIGH })
}
